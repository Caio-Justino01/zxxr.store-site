import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = `${root}/assets-originals/campaign/ensaiodrop1zxxrfoto06-original.png`;
const base = `${root}/public/media/ensaio-drop/ensaiodrop1zxxrfoto06-banner-v1`;

test("campaign desktop and portrait variants preserve their full framing", async () => {
  for (const [suffix, width, height] of [
    ["960", 960, 400],
    ["1440", 1440, 600],
    ["1920", 1920, 800],
    ["portrait-640", 640, 853],
    ["portrait-1086", 1086, 1448],
  ] as const) {
    const meta = await sharp(`${base}-${suffix}.webp`).metadata();
    assert.equal(meta.width, width);
    assert.equal(meta.height, height);
    assert.equal(meta.hasAlpha, false, "The banner must fill its entire frame");
  }
});

test("all three people and shirt artworks use original source pixels in the panorama", async () => {
  const original = await sharp(source)
    .resize(600, 800)
    .removeAlpha()
    .png()
    .toBuffer();
  const expected = await sharp(original)
    .extract({ left: 48, top: 0, width: 536, height: 800 })
    .raw()
    .toBuffer();
  const actual = await sharp(`${base}-1920.webp`)
    .extract({ left: 708, top: 0, width: 536, height: 800 })
    .removeAlpha()
    .raw()
    .toBuffer();
  assert.equal(
    Buffer.compare(actual, expected),
    0,
    "Faces, poses, clothing and print pixels must not be regenerated",
  );
});

test("the mobile photograph retains the complete original at native resolution", async () => {
  const expected = await sharp(source).removeAlpha().raw().toBuffer();
  const actual = await sharp(`${base}-portrait-1086.webp`)
    .removeAlpha()
    .raw()
    .toBuffer();
  assert.equal(Buffer.compare(actual, expected), 0);
});
