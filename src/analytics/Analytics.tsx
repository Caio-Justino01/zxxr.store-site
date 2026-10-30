import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { useCommerce } from "../commerce/CommerceProvider";
import { useConsent } from "../privacy/ConsentProvider";
import {
  analyticsAllowed,
  publicAnalyticsPath,
  startAnalytics,
  stopAnalytics,
  type AnalyticsEventDetail,
} from "./client";
import type { CartItem } from "../lib/cart";

const sectionMap: Record<string, string> = {
  "o-drop": "products",
  "proximos-desejos": "coming-soon",
  som: "music",
  "como-funciona": "guide",
};
function sectionOf(node: Element | null): string | undefined {
  if (!node) return;
  const explicit = node
    .closest("[data-analytics-section]")
    ?.getAttribute("data-analytics-section");
  if (explicit) return explicit;
  if (node.closest(".support-launcher,#zxxr-support-panel")) return "support";
  let section = node.closest("section,footer,header,nav");
  while (section) {
    const mapped = sectionMap[section.id];
    if (mapped) return mapped;
    if (section.matches("footer")) return "footer";
    if (section.classList.contains("desejos-hero")) return "hero";
    if (section.classList.contains("storefront-header")) return "navigation";
    section =
      section.parentElement?.closest("section,footer,header,nav") ?? null;
  }
}
function useTracking(enabled: boolean, path: string) {
  useEffect(() => {
    if (!enabled || !publicAnalyticsPath(path)) {
      stopAnalytics(!enabled);
      return;
    }
    const tracker = startAnalytics(path === "/espera" ? "/espera" : undefined);
    if (!tracker) return;
    tracker.track({ type: "page_view" });
    const productId = path.startsWith("/produto/")
      ? path.split("/")[2]
      : undefined;
    if (productId)
      tracker.track({ type: "product_view", productId, source: "product" });
    if (path === "/sacola")
      tracker.track({ type: "cart_view", source: "cart" });
    if (path === "/encomenda")
      tracker.track({ type: "begin_checkout", source: "checkout" });
    const custom = (event: Event) =>
      tracker.track((event as CustomEvent<AnalyticsEventDetail>).detail);
    const cartAction = (event: Event) => {
      const value = (
        event as CustomEvent<{
          type: string;
          productId?: string;
          quantity?: number;
          delta?: number;
          items?: CartItem[];
        }>
      ).detail;
      if (value?.items && ["add", "remove", "quantity"].includes(value.type))
        tracker.track({
          type: "cart_update",
          items: value.items,
          source: "cart",
        });
      if (
        value?.type === "add" ||
        (value?.type === "quantity" && (value.delta ?? 0) > 0)
      )
        tracker.track({
          type: "add_to_cart",
          productId: value.productId,
          quantity: value.type === "add" ? 1 : value.delta,
          source: "cart",
        });
      if (
        value?.type === "remove" ||
        (value?.type === "quantity" && (value.delta ?? 0) < 0)
      )
        tracker.track({
          type: "remove_from_cart",
          productId: value.productId,
          quantity: Math.abs(value.delta ?? value.quantity ?? 1),
          source: "cart",
        });
    };
    const click = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const element = event.target.closest<HTMLElement>(
        "a,button,[data-analytics-product]",
      );
      if (!element) return;
      const section = sectionOf(element);
      if (section) tracker.track({ type: "section_click", section });
      const direct =
        element.dataset.analyticsProduct ||
        element.closest<HTMLElement>("[data-product-id]")?.dataset.productId ||
        element.closest<HTMLElement>("[data-product]")?.dataset.product;
      let id = direct;
      if (!id && element instanceof HTMLAnchorElement) {
        try {
          const target = new URL(element.href);
          if (
            target.origin === location.origin &&
            target.pathname.startsWith("/produto/")
          )
            id = target.pathname.split("/")[2];
          if (target.hostname === "wa.me")
            tracker.track({
              type: "whatsapp_click",
              source: section === "music" ? "music" : "support",
            });
        } catch {
          /* not a public route */
        }
      }
      if (id)
        tracker.track({
          type: "product_click",
          productId: id,
          source:
            element.closest<HTMLElement>("[data-analytics-source]")?.dataset
              .analyticsSource ||
            (element.closest(".other-pieces")
              ? "recommendation"
              : section === "products"
                ? "products"
                : section === "hero"
                  ? "hero"
                  : "navigation"),
        });
    };
    const timers = new Map<Element, ReturnType<typeof setTimeout>>();
    const visible = new Set<Element>();
    let frame = 0;
    const measure = () => {
      frame = 0;
      for (const target of visible) {
        const name = sectionOf(target);
        if (!name || tracker.sectionSeen.has(name)) continue;
        const rect = target.getBoundingClientRect();
        const visibleHeight = Math.max(
          0,
          Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0),
        );
        const ratio =
          visibleHeight / Math.max(1, Math.min(rect.height, innerHeight));
        if (document.visibilityState !== "visible" || ratio < 0.5) {
          const timer = timers.get(target);
          if (timer) clearTimeout(timer);
          timers.delete(target);
          continue;
        }
        if (!timers.has(target))
          timers.set(
            target,
            setTimeout(() => {
              timers.delete(target);
              if (
                document.visibilityState !== "visible" ||
                tracker.sectionSeen.has(name)
              )
                return;
              tracker.sectionSeen.add(name);
              tracker.track({ type: "section_view", section: name });
            }, 1000),
          );
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const observer =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            (entries) => {
              for (const entry of entries) {
                if (entry.isIntersecting) visible.add(entry.target);
                else {
                  visible.delete(entry.target);
                  const timer = timers.get(entry.target);
                  if (timer) clearTimeout(timer);
                  timers.delete(entry.target);
                }
              }
              schedule();
            },
            { threshold: [0, 0.5] },
          )
        : null;
    const observe = () =>
      document
        .querySelectorAll(
          "[data-analytics-section],section[id],.desejos-hero,footer",
        )
        .forEach((element) => observer?.observe(element));
    observe();
    const mutations = new MutationObserver(observe);
    mutations.observe(document.getElementById("root") ?? document.body, {
      childList: true,
      subtree: true,
    });
    document.addEventListener("click", click, { capture: true });
    window.addEventListener("scroll", schedule, { passive: true });
    document.addEventListener("visibilitychange", schedule);
    window.addEventListener("zxxr:analytics", custom);
    window.addEventListener("zxxr:cart-action", cartAction);
    return () => {
      observer?.disconnect();
      mutations.disconnect();
      timers.forEach(clearTimeout);
      cancelAnimationFrame(frame);
      document.removeEventListener("click", click, { capture: true });
      window.removeEventListener("scroll", schedule);
      document.removeEventListener("visibilitychange", schedule);
      window.removeEventListener("zxxr:analytics", custom);
      window.removeEventListener("zxxr:cart-action", cartAction);
      tracker.stop();
    };
  }, [enabled, path]);
}
export function Analytics() {
  const { preferences, ready } = useConsent();
  const { session, loading } = useCommerce();
  const { pathname } = useLocation();
  const enabled =
    ready &&
    !!preferences?.analytics &&
    !loading &&
    (!session.user || session.user.role === "customer") &&
    typeof location !== "undefined" &&
    analyticsAllowed(location.hostname, import.meta.env.PROD);
  useTracking(enabled, pathname);
  return null;
}
export function WaitingAnalytics() {
  const { preferences, ready } = useConsent();
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    if (
      !ready ||
      !preferences?.analytics ||
      !analyticsAllowed(location.hostname, import.meta.env.PROD)
    ) {
      setAllowed(false);
      return;
    }
    const controller = new AbortController();
    void fetch("/api/auth/session", {
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((value) =>
        setAllowed(!value.user || value.user.role === "customer"),
      )
      .catch(() => setAllowed(false));
    return () => controller.abort();
  }, [preferences?.analytics, ready]);
  useTracking(allowed, "/espera");
  return null;
}
