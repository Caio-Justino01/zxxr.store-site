import test from "node:test";
import assert from "node:assert/strict";
import { launchConfig } from "../launch-preview/config.ts";
import { mosaicLayout } from "../launch-preview/mosaic-layout.ts";
import { driftAxis, floatLayout } from "../launch-preview/float-motion.ts";

test("the eight photographs fill the viewport without gaps, overlaps or missing scenes", () => {
  for (const [width, height] of [
    [300, 636],
    [370, 740],
    [748, 920],
    [1004, 664],
    [1420, 796],
    [2540, 976],
    [300, 464],
  ]) {
    const layout = mosaicLayout(launchConfig.photos, width, height);
    assert.equal(layout.rects.length, 8);
    assert.equal(new Set(layout.rects.map((r) => r.id)).size, 8);
    let area = 0;
    for (const r of layout.rects) {
      const photo = launchConfig.photos.find((p) => p.id === r.id)!;
      assert.ok(photo.width > 0 && photo.height > 0);
      assert.ok(
        r.x >= -1e-6 &&
          r.y >= -1e-6 &&
          r.x + r.width <= width + 1e-6 &&
          r.y + r.height <= height + 1e-6,
      );
      assert.ok(
        r.width >= 40 && r.height >= 40,
        "photograph became unreadably small: " + r.id,
      );
      area += r.width * r.height;
    }
    for (let i = 0; i < 8; i++)
      for (let j = i + 1; j < 8; j++) {
        const a = layout.rects[i],
          b = layout.rects[j];
        const overlapX =
          Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
        const overlapY =
          Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
        assert.ok(overlapX <= 1e-6 || overlapY <= 1e-6, "photographs overlap");
      }
    assert.ok(
      Math.abs(area - layout.width * layout.height) < 1e-5,
      "the mosaic must have flush internal edges",
    );
    assert.equal(layout.coverage, 1);
    assert.equal(layout.x, 0);
    assert.equal(layout.y, 0);
    assert.equal(layout.width, width);
    assert.equal(layout.height, height);
  }
});
test("drift stays bounded for many turns, preserves velocity through turns, and never rebounds", () => {
  for (const range of [18, 60, 240, 1500])
    for (const speed of [6.12, 10.32, 18.92]) {
      for (let t = 0; t < 300; t += 0.11) {
        const { position, velocity } = driftAxis(t, range, speed);
        assert.ok(position >= -1e-7 && position <= range + 1e-7);
        assert.ok(Math.abs(velocity) <= speed + 1e-7);
        const next = driftAxis(t + 1e-5, range, speed);
        assert.ok(
          Math.abs(next.velocity - velocity) < 0.02,
          "velocity jumps instead of steering smoothly",
        );
        assert.ok(
          Math.abs((next.position - position) / 1e-5 - velocity) < 0.02,
          "position and velocity disagree",
        );
      }
      assert.ok(
        Math.abs(driftAxis(0, range, speed).position - range / 2) < 1e-6,
        "drift starts in the center",
      );
    }
  assert.deepEqual(driftAxis(100, 8, 12), { position: 4, velocity: 0 });
  assert.deepEqual(driftAxis(100, 0, 12), { position: 0, velocity: 0 });
});
test("the complete rotated float stays in its own area, including short mobile screens", () => {
  for (const [w, h] of [
    [300, 286],
    [370, 400],
    [748, 650],
    [1004, 340],
    [1420, 520],
    [2540, 760],
  ]) {
    const l = floatLayout(w, h);
    const radius =
      (l.size * (Math.cos(Math.PI / 120) + Math.sin(Math.PI / 120) - 1)) / 2;
    for (let t = 0; t < 180; t += 0.25) {
      const x = l.inset + driftAxis(t, l.rangeX, l.speed * 0.86).position;
      const y = l.inset + driftAxis(t, l.rangeY, l.speed * 0.51, true).position;
      assert.ok(x - radius >= -1e-6 && y - radius >= -1e-6);
      assert.ok(
        x + l.size + radius <= w + 1e-6 && y + l.size + radius <= h + 1e-6,
      );
    }
  }
});
