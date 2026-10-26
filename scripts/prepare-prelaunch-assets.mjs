import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const original = path.join(root, "public");
const output = path.join(root, "public-prelaunch");
const ids = [
  "boca",
  "flores",
  "me-preservando",
  "spiritual-gangsta",
  "zxxr-rosa",
];
const campaigns = [
  ["flores", "02", 1087],
  ["boca", "07", 1086],
  ["spiritual-gangsta", "08-v2", 1122],
  ["zxxr-rosa", "09", 1087],
];
const clearPhotos = [
  ...[640, 1120, 1680].map((w) => `ensaiodrop1zxxrfoto01-${w}.webp`),
  ...["garden", "chairs", "beach"].flatMap((id) =>
    [480, 800].map((w) => `collage-${id}-v1-${w}.webp`),
  ),
  ...["960", "1440", "1920", "portrait-640", "portrait-1086"].map(
    (s) => `ensaiodrop1zxxrfoto06-banner-v1-${s}.webp`,
  ),
];
const generated = new Set();
async function save(relative, data) {
  const target = path.join(output, relative);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, data);
  generated.add(relative.replaceAll("\\", "/"));
}
async function copy(relative) {
  const data = await fs.readFile(path.join(original, relative));
  await save(relative, /\.(?:svg|txt)$/.test(relative)
    ? Buffer.from(data.toString("utf8").replace(/[\t ]+$/gm, "")) : data);
}
async function copyDirectory(relative) {
  for (const entry of await fs.readdir(path.join(original, relative), {
    withFileTypes: true,
  })) {
    const name = `${relative}/${entry.name}`;
    if (entry.isDirectory()) await copyDirectory(name);
    else await copy(name);
  }
}
async function freeze(relative, target, targetWidth) {
  const input = path.join(original, relative);
  const meta = await sharp(input).metadata();
  // Destroy fine detail before enlargement. No unblurred bitmap is served in
  // this branch, even when CSS, JavaScript or backdrop-filter is disabled.
  const lowDetail = await sharp(input).resize({ width: 80 }).blur(6).toBuffer();
  const width = targetWidth ?? meta.width;
  const height = Math.round((width * meta.height) / meta.width);
  const bitmap = await sharp(lowDetail)
    .resize({ width, height, fit: "fill" })
    .modulate({ saturation: 0.2, brightness: 1.12 })
    .blur(9)
    .webp({ lossless: true })
    .toBuffer();
  await save(target, bitmap);
}

for (const directory of ["brand", "fonts", "media/artist"])
  await copyDirectory(directory);
for (const file of clearPhotos) await copy(`media/ensaio-drop/${file}`);
for (const id of ids) {
  for (const side of ["front", "back"]) {
    await freeze(
      `media/reference-v3/${id}-${side}.png`,
      `media/frozen-v1/${id}-${side}.webp`,
    );
  }
}
for (const [id, number, width] of campaigns) {
  for (const size of [640, width]) {
    await freeze(
      `media/ensaio-drop/ensaiodrop1zxxrfoto${number}-${width}.webp`,
      `media/frozen-v1/${id}-campaign-${size}.webp`,
      size,
    );
  }
}
await save(
  "404.html",
  Buffer.from(
    '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Não encontrado · ZXXR Store</title><p>Este arquivo não está disponível.</p><a href="/">Voltar ao drop</a></html>',
  ),
);
// An unexpected file makes the pipeline fail instead of silently publishing it.
async function audit(directory = "") {
  for (const entry of await fs.readdir(path.join(output, directory), {
    withFileTypes: true,
  })) {
    const relative = directory ? `${directory}/${entry.name}` : entry.name;
    if (entry.isDirectory()) await audit(relative);
    else if (!generated.has(relative))
      throw new Error(`Unexpected prelaunch asset: ${relative}`);
  }
}
await audit();
console.log(
  `Prepared ${generated.size} prelaunch assets; original photographs preserved.`,
);
