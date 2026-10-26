import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { products } from "../src/config/products.ts";
import { getProductGallery } from "../src/config/product-gallery.ts";

test("gallery frames use actual source dimensions and preserve original front/back assets", async () => {
  for (const product of products) {
    const gallery = getProductGallery(product);
    assert.equal(new Set(gallery.map((image) => image.id)).size, gallery.length);
    for (const side of ["front", "back"] as const) {
      assert.equal(gallery.find((image) => image.id === side)?.src, product[side]);
    }
    for (const image of gallery) {
      const path = fileURLToPath(new URL(`../public/${image.src.slice(1)}`, import.meta.url));
      const metadata = await sharp(path).metadata();
      assert.equal(image.width, metadata.width, `${product.id}/${image.id} width`);
      assert.equal(image.height, metadata.height, `${product.id}/${image.id} height`);
      for (const candidate of image.srcSet?.split(",") ?? []) {
        const [source, descriptor] = candidate.trim().split(/\s+/);
        const variant = await sharp(fileURLToPath(new URL(`../public/${source.slice(1)}`, import.meta.url))).metadata();
        assert.equal(variant.width, Number(descriptor.slice(0, -1)), `${product.id} responsive source`);
      }
    }
  }
});

test("Boca contains only the selected Mercedes photograph and front/back product views", () => {
  const product = products.find((product) => product.id === "boca")!;
  assert.deepEqual(getProductGallery(product).map((image) => image.id), ["ensaio-07", "front", "back"]);
});

test("Spiritual opens in the pool and Rosa on the Porsche, each followed by its own product views", () => {
  for (const [id, photo] of [["spiritual-gangsta", "ensaio-08"], ["zxxr-rosa", "ensaio-09"]]) {
    const product = products.find((product) => product.id === id)!;
    assert.deepEqual(getProductGallery(product).map((image) => image.id), [photo, "front", "back"]);
  }
});
