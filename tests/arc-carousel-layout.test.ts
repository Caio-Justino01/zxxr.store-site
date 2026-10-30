import test from "node:test";
import assert from "node:assert/strict";
import {
  getArcLayout,
  arcDistance,
  arcPose,
} from "../src/lib/arc-carousel-layout.ts";

const dimensions = [320, 390, 768, 1024, 1366, 1440, 1600, 2560];
test("responsive arc fits one or two complete central product and information units", () => {
  for (const screen of dimensions) {
    const width = Math.min(screen, 1600),
      visible = screen >= 768 ? 2 : 1;
    const l = getArcLayout(width, visible);
    assert.ok(l.pieceWidth <= 460 || visible === 1);
    for (let i = 0; i < visible; i++) {
      const p = arcPose(i, l),
        angle = (Math.abs(p.rotation) * Math.PI) / 180;
      const half =
        (l.pieceWidth * (Math.cos(angle) + 0.75 * Math.sin(angle))) / 2;
      assert.ok(p.x - half >= -width / 2 && p.x + half <= width / 2);
      assert.ok(
        28 + l.imageHeight + 14 + (width >= 1100 ? 72 : 82) <= l.height,
      );
      assert.equal(p.infoOpacity, 1);
      assert.equal(p.scale, 1);
      assert.ok(Math.abs(p.rotation) <= 1.5);
    }
    if (visible === 2) {
      assert.equal(arcPose(0, l).x, -arcPose(1, l).x);
      assert.equal(arcPose(0, l).y, arcPose(1, l).y);
    }
  }
});
test("every circular selection has the requested central count, two previews, and no duplicates", () => {
  for (const visible of [1, 2] as const)
    for (let first = -12; first <= 12; first++) {
      const distances = Array.from({ length: 5 }, (_, i) =>
        arcDistance(i, first, 5, visible),
      );
      assert.equal(new Set(distances).size, 5);
      assert.equal(
        distances.filter((d) => d >= 0 && d < visible).length,
        visible,
      );
      assert.equal(
        distances.filter((d) => d === -1 || d === visible).length,
        2,
      );
      assert.equal(arcDistance(((first % 5) + 5) % 5, first, 5, visible), 0);
    }
});
test("neighbors stay lower, show only an edge, and have no visible information balloon", () => {
  for (const screen of dimensions) {
    const l = getArcLayout(Math.min(screen, 1600), screen >= 768 ? 2 : 1);
    for (const d of [-1, l.visible]) {
      const p = arcPose(d, l);
      assert.equal(p.y, 32);
      assert.equal(p.infoOpacity, 0);
      assert.equal(Math.abs(p.rotation), 5);
      const edge = l.width / 2 - Math.abs(p.x) + (l.pieceWidth * p.scale) / 2;
      assert.ok(edge >= 43 && edge <= 73);
    }
  }
});
test("wrapping a moving slot never jumps while it is visible", () => {
  for (const visible of [1, 2] as const) {
    const l = getArcLayout(1000, visible);
    for (let i = 0; i < 5; i++) {
      let previous = arcPose(arcDistance(i, 0, 5, visible), l);
      for (let t = 0.01; t <= 5; t += 0.01) {
        const pose = arcPose(arcDistance(i, t, 5, visible), l);
        if (
          previous.opacity > 0 &&
          pose.opacity > 0 &&
          Math.abs(previous.x) < l.width / 2 + l.pieceWidth / 2 &&
          Math.abs(pose.x) < l.width / 2 + l.pieceWidth / 2
        )
          assert.ok(Math.abs(pose.x - previous.x) < l.step * 0.06);
        previous = pose;
      }
    }
  }
});

test("arc position, tilt, scale and their first derivatives are continuous at every join", () => {
  const epsilon = 1e-5;
  for (const visible of [1, 2] as const) {
    const layout = getArcLayout(1440, visible);
    for (const join of [-1, 0, visible - 1, visible]) {
      const before = arcPose(join - epsilon, layout);
      const at = arcPose(join, layout);
      const after = arcPose(join + epsilon, layout);
      for (const key of ["x", "y", "scale", "rotation"] as const) {
        assert.ok(
          Math.abs(before[key] - after[key]) < 0.02,
          `${visible} pieces, ${key}, position ${join}`,
        );
        const incoming = (at[key] - before[key]) / epsilon;
        const outgoing = (after[key] - at[key]) / epsilon;
        assert.ok(
          Math.abs(incoming - outgoing) < 0.02,
          `${visible} pieces, ${key}, velocity ${join}: ${incoming}/${outgoing}`,
        );
      }
    }
  }
});
