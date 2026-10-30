import { products, isAvailable, type Product } from "../config/products.ts";
import { artist } from "../config/artist.ts";

export const SITE_ORIGIN = "https://www.zxxr.store";
export const SEO_LOGO = `${SITE_ORIGIN}/brand/logo-black.svg`;
const campaignImage =
  "/media/ensaio-drop/ensaiodrop1zxxrfoto06-banner-v1-1920.webp";

export type SeoMetadata = {
  path: string;
  title: string;
  description: string;
  canonical: string;
  image: string;
  imageAlt: string;
  imageWidth: number;
  imageHeight: number;
  robots: "index, follow, max-image-preview:large" | "noindex, nofollow";
  status: 200 | 404;
  structuredData: Record<string, unknown>[];
};

export type ConfirmedOffer = { priceCents: number; available: boolean };

const absolute = (path: string) => new URL(path, SITE_ORIGIN).href;
export const isPrivateSeoPath = (path: string) =>
  /^\/(?:conta|painel|sacola|encomenda|entrar|cadastro|recuperar-acesso|api)(?:\/|$)/.test(
    path,
  );

export function normalizeSeoPath(path: string): string {
  const pathname = path.split(/[?#]/, 1)[0] || "/";
  return pathname === "/index.html" ? "/" : pathname.replace(/\/+$/, "") || "/";
}

export function publicSeoPaths(): string[] {
  return [
    "/",
    ...products.map((product) => `/produto/${product.id}`),
    "/ajuda",
    "/privacidade",
  ];
}

export function productSeoImage(product: Product): {
  src: string;
  width: number;
  height: number;
  alt: string;
} {
  if (!isAvailable(product))
    return {
      src: `/media/seo/${product.id}-congelada.webp`,
      width: 1440,
      height: 1800,
      alt: `${product.name} da ZXXR, camiseta preservada em gelo com a inscrição Em breve`,
    };
  return {
    src: `/media/products/${product.id}-back-${product.id === "boca" ? 917 : 761}.webp`,
    width: product.id === "boca" ? 917 : 761,
    height: product.id === "boca" ? 701 : 573,
    alt: `Camiseta ${product.name} ZXXR, ${product.fit.toLowerCase()}, ${product.color.toLowerCase()}, costas`,
  };
}

function organization(): Record<string, unknown> {
  return {
    "@type": "Organization",
    "@id": `${SITE_ORIGIN}/#organization`,
    name: "ZXXR Store",
    alternateName: "ZXXR",
    url: `${SITE_ORIGIN}/`,
    logo: { "@type": "ImageObject", url: SEO_LOGO, contentUrl: SEO_LOGO },
  };
}

export function getSeoMetadata(
  rawPath: string,
  offer?: ConfirmedOffer,
): SeoMetadata {
  const path = normalizeSeoPath(rawPath);
  const product = products.find((item) => path === `/produto/${item.id}`);
  const privateRoute = isPrivateSeoPath(path);
  const exists = publicSeoPaths().includes(path) || privateRoute;
  let title = "Desejos · Camisetas oversized boxy · ZXXR Store";
  let description =
    "Desejos, edição criada por Razz para a ZXXR. Conheça Emoção e Spiritual Gangsta: camisetas oversized boxy, em peças limitadas feitas sob encomenda.";
  let image = {
    src: campaignImage,
    alt: "Drop Desejos da ZXXR, edição criada por Razz",
    width: 1920,
    height: 800,
  };
  const graph: Record<string, unknown>[] = [];
  if (path === "/") {
    graph.push(organization(), {
      "@type": "WebSite",
      "@id": `${SITE_ORIGIN}/#website`,
      url: `${SITE_ORIGIN}/`,
      name: "ZXXR Store",
      inLanguage: "pt-BR",
      publisher: { "@id": `${SITE_ORIGIN}/#organization` },
    });
  } else if (product) {
    title = isAvailable(product)
      ? `${product.name} · Camiseta oversized boxy · ZXXR Store`
      : `${product.name} · Em breve · ZXXR Store`;
    description = isAvailable(product)
      ? `${product.description} Modelagem oversized boxy, ${product.material.toLowerCase()}, ${product.color.toLowerCase()}. Edição Desejos, criada por Razz.`
      : `${product.name}, um próximo desejo da ZXXR. Em breve.`;
    image = productSeoImage(product);
    if (isAvailable(product)) {
      const data: Record<string, unknown> = {
        "@type": "Product",
        "@id": `${absolute(path)}#product`,
        name: `Camiseta ${product.name} ZXXR`,
        url: absolute(path),
        description,
        image: [absolute(image.src)],
        brand: { "@type": "Brand", name: "ZXXR" },
        color: product.color,
        material: product.material,
        category: "Camisetas",
        size: ["P", "M", "G", "GG"],
      };
      if (
        offer &&
        Number.isSafeInteger(offer.priceCents) &&
        offer.priceCents > 0
      )
        data.offers = {
          "@type": "Offer",
          url: absolute(path),
          priceCurrency: "BRL",
          price: (offer.priceCents / 100).toFixed(2),
          availability: offer.available
            ? "https://schema.org/PreOrder"
            : "https://schema.org/OutOfStock",
          seller: { "@id": `${SITE_ORIGIN}/#organization` },
        };
      graph.push(organization(), data);
    }
  } else if (path === "/ajuda") {
    title = "Como comprar e encomendar · Ajuda · ZXXR Store";
    description =
      "Saiba como escolher sua camiseta ZXXR, selecionar tamanho, registrar a encomenda e acompanhar o atendimento, pagamento e entrega.";
  } else if (path === "/privacidade") {
    title = "Privacidade e preferências de cookies · ZXXR Store";
    description =
      "Entenda como a ZXXR trata dados de conta, pedidos, cookies opcionais e lembretes de sacola, e como controlar suas preferências.";
  } else {
    title = privateRoute
      ? "Sua conta e pedidos · ZXXR Store"
      : "Página não encontrada · ZXXR Store";
    description = privateRoute
      ? "Área de acesso à conta, sacola e pedidos da ZXXR Store."
      : "Esta página não foi encontrada. Conheça o drop Desejos da ZXXR Store.";
  }
  if (exists && !privateRoute && path !== "/")
    graph.push({
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "ZXXR Store",
          item: `${SITE_ORIGIN}/`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: product?.name ?? (path === "/ajuda" ? "Ajuda" : "Privacidade"),
          item: absolute(path),
        },
      ],
    });
  if (exists && !privateRoute)
    graph.push({
      "@type": "WebPage",
      "@id": `${absolute(path)}#webpage`,
      url: absolute(path),
      name: title,
      description,
      inLanguage: "pt-BR",
      primaryImageOfPage: {
        "@type": "ImageObject",
        contentUrl: absolute(image.src),
        url: absolute(image.src),
      },
      ...(path === "/"
        ? {
            about: {
              "@type": "Person",
              name: artist.name,
              sameAs: artist.url,
            },
          }
        : {}),
    });
  return {
    path,
    title,
    description,
    canonical: absolute(path),
    image: absolute(image.src),
    imageAlt: image.alt,
    imageWidth: image.width,
    imageHeight: image.height,
    robots:
      !exists || privateRoute
        ? "noindex, nofollow"
        : "index, follow, max-image-preview:large",
    status: exists ? 200 : 404,
    structuredData: graph,
  };
}

