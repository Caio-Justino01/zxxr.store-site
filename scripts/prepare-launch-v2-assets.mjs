import sharp from "sharp";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const output = new URL("public-store/media/launch-v2/", root);
const masters = new URL("assets-originals/launch-v2/", root);
await mkdir(output, { recursive: true });
await mkdir(masters, { recursive: true });
const floatSource = process.argv[2];
if (!floatSource)
  throw new Error("Provide the approved transparent imagegen PNG.");
await copyFile(floatSource, new URL("unicorn-clock-steel-v2.png", masters));
const float = await sharp(floatSource).metadata();
if (!float.hasAlpha || float.width !== float.height)
  throw new Error("Expected a square transparent float.");
for (const width of [480, 900, float.width]) {
  await sharp(floatSource)
    .resize({ width })
    .webp({ quality: 94, alphaQuality: 100, effort: 6 })
    .toFile(
      fileURLToPath(new URL(`unicorn-clock-steel-v2-${width}.webp`, output)),
    );
}

const sources = [
  [
    "court",
    "public-store/media/ensaio-drop/ensaiodrop1zxxrfoto06-banner-v1-1920.webp",
    "Ensaio ZXXR na quadra: as três pessoas e suas camisetas, fotografia completa.",
  ],
  [
    "beach",
    "work/drop-collage/assets/collage-beach-v1.png",
    "O ensaio no bar à beira da praia, fotografia completa.",
  ],
  [
    "chairs",
    "work/drop-collage/assets/collage-chairs-v1.png",
    "Duas pessoas usando as camisetas ZXXR nas cadeiras, fotografia completa.",
  ],
  [
    "garden",
    "work/drop-collage/assets/collage-garden-v1.png",
    "Ensaio com as três pessoas no jardim, fotografia completa.",
  ],
  [
    "pier",
    "public-store/media/ensaio-drop/ensaiodrop1zxxrfoto01-1680.webp",
    "Camiseta Yaji em uso no píer entre os barcos, fotografia completa.",
  ],
  [
    "mercedes",
    "../work/publish-zxxr-store/assets-originals/campaign/ensaiodrop1zxxrfoto07-v3-usuario.jpg",
    "Emoção na Mercedes, versão final editada e aprovada pelo usuário, fotografia completa.",
  ],
  [
    "pool",
    "public-store/media/ensaio-drop/ensaiodrop1zxxrfoto08-v2-1122.webp",
    "Spiritual Gangsta na piscina, fotografia completa.",
  ],
  [
    "billiards",
    "public-store/media/ensaio-drop/ensaiodrop1zxxrfoto10-v4-1086.webp",
    "Camiseta ZXXR na mesa de sinuca azul, fotografia completa.",
  ],
];
const photos = [];
const provenance = [];
for (const [id, relative, alt] of sources) {
  const source = new URL(relative, root);
  const buffer = await readFile(source);
  const meta = await sharp(buffer).metadata();
  const dimensions = meta.autoOrient ?? meta;
  const width = dimensions.width;
  const height = dimensions.height;
  const sizes = [
    ...new Set([480, 960, Math.min(1920, width)].filter((w) => w <= width)),
  ].sort((a, b) => a - b);
  for (const size of sizes) {
    await sharp(buffer)
      .rotate()
      .resize({ width: size, withoutEnlargement: true })
      .webp({ quality: 94, effort: 5 })
      .toFile(fileURLToPath(new URL(`photo-${id}-${size}.webp`, output)));
  }
  const base = `/media/launch-v2/photo-${id}`;
  photos.push({
    id,
    width,
    height,
    src: `${base}-${sizes.at(-1)}.webp`,
    srcSet: sizes.map((w) => `${base}-${w}.webp ${w}w`).join(", "),
    alt,
  });
  provenance.push({
    id,
    source: relative,
    width,
    height,
    sha256: createHash("sha256").update(buffer).digest("hex"),
  });
}
await writeFile(
  new URL("launch-preview/photos-v2.json", root),
  JSON.stringify(photos, null, 2) + "\n",
);
await writeFile(
  new URL("SOURCES.json", masters),
  JSON.stringify(provenance, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    {
      float: [float.width, float.height],
      photos: photos.map(({ id, width, height }) => ({ id, width, height })),
    },
    null,
    2,
  ),
);
