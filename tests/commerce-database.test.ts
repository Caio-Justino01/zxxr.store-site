import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const db = new PGlite();
const customer = "10000000-0000-4000-8000-000000000001",
  other = "10000000-0000-4000-8000-000000000002",
  staff = "10000000-0000-4000-8000-000000000003",
  owner = "10000000-0000-4000-8000-000000000004";
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
  note: "",
  saveAddress: false,
  items: [
    { productId: "boca", size: "M", quantity: 2, expectedUnitCents: 10000 },
  ],
};
async function actor(id: string, aal = "aal1") {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claims',$1,false)", [
    JSON.stringify({ sub: id, aal }),
  ]);
  await db.exec("set role authenticated");
}
async function rpc<T = any>(name: string, args: unknown[] = []): Promise<T> {
  const result = await db.query<{ value: T }>(
    `select public.${name}(${args.map((_, i) => `$${i + 1}`).join(",")}) as value`,
    args,
  );
  return result.rows[0].value;
}
let order: any;
before(async () => {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;
  `);
});
after(async () => {
  await db.close();
});

test("PostgreSQL migration, private catalog and customer registration", async () => {
  // Replace the UUID helper with the same signature used by Supabase.
  await db.exec(
    "drop function auth.uid(); create function auth.uid() returns uuid language sql stable as $$select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$; create function auth.jwt() returns jsonb language sql stable as $$select nullif(current_setting('request.jwt.claims',true),'')::jsonb$$; grant usage on schema auth to authenticated,anon; grant execute on all functions in schema auth to authenticated,anon;",
  );
  await db.exec(
    await readFile(
      new URL("../supabase/migrations/202610260001_store.sql", import.meta.url),
      "utf8",
    ),
  );
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/202610260002_order_hardening.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  for (const [id, email] of [
    [customer, "customer@example.test"],
    [other, "other@example.test"],
    [staff, "staff@example.test"],
    [owner, "owner@example.test"],
  ])
    await db.query("insert into auth.users values($1,$2,now())", [id, email]);
  await db.query(
    "insert into public.staff_access(user_id,role) values($1,'owner'),($2,'staff')",
    [owner, staff],
  );
  await db.exec("update public.store_settings set open=true");
  await actor(customer);
  const catalog = await rpc("store_catalog");
  assert.equal(catalog.variants.length, 20);
  order = await rpc("create_order", [
    request,
    "20000000-0000-4000-8000-000000000001",
  ]);
  assert.equal(order.subtotal_cents, 20000);
  assert.equal(order.total_cents, null);
  assert.equal(order.request_key, undefined);
});
test("creation retries are idempotent and changed payload is rejected", async () => {
  await actor(customer);
  const retry = await rpc("create_order", [
    request,
    "20000000-0000-4000-8000-000000000001",
  ]);
  assert.equal(retry.id, order.id);
  await assert.rejects(
    rpc("create_order", [
      { ...request, note: "Alterado" },
      "20000000-0000-4000-8000-000000000001",
    ]),
    /idempotency_conflict/,
  );
});
test("server prices, unavailable variants and duplicate lines are enforced", async () => {
  await actor(customer);
  await assert.rejects(
    rpc("create_order", [
      { ...request, items: [{ ...request.items[0], expectedUnitCents: 1 }] },
      "20000000-0000-4000-8000-000000000002",
    ]),
    /price_changed/,
  );
  await assert.rejects(
    rpc("create_order", [
      { ...request, items: [{ ...request.items[0], size: "XXL" }] },
      "20000000-0000-4000-8000-000000000003",
    ]),
    /unavailable/,
  );
  await assert.rejects(
    rpc("create_order", [
      { ...request, items: [request.items[0], request.items[0]] },
      "20000000-0000-4000-8000-000000000004",
    ]),
    /invalid_data/,
  );
});
test("customer isolation, no direct writes and no role escalation", async () => {
  await actor(other);
  assert.deepEqual(await rpc("list_orders"), []);
  await assert.rejects(rpc("order_detail", [order.id, false]), /not_found/);
  await assert.rejects(rpc("list_orders", [{ admin: true }]), /forbidden/);
  await assert.rejects(
    db.query("update public.orders set payment_state='paid' where id=$1", [
      order.id,
    ]),
    /permission denied/,
  );
  await assert.rejects(
    rpc("team_access", ["other@example.test", true]),
    /forbidden/,
  );
});
test("staff require MFA and cannot confirm money or release checkout", async () => {
  await actor(staff);
  await assert.rejects(rpc("order_detail", [order.id, true]), /mfa_required/);
  await actor(staff, "aal2");
  const detail = await rpc("order_detail", [order.id, true]);
  assert.equal(detail.id, order.id);
  await assert.rejects(
    rpc("order_action", [
      order.id,
      order.version,
      "pay",
      { reason: "Conta conferida" },
    ]),
    /forbidden/,
  );
  await assert.rejects(
    rpc("order_action", [order.id, order.version, "release_quote", {}]),
    /forbidden/,
  );
});
test("operational transitions, version conflicts and private notes", async () => {
  await actor(staff, "aal2");
  order = await rpc("order_action", [order.id, order.version, "start", {}]);
  await assert.rejects(
    rpc("order_action", [order.id, 1, "start", {}]),
    /version_conflict/,
  );
  await assert.rejects(
    rpc("order_action", [order.id, order.version, "production", {}]),
    /invalid_transition/,
  );
  order = await rpc("order_action", [
    order.id,
    order.version,
    "note",
    { body: "Nota privada não pode vazar" },
  ]);
  await actor(customer);
  const detail = await rpc("order_detail", [order.id, false]);
  assert.equal(detail.notes, undefined);
  assert.ok(!JSON.stringify(detail).includes("Nota privada"));
});
test("owner verifies total and payment, staff completes fulfilment", async () => {
  await actor(staff, "aal2");
  order = await rpc("order_action", [
    order.id,
    order.version,
    "quote",
    { shippingCents: 2500, deadline: "Produção em 20 dias após confirmação" },
  ]);
  await actor(customer);
  const draft = await rpc("order_detail", [order.id, false]);
  assert.equal(draft.shipping_cents, null);
  assert.equal(draft.total_cents, null);
  await actor(staff, "aal2");
  order = await rpc("order_action", [
    order.id,
    order.version,
    "checklist",
    { key: "address_confirmed", checked: true },
  ]);
  await actor(owner, "aal2");
  order = await rpc("order_action", [
    order.id,
    order.version,
    "release_quote",
    { paymentUrl: "https://example.test/pagar" },
  ]);
  assert.equal(order.total_cents, 22500);
  order = await rpc("order_action", [
    order.id,
    order.version,
    "pay",
    { reason: "Recebimento conferido no provedor" },
  ]);
  assert.equal(order.payment_state, "paid");
  await assert.rejects(
    rpc("order_action", [
      order.id,
      order.version,
      "items",
      {
        items: [{ productId: "boca", size: "G", quantity: 3 }],
        reason: "Solicitação do cliente",
      },
    ]),
    /invalid_transition/,
  );
  order = await rpc("order_action", [
    order.id,
    order.version,
    "items",
    {
      items: [{ productId: "boca", size: "G", quantity: 2 }],
      reason: "Solicitação do cliente",
    },
  ]);
  assert.equal(order.items[0].size, "G");
  await actor(staff, "aal2");
  await assert.rejects(
    rpc("order_action", [
      order.id,
      order.version,
      "items",
      {
        items: [{ productId: "boca", size: "P", quantity: 2 }],
        reason: "Solicitação do cliente",
      },
    ]),
    /forbidden/,
  );
  order = await rpc("order_action", [
    order.id,
    order.version,
    "checklist",
    { key: "production_reviewed", checked: true },
  ]);
  for (const action of ["production", "packing"])
    order = await rpc("order_action", [order.id, order.version, action, {}]);
  order = await rpc("order_action", [
    order.id,
    order.version,
    "checklist",
    { key: "package_checked", checked: true },
  ]);
  await assert.rejects(
    rpc("order_action", [order.id, order.version, "ship", {}]),
    /invalid_data/,
  );
  order = await rpc("order_action", [
    order.id,
    order.version,
    "ship",
    { trackingCode: "TESTE123BR", reason: "Postagem conferida" },
  ]);
  order = await rpc("order_action", [order.id, order.version, "deliver", {}]);
  assert.equal(order.stage, "delivered");
});
test("disabled employees immediately lose access and store closes safely", async () => {
  await actor(customer);
  let cancellation = await rpc("create_order", [
    request,
    "20000000-0000-4000-8000-000000000010",
  ]);
  await actor(owner, "aal2");
  cancellation = await rpc("order_action", [
    cancellation.id,
    cancellation.version,
    "cancel",
    { reason: "Cancelado a pedido do cliente" },
  ]);
  assert.equal(cancellation.payment_state, "pending");
  await actor(owner, "aal2");
  await rpc("team_access", ["staff@example.test", false]);
  await rpc("settings_update", [false, false]);
  await actor(staff, "aal2");
  await assert.rejects(rpc("order_detail", [order.id, true]), /forbidden/);
  await actor(customer);
  await assert.rejects(
    rpc("create_order", [request, "20000000-0000-4000-8000-000000000009"]),
    /closed/,
  );
  assert.equal(
    (await rpc("order_detail", [order.id, false])).stage,
    "delivered",
  );
});
test("a private database snapshot restores orders, identities and access in an isolated database", async () => {
  await db.exec("reset role");
  const tables = [
    "store_settings",
    "store_variants",
    "profiles",
    "staff_access",
    "addresses",
    "orders",
    "order_events",
    "order_notes",
    "order_contacts",
    "store_audit",
  ];
  const snapshot: Record<string, unknown[]> = {};
  for (const table of tables)
    snapshot[table] = (await db.query(`select * from public.${table}`)).rows;
  const identities = (await db.query("select * from auth.users")).rows;
  const restored = new PGlite();
  try {
    await restored.exec(
      "create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz); create function auth.uid() returns uuid language sql stable as $$select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$; create function auth.jwt() returns jsonb language sql stable as $$select nullif(current_setting('request.jwt.claims',true),'')::jsonb$$; grant usage on schema auth to authenticated,anon; grant execute on all functions in schema auth to authenticated,anon;",
    );
    for (const name of [
      "202610260001_store.sql",
      "202610260002_order_hardening.sql",
    ])
      await restored.exec(
        await readFile(
          new URL(`../supabase/migrations/${name}`, import.meta.url),
          "utf8",
        ),
      );
    await restored.query(
      "insert into auth.users select * from jsonb_populate_recordset(null::auth.users,$1::jsonb)",
      [JSON.stringify(identities)],
    );
    await restored.exec(
      "begin; delete from public.store_settings; delete from public.store_variants;",
    );
    for (const table of tables) {
      const columns = (
        await restored.query<{ column_name: string }>(
          "select column_name from information_schema.columns where table_schema='public' and table_name=$1 and is_generated='NEVER' order by ordinal_position",
          [table],
        )
      ).rows
        .map((r) => r.column_name)
        .join(",");
      await restored.query(
        `insert into public.${table}(${columns}) overriding system value select ${columns} from jsonb_populate_recordset(null::public.${table},$1::jsonb)`,
        [JSON.stringify(snapshot[table])],
      );
    }
    await restored.exec(
      "select setval(pg_get_serial_sequence('public.orders','order_no'),(select max(order_no) from public.orders)); commit;",
    );
    const counts = await restored.query<{ count: number }>(
      "select count(*)::int as count from public.orders",
    );
    assert.equal(counts.rows[0].count, snapshot.orders.length);
    await restored.query("select set_config('request.jwt.claims',$1,false)", [
      JSON.stringify({ sub: customer, aal: "aal1" }),
    ]);
    await restored.exec("set role authenticated");
    const result = await restored.query<{ value: any }>(
      "select public.order_detail($1,false) as value",
      [order.id],
    );
    assert.equal(result.rows[0].value.stage, "delivered");
    assert.equal(result.rows[0].value.total_cents, 22500);
    assert.equal(result.rows[0].value.notes, undefined);
  } finally {
    await restored.close();
  }
});
