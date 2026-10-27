import test from "node:test";
import assert from "node:assert/strict";
import {
  accountDestination,
  offeredPayments,
  storeContactLink,
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
