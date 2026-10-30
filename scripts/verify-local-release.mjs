import { writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
const origin = "http://127.0.0.1:5281";
const paths = ["/", "/produto/boca", "/produto/spiritual-gangsta", "/produto/flores", "/produto/me-preservando", "/produto/zxxr-rosa", "/sacola", "/painel/analytics", "/pagina-inexistente", "/sitemap.xml", "/robots.txt", "/api/launch", "/api/auth/session"];
const records = [];
for (const path of paths) {
  const response = await fetch(origin + path);
  const body = await response.text();
  records.push({ path, status: response.status, contentType: response.headers.get("content-type"), robots: response.headers.get("x-robots-tag"), cache: response.headers.get("cache-control"), title: body.match(/<title[^>]*>(.*?)<\/title>/s)?.[1], canonical: body.match(/rel="canonical"[^>]*href="([^"]+)"/)?.[1], prerendered: body.includes('data-seo-prerendered="true"'), pendingSuspense: body.includes("<!--$?-->"), streamingScript: body.includes("$RC("), hash: createHash("sha256").update(body).digest("hex"), json: path.startsWith("/api/") ? JSON.parse(body) : undefined });
}
const launch = records.find(row => row.path === "/api/launch").json;
const session = records.find(row => row.path === "/api/auth/session").json;
if (launch.enabled !== false || session.configured !== false) throw new Error("QA must remain isolated from operational accounts and orders.");
if (records.find(row => row.path === "/pagina-inexistente").status !== 404) throw new Error("Expected real HTTP 404.");
if (records.some(row => row.pendingSuspense || row.streamingScript)) throw new Error("Incomplete streaming markup cannot be shipped as static HTML.");
for (const path of ["/media/reference-v3/flores-front.png", "/media/reference-v3/me-preservando-back.png", "/media/reference-v3/zxxr-rosa-back.png"]) {
  const response = await fetch(origin + path, { method: "HEAD" });
  records.push({ path, status: response.status, robots: response.headers.get("x-robots-tag") });
  if (!response.headers.get("x-robots-tag")?.includes("noindex")) throw new Error("Upcoming source image must not be indexed.");
}
await mkdir(new URL("../previews/analytics-seo-20261029/", import.meta.url), { recursive: true });
await writeFile(new URL("../previews/analytics-seo-20261029/http-smoke.json", import.meta.url), JSON.stringify({ verifiedAt: new Date().toISOString(), origin, records }, null, 2));
console.log(`Verified ${records.length} HTTP responses, isolated backend, static HTML and source-image indexing headers.`);
