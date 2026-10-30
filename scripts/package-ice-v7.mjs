import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { products } from "../src/config/products.ts";
import {
  frozenMaterial,
  frozenGarmentView,
} from "../src/config/frozen-material.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const packageName = "matriz-gelo-v7-20261029";
const destination = path.join(root, "entrega", packageName);
const withPreviews = process.argv.includes("--with-previews");
const files = [];
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
async function copy(source, relative) {
  await save(relative, await fs.readFile(source));
}
async function optional(source, relative) {
  try {
    await copy(source, relative);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

for (const name of ["shell", "front", "engraving"]) {
  await copy(
    path.join(root, "assets-originals/ice-v7", name + ".png"),
    "material/" + name + ".png",
  );
  for (const width of [640, 1024, 1440])
    await copy(
      path.join(
        root,
        "public-store/media/ice-v7",
        name + "-" + width + ".webp",
      ),
      "material/" + name + "-" + width + ".webp",
    );
}

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
  await copy(
    path.join(root, "public-store", source),
    "camisetas/" + entry.file,
  );
  pieces.push({
    id: product.id,
    name: product.name,
    view,
    file: entry.file,
    source,
  });
}

await copy(
  path.join(root, "src/frozen-garment.css"),
  "styles/frozen-garment.css",
);
await copy(path.join(root, "docs/MATRIZ-GELO-v7-20261029.md"), "LEIA-ME.md");
await optional(
  path.join(root, "docs/GELO-v7-PROMPTS.json"),
  "proveniencia/prompts.json",
);

const image = (name, className = name) =>
  `<img class="ice-layer ice-${className}" src="material/${name}-1440.webp" srcset="material/${name}-640.webp 640w, material/${name}-1024.webp 1024w, material/${name}-1440.webp 1440w" sizes="(max-width:767px) 90vw, 460px" width="1440" height="1080" alt="" draggable="false">`;
const card = (piece) => `<article>
  <span class="ice-block" data-effects="false" data-active="false" data-material="shared-v7" data-image-state="present" role="img" aria-label="${escapeHtml(piece.name)}, camiseta congelada em gelo espesso. Em breve." style="--ice-garment-width:${frozenMaterial.contentWidth * 100}%;--ice-garment-height:${frozenMaterial.contentHeight * 100}%">
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
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ZXXR — matriz de gelo v7</title>
<link rel="stylesheet" href="styles/frozen-garment.css">
<style>
*{box-sizing:border-box}body{margin:0;color:#101010;font-family:Arial,sans-serif;background:radial-gradient(ellipse at 18% 20%,#f5faff 0%,transparent 42%),radial-gradient(ellipse at 90% 45%,#8fcaff 0%,transparent 46%),linear-gradient(130deg,#3a83f7,#b2d7ff 55%,#f5faff)}
header{max-width:1500px;margin:auto;padding:46px 28px 22px}h1{margin:0 0 12px;font-size:clamp(28px,4vw,52px);letter-spacing:-.04em}p{max-width:670px;line-height:1.6;margin:0}main{max-width:1500px;margin:auto;padding:30px 28px 65px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:34px}article{min-width:0}.piece-caption{display:flex;justify-content:space-between;align-items:center;padding:20px 12px 0;gap:12px}.piece-caption strong{font-size:20px;letter-spacing:-.03em}.piece-caption span{font-size:13px;color:#344b5d}footer{max-width:1500px;margin:auto;padding:0 28px 40px;font-size:13px;line-height:1.7}a{color:inherit;text-underline-offset:3px}@media(max-width:767px){header{padding-top:30px}main{max-width:540px;grid-template-columns:1fr;gap:42px}.piece-caption{padding-top:12px}}
</style></head>
<body><header><h1>Uma matriz. Três próximos desejos.</h1><p>Os recortes originais ficam entre as mesmas camadas de gelo. Esta comparação estática usa o CSS da apresentação local, com atmosfera pausada.</p></header>
<main>${pieces.map(card).join("\n")}</main>
<footer>Composição 2D compartilhada. As estampas e as proporções dos recortes originais são preservadas.<br><a href="http://127.0.0.1:5274/">Abrir a loja local</a> · <a href="LEIA-ME.md">Ler a documentação do pacote</a></footer></body></html>`;
await save("comparacao.html", html);

let previewCount = 0;
if (withPreviews) {
  const previewRoot = path.join(root, "previews/matriz-gelo-v7");
  for (const entry of await fs.readdir(previewRoot, { withFileTypes: true })) {
    if (
      entry.isFile() &&
      (/\.(?:png|jpe?g|webp)$/i.test(entry.name) ||
        ["responsivo.json", "compatibilidade.json"].includes(entry.name))
    ) {
      await copy(path.join(previewRoot, entry.name), "capturas/" + entry.name);
      previewCount++;
    }
  }
}
await save(
  "manifest.json",
  JSON.stringify(
    {
      package: packageName,
      date: "2026-10-29",
      method:
        "Shared 2D ice shell/front/engraving around original product cutouts; no new 3D cloth simulation.",
      material: {
        width: frozenMaterial.width,
        height: frozenMaterial.height,
        contentWidth: frozenMaterial.contentWidth,
        contentHeight: frozenMaterial.contentHeight,
        engravingWidth: frozenMaterial.engravingWidth,
      },
      products: pieces,
      publication:
        "Local only. No deployment, catalog price changes or order data included.",
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
