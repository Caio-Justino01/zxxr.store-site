import test from "node:test";
import assert from "node:assert/strict";
import { cartReducer, readCart } from "../src/lib/cart.ts";
test("same product and size group; different sizes stay separate", () => {
  let c = cartReducer([], { type: "add", productId: "boca", size: "M" });
  c = cartReducer(c, { type: "add", productId: "boca", size: "M" });
  c = cartReducer(c, { type: "add", productId: "boca", size: "G" });
  assert.equal(c.length, 2);
  assert.equal(c[0].quantity, 2);
  assert.equal(c[1].quantity, 1);
});
test("corrupt persisted data cannot introduce unknown products or invalid quantities", () => {
  assert.deepEqual(readCart("{bad"), []);
  assert.deepEqual(readCart("{}"), []);
  assert.deepEqual(
    readCart(
      JSON.stringify([
        { productId: "unknown", size: "M", quantity: 1 },
        { productId: "boca", size: "X", quantity: 1 },
        { productId: "flores", size: "P", quantity: 0 },
        { productId: "boca", size: "M", quantity: 2 },
        { productId: "boca", size: "M", quantity: 3 },
      ]),
    ),
    [{ productId: "boca", size: "M", quantity: 5 }],
  );
});
test("quantity bounds and remove do not affect a second size", () => {
  const c = [
    { productId: "boca", size: "M" as const, quantity: 2 },
    { productId: "boca", size: "G" as const, quantity: 1 },
  ];
  assert.deepEqual(
    cartReducer(c, {
      type: "quantity",
      productId: "boca",
      size: "M",
      quantity: -1,
    }),
    c,
  );
  assert.deepEqual(
    cartReducer(c, {
      type: "quantity",
      productId: "boca",
      size: "M",
      quantity: 11,
    }),
    c,
  );
  assert.deepEqual(
    cartReducer(c, { type: "remove", productId: "boca", size: "M" }),
    [c[1]],
  );
});

test("upcoming pieces cannot be added but old bag lines remain removable", () => {
  const old = [{ productId: "flores", size: "M" as const, quantity: 1 }];
  assert.deepEqual(readCart(JSON.stringify(old)), old);
  for (const productId of ["flores", "me-preservando", "zxxr-rosa"]) {
    assert.deepEqual(cartReducer([], { type: "add", productId, size: "M" }), []);
  }
  assert.deepEqual(cartReducer(old, { type: "quantity", productId: "flores", size: "M", quantity: 2 }), old);
  assert.deepEqual(cartReducer(old, { type: "remove", productId: "flores", size: "M" }), []);
});
