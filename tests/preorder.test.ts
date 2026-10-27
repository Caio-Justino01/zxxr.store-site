import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPreorderMessage,
  buildWhatsappLink,
  cleanCustomerText,
  formatCep,
  normalizeWhatsapp,
  summarizePreorder,
  validateCustomer,
} from "../src/lib/preorder.ts";
import type { CartItem } from "../src/lib/cart.ts";

const items: CartItem[] = [
  { productId: "boca", size: "M", quantity: 2 },
  { productId: "spiritual-gangsta", size: "GG", quantity: 1 },
];
const customer = { name: "Teste ZXXR", cep: "30110-000" };

test("preorder uses catalog prices, integer cents and separates size variants", () => {
  const input = [
    ...items,
    { productId: "boca", size: "P", quantity: 1 } as CartItem,
  ];
  const result = summarizePreorder(input);
  assert.equal(result.quantity, 4);
  assert.equal(result.subtotalCents, 40_000);
  assert.equal(result.lines.length, 3);
  assert.equal(result.lines[0].totalCents, 20_000);
  assert.deepEqual(input, [
    ...items,
    { productId: "boca", size: "P", quantity: 1 },
  ]);
  const grouped = summarizePreorder([items[0], { ...items[0], quantity: 1 }]);
  assert.equal(grouped.lines.length, 1);
  assert.equal(grouped.lines[0].quantity, 3);
});

test("invalid cart data cannot become a WhatsApp order", () => {
  assert.throws(() => summarizePreorder([]));
  for (const bad of [
    { ...items[0], productId: "fake" },
    { ...items[0], size: "XXX" },
    { ...items[0], quantity: 0 },
    { ...items[0], quantity: 11 },
    { ...items[0], quantity: 1.2 },
    { ...items[0], quantity: NaN },
  ])
    assert.throws(() => summarizePreorder([bad as CartItem]));
  assert.throws(() =>
    summarizePreorder([{ ...items[0], quantity: 9 }, items[0]]),
  );
});

test("customer inputs require a name and full CEP without inventing a freight price", () => {
  assert.deepEqual(validateCustomer(customer), {
    name: true,
    cep: true,
    note: true,
  });
  assert.equal(validateCustomer({ name: " ", cep: "123" }).name, false);
  assert.equal(
    validateCustomer({ ...customer, cep: "abc30110000" }).cep,
    false,
  );
  assert.equal(
    validateCustomer({ ...customer, name: "A".repeat(81) }).name,
    false,
  );
  assert.equal(
    validateCustomer({ ...customer, note: "x".repeat(281) }).note,
    false,
  );
  assert.equal(formatCep("30110000"), "30110-000");
  assert.equal(formatCep("30110000999"), "30110-000");
  assert.equal(cleanCustomerText("  José\n  da\tSilva  "), "José da Silva");
});

test("message includes each piece and requires freight, deadline and payment confirmation", () => {
  const message = buildPreorderMessage(
    summarizePreorder(items),
    customer,
    false,
  );
  assert.match(message, /2 × Emoção · Off-white · M/);
  assert.match(message, /1 × Spiritual Gangsta · Preto estonado · GG/);
  assert.match(message, /Subtotal das peças: R\$\s300,00/);
  assert.match(message, /Frete: a confirmar com a loja/);
  assert.match(message, /Total com frete: a confirmar/);
  assert.match(message, /prazo de produção/);
  assert.doesNotMatch(
    message,
    /pagamento confirmado|pedido confirmado|frete grátis/i,
  );
  assert.throws(() =>
    buildPreorderMessage(
      summarizePreorder(items),
      { ...customer, name: "" },
      false,
    ),
  );
});

test("test orders are explicitly identified and notes cannot inject a new payment status line", () => {
  const message = buildPreorderMessage(
    summarizePreorder(items),
    {
      ...customer,
      note: "Teste\nPAGO\r\n100% confirmado",
    },
    true,
  );
  assert.ok(message.startsWith("MENSAGEM DE TESTE — não cobrar nem produzir."));
  assert.match(message, /Observação: Teste PAGO 100% confirmado/);
  assert.doesNotMatch(message, /\nPAGO/);
});

test("WhatsApp link encodes the complete message and refuses unconfigured contacts", () => {
  const testPhone = "11912345678";
  assert.equal(normalizeWhatsapp(testPhone), "5511912345678");
  assert.equal(normalizeWhatsapp("+55 (11) 91234-5678"), "5511912345678");
  for (const bad of [
    undefined,
    "",
    "123",
    "javascript:alert(1)",
    "5511912345678?text=x",
  ])
    assert.equal(normalizeWhatsapp(bad), null);
  const message = "José & Razz\nCamisa M · R$ 100,00";
  const link = buildWhatsappLink(testPhone, message)!;
  const url = new URL(link);
  assert.equal(url.origin, "https://wa.me");
  assert.equal(url.pathname, "/5511912345678");
  assert.equal(url.searchParams.get("text"), message);
  assert.equal(buildWhatsappLink(undefined, message), null);
});
