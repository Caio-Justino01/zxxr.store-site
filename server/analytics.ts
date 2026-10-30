import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  analyticsBatchSchema,
  recoveryCartSchema,
  recoveryContactSchema,
  recoveryPreferenceSchema,
  type RecoveryLead,
} from "../src/analytics/contracts.ts";
import { HttpError, dbError, readBody } from "./http.ts";
import { storeModesMatch } from "./store-mode.ts";

export type AnalyticsEnv = {
  STORE_MODE?: string;
  ANALYTICS_TEST_ENABLED?: string;
};
export type AnalyticsContext = {
  rpc: <T = unknown>(
    name: string,
    args?: Record<string, unknown>,
  ) => Promise<T>;
  getUser: () => Promise<{ id: string }>;
  getAccess?: () => Promise<{ role: string; active: boolean; mfa?: boolean }>;
  requireOwner: () => Promise<{ id: string }>;
  service: () => SupabaseClient;
  json: (value: unknown, status?: number) => Response;
};
const officialHosts = new Set(["www.zxxr.store", "zxxr.store"]);
export function analyticsEnvironmentAllowed(
  request: Request,
  env: AnalyticsEnv,
) {
  const url = new URL(request.url);
  return env.STORE_MODE === "live"
    ? url.protocol === "https:" && officialHosts.has(url.hostname)
    : env.ANALYTICS_TEST_ENABLED === "true";
}
function unavailable() {
  return new HttpError(
    503,
    "As métricas estão sendo preparadas. A loja continua funcionando.",
    "analytics_unavailable",
  );
}
function recoveryError(error: unknown): never {
  const message = error instanceof Error ? error.message : "";
  if (/recovery_consent_required/.test(message))
    throw new HttpError(
      409,
      "Autorize o lembrete para acompanhar sua sacola.",
      "recovery_consent_required",
    );
  if (/recovery_not_eligible/.test(message))
    throw new HttpError(
      409,
      "Esta sacola não está mais disponível para contato. Atualize a lista.",
      "recovery_not_eligible",
    );
  throw error;
}
async function assertMode(ctx: AnalyticsContext, env: AnalyticsEnv) {
  const catalog = await ctx.rpc<{ testMode: boolean }>("store_catalog");
  if (!storeModesMatch(env.STORE_MODE, catalog.testMode)) throw unavailable();
  return catalog.testMode;
}
/** Optional routes. The regular API owns sessions/cookies and catches validation errors. */
export async function handleAnalytics(
  request: Request,
  env: AnalyticsEnv,
  ctx: AnalyticsContext,
): Promise<Response | null> {
  const url = new URL(request.url),
    route = url.pathname.replace(/^\/api\//, "").replace(/\/$/, "");
  if (
    !/^(?:analytics\/events|recovery\/(?:preferences|cart)|admin\/(?:analytics|recovery)(?:\/|$))/.test(
      route,
    )
  )
    return null;
  if (!analyticsEnvironmentAllowed(request, env)) throw unavailable();
  if (route === "analytics/events" && request.method === "POST") {
    const batch = analyticsBatchSchema.parse(await readBody(request));
    try {
      await ctx.getUser();
      const access = ctx.getAccess
        ? await ctx.getAccess()
        : await ctx.rpc<{ role: string }>("my_access");
      if (access.role !== "customer")
        return ctx.json({ accepted: 0, excluded: true });
    } catch (error) {
      if (!(error instanceof HttpError && error.status === 401)) throw error;
    }
    const testMode = await assertMode(ctx, env);
    try {
      const { data, error } = await ctx
        .service()
        .rpc("analytics_ingest", { p_batch: batch, p_test_mode: testMode });
      dbError(error);
      return ctx.json(data ?? { accepted: 0 }, 202);
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw unavailable();
    }
  }
  if (route === "recovery/preferences" || route === "recovery/cart") {
    await ctx.getUser();
    await assertMode(ctx, env);
    try {
      if (route === "recovery/preferences") {
        if (request.method === "GET")
          return ctx.json(await ctx.rpc("recovery_preferences"));
        if (request.method === "PUT") {
          const body = recoveryPreferenceSchema.parse(await readBody(request));
          return ctx.json(
            await ctx.rpc("recovery_preferences_update", {
              p_enabled: body.enabled,
              p_version: body.version,
            }),
          );
        }
      } else {
        if (request.method === "GET")
          return ctx.json(await ctx.rpc("recovery_cart"));
        if (request.method === "PUT") {
          const body = recoveryCartSchema.parse(await readBody(request));
          return ctx.json(
            await ctx.rpc("recovery_cart_update", { p_data: body }),
          );
        }
      }
    } catch (error) {
      recoveryError(error);
    }
    throw new HttpError(405, "Método não permitido.");
  }
  if (route.startsWith("admin/")) {
    await ctx.requireOwner();
    await assertMode(ctx, env);
    if (route === "admin/analytics" && request.method === "GET") {
      const date = z.iso.date(),
        params = z
          .object({ from: date.optional(), to: date.optional() })
          .parse({
            from: url.searchParams.get("from") || undefined,
            to: url.searchParams.get("to") || undefined,
          });
      return ctx.json(
        await ctx.rpc("analytics_overview", {
          p_from: params.from ?? null,
          p_to: params.to ?? null,
        }),
      );
    }
    if (route === "admin/recovery" && request.method === "GET")
      return ctx.json(await ctx.rpc("recovery_overview"));
    const match =
      /^admin\/recovery\/([^/]+)\/(prepare-contact|contacted)$/.exec(route);
    if (match && request.method === "POST") {
      const id = z.uuid().parse(match[1]),
        body = recoveryContactSchema.parse(await readBody(request));
      try {
        const lead = await ctx.rpc<RecoveryLead>("recovery_contact", {
          p_id: id,
          p_version: body.version,
          p_action: match[2],
        });
        if (match[2] === "contacted")
          return ctx.json({ ok: true, contactedAt: lead.contactedAt });
        const message = `Olá, ${lead.name}! Você autorizou a ZXXR a falar sobre sua sacola. Gostaria de ajuda para concluir sua escolha?`;
        return ctx.json({
          url: `https://wa.me/${lead.phone}?text=${encodeURIComponent(message)}`,
          preparedAt: lead.preparedAt,
        });
      } catch (error) {
        recoveryError(error);
      }
    }
  }
  throw new HttpError(404, "Recurso não encontrado.");
}

/** Call only AFTER the checked create_order succeeds. Tracking never changes its response. */
export async function recordAnalyticsOrder(
  ctx: AnalyticsContext,
  orderId: string,
  sessionId: string | null,
  visitorId: string | null,
  testMode: boolean,
): Promise<void> {
  const ids = z
    .object({ orderId: z.uuid(), sessionId: z.uuid(), visitorId: z.uuid() })
    .safeParse({ orderId, sessionId, visitorId });
  if (!ids.success) return;
  try {
    const user = await ctx.getUser();
    const access = ctx.getAccess
      ? await ctx.getAccess()
      : await ctx.rpc<{ role: string }>("my_access");
    if (access.role !== "customer") return;
    await ctx
      .service()
      .rpc("analytics_link_order", {
        p_order_id: orderId,
        p_session_id: sessionId,
        p_visitor_id: visitorId,
        p_customer_id: user.id,
        p_test_mode: testMode,
      });
  } catch {
    /* An order stays successful even when optional measurement is unavailable. */
  }
}
