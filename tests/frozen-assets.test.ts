import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { products } from "../src/config/products.ts";
import {
  frozenMaterial,
  frozenGarmentView,
} from "../src/config/frozen-material.ts";

const publicFile = (path: string) =>
  fileURLToPath(new URL(`../public-store${path}`, import.meta.url));

test("one shared ice matrix ships three responsive transparent layers", async () => {
  for (const name of ["shell", "front", "engraving"] as const) {
    const layer = frozenMaterial[name];
    assert.equal(layer.src, `/media/ice-v8/${name}-1440.webp`);
    const metadata = await sharp(publicFile(layer.src)).metadata();
    assert.equal(metadata.width, layer.width);
    assert.equal(metadata.height, layer.height);
    assert.equal(layer.width / layer.height, 4 / 5);

    const variants = layer.srcSet.split(",").map((entry) => {
      const [path, descriptor] = entry.trim().split(/\s+/);
      return { path, width: Number(descriptor.slice(0, -1)) };
    });
    assert.deepEqual(
      variants.map(({ width }) => width),
      [640, 1024, 1440],
    );
    for (const { path, width } of variants) {
      const file = publicFile(path);
      const variant = await sharp(file).metadata();
      assert.equal(variant.width, width);
      assert.equal(variant.height, (width * 5) / 4);
      assert.equal(variant.hasAlpha, true, `${name}: alpha channel`);
      const stats = await sharp(file).stats();
      assert.equal(stats.channels[3].min, 0, `${name}: transparent exterior`);
      assert.ok(stats.channels[3].max > 0, `${name}: visible material`);
    }
  }
});

test("shared matrix retains transparent PNG sources with matching framing", async () => {
  for (const name of ["shell", "front", "engraving"] as const) {
    const source = fileURLToPath(
      new URL(`../assets-originals/ice-v8/${name}.png`, import.meta.url),
    );
    const metadata = await sharp(source).metadata();
    assert.equal(metadata.hasAlpha, true, `${name}: original alpha`);
    assert.equal(
      metadata.width! / metadata.height!,
      4 / 5,
      `${name}: original frame`,
    );
    assert.ok(
      metadata.width! >= frozenMaterial.width,
      `${name}: no upscaled delivery`,
    );
    const stats = await sharp(source).stats();
    assert.equal(stats.channels[3].min, 0);
    assert.ok(stats.channels[3].max > 0);
  }
});

test("front ice surface has no transparent hole in the center", async () => {
  const source = fileURLToPath(
    new URL("../assets-originals/ice-v8/front.png", import.meta.url),
  );
  const files = [
    source,
    ...frozenMaterial.front.srcSet
      .split(",")
      .map((entry) => publicFile(entry.trim().split(/\s+/)[0])),
  ];
  for (const file of files) {
    const { width, height } = await sharp(file).metadata();
    assert.ok(width && height);
    const meanAlpha = async (start: number, end: number) => {
      const left = Math.floor(width * start);
      const top = Math.floor(height * start);
      const stats = await sharp(file)
        .extract({
          left,
          top,
          width: Math.floor(width * end) - left,
          height: Math.floor(height * end) - top,
        })
        .stats();
      return stats.channels[3].mean;
    };
    const [center, face] = await Promise.all([
      meanAlpha(0.45, 0.55),
      meanAlpha(0.2, 0.8),
    ]);
    assert.ok(face > 0, `${file}: the front face must remain visible`);
    assert.ok(
      center >= face * 0.6,
      `${file}: center alpha ${center.toFixed(2)} is below 60% of face alpha ${face.toFixed(2)}`,
    );
  }
});

test("the visible shell silhouette is a portrait block, not a landscape image on a tall canvas", async () => {
  const source = fileURLToPath(
    new URL("../assets-originals/ice-v8/shell.png", import.meta.url),
  );
  const files = [
    source,
    ...frozenMaterial.shell.srcSet
      .split(",")
      .map((entry) => publicFile(entry.trim().split(/\s+/)[0])),
  ];
  for (const file of files) {
    const { data, info } = await sharp(file)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let left = info.width,
      right = -1,
      top = info.height,
      bottom = -1;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const alpha =
          data[(y * info.width + x) * info.channels + info.channels - 1];
        if (alpha <= 32) continue;
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
    assert.ok(right >= left && bottom >= top, `${file}: visible shell`);
    const ratio = (right - left + 1) / (bottom - top + 1);
    assert.ok(
      Math.abs(ratio - 0.8) <= 0.05,
      `${file}: alpha silhouette ratio ${ratio.toFixed(3)} must stay near 0.8`,
    );
  }
});

test("future pieces keep the intended original view independently of legacy renders", () => {
  const future = products.filter(
    (product) => product.releaseStatus === "coming-soon",
  );
  assert.deepEqual(
    future.map((product) => [product.id, frozenGarmentView(product)]),
    [
      ["flores", "front"],
      ["me-preservando", "back"],
      ["zxxr-rosa", "back"],
    ],
  );
  assert.equal(frozenGarmentView({}), "back");
  assert.equal(frozenGarmentView({ heroView: "front" }), "front");
  assert.equal(frozenMaterial.contentWidth, 0.82);
  assert.equal(frozenMaterial.contentHeight, 0.76);
  assert.equal(frozenMaterial.engravingWidth, 0.52);
});
