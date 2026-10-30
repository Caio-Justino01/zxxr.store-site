import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { products } from "../src/config/products.ts";
import { frozenGarmentOptics, frozenGarmentView } from "../src/config/frozen-material.ts";

const manifestPath = new URL("../assets-originals/ice-v11-masks/manifest.json", import.meta.url);
const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
const file = (relative: string) => new URL(relative, new URL("../", import.meta.url));
const digest = (buffer: Buffer) => crypto.createHash("sha256").update(buffer).digest("hex");
const alpha = async (relative: string) => {
  const { data, info } = await sharp(fileURLToPath(file(relative))).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
};
const value = (data: Buffer, index: number) => data[index * 4 + 3];

test("runtime optical masks match their product view, native dimensions and exported manifest URLs", () => {
  const future = products.filter((product) => product.releaseStatus === "coming-soon");
  assert.deepEqual(future.map((product) => product.id).sort(), manifest.products.map((product: any) => product.id).sort());
  for (const product of future) {
    const record = manifest.products.find((entry: any) => entry.id === product.id);
    const optics = frozenGarmentOptics(product);
    assert.ok(optics, `${product.id}: runtime masks are available`);
    assert.equal(frozenGarmentView(product), record.view, `${product.id}: correct original front/back view`);
    assert.equal(product[record.view as "front" | "back"], "/" + record.garment.path.replace(/^public-store\//, ""));
    assert.equal(optics.width, record.width);
    assert.equal(optics.height, record.height);
    for (const name of ["clear", "print", "contact"] as const)
      assert.equal(optics[name], record.masks[name].url, `${product.id}: ${name} uses the exported mask`);
  }
  for (const product of products.filter((product) => product.releaseStatus === "available"))
    assert.equal(frozenGarmentOptics(product), undefined, `${product.id}: available product must not receive frozen masks`);
  assert.equal(frozenGarmentOptics({ id: "missing-product" }), undefined);
});

test("teaser alpha masks retain the intended product views and native framing", async () => {
  assert.deepEqual(manifest.products.map((p: any) => [p.id, p.view, p.width, p.height]), [
    ["flores", "front", 923, 694],
    ["me-preservando", "back", 917, 701],
    ["zxxr-rosa", "back", 761, 573],
  ]);
  for (const product of manifest.products) for (const mask of Object.values(product.masks) as any[]) {
    for (const path of [mask.png, mask.webp]) {
      const metadata = await sharp(fileURLToPath(file(path))).metadata();
      assert.equal(metadata.width, product.width, path);
      assert.equal(metadata.height, product.height, path);
      assert.equal(metadata.hasAlpha, true, path);
    }
  }
});

test("sharp source alpha and opaque diffused RGB reconstruct the original silhouette without gaps", async () => {
  for (const product of manifest.products) {
    const [clear, print, garment] = await Promise.all([
      alpha(product.masks.clear.png), alpha(product.masks.print.png), alpha(product.garment.path),
    ]);
    let featherPixels = 0;
    for (let i = 0; i < product.width * product.height; i++) {
      const c = value(clear.data, i), p = value(print.data, i), g = value(garment.data, i);
      const sharpAlpha = Math.round(g * c / 255);
      assert.ok(Math.abs(sharpAlpha + p - g) <= 1, `${product.id}: reconstructed alpha differs at pixel ${i}`);
      if (g === 255)
        assert.equal(c + p, 255, `${product.id}: complementary alpha inside solid garment at pixel ${i}`);
      assert.ok(p <= g, `${product.id}: print mask outside original alpha at pixel ${i}`);
      if (p > 0 && p < 255) featherPixels++;
    }
    assert.ok(featherPixels > product.width, `${product.id}: softened print transition exists`);
  }
});

test("every source ink pixel is assigned to the diffused layer, never the sharp layer", async () => {
  for (const product of manifest.products) {
    const [clear, print, garment, artwork] = await Promise.all([
      alpha(product.masks.clear.png), alpha(product.masks.print.png),
      alpha(product.garment.path), alpha(product.artwork.path),
    ]);
    let visibleInk = 0;
    for (let i = 0; i < product.width * product.height; i++) {
      if (value(artwork.data, i) === 0) continue;
      visibleInk++;
      assert.equal(value(print.data, i), value(garment.data, i), `${product.id}: uncovered ink at ${i}`);
      assert.equal(value(clear.data, i), 0, `${product.id}: sharp ink remains at ${i}`);
    }
    assert.ok(visibleInk > 100, `${product.id}: expected source print alpha`);
  }
});

test("contact masks stay near real edges and leave the body center unmarked", async () => {
  for (const product of manifest.products) {
    const [contact, garment] = await Promise.all([alpha(product.masks.contact.png), alpha(product.garment.path)]);
    const { width, height } = contact;
    const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height && value(garment.data, y * width + x) > 127;
    let edgeSum = 0, edgeCount = 0, centerMax = 0, minimum = 255, maximum = 0;
    let emphasizedSum = 0, emphasizedCount = 0, sideSum = 0, sideCount = 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const a = value(contact.data, y * width + x);
      maximum = Math.max(maximum, a);
      if (a > 0) minimum = Math.min(minimum, a);
      if (x > width * .42 && x < width * .58 && y > height * .40 && y < height * .68)
        centerMax = Math.max(centerMax, a);
      const edge = solid(x, y) && (!solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1));
      if (!edge) continue;
      edgeSum += a; edgeCount++;
      if (y < height * .3 || y > height * .9) { emphasizedSum += a; emphasizedCount++; }
      if (y > height * .58 && y < height * .77) { sideSum += a; sideCount++; }
    }
    assert.ok(edgeCount > 100 && edgeSum / edgeCount > 5, `${product.id}: visible contact near real perimeter`);
    assert.equal(centerMax, 0, `${product.id}: body center is not a contact band`);
    assert.ok(maximum < 210 && maximum - minimum > 30, `${product.id}: restrained nonuniform contact alpha`);
    assert.ok(emphasizedCount > 0 && sideCount > 0);
    assert.ok(emphasizedSum / emphasizedCount > 1.5 * sideSum / sideCount, `${product.id}: shoulders/hem emphasized over body sides`);
  }
});

test("lossless WebPs retain every PNG mask alpha value", async () => {
  for (const product of manifest.products) for (const mask of Object.values(product.masks) as any[]) {
    const [png, webp] = await Promise.all([alpha(mask.png), alpha(mask.webp)]);
    for (let i = 0; i < product.width * product.height; i++)
      assert.equal(value(png.data, i), value(webp.data, i), `${mask.webp}: changed alpha at ${i}`);
  }
});

test("mask preparation preserves original photographs and source artwork hashes", async () => {
  for (const product of manifest.products) {
    assert.equal(product.originalSourcesUnchanged, true);
    for (const source of [product.garment, product.artwork])
      assert.equal(digest(await fs.readFile(file(source.path))), source.sha256, source.path);
    const matchingOriginal = product.garment.path.replace("public-store/", "public/");
    assert.equal(digest(await fs.readFile(file(matchingOriginal))), product.garment.sha256, `${product.id}: original reference still identical`);
    for (const mask of Object.values(product.masks) as any[]) {
      assert.equal(digest(await fs.readFile(file(mask.png))), mask.pngSha256);
      assert.equal(digest(await fs.readFile(file(mask.webp))), mask.webpSha256);
    }
  }
  assert.deepEqual(JSON.parse(await fs.readFile(file("public-store/media/ice-v11-masks/manifest.json"), "utf8")), manifest);
});
