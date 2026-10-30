import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
const root = fileURLToPath(new URL("../", import.meta.url));
const [id, input] = process.argv.slice(2);
if (!["flores","yaji","zxxr"].includes(id) || !input) throw new Error("Usage: node scripts/prepare-ice-v6.mjs flores|yaji|zxxr generated.png");
const originals = path.join(root,"assets-originals/ice-v6");
const output = path.join(root,"public-store/media/ice-v6");
await fs.mkdir(originals,{recursive:true});
await fs.mkdir(output,{recursive:true});
const png = path.join(originals,id + "-ice-v6.png");
await fs.copyFile(input,png);
const metadata = await sharp(png).metadata();
const variants = [];
for (const width of [640,1024,1440].filter(w => w <= metadata.width)) {
  const name = id + "-ice-v6-" + width + ".webp";
  const info = await sharp(png).resize({width}).webp({quality:94,alphaQuality:100,effort:6}).toFile(path.join(output,name));
  variants.push({src:"/media/ice-v6/" + name,width:info.width,height:info.height,bytes:info.size});
}
console.log(JSON.stringify({id,source:input,png,width:metadata.width,height:metadata.height,hasAlpha:metadata.hasAlpha,variants},null,2));
