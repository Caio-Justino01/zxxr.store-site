import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  analyticsBatchSchema,
  ANALYTICS_CONSENT_VERSION,
  RECOVERY_CONSENT_VERSION,
} from "../src/analytics/contracts.ts";
import {
  analyticsEnvironmentAllowed,
  handleAnalytics,
  recordAnalyticsOrder,
  type AnalyticsContext,
} from "../server/analytics.ts";
import { HttpError } from "../server/http.ts";

const db = new PGlite();
const customer = "10000000-0000-4000-8000-000000000001",
  other = "10000000-0000-4000-8000-000000000002",
  owner = "10000000-0000-4000-8000-000000000003",
  staff = "10000000-0000-4000-8000-000000000004";
const cartId = "20000000-0000-4000-8000-000000000001";
const items = [{ productId: "boca", size: "M", quantity: 1 }];
const batch = {
  consent: { analytics: true as const, version: ANALYTICS_CONSENT_VERSION },
  visitorId: "30000000-0000-4000-8000-000000000001",
  sessionId: "30000000-0000-4000-8000-000000000002",
  events: [
    {
      id: "30000000-0000-4000-8000-000000000003",
      type: "page_view" as const,
      page: "/",
      device: "mobile" as const,
    },
  ],
  campaign: { source: "instagram", medium: "social", name: "Desejos" },
};
async function actor(id: string, aal = "aal1") {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claims',$1,false)", [
    JSON.stringify({ sub: id, aal }),
  ]);
  await db.exec("set role authenticated");
}
async function service() {
  await db.exec("reset role; set role service_role");
}
async function root() {
  await db.exec("reset role");
}
async function rpc<T = any>(name: string, args: unknown[] = []): Promise<T> {
  return (
    await db.query<{ value: T }>(
      `select public.${name}(${args.map((_, i) => `$${i + 1}`).join(",")}) as value`,
      args,
    )
  ).rows[0].value;
}
before(async () => {
  await db.exec(
    "create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;create function auth.jwt() returns jsonb language sql stable as $$select nullif(current_setting('request.jwt.claims',true),'')::jsonb$$;grant usage on schema auth to authenticated,anon;grant execute on all functions in schema auth to authenticated,anon;",
  );
  for (const file of [
    "202610260001_store.sql",
    "202610260002_order_hardening.sql",
    "202610270001_operational_orders.sql",
    "202610270003_settings_scope.sql",
    "202610270004_product_prices_materials.sql",
    "202610290001_two_piece_launch.sql",
    "202610290002_analytics_recovery.sql",
  ])
    await db.exec(
      await readFile(
        new URL(`../supabase/migrations/${file}`, import.meta.url),
        "utf8",
      ),
    );
  for (const [id, email] of [
    [customer, "customer@example.test"],
    [other, "other@example.test"],
    [owner, "owner@example.test"],
    [staff, "staff@example.test"],
  ])
    await db.query("insert into auth.users values($1,$2,now())", [id, email]);
  await db.query(
    "insert into public.staff_access(user_id,role) values($1,'owner'),($2,'staff')",
    [owner, staff],
  );
  await db.exec("update public.store_settings set open=true");
});
after(async () => {
  await db.close();
});

