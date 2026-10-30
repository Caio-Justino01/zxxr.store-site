import {
  products,
  isAvailable,
  productById,
  sizes,
  type Size,
} from "../config/products.ts";
export const VISITOR_KEY = "zxxr-analytics-visitor-v1";
export const SESSION_KEY = "zxxr-analytics-session-v1";
export type AnalyticsEventType =
  | "page_view"
  | "section_view"
  | "section_click"
  | "product_view"
  | "product_click"
  | "add_to_cart"
  | "remove_from_cart"
  | "cart_update"
  | "cart_view"
  | "begin_checkout"
  | "checkout_step"
  | "whatsapp_click"
  | "heartbeat";
export type AnalyticsEventDetail = {
  type: AnalyticsEventType;
  productId?: string;
  section?: string;
  source?: string;
  step?: number;
  quantity?: number;
  items?: { productId: string; size: Size; quantity: number }[];
};
type Event = AnalyticsEventDetail & {
  id: string;
  page: string;
  device: "mobile" | "tablet" | "desktop";
  occurredAt: string;
};
const eventTypes = new Set<AnalyticsEventType>([
  "page_view",
  "section_view",
  "section_click",
  "product_view",
  "product_click",
  "add_to_cart",
  "remove_from_cart",
  "cart_update",
  "cart_view",
  "begin_checkout",
  "checkout_step",
  "whatsapp_click",
  "heartbeat",
]);
const productIds = new Set(products.map((p) => p.id));
const sections = new Set([
  "hero",
  "products",
  "coming-soon",
  "guide",
  "music",
  "footer",
  "navigation",
  "support",
]);
const sources = new Set([
  "hero",
  "products",
  "recommendation",
  "product",
  "cart",
  "checkout",
  "music",
  "navigation",
  "support",
]);
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function publicAnalyticsPath(pathname: string): string | null {
  if (
    ["/", "/espera", "/espera.html", "/sacola", "/encomenda"].includes(pathname)
  )
    return pathname === "/espera.html" ? "/espera" : pathname;
  const match = pathname.match(/^\/produto\/([^/]+)\/?$/);
  return match && productIds.has(match[1]) ? `/produto/${match[1]}` : null;
}
export function safeAnalyticsDetail(
  value: unknown,
): AnalyticsEventDetail | null {
  if (!value || typeof value !== "object") return null;
  const input = value as AnalyticsEventDetail;
  if (!eventTypes.has(input.type)) return null;
  const clean: AnalyticsEventDetail = { type: input.type };
  if (input.productId && productIds.has(input.productId))
    clean.productId = input.productId;
  if (input.section && sections.has(input.section))
    clean.section = input.section;
  if (input.source && sources.has(input.source)) clean.source = input.source;
  if (Number.isInteger(input.step) && input.step! >= 0 && input.step! <= 2)
    clean.step = input.step;
  if (
    Number.isInteger(input.quantity) &&
    input.quantity! >= 1 &&
    input.quantity! <= 10
  )
    clean.quantity = input.quantity;
  if (input.type === "cart_update") {
    if (!Array.isArray(input.items)) return null;
    const cleanItems = input.items
      .filter(
        (item) =>
          item &&
          isAvailable(productById(item.productId)) &&
          sizes.includes(item.size) &&
          Number.isInteger(item.quantity) &&
          item.quantity >= 1 &&
          item.quantity <= 10,
      )
      .slice(0, 20)
      .map(({ productId, size, quantity }) => ({ productId, size, quantity }));
    const keys = new Set<string>();
    clean.items = cleanItems.filter((item) => {
      const key = `${item.productId}:${item.size}`;
      if (keys.has(key)) return false;
      keys.add(key);
      return true;
    });
  }
  return clean;
}
export function analyticsAllowed(hostname: string, production: boolean) {
  return production && hostname === "www.zxxr.store";
}
function readId(storage: Storage, key: string, maxAge: number, now: number) {
  try {
    const stored = JSON.parse(storage.getItem(key) ?? "null");
    if (
      stored &&
      UUID.test(stored.id) &&
      Number.isFinite(stored.at) &&
      now - stored.at < maxAge &&
      now >= stored.at
    )
      return stored.id as string;
  } catch {
    /* create only after consent */
  }
  return crypto.randomUUID();
}
type Runtime = {
  track: (detail: AnalyticsEventDetail) => void;
  stop: (discard?: boolean) => void;
  sessionId: string;
  visitorId: string;
  sectionSeen: Set<string>;
};
let runtime: Runtime | null = null;
const seenBySession = new Map<string, Set<string>>();
const outstandingRequests = new Set<AbortController>();
export function analyticsOrderHeaders(): Record<string, string> {
  return runtime
    ? {
        "X-ZXXR-Session": runtime.sessionId,
        "X-ZXXR-Visitor": runtime.visitorId,
      }
    : {};
}
export function trackAnalytics(detail: AnalyticsEventDetail) {
  runtime?.track(detail);
}
export function stopAnalytics(removeIdentifiers = false) {
  runtime?.stop(removeIdentifiers);
  runtime = null;
  if (removeIdentifiers) {
    for (const controller of outstandingRequests) controller.abort();
    outstandingRequests.clear();
    try {
      localStorage.removeItem(VISITOR_KEY);
      localStorage.removeItem(SESSION_KEY);
    } catch {
      /* no persistence */
    }
    seenBySession.clear();
  }
}
export function startAnalytics(pageOverride?: "/espera"): Runtime | null {
  stopAnalytics();
  const path = pageOverride ?? publicAnalyticsPath(location.pathname);
  if (!path) return null;
  let visitorId: string, sessionId: string;
  try {
    const now = Date.now();
    visitorId = readId(localStorage, VISITOR_KEY, 90 * 86_400_000, now);
    sessionId = readId(localStorage, SESSION_KEY, 30 * 60_000, now);
    localStorage.setItem(
      VISITOR_KEY,
      JSON.stringify({ id: visitorId, at: now }),
    );
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ id: sessionId, at: now }),
    );
  } catch {
    return null;
  }
  let queue: Event[] = [],
    stopped = false;
  const inFlight = outstandingRequests;
  const params = new URLSearchParams(location.search);
  const sanitize = (value: string | null) =>
    value?.replace(/[^\p{L}\p{N} _.-]/gu, "").slice(0, 64) || undefined;
  const campaign = {
    source: sanitize(params.get("utm_source")),
    medium: sanitize(params.get("utm_medium")),
    name: sanitize(params.get("utm_campaign")),
  };
  let referrerHost: string | undefined;
  try {
    const host = new URL(document.referrer).hostname;
    if (host !== location.hostname) referrerHost = host.slice(0, 120);
  } catch {
    /* direct */
  }
  const device =
    innerWidth < 768 ? "mobile" : innerWidth < 1100 ? "tablet" : "desktop";
  const flush = () => {
    if (stopped || !queue.length) return;
    const events = queue.splice(0, 20);
    const controller = new AbortController();
    inFlight.add(controller);
    void fetch("/api/analytics/events", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        consent: { analytics: true, version: "2026-10-29-v1" },
        sessionId,
        visitorId,
        events,
        campaign,
        referrerHost,
      }),
      signal: controller.signal,
      keepalive: true,
    })
      .catch(() => {
        /* analytics must never interrupt shopping */
      })
      .finally(() => inFlight.delete(controller));
  };
  const track = (value: AnalyticsEventDetail) => {
    const detail = safeAnalyticsDetail(value);
    if (
      stopped ||
      !detail ||
      !(pageOverride ?? publicAnalyticsPath(location.pathname))
    )
      return;
    try {
      const latestSession = readId(
        localStorage,
        SESSION_KEY,
        30 * 60_000,
        Date.now(),
      );
      if (latestSession !== sessionId) {
        flush();
        sessionId = latestSession;
        if (runtime?.track === track) {
          runtime.sessionId = sessionId;
          runtime.sectionSeen.clear();
        }
      }
    } catch {
      stopAnalytics(true);
      return;
    }
    const event: Event = {
      ...detail,
      id: crypto.randomUUID(),
      page: pageOverride ?? publicAnalyticsPath(location.pathname)!,
      device,
      occurredAt: new Date().toISOString(),
    };
    queue.push(event);
    try {
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ id: sessionId, at: Date.now() }),
      );
    } catch {
      stopAnalytics(true);
      return;
    }
    if (queue.length >= 20) flush();
  };
  const timer = window.setInterval(flush, 3000);
  const heartbeat = window.setInterval(() => {
    if (document.visibilityState === "visible") track({ type: "heartbeat" });
  }, 60_000);
  const hide = () => {
    if (document.visibilityState === "hidden") flush();
  };
  document.addEventListener("visibilitychange", hide);
  const sectionSeen = seenBySession.get(sessionId) ?? new Set<string>();
  seenBySession.set(sessionId, sectionSeen);
  const value: Runtime = {
    track,
    sessionId,
    visitorId,
    sectionSeen,
    stop(discard = false) {
      if (!discard && !stopped) flush();
      stopped = true;
      queue = [];
      clearInterval(timer);
      clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", hide);
      if (discard) {
        for (const c of inFlight) c.abort();
        inFlight.clear();
      }
    },
  };
  runtime = value;
  return value;
}
