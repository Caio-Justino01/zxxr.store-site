import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import {
  getSeoMetadata,
  publicSeoPaths,
  renderSeoHead,
  applySeoToHtml,
  renderSitemap,
  safeJsonLd,
} from "../src/seo/metadata.ts";
import { handleSeoRequest } from "../server/seo.ts";

const before = Date.parse("2026-10-31T02:59:59Z");
const after = Date.parse("2026-10-31T03:00:00Z");
const template =
  '<!doctype html><html lang="pt-BR"><head><title>Old title</title><meta name="description" content="Cinco camisetas"><meta name="robots" content="index,follow"><link rel="canonical" href="https://www.zxxr.store/"><meta property="og:title" content="Old"><script type="module" src="/assets/store.js"></script></head><body><div id="root"></div></body></html>';
const context = (path: string, host = "www.zxxr.store") => ({
  request: new Request(`https://${host}${path}`),
  env: {
    LAUNCH_ENABLED: "true",
    LAUNCH_OPENS_AT: "2026-10-31T00:00:00-03:00",
    ASSETS: {
      async fetch(request: Request) {
        return new Response(
          template.replace(
            '<div id="root"></div>',
            `<div id="root">${new URL(request.url).pathname === "/404.html" ? "Não encontrado" : ""}</div>`,
          ),
          { headers: { "Content-Type": "text/html" } },
        );
      },
    },
  },
  async next() {
    return new Response(template, { headers: { "Content-Type": "text/html" } });
  },
});

test("public routes have unique canonical URLs, useful descriptions and specific product titles", () => {
  const metadata = publicSeoPaths().map((path) => getSeoMetadata(path));
  assert.equal(new Set(metadata.map((meta) => meta.canonical)).size, 8);
  assert.ok(
    metadata.every(
      (meta) => meta.description.length > 35 && meta.status === 200,
    ),
  );
  assert.match(getSeoMetadata("/produto/boca").title, /Emoção/);
  assert.match(
    getSeoMetadata("/produto/spiritual-gangsta").description,
    /fio 30\.1/i,
  );
  assert.doesNotMatch(getSeoMetadata("/").description, /cinco estampas/i);
});

test("future pieces expose frozen images and no commercial structured data or prices", () => {
  for (const id of ["flores", "me-preservando", "zxxr-rosa"]) {
    const meta = getSeoMetadata(`/produto/${id}`, {
      priceCents: 100,
      available: true,
    });
    assert.match(meta.image, new RegExp(`/media/seo/${id}-congelada\\.webp$`));
    assert.match(meta.title, /Em breve/);
    assert.doesNotMatch(
      JSON.stringify(meta),
      /reference-v3|artwork-v4|price|Offer|"@type":"Product"/,
    );
  }
});

test("offers require server-confirmed values and never use local fallback prices", () => {
  const data = getSeoMetadata("/produto/boca").structuredData.find(
    (item) => item["@type"] === "Product",
  );
  assert.ok(data);
  assert.equal(data.offers, undefined);
  const verified = getSeoMetadata("/produto/boca", {
    priceCents: 14990,
    available: true,
  }).structuredData.find((item) => item["@type"] === "Product");
  assert.deepEqual(
    (verified?.offers as Record<string, unknown>).price,
    "149.90",
  );
  assert.equal(
    (verified?.offers as Record<string, unknown>).availability,
    "https://schema.org/PreOrder",
  );
});

test("head replacement is idempotent and does not remove application assets", () => {
  const first = applySeoToHtml(template, getSeoMetadata("/produto/boca"));
  const second = applySeoToHtml(
    first,
    getSeoMetadata("/produto/spiritual-gangsta"),
  );
  assert.equal((second.match(/rel="canonical"/g) ?? []).length, 1);
  assert.equal((second.match(/<title/g) ?? []).length, 1);
  assert.equal((second.match(/name="description"/g) ?? []).length, 1);
  assert.match(second, /\/assets\/store\.js/);
  assert.doesNotMatch(second, /Cinco camisetas|Old title/);
  assert.doesNotMatch(
    safeJsonLd({ text: "</script><script>alert(1)</script>" }),
    /<\/script>/,
  );
  assert.match(renderSeoHead(getSeoMetadata("/")), /application\/ld\+json/);
});

test("sitemap has only indexable public routes and approved images after release", () => {
  assert.equal((renderSitemap(false).match(/<url>/g) ?? []).length, 0);
  const xml = renderSitemap(true);
  assert.equal((xml.match(/<url>/g) ?? []).length, 8);
  assert.doesNotMatch(xml, /conta|painel|sacola|reference-v3|artwork-v4/);
});

