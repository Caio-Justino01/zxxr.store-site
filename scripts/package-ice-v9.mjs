import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { products } from "../src/config/products.ts";
import {
  frozenMaterial,
  frozenGarmentView,
} from "../src/config/frozen-material.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const packageName = "matriz-gelo-v9-20261029";
const destination = path.join(root, "entrega", packageName);
const withPreviews = process.argv.includes("--with-previews");
const dimensions = { width: 1440, height: 1800 };
const sizes = [640, 1024, 1440];
const layerNames = ["shell", "front", "engraving"];
const files = [];
const copies = [];
const generatedSources = [];
const escapeHtml = (text) =>
  String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

function target(relative) {
  const resolved = path.resolve(destination, relative);
  if (!resolved.startsWith(destination + path.sep))
    throw new Error("Package target escaped its dedicated directory");
  return resolved;
}
async function save(relative, bytes) {
  const file = target(relative);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, bytes);
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  files.push({
    file: relative.replaceAll("\\", "/"),
    bytes: buffer.length,
    sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
  });
}
async function planCopy(source, relative) {
  const absoluteSource = path.join(root, source);
  await fs.access(absoluteSource);
  target(relative);
  copies.push({ source: absoluteSource, relative });
}
async function inspectImage(source, width, height) {
  const metadata = await sharp(path.join(root, source)).metadata();
  if (
    metadata.width !== width ||
    metadata.height !== height ||
    !metadata.hasAlpha
  ) {
    throw new Error(
      `Expected transparent ${width} × ${height} image: ${source}`,
    );
  }
}

// Validate all inputs before writing the dedicated delivery directory.
if (
  frozenMaterial.width !== dimensions.width ||
  frozenMaterial.height !== dimensions.height ||
  frozenMaterial.contentWidth !== 0.82 ||
  frozenMaterial.contentHeight !== 0.76 ||
  frozenMaterial.engravingWidth !== 0.52 ||
  !frozenMaterial.shell.src.startsWith("/media/ice-v9/")
) {
  throw new Error("The active material must match the shared v9 matrix");
}

for (const name of layerNames) {
  const source = `assets-originals/ice-v9/${name}.png`;
  await inspectImage(source, dimensions.width, dimensions.height);
  await planCopy(source, `material/${name}.png`);
  const generatedSource = `assets-originals/ice-v9/generated/${name}.png`;
  const originalBytes = await fs.readFile(path.join(root, generatedSource));
  const metadata = await sharp(originalBytes).metadata();
  generatedSources.push({
    layer: name,
    source: generatedSource,
    width: metadata.width,
    height: metadata.height,
    sha256: crypto.createHash("sha256").update(originalBytes).digest("hex"),
  });
  for (const width of sizes) {
    const webp = `public-store/media/ice-v9/${name}-${width}.webp`;
    await inspectImage(webp, width, (width * 5) / 4);
    await planCopy(webp, `material/${name}-${width}.webp`);
  }
}

// Shell and front intentionally reuse the same registered organic surface.
// This keeps the rim and diffusion on exactly the same outline.
const [shellSource, frontSource] = await Promise.all(
  ["shell", "front"].map((name) =>
    fs.readFile(path.join(root, `assets-originals/ice-v9/${name}.png`)),
  ),
);
if (!shellSource.equals(frontSource))
  throw new Error("The v9 shell and front must reuse the same organic matrix");

const names = [
  { id: "flores", file: "flores-front.png" },
  { id: "me-preservando", file: "yaji-back.png" },
  { id: "zxxr-rosa", file: "zxxr-back.png" },
];
const pieces = [];
for (const entry of names) {
  const product = products.find((item) => item.id === entry.id);
  if (!product || product.releaseStatus !== "coming-soon")
    throw new Error("Expected future product unavailable: " + entry.id);
  const view = frozenGarmentView(product);
  const source = product[view];
  if (!source.startsWith("/media/reference-v3/"))
    throw new Error("Only original reference cutouts belong in this package");
  await planCopy("public-store" + source, "camisetas/" + entry.file);
  pieces.push({
    id: product.id,
    name: product.name,
    view,
    file: entry.file,
    source,
  });
}

await planCopy("src/frozen-garment.css", "styles/frozen-garment.css");
await planCopy("docs/MATRIZ-GELO-v9-20261029.md", "LEIA-ME.md");
await planCopy("docs/GELO-v9-PROMPTS.json", "proveniencia/prompts.json");

let previewCount = 0;
if (withPreviews) {
  const previewRoot = "previews/matriz-gelo-v9";
  for (const entry of await fs.readdir(path.join(root, previewRoot), {
    withFileTypes: true,
  })) {
    if (entry.isFile() && /\.(?:png|json)$/i.test(entry.name)) {
      await planCopy(`${previewRoot}/${entry.name}`, "capturas/" + entry.name);
      previewCount++;
    }
  }
}

