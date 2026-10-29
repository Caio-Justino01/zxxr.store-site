import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import {
  prepareMosaicImages,
  type MosaicImage,
} from "../launch-preview/mosaic-readiness.ts";
import previews from "../launch-preview/mosaic-previews.json" with { type: "json" };
import { launchConfig } from "../launch-preview/config.ts";

class ImageStub extends EventTarget implements MosaicImage {
  complete = false;
  naturalWidth = 0;
  decode: undefined | (() => Promise<void>) = () => Promise.resolve();
  load() {
    this.complete = true;
    this.naturalWidth = 160;
    this.dispatchEvent(new Event("load"));
  }
}
test("cached previews are decoded before the opening is ready", async () => {
  const image = new ImageStub();
  image.complete = true;
  image.naturalWidth = 160;
  let release!: () => void;
  image.decode = () =>
    new Promise((resolve) => {
      release = resolve;
    });
  let ready = false;
  const promise = prepareMosaicImages([image], {
    signal: new AbortController().signal,
  }).then((result) => {
    ready = true;
    return result;
  });
  await Promise.resolve();
  assert.equal(ready, false);
  release();
  assert.deepEqual(await promise, ["ready"]);
});
test("slow image loads do not run the opening clock ahead of the photographs", async () => {
  const a = new ImageStub(),
    b = new ImageStub();
  let ready = false;
  const promise = prepareMosaicImages([a, b], {
    signal: new AbortController().signal,
  }).then((result) => {
    ready = true;
    return result;
  });
  a.load();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(ready, false);
  b.load();
  assert.deepEqual(await promise, ["ready", "ready"]);
});
test("older browsers without decode and valid Safari decode rejections still show images", async () => {
  const a = new ImageStub(),
    b = new ImageStub();
  a.decode = undefined;
  b.decode = () => Promise.reject(new Error("Decoding rejected"));
  const promise = prepareMosaicImages([a, b], {
    signal: new AbortController().signal,
  });
  a.load();
  b.load();
  assert.deepEqual(await promise, ["ready", "ready"]);
});
test("image errors and stalled decoders settle within the deadline", async () => {
  const a = new ImageStub(),
    b = new ImageStub(),
    c = new ImageStub();
  c.decode = () => new Promise(() => {});
  const promise = prepareMosaicImages([a, b, c], {
    signal: new AbortController().signal,
    timeoutMs: 15,
  });
  a.dispatchEvent(new Event("error"));
  c.load();
  assert.deepEqual(await promise, ["failed", "timeout", "timeout"]);
});
test("unmount and replay cancel pending work without starting a discarded opening", async () => {
  const controller = new AbortController();
  const promise = prepareMosaicImages([new ImageStub()], {
    signal: controller.signal,
  });
  controller.abort();
  assert.deepEqual(await promise, ["aborted"]);
  assert.deepEqual(
    await prepareMosaicImages([new ImageStub()], { signal: controller.signal }),
    ["aborted"],
  );
});
test("all eight approved photographs have valid embedded JPEGs independent of network and WebP support", async () => {
  assert.equal(Object.keys(previews).length, 8);
  let total = 0;
  for (const photo of launchConfig.photos) {
    const src = previews[photo.id as keyof typeof previews];
    assert.match(src, /^data:image\/jpeg;base64,/);
    const bytes = Buffer.from(src.split(",")[1], "base64");
    const meta = await sharp(bytes).metadata();
    assert.equal(meta.format, "jpeg");
    assert.equal(meta.width, 160);
    assert.ok(
      Math.abs(meta.width! / meta.height! - photo.width / photo.height) < 0.02,
    );
    total += bytes.length;
  }
  assert.ok(total < 50000, "inline previews should remain a small bootstrap");
});
test("reduced motion keeps the photographic introduction instead of skipping it", async () => {
  const source = await readFile(
    new URL("../launch-preview/LaunchPreview.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /function firstVisit|useState\(firstVisit\)/);
  assert.match(source, /if \(!mosaicReady\)/);
  const branch = source.slice(
    source.indexOf("if (reduced) {"),
    source.indexOf("timeline.fromTo("),
  );
  assert.match(branch, /timeline\.set\(tiles/);
  assert.doesNotMatch(branch, /setIntro\(false\)/);
});
