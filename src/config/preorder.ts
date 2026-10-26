import { normalizeWhatsapp } from "../lib/preorder";

export const preorder = {
  whatsapp: normalizeWhatsapp(import.meta.env.VITE_PREORDER_WHATSAPP),
  testMode: import.meta.env.VITE_PREORDER_MODE !== "live",
  open: import.meta.env.VITE_PREORDER_OPEN !== "false",
} as const;
