import test from "node:test";
import assert from "node:assert/strict";
import {
  rouletteDistance,
  rouletteGestureStep,
  roulettePose,
  rouletteRebasedProgress,
  wrapRouletteIndex,
} from "../src/lib/roulette-layout.ts";

test("roulette wraps both ways and has exactly one center without duplicate positions", () => {
  for (let active = 0; active < 5; active++) {
    const distances = Array.from({ length: 5 }, (_, index) =>
      rouletteDistance(index, active, 5),
    );
    assert.equal(new Set(distances).size, 5);
    assert.deepEqual(
      [...distances].sort((a, b) => a - b),
      [-2, -1, 0, 1, 2],
    );
  }
  assert.equal(wrapRouletteIndex(-1, 5), 4);
  assert.equal(wrapRouletteIndex(5, 5), 0);
});

test("one gesture moves at most one shirt and short slow gestures cancel", () => {
  assert.equal(rouletteGestureStep(-20, -0.1, 200), 0);
  assert.equal(rouletteGestureStep(-37, -0.1, 200), 1);
  assert.equal(rouletteGestureStep(37, 0.1, 200), -1);
  assert.equal(rouletteGestureStep(-13, -0.4, 200), 1);
  assert.equal(rouletteGestureStep(-1000, -3, 200), 1);
  assert.equal(rouletteGestureStep(0, -0.5, 200), 1);
  assert.equal(rouletteGestureStep(0, 0.5, 200), -1);
  assert.equal(rouletteGestureStep(8, -0.5, 200), 1);
  assert.equal(rouletteGestureStep(-8, 0.5, 200), -1);
  assert.equal(rouletteGestureStep(13, -0.5, 200), -1);
  assert.equal(rouletteGestureStep(-13, 0.5, 200), 1);
});

test("interrupting a snap rebases without any shirt changing its circular position", () => {
  const normalized = (value: number) => ((((value + 2.5) % 5) + 5) % 5) - 2.5;
  for (let base = 0; base < 5; base++) {
    for (const direction of [-1, 1]) {
      const next = wrapRouletteIndex(base + direction, 5);
      for (const progress of [
        direction * 0.1,
        direction * 0.45,
        direction * 0.9,
      ]) {
        const rebased = rouletteRebasedProgress(progress, base, next, 5);
        for (let index = 0; index < 5; index++) {
          const before = normalized(
            rouletteDistance(index, base, 5) - progress,
          );
          const after = normalized(rouletteDistance(index, next, 5) - rebased);
          assert.ok(Math.abs(before - after) < 1e-10);
        }
      }
    }
  }
});

test("shirts stay intact with a full size center, visible neighbors and hidden wrap", () => {
  assert.deepEqual(roulettePose(0, 200), {
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
    opacity: 1,
  });
  assert.equal(roulettePose(1, 200).scale, 0.78);
  assert.equal(roulettePose(-1, 200).rotation, -4);
  assert.equal(roulettePose(2, 200).opacity, 0);
  assert.equal(roulettePose(-2.5, 200).opacity, 0);
});
