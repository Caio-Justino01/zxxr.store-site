import { getLaunchStatus, type LaunchEnv } from "./launch.ts";

type Context = {
  request: Request;
  env: LaunchEnv & { ASSETS: { fetch(request: Request): Promise<Response> } };
  next(): Promise<Response>;
};
export function isAccountRoute(path: string) {
  return /^\/(?:entrar|cadastro|recuperar-acesso|conta|painel|ajuda|privacidade)(?:\/|$)/.test(
    path,
  );
}
export async function handleLaunchGate(
  context: Context,
  now = Date.now(),
): Promise<Response> {
  const { request, env } = context;
  const url = new URL(request.url);
  const status = getLaunchStatus(env, now);
  if (!status.enabled || status.isOpen) {
    if (url.pathname === "/espera.html")
      return new Response(null, {
        status: 302,
        headers: { Location: "/", "Cache-Control": "no-store" },
      });
    const response = await context.next();
    if (
      request.headers.get("accept")?.includes("text/html") ||
      !url.pathname.split("/").pop()?.includes(".")
    ) {
      const fresh = new Response(response.body, response);
      fresh.headers.set("Cache-Control", "private, no-store");
      return fresh;
    }
    return response;
  }
  if (url.pathname.startsWith("/api/")) {
    if (
      url.pathname.replace(/\/$/, "") === "/api/catalog" ||
      (url.pathname.replace(/\/$/, "") === "/api/orders" &&
        request.method === "POST")
    ) {
      return new Response(
        JSON.stringify({
          error: "O drop abre em 31 de outubro, às 00h de Brasília.",
          code: "launch_pending",
          opensAt: status.opensAt,
        }),
        {
          status: 503,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            "Retry-After": String(
              Math.max(
                1,
                Math.ceil(
                  ((Date.parse(status.opensAt ?? "") || now + 60_000) - now) /
                    1000,
                ),
              ),
            ),
          },
        },
      );
    }
    return context.next();
  }
  if (
    isAccountRoute(url.pathname) ||
    /^\/(?:assets|brand|fonts|media)\//.test(url.pathname) ||
    /\.(?:ico|txt|svg|png|webp|jpg|css|js)$/.test(url.pathname)
  )
    return context.next();
  if (request.method !== "GET" && request.method !== "HEAD")
    return new Response(null, {
      status: 405,
      headers: { Allow: "GET, HEAD", "Cache-Control": "no-store" },
    });
  const assetUrl = new URL("/espera.html", url);
  const asset = await env.ASSETS.fetch(
    new Request(assetUrl, { method: "GET" }),
  );
  const headers = new Headers(asset.headers);
  headers.set("Cache-Control", "private, no-store, max-age=0");
  headers.set("X-ZXXR-Launch", "waiting");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Robots-Tag", "noindex");
  return new Response(request.method === "HEAD" ? null : asset.body, {
    status: asset.status,
    headers,
  });
}
