import test from "node:test";
import assert from "node:assert/strict";
import { products } from "../src/config/products.ts";
import type { CartItem } from "../src/lib/cart.ts";
import { cartSubtotal, formatPrice } from "../src/lib/pricing.ts";

const spaces = (text: string) => text.replace(/\s+/g, " ");

test("launch prices and materials match the approved color groups", () => {
  assert.equal(products.length, 5);
  for (const product of products) {
    assert.equal(product.price, product.dark ? 169.9 : 149.9, product.id);
    assert.equal(product.fit, "Oversized boxy");
    assert.equal(product.material, product.dark ? "100% algodão · fio 30.1" : "Algodão Madri");
    assert.equal(product.finish, product.dark ? "Marmorizado" : undefined);
    assert.equal(spaces(formatPrice(product.price)), product.dark ? "R$ 169,90" : "R$ 149,90");
  }
});

test("BRL formatting accepts zero and uses the pending label for invalid prices", () => {
  assert.equal(spaces(formatPrice(0)), "R$ 0,00");
  assert.equal(spaces(formatPrice(1234.56)), "R$ 1.234,56");
  for (const price of [undefined, NaN, Infinity, -Infinity, -0.01])
    assert.equal(formatPrice(price), "Preço a definir");
});

test("subtotal includes each size variant and quantities one and three without mutating the bag", () => {
  const items: readonly CartItem[] = Object.freeze([
    Object.freeze({ productId: "boca", size: "M", quantity: 1 }),
    Object.freeze({ productId: "boca", size: "G", quantity: 3 }),
    Object.freeze({ productId: "spiritual-gangsta", size: "P", quantity: 1 }),
  ]);
  assert.equal(cartSubtotal([]), 0);
  assert.equal(cartSubtotal(items), 769.5);
  assert.equal(items.length, 3);
  assert.equal(items[1].quantity, 3);
});

test("unknown products and malformed quantities do not make a valid subtotal NaN", () => {
  assert.equal(
    cartSubtotal([
      { productId: "unknown-product", size: "M", quantity: 1 },
      { productId: "spiritual-gangsta", size: "GG", quantity: 3 },
      { productId: "flores", size: "P", quantity: NaN },
      { productId: "zxxr-rosa", size: "M", quantity: Infinity },
      { productId: "boca", size: "G", quantity: -1 },
    ]),
    509.7,
  );
});

test("subtotal adds integer cents rather than accumulating fractional real amounts", () => {
  const product = products[0];
  const previous = product.price;
  try {
    product.price = 19.99;
    assert.equal(
      cartSubtotal([
        { productId: product.id, size: "M", quantity: 3 },
        { productId: "spiritual-gangsta", size: "G", quantity: 1 },
      ]),
      229.87,
    );
  } finally {
    product.price = previous;
  }
});


test("one off-white and one black shirt total R$ 319.80", () => {
  assert.equal(cartSubtotal([
    { productId: "boca", size: "M", quantity: 1 },
    { productId: "spiritual-gangsta", size: "G", quantity: 1 },
  ]), 319.8);
});

test("future pieces in an old bag do not enter the payable subtotal", () => {
  assert.equal(cartSubtotal([
    { productId: "flores", size: "M", quantity: 2 },
    { productId: "me-preservando", size: "G", quantity: 1 },
    { productId: "zxxr-rosa", size: "P", quantity: 1 },
    { productId: "boca", size: "GG", quantity: 1 },
  ]), 149.9);
});
