import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { launchConfig } from "../launch-preview/config.ts";

const root = new URL("../", import.meta.url);
test("v1 float remains preserved while v2 ships real alpha and responsive square images", async () => {
  const png = new URL("assets-originals/launch-v1/unicorn-clock-v1.png", root);
  const meta = await sharp(fileURLToPath(png)).metadata();
  assert.equal(meta.width, 1254);
  assert.equal(meta.height, 1254);
  assert.equal(meta.hasAlpha, true);
  for (const width of [480, 900, 1254]) {
    const image = await readFile(
      new URL(
        `public-store/media/launch-v2/unicorn-clock-steel-v2-${width}.webp`,
        root,
      ),
    );
    const info = await sharp(image).metadata();
    assert.equal(info.width, width);
    assert.equal(info.height, width);
    assert.equal(info.hasAlpha, true);
    const { data, info: raw } = await sharp(image)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    assert.equal(data[3], 0, "top left pixel must be transparent");
    assert.equal(
      data[(raw.width - 1) * 4 + 3],
      0,
      "top right pixel must be transparent",
    );
    assert.ok(
      image.length < 400_000,
      "responsive asset must stay below 400 KB",
    );
  }
});
test("all eight approved scenes keep complete native aspect ratios and the store entry stays independent", async () => {
  assert.equal(launchConfig.photos.length, 8);
  assert.deepEqual(
    launchConfig.photos.map((p) => p.id),
    [
      "court",
      "beach",
      "chairs",
      "garden",
      "pier",
      "mercedes",
      "pool",
      "billiards",
    ],
  );
  for (const image of launchConfig.photos) {
    const file = await readFile(new URL(`public-store${image.src}`, root));
    assert.ok(file.length > 1000);
    const info = await sharp(file).metadata();
    assert.equal(info.format, "webp");
    assert.equal(info.width, image.width);
    assert.equal(info.height, image.height);
  }
  const main = await readFile(new URL("src/main.tsx", root), "utf8");
  assert.doesNotMatch(main, /LaunchPreview|launch-preview|\/api\/launch/);
  const storeVite = await readFile(new URL("vite.config.ts", root), "utf8");
  assert.doesNotMatch(storeVite, /previewClock|launch-preview/);
});
