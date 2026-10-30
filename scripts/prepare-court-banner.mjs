import { mkdir, copyFile, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import sharp from "sharp";

const root = fileURLToPath(new URL("../", import.meta.url));
const delivery = resolve(root, "../entrega/ensaiodrop1zxxr/banner-quadra-v1");
const campaign = resolve(root, "assets-originals/campaign");
const source = resolve(campaign, "ensaiodrop1zxxrfoto06-original.png");
const generated = resolve(
  delivery,
  "ensaiodrop1zxxrfoto06-banner-v1-expansao.png",
);
const master = resolve(delivery, "ensaiodrop1zxxrfoto06-banner-v1.png");
const publicDir = resolve(root, "public/media/ensaio-drop");
await Promise.all([
  mkdir(delivery, { recursive: true }),
  mkdir(publicDir, { recursive: true }),
]);

// Restore source pixels over the generated center. Feather only the narrow
// background edges: every person and garment is inside the fully opaque core.
const original = await sharp(source)
  .resize(600, 800)
  .ensureAlpha()
  .raw()
  .toBuffer();
const smooth = (value) => {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
};
for (let y = 0; y < 800; y++) {
  for (let x = 0; x < 600; x++) {
    original[(y * 600 + x) * 4 + 3] = Math.round(
      255 * Math.min(smooth(x / 48), smooth((599 - x) / 16)),
    );
  }
}
const protectedPhoto = await sharp(original, {
  raw: { width: 600, height: 800, channels: 4 },
})
  .png()
  .toBuffer();
await sharp(generated)
  .resize(1920, 800, { fit: "fill" })
  .composite([{ input: protectedPhoto, left: 660, top: 0 }])
  .removeAlpha()
  .png()
  .toFile(master);

const files = [];
for (const width of [960, 1440, 1920]) {
  const file = `ensaiodrop1zxxrfoto06-banner-v1-${width}.webp`;
  const info = await sharp(master)
    .resize(width)
    .webp({ lossless: true, effort: 6 })
    .toFile(resolve(publicDir, file));
  files.push({
    file,
    width: info.width,
    height: info.height,
    bytes: info.size,
  });
}
for (const width of [640, 1086]) {
  const file = `ensaiodrop1zxxrfoto06-banner-v1-portrait-${width}.webp`;
  const info = await sharp(source)
    .resize(width)
    .webp({ lossless: true, effort: 6 })
    .toFile(resolve(publicDir, file));
  files.push({
    file,
    width: info.width,
    height: info.height,
    bytes: info.size,
  });
}
const hash = async (file) =>
  createHash("sha256")
    .update(await readFile(file))
    .digest("hex");
await writeFile(
  resolve(delivery, "SOURCE.json"),
  JSON.stringify(
    {
      source: "ensaiodrop1zxxrfoto06-com-estampa.png",
      sourceDimensions: { width: 1086, height: 1448 },
      sourceSha256: await hash(source),
      tool: "Built-in image_gen; side expansion only, followed by source-pixel restoration",
      selectedExpansion: "Second generation: protected-source-canvas.png, 12:5",
      master: {
        file: "ensaiodrop1zxxrfoto06-banner-v1.png",
        width: 1920,
        height: 800,
      },
      sourcePlacement: { left: 660, top: 0, width: 600, height: 800 },
      protectedCore: { left: 708, top: 0, width: 536, height: 800 },
      processing:
        "Only the left 48 and right 16 background columns of the source rectangle are feathered. All three people, faces, clothing, artwork and shoes use opaque original source pixels. All WebP files use lossless encoding. Mobile uses the original photograph without expansion or cropping.",
      files,
    },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify({ master, files }, null, 2));
