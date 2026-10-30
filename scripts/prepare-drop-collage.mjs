import sharp from "sharp";
import { mkdir, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const input = new URL("../work/drop-collage/assets/", import.meta.url);
const output = new URL("../public/media/ensaio-drop/", import.meta.url);
await mkdir(output, { recursive: true });
for (const name of ["garden", "chairs", "beach"]) {
  const source = new URL(`collage-${name}-v1.png`, input);
  try {
    await access(source);
  } catch {
    continue;
  }
  for (const width of [480, 800]) {
    const target = new URL(`collage-${name}-v1-${width}.webp`, output);
    const result = await sharp(fileURLToPath(source))
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 94, effort: 5 })
      .toFile(fileURLToPath(target));
    console.log(
      `${name}: ${result.width} x ${result.height}, ${Math.round(result.size / 1024)} KB`,
    );
  }
}
