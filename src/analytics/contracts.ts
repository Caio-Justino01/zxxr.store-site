import { z } from "zod";

export const ANALYTICS_CONSENT_VERSION = "2026-10-29-v1";
export const RECOVERY_CONSENT_VERSION = "2026-10-29-v1";
export const analyticsProductIds = [
  "boca",
  "flores",
  "me-preservando",
  "spiritual-gangsta",
  "zxxr-rosa",
] as const;
export const analyticsPages = [
  "/",
  "/espera",
  "/espera.html",
  "/sacola",
  "/encomenda",
  ...analyticsProductIds.map((id) => `/produto/${id}`),
] as const;
export const analyticsEventTypes = [
  "page_view",
  "section_view",
  "section_click",
  "product_view",
  "product_click",
  "add_to_cart",
  "remove_from_cart",
  "cart_view",
  "cart_update",
  "begin_checkout",
  "checkout_step",
  "whatsapp_click",
  "heartbeat",
] as const;
export const analyticsSections = [
  "hero",
  "products",
  "coming-soon",
  "guide",
  "music",
  "footer",
  "navigation",
  "support",
] as const;
export const analyticsSources = [
  "hero",
  "products",
  "recommendation",
  "product",
  "cart",
  "checkout",
  "music",
  "navigation",
  "support",
] as const;
const campaignValue = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[\p{L}\p{N}_. -]+$/u);
export const recoveryItemSchema = z
  .object({
    productId: z.enum(analyticsProductIds),
    size: z.enum(["P", "M", "G", "GG"]),
    quantity: z.number().int().min(1).max(10),
  })
  .strict();
export type RecoveryItem = z.infer<typeof recoveryItemSchema>;
export const analyticsEventSchema = z
  .object({
    id: z.uuid(),
    type: z.enum(analyticsEventTypes),
    page: z
      .string()
      .refine((value) => (analyticsPages as readonly string[]).includes(value))
      .optional(),
    section: z.enum(analyticsSections).optional(),
    productId: z.enum(analyticsProductIds).optional(),
    source: z.enum(analyticsSources).optional(),
    device: z.enum(["mobile", "tablet", "desktop"]).optional(),
    step: z.number().int().min(0).max(2).optional(),
    quantity: z.number().int().min(1).max(10).optional(),
    occurredAt: z.iso.datetime({ offset: true }).optional(),
    items: z.array(recoveryItemSchema).max(20).optional(),
    cartId: z.uuid().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.type === "cart_update") {
      if (!value.items)
        ctx.addIssue({
          code: "custom",
          message: "Informe o estado da sacola.",
          path: ["items"],
        });
      if (
        value.items &&
        new Set(value.items.map((item) => `${item.productId}:${item.size}`))
          .size !== value.items.length
      )
        ctx.addIssue({
          code: "custom",
          message: "Repita cada tamanho apenas uma vez.",
          path: ["items"],
        });
      if (
        value.items?.some(
          (item) => !["boca", "spiritual-gangsta"].includes(item.productId),
        )
      )
        ctx.addIssue({
          code: "custom",
          message: "A sacola só contém peças disponíveis.",
          path: ["items"],
        });
    } else if (value.items || value.cartId)
      ctx.addIssue({
        code: "custom",
        message: "O estado da sacola pertence somente a cart_update.",
      });
  });
export const analyticsBatchSchema = z
  .object({
    consent: z
      .object({
        analytics: z.literal(true),
        version: z.literal(ANALYTICS_CONSENT_VERSION),
      })
      .strict(),
    sessionId: z.uuid(),
    visitorId: z.uuid(),
    events: z.array(analyticsEventSchema).min(1).max(20),
    campaign: z
      .object({
        source: campaignValue.optional(),
        medium: campaignValue.optional(),
        name: campaignValue.optional(),
      })
      .strict()
      .optional(),
    referrerHost: z
      .string()
      .max(253)
      .regex(
        /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i,
      )
      .optional(),
  })
  .strict();
export type AnalyticsEvent = z.infer<typeof analyticsEventSchema>;
export type AnalyticsBatch = z.infer<typeof analyticsBatchSchema>;
export const recoveryPreferenceSchema = z
  .object({
    enabled: z.boolean(),
    version: z
      .literal(RECOVERY_CONSENT_VERSION)
      .default(RECOVERY_CONSENT_VERSION),
  })
  .strict();
export const recoveryCartSchema = z
  .object({
    expectedVersion: z.number().int().min(0),
    cartId: z.uuid(),
    intent: z.enum(["restore", "change", "checkout", "activity"]),
    items: z.array(recoveryItemSchema).max(20),
  })
  .strict()
  .refine(
    (value) =>
      new Set(value.items.map((item) => `${item.productId}:${item.size}`))
        .size === value.items.length,
    { message: "Repita cada tamanho apenas uma vez." },
  );
export const recoveryContactSchema = z
  .object({ version: z.number().int().min(0) })
  .strict();
export type RecoveryPreferences = {
  enabled: boolean;
  version: string | null;
  updatedAt: string | null;
  contactAvailable: boolean;
};
export type RecoveryCart = {
  version: number;
  cartId: string | null;
  status: "empty" | "active" | "converted" | "revoked" | "expired";
  stage: "cart" | "checkout";
  items: RecoveryItem[];
  lastActivityAt: string | null;
  lastOrderAt: string | null;
};
export type RecoveryLead = {
  id: string;
  name: string;
  phone: string;
  cartId: string;
  version: number;
  stage: "cart" | "checkout";
  items: RecoveryItem[];
  lastActivityAt: string;
  abandonedSince: string;
  preparedAt: string | null;
  contactedAt: string | null;
};
export type RecoveryOverview = {
  items: RecoveryLead[];
  totals: { eligible: number; contacted: number };
  generatedAt: string;
};
export type AnalyticsOverview = {
  period: { from: string; to: string; timeZone: "America/Sao_Paulo" };
  generatedAt: string;
  coverage: string;
  totals: {
    visitors: number;
    sessions: number;
    pageViews: number;
    activeNow: number;
    productClicks: number;
    addToCart: number;
    checkoutStarts: number;
    registeredOrders: number;
    paidOrders: number;
    paidRevenueCents: number;
    abandonedCarts: number;
    abandonedCartsEstimated: number;
    recoveryEligibleCount: number;
    recoveredCarts: number;
  };
  pages: { page: string; views: number; sessions: number }[];
  sections: {
    section: string;
    views: number;
    clicks: number;
    sessions: number;
  }[];
  products: {
    productId: string;
    views: number;
    clicks: number;
    adds: number;
  }[];
  sources: {
    source: string;
    medium: string;
    campaign: string;
    sessions: number;
  }[];
  devices: { device: string; sessions: number }[];
  daily: { date: string; sessions: number; pageViews: number }[];
};
