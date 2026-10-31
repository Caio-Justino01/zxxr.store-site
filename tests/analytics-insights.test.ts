import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import {
  analyticsMetricKeys,
  type AnalyticsOverview,
} from "../src/analytics/contracts.ts";

const db = new PGlite();
const owner = "10000000-0000-4000-8000-000000000011";
const staff = "10000000-0000-4000-8000-000000000012";
const customer = "10000000-0000-4000-8000-000000000013";
const migration = new URL(
  "../supabase/migrations/202610310001_analytics_insights.sql",
  import.meta.url,
);

async function actor(id: string, aal = "aal2") {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claims',$1,false)", [
    JSON.stringify({ sub: id, aal }),
  ]);
  await db.exec("set role authenticated");
}
async function overview(
  from?: string,
  to?: string,
  legacy = false,
): Promise<AnalyticsOverview> {
  const fn = legacy ? "analytics_overview_legacy" : "analytics_overview";
  return (
    await db.query<{ value: AnalyticsOverview }>(
      `select public.${fn}($1::date,$2::date) as value`,
      [from ?? null, to ?? null],
    )
  ).rows[0].value;
}
function day(value: Date, offset: number) {
  const shifted = new Date(value.getTime() + offset * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(shifted);
}
const at = (date: string, hour = 0, minute = 0) =>
  new Date(
    `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00-03:00`,
  ).toISOString();
async function scenario(run: (now: Date) => Promise<void>) {
  await db.exec("reset role;begin;");
  try {
    await db.exec(
      "truncate public.analytics_events,public.analytics_sessions,public.analytics_order_links,public.orders,public.order_events,public.order_notes,public.order_contacts,public.recovery_carts,public.recovery_accounts,public.recovery_contacts restart identity cascade;update public.store_settings set test_mode=true where id;",
    );
    const now = new Date(
      (
        await db.query<{ value: string }>(
          "select transaction_timestamp()::text as value",
        )
      ).rows[0].value,
    );
    await run(now);
  } finally {
    await db.exec("rollback;reset role;");
  }
}
async function expectError(run: () => Promise<unknown>, pattern: RegExp) {
  await db.exec("savepoint expected_error");
  try {
    await assert.rejects(run, pattern);
  } finally {
    await db.exec("rollback to expected_error;release expected_error");
  }
}
async function event(
  time: string,
  kind = "page_view",
  options: {
    session?: string;
    visitor?: string;
    mode?: boolean;
    product?: string;
    section?: string;
  } = {},
) {
  const session = options.session ?? randomUUID(),
    visitor = options.visitor ?? randomUUID(),
    mode = options.mode ?? true;
  await db.query(
    'insert into public.analytics_sessions(session_id,visitor_id,test_mode,campaign,device) values($1,$2,$3,\'{"source":"instagram","medium":"social","name":"Desejos"}\',\'mobile\') on conflict(session_id,test_mode) do nothing',
    [session, visitor, mode],
  );
  await db.query(
    "insert into public.analytics_events(id,session_id,visitor_id,test_mode,kind,page,section,product_id,occurred_at,received_at) values($1,$2,$3,$4,$5,'/',$6,$7,$8::timestamptz,now())",
    [
      randomUUID(),
      session,
      visitor,
      mode,
      kind,
      options.section ?? null,
      options.product ?? null,
      time,
    ],
  );
  return { session, visitor };
}
async function order(
  time: string,
  options: {
    mode?: boolean;
    state?: "paid" | "pending" | "refund_pending";
    payments?: string[];
    total?: number;
  } = {},
) {
  const id = randomUUID(),
    total = options.total ?? 17490;
  await db.query(
    "insert into public.orders(id,customer_id,customer,address,items,subtotal_cents,shipping_cents,total_cents,payment_preference,payment_state,stage,test_mode,request_key,request_data,created_at) values($1,$2,'{\"name\":\"Fictional customer\"}','{}','[]',$3,2500,$4,'pix',$5,'received',$6,$7,'{}',$8::timestamptz)",
    [
      id,
      customer,
      total - 2500,
      total,
      options.state ?? "pending",
      options.mode ?? true,
      randomUUID(),
      time,
    ],
  );
  for (const payment of options.payments ?? [])
    await db.query(
      "insert into public.order_events(order_id,actor_id,kind,label,created_at) values($1,$2,'pay','Fictional payment',$3::timestamptz)",
      [id, owner, payment],
    );
  return id;
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
  const old = await readFile(
    new URL(
      "../supabase/migrations/202610290002_analytics_recovery.sql",
      import.meta.url,
    ),
    "utf8",
  );
  const legacy = old.slice(
    old.indexOf("create function public.analytics_overview("),
    old.indexOf("\nrevoke all on function public.analytics_ingest"),
  );
  await db.exec(
    legacy.replace(
      "public.analytics_overview(",
      "public.analytics_overview_legacy(",
    ),
  );
  for (const [id, email] of [
    [owner, "owner@example.invalid"],
    [staff, "staff@example.invalid"],
    [customer, "customer@example.invalid"],
  ])
    await db.query("insert into auth.users values($1,$2,now())", [id, email]);
  await db.query(
    "insert into public.staff_access(user_id,role) values($1,'owner'),($2,'staff')",
    [owner, staff],
  );
  await db.exec(await readFile(migration, "utf8"));
});
after(async () => {
  await db.close();
});

