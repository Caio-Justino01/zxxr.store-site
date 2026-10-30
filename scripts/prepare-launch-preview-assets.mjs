import sharp from "sharp";
import { copyFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const source = process.argv[2];
if (!source)
  throw new Error(
    "Provide the approved imagegen PNG path; the original will be copied, never overwritten.",
  );
const originals = new URL("../assets-originals/launch-v1/", import.meta.url);
const web = new URL("../public-store/media/launch-v1/", import.meta.url);
await mkdir(originals, { recursive: true });
await mkdir(web, { recursive: true });
const original = new URL("unicorn-clock-v1.png", originals);
await copyFile(source, original);
const meta = await sharp(fileURLToPath(original)).metadata();
if (!meta.hasAlpha)
  throw new Error("The float must retain real alpha transparency.");
for (const width of [480, 900, 1254]) {
  const result = await sharp(fileURLToPath(original))
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 94, alphaQuality: 100, effort: 6 })
    .toFile(fileURLToPath(new URL(`unicorn-clock-v1-${width}.webp`, web)));
  console.log(
    `${result.width} × ${result.height}: ${Math.round(result.size / 1024)} KB`,
  );
}
