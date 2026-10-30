import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("../", import.meta.url));
const [name, input] = process.argv.slice(2);
if (!["shell", "front", "engraving"].includes(name) || !input)
  throw new Error("Usage: node scripts/prepare-ice-v8.mjs shell|front|engraving generated.png");
const originals = path.join(root, "assets-originals/ice-v8");
const output = path.join(root, "public-store/media/ice-v8");
await fs.mkdir(path.join(originals, "generated"), { recursive: true });
await fs.mkdir(output, { recursive: true });
await fs.copyFile(input, path.join(originals, "generated", `${name}.png`));
const metadata = await sharp(input).metadata();
let source = sharp(input).resize(1440, 1800, { fit: "contain", background: "#00000000" });
if (name === "engraving") {
  // Register only the transparent inscription: preserve its natural stroke ratio.
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, right = -1, top = info.height, bottom = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] <= 8) continue;
    left = Math.min(left, x); right = Math.max(right, x);
    top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  if (right < left) throw new Error("Empty engraving layer");
  const width = Math.round(1440 * .52);
  const height = Math.round(width * (bottom - top + 1) / (right - left + 1));
  const paddingX = Math.floor((1440 - width) / 2);
  const paddingY = Math.floor((1800 - height) / 2);
  source = sharp(input).extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
    .resize(width, height).extend({ left: paddingX, right: 1440 - width - paddingX,
      top: paddingY, bottom: 1800 - height - paddingY, background: "#00000000" });
}
const png = path.join(originals, `${name}.png`);
await source.png().toFile(png);
for (const width of [640, 1024, 1440])
  await sharp(png).resize({ width }).webp({ quality: 94, alphaQuality: 100, effort: 6 })
    .toFile(path.join(output, `${name}-${width}.webp`));
console.log(JSON.stringify({ name, input: { width: metadata.width, height: metadata.height }, png, output: [1440, 1800] }));
