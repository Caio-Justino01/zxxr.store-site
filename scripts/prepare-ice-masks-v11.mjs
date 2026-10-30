import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// Analytical alpha masks only. Original garment and print RGB are never written.
const root = fileURLToPath(new URL("../", import.meta.url));
const originalDirectory = "assets-originals/ice-v11-masks";
const webDirectory = "public-store/media/ice-v11-masks";
const entries = [
  { id: "flores", view: "front", width: 923, height: 694 },
  { id: "me-preservando", view: "back", width: 917, height: 701 },
  { id: "zxxr-rosa", view: "back", width: 761, height: 573 },
];
const hash = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const clamp = (x, low = 0, high = 1) => Math.min(high, Math.max(low, x));
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const parameters = {
  printPaddingWidth: 0.025,
  printFeatherWidth: 0.012,
  contactMaximumWidth: 0.025,
  contactFeatherWidth: 0.005,
  complement: "regionAlpha = expanded and feathered print ROI; clearAlpha = 255 - regionAlpha; printAlpha = round(regionAlpha * original garment alpha / 255). Sharp original alpha times clearAlpha plus opaque blurred RGB times printAlpha reconstructs original garment alpha within one level.",
  contact: "Distance band around the original garment silhouette; low frequency analytical alpha variation, biased toward shoulders, sleeves and hem. No synthetic photograph or texture.",
};

function alphaBounds(data, width, height) {
  let left = width, right = -1, top = height, bottom = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (data[(y * width + x) * 4 + 3] === 0) continue;
    left = Math.min(left, x); right = Math.max(right, x);
    top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  if (right < left) throw new Error("Print mask source has no visible alpha");
  return { left, top, right: right + 1, bottom: bottom + 1 };
}

// Exact squared Euclidean distance to a binary edge, in O(width * height).
function distanceToEdge(edge, width, height) {
  const intermediate = new Float64Array(width * height);
  const result = new Float64Array(width * height);
  const maximum = Math.max(width, height);
  const f = new Float64Array(maximum);
  const d = new Float64Array(maximum);
  const v = new Int32Array(maximum);
  const z = new Float64Array(maximum + 1);
  function transform(length) {
    let k = 0;
    v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
    for (let q = 1; q < length; q++) {
      let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * (q - v[k]));
      while (s <= z[k]) {
        k--;
        s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * (q - v[k]));
      }
      k++; v[k] = q; z[k] = s; z[k + 1] = Infinity;
    }
    k = 0;
    for (let q = 0; q < length; q++) {
      while (z[k + 1] < q) k++;
      d[q] = (q - v[k]) ** 2 + f[v[k]];
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) f[x] = edge[y * width + x] ? 0 : 1e12;
    transform(width);
    for (let x = 0; x < width; x++) intermediate[y * width + x] = d[x];
  }
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) f[y] = intermediate[y * width + x];
    transform(height);
    for (let y = 0; y < height; y++) result[y * width + x] = Math.sqrt(d[y]);
  }
  return result;
}

function garmentEdge(garment, width, height) {
  const edge = new Uint8Array(width * height);
  const solid = (x, y) => x >= 0 && y >= 0 && x < width && y < height && garment[(y * width + x) * 4 + 3] > 127;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (!solid(x, y)) continue;
    if (!solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1))
      edge[y * width + x] = 1;
  }
  return edge;
}