test("hourly timeline uses Brasilia midnight and fills all 24 past hours with zeros", async () =>
  scenario(async (now) => {
    const yesterday = day(now, -1);
    await event(at(yesterday, 0, 1));
    await event(at(yesterday, 23, 59));
    await actor(owner);
    const data = await overview(yesterday, yesterday);
    assert.equal(data.period.timeZone, "America/Sao_Paulo");
    assert.equal(data.timeline?.granularity, "hour");
    const points = data.timeline!.points;
    assert.equal(points.length, 24);
    assert.equal(Date.parse(points[0].at), Date.parse(at(yesterday)));
    assert.equal(points[0].pageViews, 1);
    assert.equal(points[23].pageViews, 1);
    assert.equal(points[7].pageViews, 0);
    assert.deepEqual(
      Object.keys(points[7]).sort(),
      ["at", ...analyticsMetricKeys].sort(),
    );
    assert.ok(
      points.every((p) =>
        analyticsMetricKeys.every((k) => typeof p[k] === "number"),
      ),
    );
  }));

test("today stops at the current hour and previous day is cut at equivalent local time", async () =>
  scenario(async (now) => {
    const today = day(now, 0),
      yesterday = day(now, -1),
      start = Date.parse(at(today));
    const elapsed = now.getTime() - start;
    await event(new Date(start + elapsed / 2).toISOString());
    await event(new Date(now.getTime() + 30 * 60_000).toISOString());
    await event(new Date(start - 86_400_000 + elapsed / 2).toISOString());
    await event(
      new Date(
        start - 86_400_000 + elapsed + (86_400_000 - elapsed) / 2,
      ).toISOString(),
    );
    await actor(owner);
    const data = await overview(today, today);
    const hours = Math.floor(elapsed / 3_600_000) + 1;
    assert.equal(data.timeline!.points.length, hours);
    assert.equal(Date.parse(data.timeline!.through), now.getTime());
    assert.equal(data.totals.pageViews, 1);
    assert.equal(data.comparison!.available, true);
    assert.equal(data.comparison!.period.from, yesterday);
    assert.equal(data.comparison!.period.to, yesterday);
    assert.equal(data.comparison!.timeline!.points.length, hours);
    assert.equal(
      Date.parse(data.comparison!.timeline!.through),
      now.getTime() - 86_400_000,
    );
    assert.equal(data.comparison!.totals!.pageViews, 1);
    assert.ok(
      data.timeline!.points.every((p) => Date.parse(p.at) <= now.getTime()),
    );
  }));

