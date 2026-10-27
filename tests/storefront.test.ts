import test from "node:test";
import assert from "node:assert/strict";
import {
  accountDestination,
  offeredPayments,
  storeContactLink,
  storeNavigationGroups,
} from "../src/config/storefront.ts";
import { safeReturnTo } from "../src/commerce/contracts.ts";

test("shopping account shortcuts preserve an allowed destination through login", () => {
  for (const destination of ["/conta/pedidos", "/conta/dados"]) {
    const login = new URL(
      accountDestination(false, destination),
      "https://www.zxxr.store",
    );
    assert.equal(login.pathname, "/entrar");
    assert.equal(safeReturnTo(login.searchParams.get("returnTo")), destination);
    assert.equal(accountDestination(true, destination), destination);
  }
});

test("complete navigation protects account destinations and omits unavailable contact", () => {
  const groups = storeNavigationGroups(false, null);
  assert.deepEqual(
    groups.map((group) => group.label),
    ["Comprar", "Minha conta", "Ajuda", "Sobre"],
  );
  const entries = groups.flatMap((group) => group.items);
  assert.equal(
    entries.some((item) => item.label === "Falar no WhatsApp"),
    false,
  );
  assert.equal(
    entries.find((item) => item.label === "Abrir suporte")?.kind,
    "support",
  );
  const orders = entries.find((item) => item.label === "Meus pedidos");
  assert.ok(orders && orders.kind === "route");
  assert.equal(orders.href, "/entrar?returnTo=%2Fconta%2Fpedidos");
  const signedIn = storeNavigationGroups(true, "5531985579685").flatMap(
    (group) => group.items,
  );
  const ownOrders = signedIn.find((item) => item.label === "Meus pedidos");
  assert.ok(ownOrders && ownOrders.kind === "route");
  assert.equal(ownOrders.href, "/conta/pedidos");
  assert.equal(
    signedIn.find((item) => item.label === "Falar no WhatsApp")?.kind,
    "external",
  );
});

test("payment presentation never advertises methods absent from the verified catalog", () => {
  assert.deepEqual(offeredPayments(undefined), []);
  assert.deepEqual(offeredPayments([]), []);
  assert.deepEqual(
    offeredPayments(["debit", "credit", "pix", "pix"]).map((m) => m.id),
    ["pix", "credit"],
  );
  assert.deepEqual(
    offeredPayments(["boleto"]).map((m) => m.label),
    ["Boleto"],
  );
});

test("store contact is unavailable without a valid configured number and encodes the draft", () => {
  for (const contact of [
    null,
    undefined,
    "",
    "31985579685",
    "javascript:alert(1)",
    "55x1234567890",
  ])
    assert.equal(storeContactLink(contact, "Olá"), null);
  const message = "Olá! Pedido #12 & tamanho GG?";
  const link = new URL(storeContactLink("5531985579685", message)!);
  assert.equal(link.origin, "https://wa.me");
  assert.equal(link.pathname, "/5531985579685");
  assert.equal(link.searchParams.get("text"), message);
});
