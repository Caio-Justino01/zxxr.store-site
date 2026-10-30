import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("../", import.meta.url));
const [name, input] = process.argv.slice(2);
if (!["shell", "front", "engraving"].includes(name) || !input)
  throw new Error("Usage: node scripts/prepare-ice-v7.mjs shell|front|engraving generated.png");
const originals = path.join(root, "assets-originals/ice-v7");
const output = path.join(root, "public-store/media/ice-v7");
await fs.mkdir(path.join(originals, "generated"), { recursive: true });
await fs.mkdir(output, { recursive: true });
await fs.copyFile(input, path.join(originals, "generated", `${name}.png`));
const png = path.join(originals, `${name}.png`);
// Only normalize canvas size/registration; no generated replacement clothing.
let source = sharp(input).resize(1440, 1080, { fit: "contain", background: "#00000000" });
if (name === "engraving") {
  source = sharp(input).resize(528, 396, { fit: "contain", background: "#00000000" })
    .extend({ top: 342, bottom: 342, left: 456, right: 456, background: "#00000000" });
}
await source.png().toFile(png);
for (const width of [640, 1024, 1440])
  await sharp(png).resize({ width }).webp({ quality: 94, alphaQuality: 100, effort: 6 })
    .toFile(path.join(output, `${name}-${width}.webp`));
console.log(JSON.stringify({ name, png, metadata: await sharp(png).metadata() }));