test("sitemap and robots respond with correct types before opening without exposing the store", async () => {
  const sitemap = await handleSeoRequest(context("/sitemap.xml"), before);
  assert.match(sitemap.headers.get("Content-Type") ?? "", /application\/xml/);
  assert.doesNotMatch(await sitemap.text(), /<url>|<html/);
  const robots = await handleSeoRequest(context("/robots.txt"), before);
  assert.match(await robots.text(), /Disallow: \/\n/);
});

test("SEO leaves the waiting screen intact and releases indexable public HTML at the deadline", async () => {
  const waitingContext = context("/produto/boca");
  waitingContext.next = async () =>
    new Response("waiting", {
      headers: {
        "Content-Type": "text/html",
        "X-ZXXR-Launch": "waiting",
        "X-Robots-Tag": "noindex",
      },
    });
  const waiting = await handleSeoRequest(waitingContext, before);
  assert.equal(await waiting.text(), "waiting");
  assert.equal(waiting.headers.get("X-Robots-Tag"), "noindex");
  const page = await handleSeoRequest(context("/produto/boca"), after);
  assert.equal(page.status, 200);
  assert.equal(page.headers.get("X-Robots-Tag"), null);
  assert.match(await page.text(), /Emoção/);
});

test("unknown pages return real 404; private routes use an empty CSR shell and noindex", async () => {
  const missing = await handleSeoRequest(context("/nao-existe"), after);
  assert.equal(missing.status, 404);
  assert.equal(missing.headers.get("X-Robots-Tag"), "noindex, nofollow");
  assert.match(await missing.text(), /Não encontrado/);
  const privatePage = await handleSeoRequest(
    context("/painel/analytics"),
    after,
  );
  assert.equal(privatePage.status, 200);
  assert.equal(privatePage.headers.get("X-Robots-Tag"), "noindex, nofollow");
  assert.match(await privatePage.text(), /<div id="root"><\/div>/);
  const preview = await handleSeoRequest(
    context("/", "preview.zxxr-store.pages.dev"),
    after,
  );
  assert.equal(preview.headers.get("X-Robots-Tag"), "noindex, nofollow");
});

test("production canonical redirects do not capture preview domains", async () => {
  const redirect = await handleSeoRequest(
    context("/produto/boca/", "zxxr.store"),
    after,
  );
  assert.equal(redirect.status, 301);
  assert.equal(
    redirect.headers.get("Location"),
    "https://www.zxxr.store/produto/boca",
  );
});

test("generated SEO images are transparent vertical ice exports and native product derivatives", async () => {
  for (const id of ["flores", "me-preservando", "zxxr-rosa"]) {
    const meta = await sharp(
      await readFile(
        new URL(
          `../public-store/media/seo/${id}-congelada.webp`,
          import.meta.url,
        ),
      ),
    ).metadata();
    assert.equal(meta.width, 1440);
    assert.equal(meta.height, 1800);
    assert.equal(meta.hasAlpha, true);
  }
  const native = await sharp(
    await readFile(
      new URL(
        "../public-store/media/products/boca-back-917.webp",
        import.meta.url,
      ),
    ),
  ).metadata();
  assert.equal(native.width, 917);
  assert.equal(native.height, 701);
});

test("native lossless product derivatives preserve all visible source pixels", async () => {
  for (const [id, side, width] of [
    ["boca", "front", 921],
    ["boca", "back", 917],
    ["spiritual-gangsta", "front", 761],
    ["spiritual-gangsta", "back", 761],
  ] as const) {
    const original = await sharp(
      await readFile(
        new URL(
          `../public-store/media/reference-v3/${id}-${side}.png`,
          import.meta.url,
        ),
      ),
    )
      .ensureAlpha()
      .raw()
      .toBuffer();
    const derivative = await sharp(
      await readFile(
        new URL(
          `../public-store/media/products/${id}-${side}-${width}.webp`,
          import.meta.url,
        ),
      ),
    )
      .ensureAlpha()
      .raw()
      .toBuffer();
    assert.equal(derivative.length, original.length);
    let mismatches = 0;
    for (let pixel = 0; pixel < original.length; pixel += 4) {
      if (original[pixel + 3] !== derivative[pixel + 3]) mismatches++;
      if (original[pixel + 3])
        for (let c = 0; c < 3; c++)
          if (original[pixel + c] !== derivative[pixel + c]) mismatches++;
    }
    assert.equal(mismatches, 0, `${id} ${side}: visible pixels changed`);
  }
});
