import test from "node:test";
import assert from "node:assert/strict";
import {
  boatBob,
  cornerPoint,
  isIdleDue,
  makeDvdLeg,
  nextCorner,
  sampleDvdLeg,
  viewportBounds,
  type CornerSequence,
  type Pose,
} from "../launch-preview/idle-motion.ts";
import { floatLayout } from "../launch-preview/float-motion.ts";

function seeded(seed: number) {
  return () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

test("idle begins at ten seconds and is disabled by pause, hidden tabs or reduced motion", () => {
  assert.equal(isIdleDue(10999, 1000, true, true), false);
  assert.equal(isIdleDue(11000, 1000, true, true), true);
  assert.equal(isIdleDue(20000, 1000, false, true), false);
  assert.equal(isIdleDue(20000, 1000, true, false), false);
  assert.equal(isIdleDue(20000, 19999, true, true), false);
});

test("the boat stays anchored within its small normal-mode envelope", () => {
  assert.deepEqual(boatBob(0), { x: 0, y: 0, rotation: 0 });
  for (let time = 0; time < 180; time += 0.023) {
    const p = boatBob(time),
      next = boatBob(time + 0.001);
    assert.ok(
      Math.abs(p.x) <= 2 && Math.abs(p.y) <= 4 && Math.abs(p.rotation) <= 0.6,
    );
    assert.ok(Math.hypot(next.x - p.x, next.y - p.y) < 0.005);
    assert.ok(Math.abs(next.rotation - p.rotation) < 0.001);
  }
});

test("random corner tours cover all four regions, include diagonals and avoid immediate backtracking", () => {
  for (let seed = 0; seed < 80; seed++) {
    const random = seeded(seed),
      sequence: CornerSequence = { bag: [], last: null, previous: null };
    const tour: number[] = [];
    for (let cycle = 0; cycle < 20; cycle++) {
      const group = Array.from({ length: 4 }, () =>
        nextCorner(sequence, random),
      );
      assert.equal(new Set(group).size, 4);
      tour.push(...group);
    }
    for (let i = 1; i < tour.length; i++) {
      assert.notEqual(tour[i], tour[i - 1]);
      if (i > 1) assert.notEqual(tour[i], tour[i - 2]);
    }
    assert.ok(tour.some((corner, i) => i > 0 && (corner ^ tour[i - 1]) === 3));
  }
});

test("DVD legs use approved speeds, stop smoothly and never leave the viewport", () => {
  for (const [w, h, stageH] of [
    [320, 568, 286],
    [390, 844, 400],
    [768, 1024, 650],
    [1024, 768, 340],
    [1440, 900, 520],
    [2560, 1080, 760],
  ]) {
    const size = floatLayout(w - 40, stageH).size;
    const bounds = viewportBounds(w, h, size, 20, 190);
    const reserve =
      (size * (Math.cos(Math.PI / 120) + Math.sin(Math.PI / 120) - 1)) / 2;
    let from: Pose = {
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2,
      rotation: 0,
    };
    const random = seeded(w),
      sequence: CornerSequence = { bag: [], last: null, previous: null };
    for (let i = 0; i < 16; i++) {
      const corner = nextCorner(sequence, random);
      const leg = makeDvdLeg(from, bounds, corner, w < 700, random);
      assert.ok(
        leg.speed >= (w < 700 ? 18 : 30) && leg.speed <= (w < 700 ? 24 : 45),
      );
      assert.deepEqual(sampleDvdLeg(leg, 0), from);
      assert.deepEqual(sampleDvdLeg(leg, leg.duration), leg.to);
      assert.deepEqual(
        { x: leg.to.x, y: leg.to.y },
        cornerPoint(bounds, corner),
      );
      for (let t = 0; t < leg.duration; t += 0.17) {
        const p = sampleDvdLeg(leg, t);
        assert.ok(p.x + 20 - reserve >= -1e-6 && p.y + 190 - reserve >= -1e-6);
        assert.ok(
          p.x + 20 + size + reserve <= w + 1e-6 &&
            p.y + 190 + size + reserve <= h + 1e-6,
        );
        assert.ok(Math.abs(p.rotation) <= 1.5);
        const next = sampleDvdLeg(leg, t + 0.001);
        assert.ok(
          Math.hypot(next.x - p.x, next.y - p.y) / 0.001 <= leg.speed + 0.001,
        );
      }
      const nearStart = sampleDvdLeg(leg, 0.001),
        nearEnd = sampleDvdLeg(leg, leg.duration - 0.001);
      assert.ok(
        Math.hypot(nearStart.x - from.x, nearStart.y - from.y) / 0.001 < 0.01,
      );
      assert.ok(
        Math.hypot(nearEnd.x - leg.to.x, nearEnd.y - leg.to.y) / 0.001 < 0.01,
      );
      from = { ...leg.to };
    }
  }
});

test("viewport bounds account for scrolling, visual viewport offsets and a degenerate leg", () => {
  const a = viewportBounds(390, 844, 280, 20, 190);
  const b = viewportBounds(390, 844, 280, 20, 90, 0, 0);
  assert.ok(Math.abs(b.minY - a.minY - 100) < 1e-9);
  const shifted = viewportBounds(390, 844, 280, 20, 190, 5, 15);
  assert.ok(Math.abs(shifted.minX - a.minX - 5) < 1e-9);
  assert.ok(Math.abs(shifted.minY - a.minY - 15) < 1e-9);
  const from = { ...cornerPoint(a, 0), rotation: 0 };
  const leg = makeDvdLeg(from, a, 0, true, () => 0.5);
  assert.deepEqual(sampleDvdLeg(leg, 0), leg.to);
});
