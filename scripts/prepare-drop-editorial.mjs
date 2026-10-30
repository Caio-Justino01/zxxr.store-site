import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const output = new URL("../public/media/ensaio-drop/", import.meta.url);
await mkdir(output, { recursive: true });
const selected = process.argv.slice(2);
for (const [number, widths] of [
  ["01", [640, 1120, 1680]],
  ["02", [640, 1087]],
  ["03", [640, 1087]],
  ["04", [640, 1024]],
  ["05", [640, 1024]],
  ["06", [640, 1086]],
  ["07", [640, 1086]],
  ["08", [640, 1122]],
  ["09", [640, 1087]],
]) {
  if (selected.length && !selected.includes(number)) continue;
  const revision = number === "08" ? "-v2" : "";
  const source = new URL(
    number === "08"
      ? "../../entrega/ensaiodrop1zxxr/troca-piscina-porsche/foto08/correcao-v2/ensaiodrop1zxxrfoto08-v2.jpg"
      : Number(number) >= 8
      ? `../../entrega/ensaiodrop1zxxr/troca-piscina-porsche/foto${number}/ensaiodrop1zxxrfoto${number}.jpg`
      : Number(number) >= 4
      ? `../../entrega/ensaiodrop1zxxr/boca-fotos04a07/foto${number}/ensaiodrop1zxxrfoto${number}-com-estampa.png`
      : `../../entrega/ensaiodrop1zxxr/ensaiodrop1zxxrfoto${number}.jpg`,
    import.meta.url,
  );
  for (const width of widths) {
    const result = await sharp(fileURLToPath(source))
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 94, effort: 5 })
      .toFile(
        fileURLToPath(
          new URL(`ensaiodrop1zxxrfoto${number}${revision}-${width}.webp`, output),
        ),
      );
    console.log(
      `foto${number}: ${result.width} × ${result.height}, ${Math.round(result.size / 1024)} KB`,
    );
  }
}
