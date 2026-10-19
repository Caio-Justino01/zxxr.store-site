import { productById } from "../config/products.ts";
import type { CartItem } from "./cart.ts";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function validPrice(price: number | undefined): price is number {
  return typeof price === "number" && Number.isFinite(price) && price >= 0;
}

export function formatPrice(price?: number): string {
  return validPrice(price) ? brl.format(price) : "Preço a definir";
}

export function cartSubtotal(items: readonly CartItem[]): number {
  const cents = items.reduce((subtotal, item) => {
    const price = productById(item.productId)?.price;
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