test("a seven-day report including today compares seven days at the same elapsed local time", async () =>
  scenario(async (now) => {
    const today = day(now, 0),
      startToday = Date.parse(at(today)),
      elapsed = now.getTime() - startToday;
    const previousLastDay = startToday - 7 * 86_400_000;
    await event(at(day(now, -6), 0, 1));
    await event(new Date(startToday + elapsed / 2).toISOString());
    await event(at(day(now, -13), 0, 1));
    await event(new Date(previousLastDay + elapsed / 2).toISOString());
    await event(
      new Date(
        previousLastDay + elapsed + (86_400_000 - elapsed) / 2,
      ).toISOString(),
    );
    await actor(owner);
    const data = await overview(day(now, -6), today);
    assert.equal(data.timeline!.granularity, "day");
    assert.equal(data.timeline!.points.length, 7);
    assert.equal(data.totals.pageViews, 2);
    assert.equal(Date.parse(data.timeline!.through), now.getTime());
    const previous = data.comparison!;
    assert.equal(previous.available, true);
    assert.equal(previous.period.from, day(now, -13));
    assert.equal(previous.period.to, day(now, -7));
    assert.equal(previous.timeline!.points.length, 7);
    assert.equal(previous.totals!.pageViews, 2);
    assert.equal(
      Date.parse(previous.timeline!.through),
      now.getTime() - 7 * 86_400_000,
    );
    assert.equal(Date.parse(data.timeline!.points.at(-1)!.at), startToday);
    assert.equal(
      Date.parse(previous.timeline!.points.at(-1)!.at),
      previousLastDay,
    );
    assert.ok(
      data.timeline!.points.every(
        (point) => Date.parse(point.at) <= now.getTime(),
      ),
    );
  }));

test("an exact current hour includes as-of events and payments in the current and comparison bucket", async () =>
  scenario(async (now) => {
    // A test-only copy freezes now() at an hour boundary; production SQL has no
    // clock override or test parameter. All aggregation/security logic is intact.
    const frozen = new Date(Math.floor(now.getTime() / 3_600_000) * 3_600_000);
    const sql = await readFile(migration, "utf8");
    const definition = sql.slice(
      sql.indexOf("create or replace function public.analytics_overview("),
      sql.indexOf("\nrevoke all on function public.analytics_overview"),
    );
    await db.exec(
      definition
        .replace(
          "public.analytics_overview(",
          "public.analytics_overview_frozen(",
        )
        .replaceAll("now()", `'${frozen.toISOString()}'::timestamptz`),
    );
    const prior = new Date(frozen.getTime() - 86_400_000);
    const today = day(frozen, 0),
      currentStart = Date.parse(at(today));
    await event(frozen.toISOString());
    if (frozen.getTime() > currentStart)
      await event(new Date(frozen.getTime() - 1).toISOString());
    await event(new Date(frozen.getTime() + 1).toISOString());
    await event(prior.toISOString());
    await event(new Date(prior.getTime() + 1).toISOString());
    await order(frozen.toISOString(), {
      state: "paid",
      payments: [frozen.toISOString()],
    });
    await order(new Date(frozen.getTime() + 1).toISOString());
    await actor(owner);
    const data = (
      await db.query<{ value: AnalyticsOverview }>(
        "select public.analytics_overview_frozen($1::date,$1::date) as value",
        [today],
      )
    ).rows[0].value;
    const last = data.timeline!.points.at(-1)!;
    assert.equal(Date.parse(last.at), frozen.getTime());
    assert.equal(last.pageViews, 1);
    assert.equal(last.registeredOrders, 1);
    assert.equal(last.paidOrders, 1);
    assert.equal(last.paidRevenueCents, 17490);
    assert.equal(
      data.totals.pageViews,
      frozen.getTime() > currentStart ? 2 : 1,
    );
    assert.equal(data.totals.registeredOrders, 1);
    assert.equal(data.totals.paidOrders, 1);
    assert.equal(
      data.timeline!.points.reduce((sum, point) => sum + point.pageViews, 0),
      data.totals.pageViews,
    );
    assert.equal(
      data.timeline!.points.reduce((sum, point) => sum + point.paidOrders, 0),
      data.totals.paidOrders,
    );
    assert.equal(
      Date.parse(data.comparison!.timeline!.points.at(-1)!.at),
      prior.getTime(),
    );
    assert.equal(data.comparison!.totals!.pageViews, 1);
  }));

