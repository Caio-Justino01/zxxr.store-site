export const contentSecurityPolicy =
  "default-src 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://i.scdn.co; connect-src 'self' https://viacep.com.br https://challenges.cloudflare.com; frame-src https://open.spotify.com https://challenges.cloudflare.com; object-src 'none'; base-uri 'self'; form-action 'self' https://wa.me; frame-ancestors 'none'";

/** Headers apply to function responses too; Pages _headers covers static files. */
export function secureResponse(response: Response, request: Request): Response {
  const next = new Response(response.body, response);
  next.headers.set("X-Content-Type-Options", "nosniff");
  next.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  if (!next.headers.has("Referrer-Policy"))
    next.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  if (!next.headers.has("Content-Security-Policy"))
    next.headers.set("Content-Security-Policy", contentSecurityPolicy);
  if (new URL(request.url).protocol === "https:")
    next.headers.set("Strict-Transport-Security", "max-age=31536000");
  return next;
}

export const privateImagePaths = [
  "flores-front",
  "flores-back",
  "me-preservando-front",
  "me-preservando-back",
  "zxxr-rosa-front",
  "zxxr-rosa-back",
];
export function staticSecurityHeaders(): string {
  return `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Strict-Transport-Security: max-age=31536000\n  Content-Security-Policy: ${contentSecurityPolicy}\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n${privateImagePaths.map((name) => `/media/reference-v3/${name}.png\n  X-Robots-Tag: noindex\n/media/artwork-v4/${name}.png\n  X-Robots-Tag: noindex\n`).join("")}/conta/*\n  X-Robots-Tag: noindex, nofollow\n/painel/*\n  X-Robots-Tag: noindex, nofollow\n`;
}
