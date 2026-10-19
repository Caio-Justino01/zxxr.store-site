import { productById, sizes, type Size } from "../config/products.ts";
export type CartItem = { productId: string; size: Size; quantity: number };
export type CartAction =
  | { type: "add"; productId: string; size: Size }
  | { type: "quantity"; productId: string; size: Size; quantity: number }
  | { type: "remove"; productId: string; size: Size };
export const CART_KEY = "zxxr-drop-01-bag-v1";
export const itemKey = (item: Pick<CartItem, "productId" | "size">) =>
  `${item.productId}:${item.size}`;
export function readCart(raw: string | null): CartItem[] {
  try {
    const entries: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(entries)) return [];
    const clean: CartItem[] = [];
    for (const v of entries) {
      if (
        !v ||
        typeof v !== "object" ||
        !productById(v.productId) ||
        !sizes.includes(v.size) ||
        !Number.isInteger(v.quantity) ||
        v.quantity < 1
      )
        continue;
      const existing = clean.find((c) => itemKey(c) === itemKey(v));
      const qty = Math.min(10, v.quantity);
      if (existing) existing.quantity = Math.min(10, existing.quantity + qty);
      else clean.push({ productId: v.productId, size: v.size, quantity: qty });
    }
    return clean;
  } catch {
    return [];
  }
}
export function cartReducer(cart: CartItem[], action: CartAction): CartItem[] {
  if (!productById(action.productId) || !sizes.includes(action.size))
    return cart;
  const key = itemKey(action),
    found = cart.find((c) => itemKey(c) === key);
  if (action.type === "remove") return cart.filter((c) => itemKey(c) !== key);
  if (action.type === "quantity") {
    if (
      !Number.isInteger(action.quantity) ||
      action.quantity < 1 ||
      action.quantity > 10
    )
      return cart;
    return cart.map((c) =>
      itemKey(c) === key ? { ...c, quantity: action.quantity } : c,
    );
  }
  if (found)
    return cart.map((c) =>
      itemKey(c) === key ? { ...c, quantity: Math.min(10, c.quantity + 1) } : c,
    );
  return [
    ...cart,
    { productId: action.productId, size: action.size, quantity: 1 },
  ];
}