test("daily unique totals are distinct for the whole period, not summed from buckets", async () =>
  scenario(async (now) => {
    const first = day(now, -2),
      second = day(now, -1),
      session = randomUUID(),
      visitor = randomUUID();
    await event(at(first, 23, 59), "page_view", { session, visitor });
    await event(at(second, 0, 1), "page_view", { session, visitor });
    await event(at(first, 23, 59), "begin_checkout", { session, visitor });
    await event(at(second, 0, 1), "begin_checkout", { session, visitor });
    await actor(owner);
    const data = await overview(first, second);
    assert.equal(data.timeline!.granularity, "day");
    assert.equal(data.timeline!.points.length, 2);
    assert.equal(data.totals.visitors, 1);
    assert.equal(data.totals.sessions, 1);
    assert.equal(data.totals.checkoutStarts, 1);
    assert.equal(
      data.timeline!.points.reduce((sum, p) => sum + p.visitors, 0),
      2,
    );
    assert.equal(
      data.timeline!.points.reduce((sum, p) => sum + p.sessions, 0),
      2,
    );
    assert.equal(
      data.timeline!.points.reduce((sum, p) => sum + p.checkoutStarts, 0),
      2,
    );
    assert.equal(data.totals.pageViews, 2);
  }));

test("hourly uniques also keep distinct period totals when one session crosses the hour", async () =>
  scenario(async (now) => {
    const date = day(now, -1),
      session = randomUUID(),
      visitor = randomUUID();
    await event(at(date, 11, 59), "page_view", { session, visitor });
    await event(at(date, 12, 1), "page_view", { session, visitor });
    await event(at(date, 11, 59), "begin_checkout", { session, visitor });
    await event(at(date, 12, 1), "begin_checkout", { session, visitor });
    await actor(owner);
    const data = await overview(date, date);
    assert.equal(data.totals.visitors, 1);
    assert.equal(data.totals.sessions, 1);
    assert.equal(data.totals.checkoutStarts, 1);
    assert.equal(data.timeline!.points[11].sessions, 1);
    assert.equal(data.timeline!.points[12].sessions, 1);
    assert.equal(data.timeline!.points[11].checkoutStarts, 1);
    assert.equal(data.timeline!.points[12].checkoutStarts, 1);
  }));

test("all event metrics are aggregated and WhatsApp or pending orders never become payments", async () =>
  scenario(async (now) => {
    const date = day(now, -1),
      t = at(date, 11);
    const ids = await event(t, "product_click", {
      product: "boca",
      section: "hero",
    });
    await event(t, "product_click", ids);
    await event(t, "add_to_cart", ids);
    await event(t, "whatsapp_click", ids);
    await event(t, "whatsapp_click", ids);
    await event(t, "begin_checkout", ids);
    await event(t, "begin_checkout", ids);
    await order(t);
    await actor(owner);
    const data = await overview(date, date);
    assert.equal(data.totals.productClicks, 2);
    assert.equal(data.totals.addToCart, 1);
    assert.equal(data.totals.checkoutStarts, 1);
    assert.equal(data.totals.whatsappClicks, 2);
    assert.equal(data.totals.registeredOrders, 1);
    assert.equal(data.totals.paidOrders, 0);
    assert.equal(data.totals.paidRevenueCents, 0);
    assert.equal(data.timeline!.points[11].whatsappClicks, 2);
  }));

