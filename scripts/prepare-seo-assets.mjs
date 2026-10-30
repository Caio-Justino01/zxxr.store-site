import sharp from "sharp";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const publicRoot = path.join(root, "public-store");
const output = path.join(publicRoot, "media", "seo");
const productOutput = path.join(publicRoot, "media", "products");
await Promise.all([
  mkdir(output, { recursive: true }),
  mkdir(productOutput, { recursive: true }),
]);
const width = 1440,
  height = 1800;
const windowWidth = Math.round(width * 0.82),
  windowHeight = Math.round(height * 0.76);
const garmentLeft = Math.round((width - windowWidth) / 2),
  garmentTop = Math.round((height - windowHeight) / 2);
const manifest = {
  description:
    "Static export of the existing v8/v11 shared CSS ice composition; no generated imagery or added detail.",
  sourceHashes: {},
  products: {},
};
const source = async (relative) => {
  const buffer = await readFile(path.join(publicRoot, relative));
  manifest.sourceHashes[relative] = createHash("sha256")
    .update(buffer)
    .digest("hex");
  return buffer;
};
for (const id of ["boca", "spiritual-gangsta"])
  for (const side of ["front", "back"]) {
    const buffer = await source(`media/reference-v3/${id}-${side}.png`);
    const meta = await sharp(buffer).metadata();
    for (const size of [...new Set([320, 640, meta.width])].filter(
      (size) => size <= meta.width,
    )) {
      await sharp(buffer)
        .resize({ width: size, withoutEnlargement: true })
        .webp({ lossless: true, effort: 5 })
        .toFile(path.join(productOutput, `${id}-${side}-${size}.webp`));
    }
    manifest.products[`${id}-${side}`] = {
      width: meta.width,
      height: meta.height,
      source: `media/reference-v3/${id}-${side}.png`,
    };
  }

