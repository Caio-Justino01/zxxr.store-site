import { getLaunchStatus, type LaunchEnv } from "./launch.ts";
import {
  applySeoToHtml,
  getSeoMetadata,
  isPrivateSeoPath,
  normalizeSeoPath,
  renderSitemap,
  SITE_ORIGIN,
  type ConfirmedOffer,
} from "../src/seo/metadata.ts";

export type SeoContext = {
  request: Request;
  env: LaunchEnv & { ASSETS: { fetch(request: Request): Promise<Response> } };
  next(): Promise<Response>;
  // An offer is injected only when the caller has verified the operational catalog.
  confirmedOffer?: (productId: string) => Promise<ConfirmedOffer | undefined>;
};

const plain = (body: string, type: string) =>
  new Response(body, {
    headers: {
      "Content-Type": type,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });

/** Outermost wrapper: sitemap/robots must not become the waiting HTML before launch. */
export async function handleSeoRequest(
  context: SeoContext,
  now = Date.now(),
): Promise<Response> {
  const { request, env } = context;
  const url = new URL(request.url);
  const launch = getLaunchStatus(env, now);
  const open = !launch.enabled || launch.isOpen;
  const production = url.hostname === "www.zxxr.store";
  const path = normalizeSeoPath(url.pathname);
  if (!["GET", "HEAD"].includes(request.method) || path.startsWith("/api/"))
    return context.next();
  if (url.pathname === "/sitemap.xml") {
    const response = plain(
      request.method === "HEAD" ? "" : renderSitemap(open && production),
      "application/xml; charset=utf-8",
    );
    if (!production || !open) response.headers.set("X-Robots-Tag", "noindex");
    return response;
  }
  if (url.pathname === "/robots.txt")
    return plain(
      request.method === "HEAD"
        ? ""
        : !open || !production
          ? "User-agent: *\nDisallow: /\n"
          : `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /conta/\nDisallow: /painel/\nDisallow: /sacola\nDisallow: /encomenda\nDisallow: /entrar\nDisallow: /cadastro\nDisallow: /recuperar-acesso\nDisallow: /store-shell.html\nDisallow: /espera.html\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`,
      "text/plain; charset=utf-8",
    );
  if (url.pathname.endsWith(".html") && url.pathname !== "/index.html") {
    const clean = url.pathname.slice(0, -5);
    const cleanMeta = getSeoMetadata(clean);
    if (cleanMeta.status === 200 && !isPrivateSeoPath(clean)) {
      const target = new URL(
        clean,
        url.hostname === "zxxr.store" ? SITE_ORIGIN : url.origin,
      );
      target.search = url.search;
      return new Response(null, {
        status: 301,
        headers: { Location: target.href, "Cache-Control": "no-store" },
      });
    }
  }
  // Previews remain usable without redirecting to the production domain.
  if (url.hostname === "zxxr.store" || (production && path !== url.pathname)) {
    const target = new URL(path, SITE_ORIGIN);
    target.search = url.search;
    return new Response(null, {
      status: 301,
      headers: { Location: target.href, "Cache-Control": "no-store" },
    });
  }
  const extension = /\.[a-z0-9]+$/i.test(url.pathname.split("/").pop() ?? "");
  if (
    extension &&
    !["/index.html", "/404.html", "/store-shell.html"].includes(url.pathname)
  )
    return context.next();
  let response: Response;
  const meta = getSeoMetadata(path);
  const privateRoute = isPrivateSeoPath(path);
  if (privateRoute || (open && meta.status === 404)) {
    const assetUrl = new URL(
      privateRoute ? "/store-shell.html" : "/404.html",
      url,
    );
    response = await env.ASSETS.fetch(new Request(assetUrl, { method: "GET" }));
  } else response = await context.next();
  if (
    (!open && !privateRoute) ||
    response.headers.get("X-ZXXR-Launch") === "waiting"
  )
    return response;
  if (!response.headers.get("Content-Type")?.includes("text/html"))
    return response;
  const offer =
    path.startsWith("/produto/") && context.confirmedOffer
      ? await context.confirmedOffer(path.split("/")[2]).catch(() => undefined)
      : undefined;
  const page = getSeoMetadata(path, offer);
  const html = applySeoToHtml(await response.text(), page);
  const headers = new Headers(response.headers);
  headers.delete("Content-Length");
  headers.delete("ETag");
  headers.set("Content-Type", "text/html; charset=utf-8");
  headers.set("Cache-Control", "private, no-store");
  if (
    !production ||
    page.robots.startsWith("noindex") ||
    url.pathname === "/store-shell.html"
  )
    headers.set("X-Robots-Tag", "noindex, nofollow");
  else headers.delete("X-Robots-Tag");
  return new Response(request.method === "HEAD" ? null : html, {
    status: page.status,
    headers,
  });
}