test("payment timeline deduplicates matching events into the first hour and respects paid state", async () =>
  scenario(async (now) => {
    const date = day(now, -1);
    await order(at(date, 1), {
      state: "paid",
      payments: [at(date, 8), at(date, 9)],
    });
    await order(at(date, 2), { state: "pending", payments: [at(date, 8)] });
    await order(at(date, 3), {
      state: "refund_pending",
      payments: [at(date, 8)],
    });
    await actor(owner);
    const data = await overview(date, date);
    assert.equal(data.totals.registeredOrders, 3);
    assert.equal(data.totals.paidOrders, 1);
    assert.equal(data.totals.paidRevenueCents, 17490);
    assert.equal(data.timeline!.points[8].paidOrders, 1);
    assert.equal(data.timeline!.points[8].paidRevenueCents, 17490);
    assert.equal(data.timeline!.points[9].paidOrders, 0);
    assert.equal(
      data.timeline!.points.reduce((n, p) => n + p.paidOrders, 0),
      1,
    );
  }));

test("test and live data remain separate for events, orders, paid totals and comparisons", async () =>
  scenario(async (now) => {
    const date = day(now, -1),
      prior = day(now, -2);
    await event(at(date, 10));
    await event(at(date, 10), "page_view", { mode: false });
    await event(at(prior, 10), "page_view", { mode: false });
    await order(at(date, 5), { state: "paid", payments: [at(date, 10)] });
    await order(at(date, 5), {
      mode: false,
      state: "paid",
      total: 22490,
      payments: [at(date, 10)],
    });
    await actor(owner);
    const testing = await overview(date, date);
    assert.equal(testing.totals.pageViews, 1);
    assert.equal(testing.totals.paidRevenueCents, 17490);
    assert.equal(testing.comparison!.totals!.pageViews, 0);
    await db.exec(
      "reset role;update public.store_settings set test_mode=false where id;",
    );
    await actor(owner);
    const live = await overview(date, date);
    assert.equal(live.totals.pageViews, 1);
    assert.equal(live.totals.paidRevenueCents, 22490);
    assert.equal(live.comparison!.totals!.pageViews, 1);
  }));

test("comparison outside retained telemetry is explicitly unavailable, not zero-filled", async () =>
  scenario(async (now) => {
    await actor(owner);
    const data = await overview(day(now, -60), day(now, -1));
    assert.equal(data.timeline!.points.length, 60);
    assert.equal(data.comparison!.available, false);
    assert.equal(data.comparison!.reason, "outside_retention");
    assert.equal(data.comparison!.totals, null);
    assert.equal(data.comparison!.timeline, null);
    assert.equal(data.comparison!.period.from, day(now, -120));
    assert.equal(data.comparison!.period.to, day(now, -61));
  }));

test("owner and MFA checks plus explicit RPC grants are preserved", async () =>
  scenario(async () => {
    await db.exec("set role anon");
    await expectError(() => overview(), /permission denied/);
    await actor(customer);
    await expectError(() => overview(), /forbidden/);
    await actor(staff);
    await expectError(() => overview(), /forbidden/);
    await actor(owner, "aal1");
    await expectError(() => overview(), /mfa_required/);
    await db.exec(
      "reset role;update public.staff_access set active=false where user_id='10000000-0000-4000-8000-000000000011'",
    );
    await actor(owner);
    await expectError(() => overview(), /forbidden/);
    await db.exec("reset role");
    const access = (
      await db.query<{
        anon: boolean;
        authenticated: boolean;
        definer: boolean;
        config: string[];
      }>(
        "select has_function_privilege('anon','public.analytics_overview(date,date)','EXECUTE') as anon,has_function_privilege('authenticated','public.analytics_overview(date,date)','EXECUTE') as authenticated,p.prosecdef as definer,p.proconfig as config from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='analytics_overview'",
      )
    ).rows[0];
    assert.equal(access.anon, false);
    assert.equal(access.authenticated, true);
    assert.equal(access.definer, true);
    assert.ok(access.config.includes('search_path=""'));
  }));

