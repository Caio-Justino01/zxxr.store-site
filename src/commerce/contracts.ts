import { z } from "zod";

export const roleSchema = z.enum(["customer", "staff", "owner"]);
export type Role = z.infer<typeof roleSchema>;
export const stages = [
  "received",
  "in_service",
  "awaiting_payment",
  "confirmed",
  "production",
  "packing",
  "shipped",
  "delivered",
  "cancelled",
] as const;
export type Stage = (typeof stages)[number];
export const stageLabels: Record<Stage, string> = {
  received: "Pedido recebido",
  in_service: "Em atendimento",
  awaiting_payment: "Aguardando pagamento",
  confirmed: "Pagamento confirmado",
  production: "Em produção",
  packing: "Preparando envio",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
};
export const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine(
      (v) => !/[\u0000-\u001f\u007f]/.test(v),
      "Retire os caracteres inválidos.",
    );
export const phoneSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ""))
  .transform((v) => (v.length <= 11 ? `55${v}` : v))
  .pipe(z.string().regex(/^55[1-9]\d\d{8,9}$/, "Informe o WhatsApp com DDD."));
export const profileSchema = z.object({
  name: text(80).min(2, "Informe seu nome."),
  phone: phoneSchema,
});
export const addressSchema = z.object({
  id: z.uuid().optional(),
  recipient: text(80).min(2, "Informe quem recebe."),
  cep: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .pipe(z.string().regex(/^\d{8}$/, "Informe os 8 números do CEP.")),
  street: text(120).min(2, "Informe a rua."),
  number: text(20).min(1, "Informe o número ou S/N."),
  complement: text(100).default(""),
  neighborhood: text(80).min(2, "Informe o bairro."),
  city: text(80).min(2, "Informe a cidade."),
  state: z.enum([
    "AC",
    "AL",
    "AP",
    "AM",
    "BA",
    "CE",
    "DF",
    "ES",
    "GO",
    "MA",
    "MT",
    "MS",
    "MG",
    "PA",
    "PB",
    "PR",
    "PE",
    "PI",
    "RJ",
    "RN",
    "RS",
    "RO",
    "RR",
    "SC",
    "SP",
    "SE",
    "TO",
  ]),
  reference: text(160).default(""),
});
export type Address = z.infer<typeof addressSchema>;
export const lineSchema = z.object({
  productId: text(60).min(1),
  size: z.enum(["P", "M", "G", "GG"]),
  quantity: z.number().int().min(1).max(10),
  expectedUnitCents: z.number().int().positive(),
});
export const orderInputSchema = z.object({
  customer: profileSchema,
  address: addressSchema.omit({ id: true }),
  paymentPreference: z.enum(["pix", "credit", "boleto"]),
  note: text(280).default(""),
  items: z.array(lineSchema).min(1).max(20),
  saveAddress: z.boolean().default(false),
});
export type OrderInput = z.infer<typeof orderInputSchema>;
export const credentialsSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(10, "Use pelo menos 10 caracteres.").max(128),
  captchaToken: z.string().max(4096).optional(),
});
export type Access = {
  id: string;
  email: string;
  role: Role;
  active: boolean;
  mfa: boolean;
};
export type Catalog = {
  open: boolean;
  testMode: boolean;
  contact: string | null;
  paymentMethods: string[];
  variants: {
    product_id: string;
    size: string;
    sku: string;
    price_cents: number;
    active: boolean;
  }[];
};
export type OrderLine = {
  productId: string;
  name: string;
  color: string;
  size: string;
  sku: string;
  quantity: number;
  unitCents: number;
  totalCents: number;
};
export type OrderEvent = {
  id: string;
  kind: string;
  label: string;
  created_at: string;
};
export type Order = {
  id: string;
  reference: string;
  customer_id: string;
  customer: { name: string; phone: string; email: string };
  address: Address;
  items: OrderLine[];
  subtotal_cents: number;
  shipping_cents: number | null;
  total_cents: number | null;
  quote_released: boolean;
  production_deadline: string | null;
  payment_url: string | null;
  payment_preference: string;
  payment_state: "pending" | "paid" | "refund_pending" | "refunded";
  stage: Stage;
  note: string;
  assignee_id: string | null;
  tracking_code: string | null;
  tracking_url: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  test_mode: boolean;
  checklist: {
    address_confirmed?: boolean;
    production_reviewed?: boolean;
    package_checked?: boolean;
  };
  events?: OrderEvent[];
  notes?: { id: string; body: string; author_id: string; created_at: string }[];
  contacts?: {
    id: string;
    kind: "prepared" | "declared";
    author_id: string;
    created_at: string;
  }[];
};
export type TeamMember = {
  user_id: string;
  email: string;
  name: string | null;
  role: "staff" | "owner";
  active: boolean;
};
export const actions = [
  "start",
  "assign",
  "address",
  "items",
  "checklist",
  "quote",
  "release_quote",
  "pay",
  "production",
  "packing",
  "ship",
  "deliver",
  "cancel",
  "refund",
  "note",
  "contact_prepared",
  "contact_done",
] as const;
export type OrderAction = (typeof actions)[number];
export const actionSchema = z.object({
  version: z.number().int().positive(),
  action: z.enum(actions),
  data: z.record(z.string(), z.unknown()).default({}),
});

export function safeReturnTo(value: string | null | undefined): string {
  const routes = [
    "/encomenda",
    "/conta/pedidos",
    "/conta/dados",
    "/painel/pedidos",
    "/painel/equipe",
    "/painel/configuracoes",
  ];
  return value &&
    !/[\s\\%]/.test(value) &&
    (routes.includes(value) ||
      /^\/(?:conta|painel)\/pedidos\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        value,
      ))
    ? value
    : "/conta/pedidos";
}
export function orderMessage(
  order: Order,
  origin: string,
  action: "continue" | "change" | "update" = "continue",
): string {
  const opening =
    action === "update"
      ? `Olá, ${order.customer.name}! Atualização do pedido ${order.reference}: ${stageLabels[order.stage]}.`
      : action === "change"
        ? `Olá! Gostaria de solicitar uma alteração no pedido ${order.reference}.`
        : `Olá! Criei o pedido ${order.reference} pelo site e gostaria de finalizar.`;
  return [
    order.test_mode ? "MENSAGEM DE TESTE — não cobrar nem produzir." : "",
    opening,
    ...order.items.map((i) => `${i.quantity} × ${i.name} · ${i.size}`),
    `Subtotal: ${brl(order.subtotal_cents)}`,
    order.quote_released
      ? `Frete: ${brl(order.shipping_cents!)} · Total: ${brl(order.total_cents!)}`
      : "Frete e total: a confirmar no atendimento.",
    order.quote_released && order.production_deadline
      ? `Prazo combinado: ${order.production_deadline}`
      : "",
    order.quote_released &&
    order.payment_state === "pending" &&
    order.payment_url
      ? `Pagamento: ${order.payment_url}`
      : "",
    order.tracking_code ? `Rastreamento: ${order.tracking_code}` : "",
    `Acompanhe: ${origin}/conta/pedidos/${order.id}`,
  ]
    .filter(Boolean)
    .join("\n");
}
export const brl = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );
export function csvCell(value: unknown): string {
  let s = String(value ?? "");
  if (/^[=+@\-\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replaceAll('"', '""')}"`;
}
