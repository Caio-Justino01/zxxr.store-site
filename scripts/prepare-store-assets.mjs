import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const source = path.join(root, "public");
const destination = path.join(root, "public-store");
const generated = new Set();
async function copy(relative) {
  const target = path.join(destination, relative);
  await fs.mkdir(path.dirname(target), { recursive: true });
  const bytes = await fs.readFile(path.join(source, relative));
  await fs.writeFile(target, /\.(svg|txt)$/.test(relative)
    ? Buffer.from(bytes.toString("utf8").replace(/[\t ]+$/gm, "")) : bytes);
  generated.add(relative);
}
async function directory(relative) {
  for (const entry of await fs.readdir(path.join(source, relative), { withFileTypes: true })) {
    const name = `${relative}/${entry.name}`;
    if (entry.isDirectory()) await directory(name); else await copy(name);
  }
}
for (const name of ["brand", "fonts", "media/artist", "media/reference-v3"]) await directory(name);
const campaign = [
  ...[640, 1120, 1680].map(w => `ensaiodrop1zxxrfoto01-${w}.webp`),
  ...[["02",1087],["07-v2",1086],["08-v2",1122],["10-v4",1086]].flatMap(([id,width]) => [640,width].map(w => `ensaiodrop1zxxrfoto${id}-${w}.webp`)),
  ...["garden","chairs","beach"].flatMap(id => [480,800].map(w => `collage-${id}-v1-${w}.webp`)),
  ...["960","1440","1920","portrait-640","portrait-1086"].map(s => `ensaiodrop1zxxrfoto06-banner-v1-${s}.webp`),
];
for (const name of campaign) await copy(`media/ensaio-drop/${name}`);
async function audit(relative = "") {
  for (const entry of await fs.readdir(path.join(destination, relative), { withFileTypes:true })) {
    const name = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) await audit(name);
    else if (!generated.has(name)) throw new Error(`Unexpected store asset: ${name}`);
  }
}
await audit();
console.log(`Prepared ${generated.size} original storefront assets; no frozen images.`);