const shell = await source("media/ice-v8/shell-1440.webp");
const frontSource = await source("media/ice-v8/front-1440.webp");
const engravingSource = await source("media/ice-v8/engraving-1440.webp");
const clip = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect x="100.8" y="144" width="1238.4" height="1530" rx="28.8" fill="white"/></svg>`,
);
async function alphaScale(input, opacity) {
  const { data, info } = await sharp(input)
    .toColourspace("srgb")
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let i = 3; i < data.length; i += 4)
    data[i] = Math.round(data[i] * opacity);
  return sharp(data, { raw: info }).png().toBuffer();
}
const front = await alphaScale(
  await sharp(frontSource)
    .grayscale()
    .composite([{ input: clip, blend: "dest-in" }])
    .png()
    .toBuffer(),
  0.42,
);
const engraving = await alphaScale(
  await sharp(engravingSource)
    .grayscale()
    .linear(1.4, -0.2 * 255)
    .png()
    .toBuffer(),
  0.95,
);
const transparentWindow = {
  create: {
    width: windowWidth,
    height: windowHeight,
    channels: 4,
    background: "#00000000",
  },
};
for (const [id, side] of [
  ["flores", "front"],
  ["me-preservando", "back"],
  ["zxxr-rosa", "back"],
]) {
  const original = await source(`media/reference-v3/${id}-${side}.png`);
  const { data: originalPixels, info } = await sharp(original)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const factor = Math.min(windowWidth / info.width, windowHeight / info.height);
  const fitWidth = Math.round(info.width * factor),
    fitHeight = Math.round(info.height * factor);
  const left = Math.round((windowWidth - fitWidth) / 2),
    top = Math.round((windowHeight - fitHeight) / 2);
  const mask = async (kind) => {
    const buffer = await source(`media/ice-v11-masks/${id}-${kind}-mask.webp`);
    return sharp(buffer).ensureAlpha().extractChannel("alpha").raw().toBuffer();
  };
  const clearMask = await mask("clear"),
    printMask = await mask("print"),
    contactMask = await mask("contact");
  const small = await sharp(original)
    .removeAlpha()
    .blur(Math.max(0.3, (width * 0.0022) / factor))
    .raw()
    .toBuffer();
  const diffuse = await sharp(original)
    .removeAlpha()
    .blur((width * 0.03) / factor)
    .raw()
    .toBuffer();
  const fabric = Buffer.alloc(originalPixels.length);
  const contact = Buffer.alloc(originalPixels.length);
  for (let pixel = 0; pixel < info.width * info.height; pixel++) {
    const a = originalPixels[pixel * 4 + 3];
    const clearAlpha = (a * clearMask[pixel]) / 255;
    const printAlpha = printMask[pixel];
    const sum = clearAlpha + printAlpha;
    for (let c = 0; c < 3; c++)
      fabric[pixel * 4 + c] = sum
        ? Math.round(
            (small[pixel * 3 + c] * clearAlpha +
              diffuse[pixel * 3 + c] * printAlpha) /
              sum,
          )
        : 0;
    fabric[pixel * 4 + 3] = a;
    contact[pixel * 4] = 83;
    contact[pixel * 4 + 1] = 107;
    contact[pixel * 4 + 2] = 123;
    contact[pixel * 4 + 3] = Math.round(contactMask[pixel] * 0.13);
  }
  const fittedFabric = await sharp(fabric, { raw: info })
    .resize(fitWidth, fitHeight)
    .png()
    .toBuffer();
  const fittedDepth = await sharp(contact, { raw: info })
    .resize(fitWidth, fitHeight)
    .png()
    .toBuffer();
  const fittedContactMask = await sharp(contactMask, {
    raw: { width: info.width, height: info.height, channels: 1 },
  })
    .resize(fitWidth, fitHeight)
    .extractChannel(0)
    .raw()
    .toBuffer();
  const monochromeTexture = await sharp(frontSource)
    .resize(windowWidth, windowHeight, { fit: "cover" })
    .grayscale()
    .modulate({ brightness: 1.12 })
    .png()
    .toBuffer();
  const { data: texture, info: textureInfo } = await sharp(monochromeTexture)
    .toColourspace("srgb")
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (textureInfo.channels !== 4)
    throw new Error("Contact texture must decode as RGBA.");
  for (let y = 0; y < windowHeight; y++)
    for (let x = 0; x < windowWidth; x++) {
      const inside =
        x >= left && x < left + fitWidth && y >= top && y < top + fitHeight;
      const alpha = inside
        ? fittedContactMask[(y - top) * fitWidth + x - left]
        : 0;
      texture[(y * windowWidth + x) * 4 + 3] = Math.round(
        ((texture[(y * windowWidth + x) * 4 + 3] * alpha) / 255) * 0.52,
      );
    }
  const fabricWindow = await sharp(transparentWindow)
    .composite([
      { input: fittedFabric, left, top },
      { input: fittedDepth, left, top },
      {
        input: await sharp(texture, { raw: textureInfo }).png().toBuffer(),
        left: 0,
        top: 0,
      },
    ])
    .png()
    .toBuffer();
  if (process.argv.includes("--debug") && id === "zxxr-rosa") {
    await writeFile(
      path.join(root, "work", "seo-debug-fabric.png"),
      fittedFabric,
    );
    await writeFile(
      path.join(root, "work", "seo-debug-window.png"),
      fabricWindow,
    );
    await writeFile(path.join(root, "work", "seo-debug-front.png"), front);
    await writeFile(
      path.join(root, "work", "seo-debug-engraving.png"),
      engraving,
    );
  }
  await sharp(shell)
    .composite([
      { input: fabricWindow, left: garmentLeft, top: garmentTop },
      { input: front, left: 0, top: 0 },
      { input: engraving, left: 0, top: 0 },
    ])
    .webp({ quality: 92, effort: 5 })
    .toFile(path.join(output, `${id}-congelada.webp`));
  manifest.products[id] = {
    width,
    height,
    view: side,
    src: `/media/seo/${id}-congelada.webp`,
  };
}
await writeFile(
  path.join(output, "sources.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  "Prepared responsive original product images and three static shared-ice SEO images.",
);
