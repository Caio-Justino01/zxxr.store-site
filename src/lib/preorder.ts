import { productById, sizes, type Size } from "../config/products.ts";
import type { CartItem } from "./cart.ts";
import { formatPrice, validPrice } from "./format-price.ts";

export type PreorderCustomer = { name: string; cep: string; note?: string };
export type PreorderLine = CartItem & {
  name: string;
  color: string;
  unitCents: number;
  totalCents: number;
};
export type PreorderSummary = {
  lines: PreorderLine[];
  quantity: number;
  subtotalCents: number;
};

export function normalizeWhatsapp(value: string | undefined): string | null {
  if (!value || !/^[+\d()\s-]+$/.test(value)) return null;
  let digits = value.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  return /^55[1-9]\d\d{8,9}$/.test(digits) ? digits : null;
}

export function formatCep(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

export function cleanCustomerText(value: string): string {
  return value.normalize("NFC").replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ").trim();
}

export function validateCustomer(customer: PreorderCustomer) {
  const name = cleanCustomerText(customer.name);
  return {
    name: name.length >= 2 && name.length <= 80,
    cep: /^\d{5}-?\d{3}$/.test(customer.cep.trim()),
    note: cleanCustomerText(customer.note ?? "").length <= 280,
  };
}

export function summarizePreorder(items: readonly CartItem[]): PreorderSummary {
  if (!items.length || items.length > 20) throw new Error("Confira as peças da sua sacola.");
  const grouped = new Map<string, PreorderLine>();
  for (const item of items) {
    const product = productById(item.productId);
    if (!product || !sizes.includes(item.size as Size) ||
      !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10 ||
      !validPrice(product.price)) throw new Error("Uma peça da sacola precisa ser revisada.");
    const unitCents = Math.round(product.price * 100);
    const key = `${product.id}:${item.size}`;
    const quantity = (grouped.get(key)?.quantity ?? 0) + item.quantity;
    if (quantity > 10) throw new Error("O limite é de 10 peças por estampa e tamanho.");
    grouped.set(key, {
      productId: product.id, size: item.size, quantity,
      name: product.name, color: product.color, unitCents, totalCents: unitCents * quantity,
    });
  }
  const lines = [...grouped.values()];
  return {
    lines,
    quantity: lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotalCents: lines.reduce((sum, line) => sum + line.totalCents, 0),
  };
}

export function buildPreorderMessage(
  summary: PreorderSummary,
  customer: PreorderCustomer,
  testMode: boolean,
): string {
  const valid = validateCustomer(customer);
  if (!valid.name || !valid.cep || !valid.note) throw new Error("Confira seu nome e o CEP de entrega.");
  if (!summary.lines.length) throw new Error("Sua sacola está vazia.");
  const note = cleanCustomerText(customer.note ?? "");
  return [
    testMode ? "MENSAGEM DE TESTE — não cobrar nem produzir." : "Olá! Quero encomendar estas peças da ZXXR:",
    "", "Drop Desejos · Razz", "",
    ...summary.lines.map((line, index) =>
      `${index + 1}. ${line.quantity} × ${line.name} · ${line.color} · ${line.size}\n` +
      `   ${formatPrice(line.unitCents / 100)} cada · ${formatPrice(line.totalCents / 100)}`),
    "", `Peças: ${summary.quantity}`,
    `Subtotal das peças: ${formatPrice(summary.subtotalCents / 100)}`,
    "Frete: a confirmar com a loja", "Total com frete: a confirmar", "",
    `Nome: ${cleanCustomerText(customer.name)}`,
    `CEP de entrega: ${formatCep(customer.cep)}`,
    ...(note ? [`Observação: ${note}`] : []),
    "", "Podem confirmar o frete, o prazo de produção e as formas de pagamento?",
  ].join("\n");
}

export function buildWhatsappLink(number: string | undefined, message: string): string | null {
  const phone = normalizeWhatsapp(number);
  return phone && message ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : null;
}