test("invalid ranges and future dates are rejected while 90 inclusive days stay valid", async () =>
  scenario(async (now) => {
    await actor(owner);
    await expectError(
      () => overview(day(now, -1), day(now, -2)),
      /invalid_data/,
    );
    await expectError(
      () => overview(day(now, -90), day(now, 0)),
      /invalid_data/,
    );
    await expectError(() => overview(day(now, 0), day(now, 1)), /invalid_data/);
    const data = await overview(day(now, -89), day(now, 0));
    assert.equal(data.timeline!.points.length, 90);
  }));

test("existing explicit consent and ingestion idempotency still bound the data being graphed", async () =>
  scenario(async (now) => {
    const batch = {
      consent: { analytics: false, version: "2026-10-29-v1" },
      sessionId: randomUUID(),
      visitorId: randomUUID(),
      events: [
        { id: randomUUID(), type: "page_view", page: "/", device: "mobile" },
      ],
    };
    await db.exec("set role service_role");
    const ingest = async (value: unknown) =>
      (
        await db.query<{ value: { accepted: number } }>(
          "select public.analytics_ingest($1::jsonb,true) as value",
          [JSON.stringify(value)],
        )
      ).rows[0].value;
    await expectError(() => ingest(batch), /invalid_data/);
    batch.consent.analytics = true;
    assert.equal((await ingest(batch)).accepted, 1);
    assert.equal((await ingest(batch)).accepted, 0);
    await actor(owner);
    const data = await overview(day(now, 0), day(now, 0));
    assert.equal(data.totals.pageViews, 1);
    assert.equal(data.totals.visitors, 1);
  }));

test("retention cleanup stays limited to optional telemetry and preserves historical orders", async () =>
  scenario(async (now) => {
    const old = day(now, -91);
    await event(at(old, 10));
    await order(at(old, 1), { state: "paid", payments: [at(old, 10)] });
    await db.exec(
      "update public.analytics_events set received_at=occurred_at;update public.analytics_sessions set last_seen=now()-interval '91 days';update private.analytics_maintenance set last_run=null where id;",
    );
    await actor(owner);
    await overview(day(now, 0), day(now, 0));
    await db.exec("reset role");
    const counts = (
      await db.query<{
        events: number;
        sessions: number;
        orders: number;
        payments: number;
      }>(
        "select (select count(*)::integer from public.analytics_events) as events,(select count(*)::integer from public.analytics_sessions) as sessions,(select count(*)::integer from public.orders) as orders,(select count(*)::integer from public.order_events) as payments",
      )
    ).rows[0];
    assert.deepEqual(counts, {
      events: 0,
      sessions: 0,
      orders: 1,
      payments: 1,
    });
  }));

test("legacy report fields remain compatible and operational records are unchanged", async () =>
  scenario(async (now) => {
    const date = day(now, -1);
    await event(at(date, 10), "page_view", {
      product: "boca",
      section: "products",
    });
    await event(at(date, 10), "whatsapp_click");
    await order(at(date, 1), {
      state: "paid",
      payments: [at(date, 8), at(date, 9)],
    });
    const snapshot = async () =>
      (
        await db.query<{ value: unknown }>(
          "select jsonb_build_object('orders',(select jsonb_agg(to_jsonb(o) order by id) from public.orders o),'payments',(select jsonb_agg(to_jsonb(p) order by id) from public.order_events p),'variants',(select jsonb_agg(to_jsonb(v) order by product_id,size) from public.store_variants v),'settings',(select jsonb_agg(to_jsonb(s)) from public.store_settings s)) as value",
        )
      ).rows[0].value;
    const before = await snapshot();
    await actor(owner);
    const legacy = await overview(date, date, true),
      data = await overview(date, date);
    const {
      timeline: _timeline,
      comparison: _comparison,
      ...withoutSeries
    } = data;
    const { whatsappClicks: _whatsapp, ...withoutNewTotal } =
      withoutSeries.totals;
    assert.deepEqual({ ...withoutSeries, totals: withoutNewTotal }, legacy);
    assert.deepEqual(
      data.comparison!.totals && Object.keys(data.comparison!.totals).sort(),
      [...analyticsMetricKeys].sort(),
    );
    await db.exec("reset role");
    assert.deepEqual(await snapshot(), before);
  }));
