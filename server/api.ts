import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { z, ZodError } from "zod";
import {
  actionSchema,
  addressSchema,
  credentialsSchema,
  orderInputSchema,
  phoneSchema,
  profileSchema,
  safeReturnTo,
} from "../src/commerce/contracts.ts";
import { dbError, HttpError, readBody, requireSameOrigin } from "./http.ts";

export type Env = {
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  STORE_CONTACT?: string;
  STORE_MODE?: string;
  TURNSTILE_SITE_KEY?: string;
  APP_ORIGIN?: string;
  EMAIL_LOGIN_ENABLED?: string;
  GOOGLE_LOGIN_ENABLED?: string;
};
export async function handleApi(request: Request, env: Env): Promise<Response> {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  });
  const json = (value: unknown, status = 200) =>
    new Response(JSON.stringify(value), { status, headers });
  const url = new URL(request.url);
  const route = url.pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");
  const origin = env.APP_ORIGIN || url.origin;
  const configured = !!(env.SUPABASE_URL && env.SUPABASE_PUBLISHABLE_KEY);
  const cookies = (request.headers.get("cookie") ?? "")
    .split(";")
    .flatMap((part) => {
      const i = part.indexOf("=");
      if (i < 0) return [];
      try {
        return [
          {
            name: part.slice(0, i).trim(),
            value: decodeURIComponent(part.slice(i + 1)),
          },
        ];
      } catch {
        return [];
      }
    });
  try {
    requireSameOrigin(request);
    if (!configured) {
      if (route === "auth/session" && request.method === "GET")
        return json({
          configured: false,
          user: null,
          captchaSiteKey: null,
          emailEnabled: false,
          googleEnabled: false,
        });
      throw new HttpError(
        503,
        "A loja está preparando o acesso às contas. Sua sacola continua salva.",
        "not_configured",
      );
    }
    const supabase = createServerClient(
      env.SUPABASE_URL!,
      env.SUPABASE_PUBLISHABLE_KEY!,
      {
        auth: { flowType: "pkce" },
        cookies: {
          getAll: () => cookies,
          setAll: (values) => {
            for (const { name, value, options } of values) {
              const parts = [
                `${name}=${encodeURIComponent(value)}`,
                "Path=/",
                "HttpOnly",
                "SameSite=Lax",
              ];
              if (url.protocol === "https:") parts.push("Secure");
              if (options.maxAge !== undefined)
                parts.push(`Max-Age=${options.maxAge}`);
              if (options.expires)
                parts.push(
                  `Expires=${new Date(options.expires).toUTCString()}`,
                );
              headers.append("Set-Cookie", parts.join("; "));
              const old = cookies.find((c) => c.name === name);
              if (old) old.value = value;
              else cookies.push({ name, value });
            }
          },
        },
      },
    );
    const rpc = async <T = unknown>(
      name: string,
      args: Record<string, unknown> = {},
    ): Promise<T> => {
      const { data, error } = await supabase.rpc(name, args);
      dbError(error);
      return data as T;
    };
    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user)
        throw new HttpError(
          401,
          "Entre na sua conta para continuar.",
          "auth_required",
        );
      return data.user;
    };
    const getAccess = async () => {
      await getUser();
      return rpc<{
        id: string;
        email: string;
        role: string;
        active: boolean;
        mfa: boolean;
      }>("my_access");
    };
    const requireOwner = async () => {
      const access = await getAccess();
      if (!access.active || access.role !== "owner")
        throw new HttpError(403, "Seu acesso não permite esta ação.");
      if (!access.mfa)
        throw new HttpError(
          403,
          "Confirme o código do autenticador.",
          "mfa_required",
        );
      return access;
    };
    const authFailure = (error: { code?: string } | null) => {
      if (error)
        throw new HttpError(
          error.code?.includes("rate_limit") ? 429 : 400,
          error.code?.includes("rate_limit")
            ? "Aguarde alguns minutos antes de tentar novamente."
            : "Não foi possível concluir o acesso. Confira os dados ou tente novamente.",
          error.code?.includes("rate_limit") ? "rate_limited" : "auth_failed",
        );
    };
    const redirect = (location: string) => {
      headers.set("Location", location);
      return new Response(null, { status: 303, headers });
    };
    const captcha = (token?: string) => {
      if (env.STORE_MODE === "live" && (!env.TURNSTILE_SITE_KEY || !token))
        throw new HttpError(
          400,
          "Conclua a verificação de segurança.",
          "captcha_required",
        );
    };

    if (route === "auth/session" && request.method === "GET") {
      const { data } = await supabase.auth.getUser();
      const features = {
        emailEnabled: env.EMAIL_LOGIN_ENABLED === "true",
        googleEnabled: env.GOOGLE_LOGIN_ENABLED === "true",
      };
      if (!data.user)
        return json({
          configured: true,
          user: null,
          captchaSiteKey: env.TURNSTILE_SITE_KEY || null,
          ...features,
        });
      return json({
        configured: true,
        user: await rpc("my_access"),
        captchaSiteKey: env.TURNSTILE_SITE_KEY || null,
        ...features,
      });
    }
    if (route === "auth/google" && request.method === "GET") {
      if (env.GOOGLE_LOGIN_ENABLED !== "true")
        throw new HttpError(
          503,
          "O acesso Google está indisponível no momento.",
        );
      const returnTo = safeReturnTo(url.searchParams.get("returnTo"));
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/api/auth/callback?returnTo=${encodeURIComponent(returnTo)}`,
          skipBrowserRedirect: true,
        },
      });
      authFailure(error);
      if (!data.url)
        throw new HttpError(503, "O acesso Google está indisponível.");
      return redirect(data.url);
    }
    if (route === "auth/callback" && request.method === "GET") {
      const code = url.searchParams.get("code");
      if (!code) return redirect("/entrar?erro=callback");
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) return redirect("/entrar?erro=callback");
      return redirect(safeReturnTo(url.searchParams.get("returnTo")));
    }
    if (route === "auth/confirm" && request.method === "GET") {
      const token_hash = url.searchParams.get("token_hash");
      const type = z
        .enum(["signup", "recovery", "invite", "email_change"])
        .safeParse(url.searchParams.get("type"));
      if (!token_hash || !type.success)
        return redirect("/entrar?erro=confirmacao");
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type: type.data,
      });
      if (error) return redirect("/entrar?erro=confirmacao");
      return redirect(
        ["recovery", "invite"].includes(type.data)
          ? "/recuperar-acesso?step=reset"
          : "/conta/pedidos",
      );
    }
    if (
      ["auth/login", "auth/signup"].includes(route) &&
      request.method === "POST"
    ) {
      if (env.EMAIL_LOGIN_ENABLED !== "true")
        throw new HttpError(
          503,
          "O acesso por e-mail está indisponível no momento.",
        );
      const body = credentialsSchema.parse(await readBody(request));
      captcha(body.captchaToken);
      if (route === "auth/login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: body.email,
          password: body.password,
          options: { captchaToken: body.captchaToken },
        });
        authFailure(error);
        return json({ ok: true });
      }
      const { error } = await supabase.auth.signUp({
        email: body.email,
        password: body.password,
        options: {
          emailRedirectTo: `${origin}/api/auth/confirm`,
          captchaToken: body.captchaToken,
        },
      });
      if (error?.code !== "user_already_exists") authFailure(error);
      return json({
        ok: true,
        message:
          "Confira seu e-mail para confirmar o cadastro. Se já tem uma conta, entre ou recupere o acesso.",
      });
    }
    if (route === "auth/recover" && request.method === "POST") {
      if (env.EMAIL_LOGIN_ENABLED !== "true")
        throw new HttpError(
          503,
          "A recuperação por e-mail está indisponível no momento.",
        );
      const body = z
        .object({
          email: z.email().max(254),
          captchaToken: z.string().optional(),
        })
        .parse(await readBody(request));
      captcha(body.captchaToken);
      const { error } = await supabase.auth.resetPasswordForEmail(body.email, {
        redirectTo: `${origin}/api/auth/confirm`,
        captchaToken: body.captchaToken,
      });
      authFailure(error);
      return json({
        ok: true,
        message:
          "Se houver uma conta com esse e-mail, você receberá as instruções de recuperação.",
      });
    }
    if (route === "auth/password" && request.method === "POST") {
      await getUser();
      const body = z
        .object({ password: z.string().min(10).max(128) })
        .parse(await readBody(request));
      const { error } = await supabase.auth.updateUser(body);
      authFailure(error);
      return json({ ok: true });
    }
    if (route === "auth/logout" && request.method === "POST") {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      authFailure(error);
      return json({ ok: true });
    }
    if (route === "auth/mfa" && request.method === "GET") {
      await getUser();
      const { data, error } = await supabase.auth.mfa.listFactors();
      authFailure(error);
      return json({ factors: data?.totp ?? [] });
    }
    if (route === "auth/mfa/enroll" && request.method === "POST") {
      const access = await getAccess();
      if (!access.active || access.role === "customer")
        throw new HttpError(403, "Acesso reservado à equipe.");
      const { data: factors } = await supabase.auth.mfa.listFactors();
      for (const factor of factors?.all ?? [])
        if (factor.factor_type === "totp" && factor.status === "unverified")
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "ZXXR equipe",
      });
      authFailure(error);
      return json({ id: data?.id, totp: data?.totp });
    }
    if (route === "auth/mfa/verify" && request.method === "POST") {
      await getUser();
      const body = z
        .object({ factorId: z.uuid(), code: z.string().regex(/^\d{6}$/) })
        .parse(await readBody(request));
      const { error } = await supabase.auth.mfa.challengeAndVerify(body);
      authFailure(error);
      return json({ ok: true });
    }
    if (route === "catalog" && request.method === "GET") {
      const catalog = await rpc<Record<string, unknown>>("store_catalog");
      const contact = phoneSchema.safeParse(env.STORE_CONTACT);
      return json({
        ...catalog,
        testMode: env.STORE_MODE !== "live" || catalog.testMode,
        contact: contact.success ? contact.data : null,
        open: catalog.open && contact.success,
      });
    }
    if (/^(?:profile|addresses|orders|admin)(?:\/|$)/.test(route))
      await getUser();
    if (route === "profile" && request.method === "GET") {
      await getUser();
      return json(await rpc("my_profile"));
    }
    if (route === "profile" && request.method === "PUT") {
      const body = profileSchema.parse(await readBody(request));
      return json(await rpc("save_profile", { p_data: body }));
    }
    if (route === "addresses" && request.method === "POST") {
      const body = addressSchema.parse(await readBody(request));
      return json({ id: await rpc("save_address", { p_data: body }) });
    }
    if (route === "orders" && request.method === "POST") {
      await getUser();
      if (!phoneSchema.safeParse(env.STORE_CONTACT).success)
        throw new HttpError(503, "O atendimento de pedidos está indisponível.");
      const key = z.uuid().parse(request.headers.get("Idempotency-Key"));
      const body = orderInputSchema.parse(await readBody(request));
      const catalog = await rpc<{ testMode: boolean }>("store_catalog");
      if (env.STORE_MODE !== "live" && !catalog.testMode)
        throw new HttpError(
          503,
          "Este ambiente está em validação. Não é possível registrar pedidos reais.",
        );
      return json(
        await rpc("create_order", { p_request: body, p_key: key }),
        201,
      );
    }
    if (route === "orders" && request.method === "GET")
      return json(await rpc("list_orders"));
    if (/^orders\/[^/]+$/.test(route) && request.method === "GET")
      return json(
        await rpc("order_detail", {
          p_id: z.uuid().parse(route.split("/")[1]),
        }),
      );
    if (route === "admin/orders" && request.method === "GET") {
      const p_filters = {
        admin: true,
        q: url.searchParams.get("q")?.slice(0, 100),
        stage: url.searchParams.get("stage"),
        assignee: url.searchParams.get("assignee"),
        from: url.searchParams.get("from"),
        to: url.searchParams.get("to"),
      };
      return json(await rpc("list_orders", { p_filters }));
    }
    if (/^admin\/orders\/[^/]+$/.test(route) && request.method === "GET")
      return json(
        await rpc("order_detail", {
          p_id: z.uuid().parse(route.split("/")[2]),
          p_admin: true,
        }),
      );
    if (
      /^admin\/orders\/[^/]+\/actions$/.test(route) &&
      request.method === "POST"
    ) {
      const body = actionSchema.parse(await readBody(request));
      return json(
        await rpc("order_action", {
          p_id: z.uuid().parse(route.split("/")[2]),
          p_version: body.version,
          p_action: body.action,
          p_data: body.data,
        }),
      );
    }
    if (route === "admin/team" && request.method === "GET")
      return json(
        await rpc("team_list", {
          p_full: url.searchParams.get("full") === "true",
        }),
      );
    if (route === "admin/team" && request.method === "POST") {
      await requireOwner();
      const body = z
        .object({ email: z.email().max(254), active: z.boolean() })
        .parse(await readBody(request));
      const existing = await rpc("team_lookup", { p_email: body.email });
      let invited = false;
      if (!existing && body.active) {
        if (!env.SUPABASE_SERVICE_ROLE_KEY)
          throw new HttpError(
            503,
            "O envio de convites ainda não está configurado.",
          );
        const admin = createClient(
          env.SUPABASE_URL!,
          env.SUPABASE_SERVICE_ROLE_KEY,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );
        const { error } = await admin.auth.admin.inviteUserByEmail(body.email, {
          redirectTo: `${origin}/api/auth/confirm`,
        });
        authFailure(error);
        invited = true;
      }
      await rpc("team_access", { p_email: body.email, p_active: body.active });
      return json({ ok: true, invited });
    }
    if (route === "admin/settings" && request.method === "PUT") {
      const body = z
        .object({ open: z.boolean(), boleto: z.boolean() })
        .parse(await readBody(request));
      await rpc("settings_update", {
        p_open: body.open,
        p_boleto: body.boleto,
      });
      return json({ ok: true });
    }
    if (route === "admin/settings/variant" && request.method === "PUT") {
      const body = z
        .object({
          productId: z.string().min(1).max(60),
          priceCents: z.number().int().min(1).max(10000000),
          active: z.boolean(),
        })
        .parse(await readBody(request));
      await rpc("variant_update", {
        p_product: body.productId,
        p_price: body.priceCents,
        p_active: body.active,
      });
      return json({ ok: true });
    }
    throw new HttpError(404, "Recurso não encontrado.");
  } catch (error) {
    if (error instanceof ZodError)
      return json(
        {
          error: {
            code: "validation",
            message: "Confira os campos destacados.",
            fields: error.issues.map((i) => ({
              path: i.path.join("."),
              message: i.message,
            })),
          },
        },
        422,
      );
    if (error instanceof HttpError)
      return json(
        { error: { code: error.code, message: error.message } },
        error.status,
      );
    return json(
      {
        error: {
          code: "service_unavailable",
          message:
            "O serviço está indisponível. Seus dados não foram confirmados; tente novamente.",
        },
      },
      503,
    );
  }
}
