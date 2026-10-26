import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { previewProducts, getPreviewGallery } from "../src/config/prelaunch.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const previewRoot = path.join(root, "public-prelaunch");
const originalRoot = path.join(root, "public");

test("prelaunch catalog has no price or technical content and only the person photograph stays clear", async () => {
  assert.equal(previewProducts.length, 5);
  for (const product of previewProducts) {
    assert.equal(Object.hasOwn(product, "price"), false);
    assert.equal(product.description, "");
    assert.equal(product.color, "");
    for (const side of ["front", "back"] as const)
      assert.match(product[side], /^\/media\/frozen-v1\//);
    for (const image of getPreviewGallery(product)) {
      assert.equal(
        image.frozen,
        !(product.id === "me-preservando" && image.id === "campaign"),
      );
      assert.match(
        image.src,
        image.frozen
          ? /^\/media\/frozen-v1\//
          : /^\/media\/ensaio-drop\/ensaiodrop1zxxrfoto01-/,
      );
      const meta = await sharp(path.join(previewRoot, image.src)).metadata();
      assert.equal(meta.width, image.width);
      assert.equal(meta.height, image.height);
    }
  }
});

test("all clear campaign assets are people photographs and remain byte-identical to the approved sources", () => {
  const directory = "media/ensaio-drop";
  for (const name of fs.readdirSync(path.join(previewRoot, directory))) {
    assert.match(
      name,
      /^(?:collage-(?:garden|chairs|beach)-v1-|ensaiodrop1zxxrfoto01-|ensaiodrop1zxxrfoto06-banner-v1-)/,
    );
    assert.deepEqual(
      fs.readFileSync(path.join(previewRoot, directory, name)),
      fs.readFileSync(path.join(originalRoot, directory, name)),
      name,
    );
  }
  for (const folder of [
    "reference-v3",
    "source",
    "artwork-v4",
    "products",
    "prints",
    "studio-photos",
  ]) {
    assert.equal(fs.existsSync(path.join(previewRoot, "media", folder)), false);
  }
});

test("frozen cutouts keep their original framing but never contain the original product pixels", async () => {
  for (const product of previewProducts) {
    for (const side of ["front", "back"] as const) {
      const frozenFile = path.join(previewRoot, product[side]);
      const originalFile = path.join(
        originalRoot,
        "media/reference-v3",
        `${product.id}-${side}.png`,
      );
      const [frozen, original, a, b] = await Promise.all([
        sharp(frozenFile).ensureAlpha().raw().toBuffer(),
        sharp(originalFile).ensureAlpha().raw().toBuffer(),
        sharp(frozenFile).metadata(),
        sharp(originalFile).metadata(),
      ]);
      assert.equal(a.width, b.width);
      assert.equal(a.height, b.height);
      assert.notEqual(
        Buffer.compare(frozen, original),
        0,
        `${product.id}/${side}: a clear original was copied into prelaunch`,
      );
    }
  }
});
