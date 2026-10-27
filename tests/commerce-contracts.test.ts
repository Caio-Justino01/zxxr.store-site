import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addressSchema,
  csvCell,
  orderMessage,
  phoneSchema,
  safeReturnTo,
} from "../src/commerce/contracts.ts";
import { handleApi } from "../server/api.ts";
test("safe login return URL never leaves the application", () => {
  for (const path of [
    "https://evil.test",
    "//evil.test",
    "/\\evil",
    "/painel\n",
    "/conta/../api/auth/google",
  ])
    assert.equal(safeReturnTo(path), "/conta/pedidos");
  assert.equal(safeReturnTo("/encomenda"), "/encomenda");
});
test("WhatsApp input and spreadsheet exports reject ambiguous data", () => {
  assert.equal(phoneSchema.parse("(31) 99999-9999"), "5531999999999");
  assert.equal(phoneSchema.safeParse("123").success, false);
  assert.equal(csvCell("=IMPORTXML(1)"), '"\'=IMPORTXML(1)"');
  assert.equal(addressSchema.safeParse({}).success, false);
});
test("API fails closed without secrets and never returns HTML", async () => {
  const session = await handleApi(
    new Request("https://store.test/api/auth/session"),
    {},
  );
  assert.equal(session.status, 200);
  assert.equal((await session.json()).configured, false);
  const order = await handleApi(
    new Request("https://store.test/api/orders", {
      method: "POST",
      headers: {
        Origin: "https://store.test",
        "Content-Type": "application/json",
      },
      body: "{}",
    }),
    {},
  );
  assert.equal(order.status, 503);
  assert.match(order.headers.get("Content-Type")!, /application\/json/);
  assert.match(order.headers.get("Cache-Control")!, /no-store/);
});
test("API rejects cross-origin and missing-origin mutations", async () => {
  for (const origin of ["https://evil.test", null]) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (origin) headers.Origin = origin;
    const response = await handleApi(
      new Request("https://store.test/api/admin/settings", {
        method: "PUT",
        headers,
        body: '{"open":true}',
      }),
      {},
    );
    assert.equal(response.status, 403);
  }
});
test("anonymous users cannot use order or staff endpoints", async () => {
  for (const path of ["orders", "admin/orders", "admin/team"]) {
    const response = await handleApi(
      new Request(`https://store.test/api/${path}`),
      {
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_PUBLISHABLE_KEY: "test",
      },
    );
    assert.equal(response.status, 401);
  }
});
test("messages use only public order fields and never claim payment", () => {
  const order: any = {
    test_mode: true,
    reference: "ZXXR-TEST",
    stage: "received",
    customer: { name: "Teste" },
    items: [{ name: "Boca", size: "M", quantity: 1 }],
    subtotal_cents: 10000,
    quote_released: false,
    shipping_cents: 3000,
    total_cents: 13000,
    production_deadline: "RASCUNHO DE PRAZO",
    payment_state: "pending",
    notes: [{ body: "NOTA INTERNA" }],
    id: "test",
  };
  const message = orderMessage(order, "https://store.test");
  assert.match(message, /não cobrar nem produzir/);
  assert.match(message, /Frete e total: a confirmar/);
  assert.ok(!message.includes("NOTA INTERNA"));
  assert.ok(!message.includes("130,00"));
  assert.ok(!message.includes("RASCUNHO DE PRAZO"));
});