export const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
export const safeJsonLd = (data: unknown) =>
  JSON.stringify(data)
    .replaceAll("<", "\\u003c")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");

export function renderSeoHead(meta: SeoMetadata): string {
  const tags = [
    `<title data-zxxr-seo>${escapeHtml(meta.title)}</title>`,
    `<meta data-zxxr-seo name="description" content="${escapeHtml(meta.description)}">`,
    `<meta data-zxxr-seo name="robots" content="${meta.robots}">`,
    `<link data-zxxr-seo rel="canonical" href="${meta.canonical}">`,
    ...Object.entries({
      "og:type": "website",
      "og:site_name": "ZXXR Store",
      "og:locale": "pt_BR",
      "og:title": meta.title,
      "og:description": meta.description,
      "og:url": meta.canonical,
      "og:image": meta.image,
      "og:image:alt": meta.imageAlt,
      "og:image:width": String(meta.imageWidth),
      "og:image:height": String(meta.imageHeight),
    }).map(
      ([key, value]) =>
        `<meta data-zxxr-seo property="${key}" content="${escapeHtml(value)}">`,
    ),
    `<meta data-zxxr-seo name="twitter:card" content="summary_large_image">`,
    `<meta data-zxxr-seo name="twitter:title" content="${escapeHtml(meta.title)}">`,
    `<meta data-zxxr-seo name="twitter:description" content="${escapeHtml(meta.description)}">`,
    `<meta data-zxxr-seo name="twitter:image" content="${meta.image}">`,
  ];
  if (meta.structuredData.length)
    tags.push(
      `<script data-zxxr-seo type="application/ld+json">${safeJsonLd({ "@context": "https://schema.org", "@graph": meta.structuredData })}</script>`,
    );
  return `<!--zxxr-seo:start-->\n${tags.join("\n")}\n<!--zxxr-seo:end-->`;
}

export function applySeoToHtml(html: string, meta: SeoMetadata): string {
  const cleaned = html
    .replace(/<!--zxxr-seo:start-->[\s\S]*?<!--zxxr-seo:end-->/g, "")
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, "")
    .replace(
      /<meta\b(?=[^>]*(?:name=["'](?:description|robots|twitter:[^"']*)["']|property=["']og:[^"']*["']))[^>]*>/gi,
      "",
    )
    .replace(/<link\b(?=[^>]*rel=["']canonical["'])[^>]*>/gi, "")
    .replace(
      /<script\b(?=[^>]*type=["']application\/ld\+json["'])[^>]*>[\s\S]*?<\/script>/gi,
      "",
    );
  return cleaned.replace(/<\/head>/i, `${renderSeoHead(meta)}\n</head>`);
}

export function updateDocumentSeo(path: string, offer?: ConfirmedOffer): void {
  if (typeof document === "undefined") return;
  const meta = getSeoMetadata(path, offer);
  for (const node of document.head.querySelectorAll(
    '[data-zxxr-seo],title,meta[name="description"],meta[name="robots"],meta[property^="og:"],meta[name^="twitter:"],link[rel="canonical"]',
  ))
    node.remove();
  // The same managed fields are used by direct HTML responses and client navigation.
  const template = document.createElement("template");
  template.innerHTML = renderSeoHead(meta);
  document.head.append(template.content);
  document.title = meta.title;
}

export function renderSitemap(open: boolean): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${
    open
      ? publicSeoPaths()
          .map((path) => {
            const meta = getSeoMetadata(path);
            return `<url><loc>${meta.canonical}</loc><image:image><image:loc>${meta.image}</image:loc><image:title>${escapeHtml(meta.imageAlt)}</image:title></image:image></url>`;
          })
          .join("")
      : ""
  }</urlset>`;
}