test("analytics accepts bounded explicit consent and rejects identity, query strings, form contents and oversized batches", () => {
  assert.equal(analyticsBatchSchema.safeParse(batch).success, true);
  for (const bad of [
    { ...batch, user_id: customer },
    {
      ...batch,
      consent: { analytics: false, version: ANALYTICS_CONSENT_VERSION },
    },
    {
      ...batch,
      events: [{ ...batch.events[0], page: "/entrar?token=private" }],
    },
    {
      ...batch,
      events: [{ ...batch.events[0], email: "private@example.test" }],
    },
    { ...batch, campaign: { source: "https://example.test/?email=private" } },
    { ...batch, referrerHost: "https://example.test/path?secret=value" },
    { ...batch, events: Array.from({ length: 21 }, () => batch.events[0]) },
    { ...batch, events: [{ ...batch.events[0], type: "cart_update" }] },
    {
      ...batch,
      events: [
        {
          ...batch.events[0],
          type: "cart_update",
          items: [{ productId: "flores", size: "M", quantity: 1 }],
        },
      ],
    },
  ])
    assert.equal(analyticsBatchSchema.safeParse(bad).success, false);
  assert.equal(
    analyticsEnvironmentAllowed(
      new Request("https://www.zxxr.store/api/analytics/events"),
      { STORE_MODE: "live" },
    ),
    true,
  );
  assert.equal(
    analyticsEnvironmentAllowed(
      new Request("https://preview.pages.dev/api/analytics/events"),
      { STORE_MODE: "live" },
    ),
    false,
  );
  assert.equal(
    analyticsEnvironmentAllowed(
      new Request("http://127.0.0.1:5274/api/analytics/events"),
      {},
    ),
    false,
  );
});
test("anonymous roles have no direct telemetry or recovery access and cannot call the service-only ingest RPC", async () => {
  await db.exec("reset role;set role anon");
  await assert.rejects(
    rpc("analytics_ingest", [batch, true]),
    /permission denied/,
  );
  await assert.rejects(
    db.query("select * from public.analytics_events"),
    /permission denied/,
  );
  await assert.rejects(rpc("recovery_cart"), /permission denied/);
  await actor(customer);
  await assert.rejects(
    rpc("analytics_ingest", [batch, true]),
    /permission denied/,
  );
  await assert.rejects(
    db.query("select * from public.recovery_carts"),
    /permission denied/,
  );
});
test("service ingest deduplicates event ids, binds session to visitor, separates modes and stores no user identity", async () => {
  await service();
  assert.deepEqual(await rpc("analytics_ingest", [batch, true]), {
    accepted: 1,
  });
  assert.deepEqual(await rpc("analytics_ingest", [batch, true]), {
    accepted: 0,
  });
  await assert.rejects(rpc("analytics_ingest", [batch, false]), /forbidden/);
  await assert.rejects(
    rpc("analytics_ingest", [{ ...batch, visitorId: other }, true]),
    /invalid_data/,
  );
  await root();
  const columns = (
    await db.query<{ column_name: string }>(
      "select column_name from information_schema.columns where table_name='analytics_events'",
    )
  ).rows.map((row) => row.column_name);
  for (const field of [
    "user_id",
    "customer_id",
    "phone",
    "email",
    "ip",
    "user_agent",
  ])
    assert.equal(columns.includes(field), false);
  assert.equal(
    (
      await db.query<{ n: number }>(
        "select count(*)::integer n from public.analytics_events",
      )
    ).rows[0].n,
    1,
  );
});
test("only owner with MFA can read metrics and recovery contacts", async () => {
  await actor(customer);
  await assert.rejects(rpc("analytics_overview"), /forbidden/);
  await actor(staff, "aal2");
  await assert.rejects(rpc("recovery_overview"), /forbidden/);
  await actor(owner);
  await assert.rejects(rpc("analytics_overview"), /mfa_required/);
  await actor(owner, "aal2");
  const overview = await rpc("analytics_overview");
  assert.equal(overview.totals.pageViews, 1);
  assert.equal(overview.totals.activeNow, 1);
  assert.equal(overview.devices[0].device, "mobile");
  assert.equal(overview.sources[0].source, "instagram");
  assert.match(overview.coverage, /autorizar|autorizou/);
});
test("recovery consent is separate, account-owned and empty by default", async () => {
  await actor(customer);
  assert.equal((await rpc("recovery_preferences")).enabled, false);
  await rpc("save_profile", [
    { name: "Cliente de teste", phone: "5531999999999" },
  ]);
  const preferences = await rpc("recovery_preferences_update", [
    true,
    RECOVERY_CONSENT_VERSION,
  ]);
  assert.equal(preferences.enabled, true);
  assert.equal(preferences.contactAvailable, true);
  const state = await rpc("recovery_cart");
  assert.equal(state.status, "empty");
  assert.equal(state.version, 0);
  const active = await rpc("recovery_cart_update", [
    { expectedVersion: state.version, cartId, intent: "restore", items },
  ]);
  assert.equal(active.status, "active");
  assert.equal(active.version, 1);
  await actor(other);
  assert.equal((await rpc("recovery_cart")).status, "empty");
  await assert.rejects(
    rpc("recovery_cart_update", [
      { expectedVersion: 0, cartId, intent: "change", items },
    ]),
    /recovery_consent_required/,
  );
});
test("competing updates use compare-and-swap; one wins and the stale upload is refused", async () => {
  await actor(customer);
  const outcomes = await Promise.allSettled([
    rpc("recovery_cart_update", [
      { expectedVersion: 1, cartId, intent: "activity", items },
    ]),
    rpc("recovery_cart_update", [
      { expectedVersion: 1, cartId, intent: "activity", items },
    ]),
  ]);
  assert.equal(outcomes.filter((row) => row.status === "fulfilled").length, 1);
  const rejected = outcomes.find(
    (row) => row.status === "rejected",
  ) as PromiseRejectedResult;
  assert.match(String(rejected.reason), /version_conflict/);
});
test("24h boundary, manual contact preparation and revocation are checked in the database", async () => {
  await root();
  await db.query(
    "update public.recovery_carts set last_activity_at=now()-interval '23 hours 59 minutes' where user_id=$1",
    [customer],
  );
  await actor(owner, "aal2");
  assert.equal((await rpc("recovery_overview")).items.length, 0);
  await root();
  await db.query(
    "update public.recovery_carts set last_activity_at=now()-interval '24 hours' where user_id=$1",
    [customer],
  );
  await actor(owner, "aal2");
  const lead = (await rpc("recovery_overview")).items[0];
  assert.equal(lead.name, "Cliente de teste");
  const prepared = await rpc("recovery_contact", [
    lead.id,
    lead.version,
    "prepare-contact",
  ]);
  assert.ok(prepared.preparedAt);
  const contacted = await rpc("recovery_contact", [
    lead.id,
    lead.version,
    "contacted",
  ]);
  assert.ok(contacted.contactedAt);
  await actor(customer);
  await rpc("recovery_preferences_update", [false, RECOVERY_CONSENT_VERSION]);
  await actor(owner, "aal2");
  assert.equal((await rpc("recovery_overview")).items.length, 0);
  await assert.rejects(
    rpc("recovery_contact", [lead.id, lead.version, "prepare-contact"]),
    /version_conflict|recovery_not_eligible/,
  );
});
let recordedOrder: any;
test("create_order atomically closes the account cycle and late other-device snapshots cannot reopen it", async () => {
  await actor(customer);
  await rpc("recovery_preferences_update", [true, RECOVERY_CONSENT_VERSION]);
  const state = await rpc("recovery_cart"),
    newId = "20000000-0000-4000-8000-000000000002";
  const active = await rpc("recovery_cart_update", [
    { expectedVersion: state.version, cartId: newId, intent: "change", items },
  ]);
  await root();
  await db.query(
    "update public.recovery_carts set last_activity_at=now()-interval '25 hours' where cart_id=$1",
    [newId],
  );
  await actor(customer);
  const request = {
    customer: { name: "Cliente de teste", phone: "5531999999999" },
    address: {
      recipient: "Cliente de teste",
      cep: "30110000",
      street: "Rua de teste",
      number: "10",
      neighborhood: "Centro",
      city: "Belo Horizonte",
      state: "MG",
      complement: "",
      reference: "",
    },
    paymentPreference: "pix",
    items: [{ ...items[0], expectedUnitCents: 14990 }],
  };
  recordedOrder = await rpc("create_order", [
    request,
    "40000000-0000-4000-8000-000000000001",
  ]);
  const converted = await rpc("recovery_cart");
  assert.equal(converted.status, "converted");
  assert.equal(converted.version, active.version + 1);
  await assert.rejects(
    rpc("recovery_cart_update", [
      {
        expectedVersion: active.version,
        cartId: newId,
        intent: "activity",
        items,
      },
    ]),
    /version_conflict/,
  );
  const restored = await rpc("recovery_cart_update", [
    {
      expectedVersion: converted.version,
      cartId: "20000000-0000-4000-8000-000000000003",
      intent: "restore",
      items,
    },
  ]);
  assert.equal(restored.status, "converted");
  const retry = await rpc("create_order", [
    request,
    "40000000-0000-4000-8000-000000000001",
  ]);
  assert.equal(retry.id, recordedOrder.id);
  assert.equal((await rpc("recovery_cart")).version, converted.version);
  await actor(owner, "aal2");
  assert.equal((await rpc("recovery_overview")).items.length, 0);
  const overview = await rpc("analytics_overview");
  assert.equal(overview.totals.registeredOrders, 1);
  assert.equal(overview.totals.paidOrders, 0);
  assert.equal(overview.totals.recoveredCarts, 1);
});
test("conversions link once, server checks the order owner, and pending orders never count as paid", async () => {
  await service();
  assert.equal(
    await rpc("analytics_link_order", [
      recordedOrder.id,
      batch.sessionId,
      batch.visitorId,
      other,
      true,
    ]),
    false,
  );
  assert.equal(
    await rpc("analytics_link_order", [
      recordedOrder.id,
      batch.sessionId,
      batch.visitorId,
      customer,
      true,
    ]),
    true,
  );
  assert.equal(
    await rpc("analytics_link_order", [
      recordedOrder.id,
      batch.sessionId,
      batch.visitorId,
      customer,
      true,
    ]),
    true,
  );
  await root();
  assert.equal(
    (
      await db.query<{ n: number }>(
        "select count(*)::integer n from public.analytics_order_links",
      )
    ).rows[0].n,
    1,
  );
  await actor(owner, "aal2");
  assert.equal((await rpc("analytics_overview")).totals.paidOrders, 0);
});
test("anonymous cart abandonment is estimated across sessions, cleared by an empty snapshot and excluded after a linked order", async () => {
  const visitor = "50000000-0000-4000-8000-000000000001",
    session = "50000000-0000-4000-8000-000000000002",
    event = "50000000-0000-4000-8000-000000000003";
  await service();
  await rpc("analytics_ingest", [
    {
      ...batch,
      visitorId: visitor,
      sessionId: session,
      events: [{ id: event, type: "cart_update", page: "/sacola", items }],
    },
    true,
  ]);
  await actor(owner, "aal2");
  assert.equal(
    (await rpc("analytics_overview")).totals.abandonedCartsEstimated,
    0,
  );
  await root();
  await db.query(
    "update public.analytics_events set received_at=now()-interval '25 hours' where id=$1",
    [event],
  );
  await actor(owner, "aal2");
  const estimated = await rpc("analytics_overview");
  assert.equal(estimated.totals.abandonedCartsEstimated, 1);
  assert.equal(estimated.totals.recoveryEligibleCount, 0);
  assert.equal((await rpc("recovery_overview")).items.length, 0);
  await service();
  await rpc("analytics_ingest", [
    {
      ...batch,
      visitorId: visitor,
      sessionId: "50000000-0000-4000-8000-000000000004",
      events: [
        {
          id: "50000000-0000-4000-8000-000000000005",
          type: "cart_update",
          items: [],
        },
      ],
    },
    true,
  ]);
  await actor(owner, "aal2");
  assert.equal(
    (await rpc("analytics_overview")).totals.abandonedCartsEstimated,
    0,
  );
  const linkedEvent = "50000000-0000-4000-8000-000000000006";
  await service();
  await rpc("analytics_ingest", [
    { ...batch, events: [{ id: linkedEvent, type: "cart_update", items }] },
    true,
  ]);
  await root();
  await db.query(
    "update public.analytics_events set received_at=now()-interval '25 hours' where id=$1",
    [linkedEvent],
  );
  await actor(owner, "aal2");
  assert.equal(
    (await rpc("analytics_overview")).totals.abandonedCartsEstimated,
    0,
  );
});
test("the service enforces the session rate limit without IP storage and retries remain deduplicated", async () => {
  await service();
  const visitorId = "60000000-0000-4000-8000-000000000001",
    sessionId = "60000000-0000-4000-8000-000000000002";
  let retry: unknown;
  for (let i = 0; i < 6; i++) {
    const value = {
      ...batch,
      visitorId,
      sessionId,
      events: Array.from({ length: 20 }, () => ({
        id: crypto.randomUUID(),
        type: "heartbeat",
      })),
    };
    assert.deepEqual(await rpc("analytics_ingest", [value, true]), {
      accepted: 20,
    });
    retry = value;
  }
  assert.deepEqual(await rpc("analytics_ingest", [retry, true]), {
    accepted: 0,
  });
  await assert.rejects(
    rpc("analytics_ingest", [
      {
        ...batch,
        visitorId,
        sessionId,
        events: [{ id: crypto.randomUUID(), type: "heartbeat" }],
      },
      true,
    ]),
    /rate_limited/,
  );
});
test("payment metrics require the real owner confirmation event and repeated reads do not duplicate revenue", async () => {
  await actor(owner, "aal2");
  let order = await rpc("order_action", [
    recordedOrder.id,
    recordedOrder.version,
    "quote",
    { shippingCents: 2500, deadline: "Prazo de teste" },
  ]);
  order = await rpc("order_action", [
    order.id,
    order.version,
    "checklist",
    { key: "address_confirmed", checked: true },
  ]);
  order = await rpc("order_action", [
    order.id,
    order.version,
    "release_quote",
    { paymentUrl: "https://example.test/pagar" },
  ]);
  assert.equal((await rpc("analytics_overview")).totals.paidOrders, 0);
  order = await rpc("order_action", [
    order.id,
    order.version,
    "pay",
    { reason: "Pagamento confirmado no teste isolado" },
  ]);
  const first = await rpc("analytics_overview"),
    second = await rpc("analytics_overview");
  assert.equal(first.totals.paidOrders, 1);
  assert.equal(first.totals.paidRevenueCents, 17490);
  assert.deepEqual(first.totals, second.totals);
});
test("retention prunes only optional telemetry and recovery, never historical orders", async () => {
  await root();
  await db.exec(
    "update public.analytics_events set received_at=now()-interval '91 days';update public.analytics_sessions set last_seen=now()-interval '91 days';update public.analytics_order_links set created_at=now()-interval '91 days';update public.recovery_carts set last_activity_at=now()-interval '31 days';update private.analytics_maintenance set last_run=null",
  );
  await actor(owner, "aal2");
  const overview = await rpc("analytics_overview");
  assert.equal(overview.totals.pageViews, 0);
  assert.equal(overview.totals.registeredOrders, 1);
  await root();
  assert.equal(
    (
      await db.query<{ n: number }>(
        "select count(*)::integer n from public.recovery_carts",
      )
    ).rows[0].n,
    0,
  );
  assert.equal(
    (
      await db.query<{ n: number }>(
        "select count(*)::integer n from public.orders",
      )
    ).rows[0].n,
    1,
  );
});
test("HTTP service excludes staff, rejects oversized data and measurement failure cannot fail an existing order", async () => {
  const json = (value: unknown, status = 200) =>
    new Response(JSON.stringify(value), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  let ingests = 0;
  const ctx: AnalyticsContext = {
    rpc: async <T>(name: string) => ({ testMode: false, role: "owner" }) as T,
    getUser: async () => ({ id: owner }),
    getAccess: async () => ({ role: "owner", active: true }),
    requireOwner: async () => ({ id: owner }),
    service: () =>
      ({
        rpc: async () => {
          ingests++;
          throw new Error("unavailable");
        },
      }) as any,
    json,
  };
  const request = new Request("https://www.zxxr.store/api/analytics/events", {
    method: "POST",
    body: JSON.stringify(batch),
  });
  assert.deepEqual(
    await (await handleAnalytics(request, { STORE_MODE: "live" }, ctx))!.json(),
    { accepted: 0, excluded: true },
  );
  assert.equal(ingests, 0);
  const tooLarge = new Request("https://www.zxxr.store/api/analytics/events", {
    method: "POST",
    body: JSON.stringify({ ...batch, padding: "x".repeat(33000) }),
  });
  await assert.rejects(
    handleAnalytics(tooLarge, { STORE_MODE: "live" }, ctx),
    (error: unknown) => error instanceof HttpError && error.status === 413,
  );
  await recordAnalyticsOrder(
    { ...ctx, getAccess: async () => ({ role: "customer", active: true }) },
    "40000000-0000-4000-8000-000000000001",
    batch.sessionId,
    batch.visitorId,
    false,
  );
  assert.equal(ingests, 1);
  assert.equal(
    await handleAnalytics(
      new Request("https://www.zxxr.store/api/catalog"),
      { STORE_MODE: "live" },
      ctx,
    ),
    null,
  );
});
