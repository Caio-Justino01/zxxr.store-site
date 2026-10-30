import { productById, isAvailable } from "../config/products.ts";
import type { CartItem } from "./cart.ts";
import { validPrice } from "./format-price.ts";
export { formatPrice } from "./format-price.ts";

export function cartSubtotal(items: readonly CartItem[]): number {
  const cents = items.reduce((subtotal, item) => {
    const product = productById(item.productId);
    if (!isAvailable(product)) return subtotal;
    const price = product.price;
    if (
      !validPrice(price) ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1
    )
      return subtotal;
    return subtotal + Math.round(price * 100) * item.quantity;
  }, 0);
  return cents / 100;
}
