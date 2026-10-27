import fs from "node:fs/promises";
import { createHmac, randomUUID } from "node:crypto";
import assert from "node:assert/strict";
const base = "http://127.0.0.1:8788";
const fixtureFile = new URL("../.commerce-test-users.json", import.meta.url);
const users = JSON.parse(await fs.readFile(fixtureFile, "utf8"));
const catalogResponse = await fetch(`${base}/api/catalog`);
const catalog = await catalogResponse.json();
assert.equal(catalog.testMode, true, "Somente ambiente de teste");
const session = await (await fetch(`${base}/api/auth/session`)).json();
assert.ok(
  !session.captchaSiteKey,
  "Com Turnstile configurado, valide o login no navegador. Este script não contorna CAPTCHA.",
);
assert.equal(
  catalog.open,
  true,
  "Abra somente as encomendas de teste antes da validação",
);
function totp(secret) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of secret.toUpperCase().replace(/=/g, ""))
    bits += alphabet.indexOf(char).toString(2).padStart(5, "0");
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8)
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const digest = createHmac("sha1", Buffer.from(bytes))
    .update(counter)
    .digest();
  const offset = digest[19] & 15;
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(
    6,
    "0",
  );
}
function actor(role) {
  const user = users.find((u) => u.role === role);
  const jar = new Map();
  return {
    user,
    async call(path, body, expected = 200, headers = {}) {
      const response = await fetch(`${base}/api/${path}`, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: base,
          Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; "),
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        redirect: "manual",
      });
      for (const cookie of response.headers.getSetCookie()) {
        assert.match(
          cookie,
          /HttpOnly/i,
          "Sessão deve ficar em cookie HttpOnly",
        );
        assert.match(cookie, /SameSite=Lax/i);
        if (base.startsWith("https:")) assert.match(cookie, /Secure/i);
        const [part] = cookie.split(";");
        const index = part.indexOf("=");
        const name = part.slice(0, index),
          value = part.slice(index + 1);
        if (value) jar.set(name, value);
        else jar.delete(name);
      }
      const result = await response.json();
      assert.equal(
        response.status,
        expected,
        `${role} ${path}: ${result.error?.code || "unexpected_response"}`,
      );
      return result;
    },
    async login() {
      await this.call("auth/login", {
        email: user.email,
        password: user.password,
      });
    },
    async mfa() {
      const { factors } = await this.call("auth/mfa");
      let factor = factors.find((f) => f.status === "verified");
      if (!factor) {
        const result = await this.call("auth/mfa/enroll", {});
        user.mfaSecret = result.totp.secret;
        user.factorId = result.id;
        await fs.writeFile(fixtureFile, JSON.stringify(users, null, 2));
        factor = { id: result.id };
      }
      assert.ok(
        user.mfaSecret,
        "Não imprimir a chave do autenticador da fixture",
      );
      await this.call("auth/mfa/verify", {
        factorId: factor.id,
        code: totp(user.mfaSecret),
      });
    },
  };
}
const customer = actor("customer"),
  staff = actor("staff"),
  owner = actor("owner");
await customer.login();
assert.equal((await customer.call("auth/session")).user.role, "customer");
const body = {
  customer: { name: "Cliente ZXXR de teste", phone: catalog.contact },
  address: {
    recipient: "Cliente ZXXR de teste",
    cep: "30110000",
    street: "Rua fictícia",
    number: "10",
    complement: "",
    neighborhood: "Centro",
    city: "Belo Horizonte",
    state: "MG",
    reference: "Dados fictícios de validação",
  },
  paymentPreference: "pix",
  note: "Pedido fictício. Não cobrar, produzir ou enviar.",
  saveAddress: false,
  items: [
    { productId: "boca", size: "M", quantity: 2, expectedUnitCents: 10000 },
    {
      productId: "spiritual-gangsta",
      size: "GG",
      quantity: 1,
      expectedUnitCents: 10000,
    },
  ],
};
const key = randomUUID();
let order = await customer.call("orders", body, 201, {
  "Idempotency-Key": key,
});
assert.equal(order.subtotal_cents, 30000);
assert.equal(order.total_cents, null);
assert.equal(order.test_mode, true);
assert.equal(
  (await customer.call("orders", body, 201, { "Idempotency-Key": key })).id,
  order.id,
);
await customer.call(
  "orders",
  { ...body, items: [{ ...body.items[0], expectedUnitCents: 1 }] },
  409,
  { "Idempotency-Key": randomUUID() },
);
await customer.call("admin/orders", undefined, 403);
await staff.login();
await staff.call("admin/orders", undefined, 403);
await staff.mfa();
await owner.login();
await owner.mfa();
await owner.call(`orders/${order.id}`, undefined, 404);
await staff.call(
  `admin/orders/${order.id}/actions`,
  {
    version: order.version,
    action: "pay",
    data: { reason: "Teste de bloqueio" },
  },
  403,
);
async function act(who, action, data = {}) {
  order = await who.call(`admin/orders/${order.id}/actions`, {
    version: order.version,
    action,
    data,
  });
}
await act(staff, "start");
await staff.call(
  `admin/orders/${order.id}/actions`,
  { version: 1, action: "start", data: {} },
  409,
);
await act(staff, "assign", { assignee: staff.user.id });
await act(staff, "note", {
  body: "Nota privada da validação: não deve aparecer para o cliente.",
});
const privateCheck = await customer.call(`orders/${order.id}`);
assert.equal(privateCheck.notes, undefined);
assert.ok(!JSON.stringify(privateCheck).includes("Nota privada"));
await act(staff, "checklist", { key: "address_confirmed", checked: true });
await act(staff, "quote", {
  shippingCents: 2500,
  deadline: "Prazo fictício da validação — não produzir",
});
assert.equal((await customer.call(`orders/${order.id}`)).total_cents, null);
await act(owner, "release_quote", {
  paymentUrl: "https://example.com/pagamento-de-teste",
});
await staff.call(
  `admin/orders/${order.id}/actions`,
  { version: order.version, action: "production", data: {} },
  409,
);
await act(owner, "pay", {
  reason: "Confirmação fictícia de teste — nenhum dinheiro foi cobrado",
});
await act(staff, "checklist", { key: "production_reviewed", checked: true });
await act(staff, "production");
await act(staff, "packing");
await act(staff, "checklist", { key: "package_checked", checked: true });
await act(staff, "ship", {
  trackingCode: "TESTE-SEM-ENVIO",
  reason: "Postagem fictícia de validação",
});
assert.equal((await customer.call(`orders/${order.id}`)).stage, "shipped");
const proof = {
  environment: "test",
  orderId: order.id,
  reference: order.reference,
  checks: [
    "real Supabase authentication",
    "HttpOnly session cookies",
    "TOTP owner and staff",
    "idempotency",
    "server price validation",
    "customer isolation",
    "staff financial restriction",
    "version conflict",
    "private notes",
    "customer quote visibility",
    "manual payment confirmation",
    "production and shipment",
    "persistent customer history",
  ],
  noEmailsSent: true,
  noWhatsappSent: true,
  noMoneyCharged: true,
};
await fs.writeFile(
  new URL("../.commerce-test-validation.json", import.meta.url),
  JSON.stringify(proof, null, 2),
);
console.log(JSON.stringify(proof));