function createMasks(garment, art, width, height) {
  const bounds = alphaBounds(art, width, height);
  const padding = width * parameters.printPaddingWidth;
  const feather = width * parameters.printFeatherWidth;
  const box = { left: bounds.left - padding, right: bounds.right + padding,
    top: bounds.top - padding, bottom: bounds.bottom + padding };
  const clear = Buffer.alloc(width * height * 4, 255);
  const print = Buffer.alloc(width * height * 4, 255);
  const contact = Buffer.alloc(width * height * 4, 255);
  const edge = garmentEdge(garment, width, height);
  const distance = distanceToEdge(edge, width, height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const index = y * width + x, offset = index * 4 + 3;
    const dx = Math.max(box.left - x, 0, x - box.right);
    const dy = Math.max(box.top - y, 0, y - box.bottom);
    const inkCoverage = 1 - smoothstep(0, feather, Math.hypot(dx, dy));
    const regionAlpha = Math.round(255 * inkCoverage);
    const printAlpha = Math.round(regionAlpha * garment[offset] / 255);
    print[offset] = printAlpha;
    clear[offset] = 255 - regionAlpha;

    const nx = x / Math.max(1, width - 1), ny = y / Math.max(1, height - 1);
    const slow = 0.5 + 0.25 * Math.sin(nx * 17.3 + ny * 9.7) + 0.25 * Math.sin(nx * 7.1 - ny * 21.1 + 1.8);
    const bandWidth = width * parameters.contactMaximumWidth * (0.55 + 0.45 * clamp(slow));
    const edgeFeather = width * parameters.contactFeatherWidth;
    const band = Math.exp(-0.5 * (distance[index] / (bandWidth * 0.48)) ** 2)
      * (1 - smoothstep(Math.max(0, bandWidth - edgeFeather), bandWidth, distance[index]));
    const shoulders = 0.8 * Math.exp(-(((ny - 0.14) / 0.16) ** 2));
    const sleeves = 0.92 * smoothstep(0.19, 0.30, Math.abs(nx - 0.5))
      * (1 - smoothstep(0.48, 0.63, ny));
    const hem = 0.92 * smoothstep(0.79, 0.96, ny);
    const region = 0.045 + Math.max(shoulders, sleeves, hem) * 0.68;
    const irregularity = 0.35 + 0.65 * clamp(slow);
    contact[offset] = Math.round(255 * band * region * irregularity);
  }
  return { masks: { clear, print, contact }, bounds, paddedBounds: box };
}

await fs.mkdir(path.join(root, originalDirectory), { recursive: true });
await fs.mkdir(path.join(root, webDirectory), { recursive: true });
const manifest = {
  version: 11,
  method: "Analytical alpha masks; original garment photographs and RGB print samples are never edited or exported by this script.",
  parameters,
  products: [],
};
for (const entry of entries) {
  const filename = `${entry.id}-${entry.view}.png`;
  const garmentPath = `public-store/media/reference-v3/${filename}`;
  const artworkPath = `public/media/artwork-v4/${filename}`;
  const [garmentBytes, artworkBytes] = await Promise.all([
    fs.readFile(path.join(root, garmentPath)), fs.readFile(path.join(root, artworkPath)),
  ]);
  const [garmentImage, artworkImage] = await Promise.all([
    sharp(garmentBytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(artworkBytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);
  for (const image of [garmentImage, artworkImage]) {
    if (image.info.width !== entry.width || image.info.height !== entry.height || image.info.channels !== 4)
      throw new Error(`Unexpected native framing for ${filename}`);
  }
  const { masks, bounds, paddedBounds } = createMasks(garmentImage.data, artworkImage.data, entry.width, entry.height);
  const record = { ...entry, garment: { path: garmentPath, sha256: hash(garmentBytes) },
    artwork: { path: artworkPath, sha256: hash(artworkBytes) },
    artworkBounds: bounds, paddedPrintBounds: paddedBounds, masks: {} };
  for (const [name, pixels] of Object.entries(masks)) {
    const basename = `${entry.id}-${name}-mask`;
    const pngPath = `${originalDirectory}/${basename}.png`;
    const webpPath = `${webDirectory}/${basename}.webp`;
    const png = await sharp(pixels, { raw: { width: entry.width, height: entry.height, channels: 4 } }).png().toBuffer();
    const webp = await sharp(png).webp({ lossless: true, alphaQuality: 100, effort: 6 }).toBuffer();
    await Promise.all([
      fs.writeFile(path.join(root, pngPath), png), fs.writeFile(path.join(root, webpPath), webp),
    ]);
    record.masks[name] = { png: pngPath, webp: webpPath, url: `/media/ice-v11-masks/${basename}.webp`,
      pngSha256: hash(png), webpSha256: hash(webp) };
  }
  const [garmentAfter, artworkAfter] = await Promise.all([
    fs.readFile(path.join(root, garmentPath)), fs.readFile(path.join(root, artworkPath)),
  ]);
  if (hash(garmentAfter) !== record.garment.sha256 || hash(artworkAfter) !== record.artwork.sha256)
    throw new Error(`Original source changed during mask preparation: ${filename}`);
  record.originalSourcesUnchanged = true;
  manifest.products.push(record);
}
const manifestText = JSON.stringify(manifest, null, 2) + "\n";
await Promise.all([
  fs.writeFile(path.join(root, originalDirectory, "manifest.json"), manifestText),
  fs.writeFile(path.join(root, webDirectory, "manifest.json"), manifestText),
]);
console.log(JSON.stringify({ products: manifest.products.map(({ id, width, height }) => ({ id, width, height })),
  files: 18, manifest: `${originalDirectory}/manifest.json`, originalSourcesUnchanged: true }, null, 2));