for (const entry of copies)
  await save(entry.relative, await fs.readFile(entry.source));

const image = (name, className = name) =>
  `<img class="ice-layer ice-${className}" src="material/${name}-1440.webp" srcset="${sizes.map((width) => `material/${name}-${width}.webp ${width}w`).join(", ")}" sizes="(max-width:767px) 90vw, 460px" width="1440" height="1800" alt="" draggable="false">`;
const card = (piece) => `<article>
  <span class="ice-block" data-effects="false" data-active="false" data-material="shared-v9" data-image-state="present" role="img" aria-label="${escapeHtml(piece.name)}, camiseta congelada em gelo espesso. Em breve." style="--ice-garment-width:${frozenMaterial.contentWidth * 100}%;--ice-garment-height:${frozenMaterial.contentHeight * 100}%">
    ${image("shell")}
    <span class="ice-garment-window" aria-hidden="true"><img class="ice-original-garment" src="camisetas/${piece.file}" alt="" draggable="false"></span>
    ${image("front")}
    ${image("engraving", "engraving-layer")}
    <span class="ice-atmosphere" aria-hidden="true"><span class="ice-reflection" style="mask-image:url('material/shell-1440.webp');-webkit-mask-image:url('material/shell-1440.webp')"><span class="ice-edge-reflection"></span></span><span class="ice-cold-mist"></span></span>
  </span>
  <div class="piece-caption"><strong>${escapeHtml(piece.name)}</strong><span>Em 2027</span></div>
</article>`;

const html = `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ZXXR — matriz de gelo v9</title>
<link rel="stylesheet" href="styles/frozen-garment.css">
<style>
*{box-sizing:border-box}body{margin:0;color:#101010;font-family:Arial,sans-serif;background:radial-gradient(ellipse at 18% 20%,#f5faff 0%,transparent 42%),radial-gradient(ellipse at 90% 45%,#8fcaff 0%,transparent 46%),linear-gradient(130deg,#3a83f7,#b2d7ff 55%,#f5faff)}
header{max-width:1500px;margin:auto;padding:46px 28px 22px}h1{margin:0 0 12px;font-size:clamp(28px,4vw,52px);letter-spacing:-.04em}p{max-width:670px;line-height:1.6;margin:0}main{max-width:1500px;margin:auto;padding:30px 28px 65px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:34px}article{min-width:0}.piece-caption{display:flex;justify-content:space-between;align-items:center;padding:20px 12px 0;gap:12px}.piece-caption strong{font-size:20px;letter-spacing:-.03em}.piece-caption span{font-size:13px;color:#344b5d}footer{max-width:1500px;margin:auto;padding:0 28px 40px;font-size:13px;line-height:1.7}a{color:inherit;text-underline-offset:3px}@media(max-width:767px){header{padding-top:30px}main{max-width:540px;grid-template-columns:1fr;gap:42px}.piece-caption{padding-top:12px}}
</style></head>
<body><header><h1>Gelo mais leve, contorno orgânico.</h1><p>Flores, Yaji e ZXXR usam a mesma matriz vertical de gelo. A superfície frontal mais leve recupera a leitura dos recortes originais; a atmosfera fica pausada nesta comparação.</p></header>
<main>${pieces.map(card).join("\n")}</main>
<footer>Composição 2D compartilhada em 4:5. Exportações de 1440 × 1800 px, normalizadas a partir das camadas geradas; não representam detalhe nativo 4K.<br><a href="http://127.0.0.1:5274/">Abrir a loja local</a> · <a href="LEIA-ME.md">Ler a documentação do pacote</a></footer></body></html>`;
await save("comparacao.html", html);

await save(
  "manifest.json",
  JSON.stringify(
    {
      package: packageName,
      date: "2026-10-29",
      method:
        "One shared organic 2D ice surface reused as shell and front around unchanged original garment cutouts, plus the preserved v8 engraving; no new garment generation or 3D simulation.",
      material: {
        ...dimensions,
        aspectRatio: "4:5",
        webpSizes: sizes.map((width) => ({ width, height: (width * 5) / 4 })),
        contentWidth: frozenMaterial.contentWidth,
        contentHeight: frozenMaterial.contentHeight,
        engravingWidth: frozenMaterial.engravingWidth,
        engravingOpacity: 0.95,
        frontOpacity: 0.28,
        garmentBlurCqw: 0.22,
        engravingContrast: 1.4,
        sharedShellAndFrontSource: true,
        generatedSources,
        resolutionNote:
          "Delivery matrices are normalized to 1440 × 1800; original generated dimensions are recorded above. Enlargement does not create native 4K detail.",
      },
      products: pieces,
      publication:
        "Local only. No deployment, catalog, database, order or cart changes included.",
      files,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify(
    {
      directory: destination,
      files: files.length,
      capturesCopied: previewCount,
      zipCreated: false,
    },
    null,
    2,
  ),
);
