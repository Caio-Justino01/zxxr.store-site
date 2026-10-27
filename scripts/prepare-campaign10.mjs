import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const source = process.argv[2];
const revision = process.argv[3] ?? "";
if (revision && !/^v[1-9]\d*$/.test(revision))
  throw new Error("Invalid revision. Use v2, v3, ...");
const suffix = revision ? `-${revision}` : "";
if (!source)
  throw new Error(
    "Usage: node scripts/prepare-campaign10.mjs <approved-master.png> [v2]",
  );
const root = fileURLToPath(new URL("../", import.meta.url));
const metadata = await sharp(source).metadata();
if (metadata.width !== 1086 || metadata.height !== 1448)
  throw new Error("Expected portrait master 1086 x 1448.");
for (const directory of ["public", "public-store"]) {
  const target = path.join(root, directory, "media/ensaio-drop");
  await fs.mkdir(target, { recursive: true });
  for (const width of [640, 1086])
    await sharp(source)
      .resize({ width })
      .webp({ quality: 92, effort: 6 })
      .toFile(
        path.join(target, `ensaiodrop1zxxrfoto10${suffix}-${width}.webp`),
      );
}
console.log(
  "Campaign 10 exported: 640/1086 WebP. Master and original artwork preserved.",
);
