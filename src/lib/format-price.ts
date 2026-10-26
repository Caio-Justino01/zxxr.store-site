const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
export function validPrice(price: number | undefined): price is number {
  return typeof price === "number" && Number.isFinite(price) && price >= 0;
}
export function formatPrice(price?: number): string {
  return validPrice(price) ? brl.format(price) : "Preço a definir";
}
