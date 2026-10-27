import test from "node:test";
import assert from "node:assert/strict";
import {
  findSupportTopics,
  normalizeQuestion,
  supportProductState,
  supportRoute,
} from "../src/support/guide.ts";
import type { Catalog } from "../src/commerce/contracts.ts";

test("guide search understands accents, email spelling and reviewed common topics", () => {
  assert.equal(normalizeQuestion("  CARTÃO / E-mail  "), "cartao email");
  for (const [question, expected] of [
    ["Quanto é o frete?", "delivery"],
    ["Não recebi o e-mail", "access"],
    ["Quais camisetas tem?", "choose"],
    ["Qual a composição do tecido?", "fabric"],
    ["Como lavar a peça?", "care"],
    ["Quero trocar meu pedido", "returns"],
    ["Quero ouvir o Razz", "social"],
  ])
    assert.ok(
      findSupportTopics(question).includes(expected as never),
      question,
    );
});
test("ambiguous order questions offer choices and unknown text never invents an answer", () => {
  assert.deepEqual(findSupportTopics("pedido"), ["buy", "orders"]);
  assert.deepEqual(findSupportTopics("  "), []);
  assert.deepEqual(findSupportTopics("uma dúvida sem assunto conhecido"), []);
  assert.deepEqual(
    findSupportTopics("<script>location='https://unknown.test'</script>"),
    [],
  );
});
test("product cards use only confirmed active prices and fail without a catalog", () => {
  assert.deepEqual(supportProductState("boca", null), {
    priceCents: null,
    varied: false,
    available: false,
  });
  const catalog: Catalog = {
    open: true,
    testMode: false,
    contact: null,
    paymentMethods: [],
    variants: [
      {
        product_id: "boca",
        size: "M",
        sku: "B-M",
        price_cents: 12000,
        active: true,
      },
      {
        product_id: "boca",
        size: "G",
        sku: "B-G",
        price_cents: 14000,
        active: true,
      },
      {
        product_id: "boca",
        size: "P",
        sku: "B-P",
        price_cents: 1,
        active: false,
      },
      {
        product_id: "flores",
        size: "M",
        sku: "F-M",
        price_cents: 10000,
        active: true,
      },
    ],
  };
  assert.deepEqual(supportProductState("boca", catalog), {
    priceCents: 12000,
    varied: true,
    available: true,
  });
  assert.equal(
    supportProductState("boca", { ...catalog, open: false }).available,
    false,
  );
  assert.equal(
    supportProductState("spiritual-gangsta", catalog).priceCents,
    null,
  );
  assert.equal(
    supportProductState("boca", {
      ...catalog,
      variants: [{ ...catalog.variants[0], price_cents: NaN }],
    }).priceCents,
    null,
  );
});
test("checkout uses inline support while employee and authentication forms have no widget", () => {
  assert.equal(supportRoute("/encomenda"), "inline");
  for (const route of [
    "/",
    "/sacola",
    "/ajuda",
    "/produto/boca",
    "/conta/pedidos",
    "/conta/pedidos/example",
  ])
    assert.equal(supportRoute(route), "floating");
  for (const route of [
    "/painel/pedidos",
    "/painel/equipe",
    "/entrar",
    "/cadastro",
    "/recuperar-acesso",
    "/conta/dados",
  ])
    assert.equal(supportRoute(route), "hidden");
});
