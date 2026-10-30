import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceCarouselSpring,
  carouselSpringAtRest,
  retargetCarouselSpring,
  type CarouselSpring,
} from "../src/lib/carousel-spring.ts";

function simulate(start: CarouselSpring, steps: number, seconds: number) {
  let spring = start;
  for (let i = 0; i < steps; i++)
    spring = advanceCarouselSpring(spring, seconds / steps);
  return spring;
}

test("critical damping reaches the same state across frame rates and a long frame", () => {
  const start = { position: -0.25, velocity: 1.4, target: 1 };
  const exact = advanceCarouselSpring(start, 0.75);
  for (const fps of [30, 60, 120, 144]) {
    const actual = simulate(start, fps, 0.75);
    assert.ok(Math.abs(actual.position - exact.position) < 1e-12);
    assert.ok(Math.abs(actual.velocity - exact.velocity) < 1e-12);
  }
  const paused = advanceCarouselSpring(start, 120);
  assert.deepEqual(paused, { position: 1, velocity: 0, target: 1 });
});

test("a rapid new command preserves position and velocity, including reversal", () => {
  const moving = advanceCarouselSpring(
    { position: 0, velocity: 0, target: 1 },
    0.12,
  );
  assert.ok(moving.velocity > 0);
  const further = retargetCarouselSpring(moving, 2);
  assert.equal(further.position, moving.position);
  assert.equal(further.velocity, moving.velocity);
  const reverse = retargetCarouselSpring(further, -1);
  assert.equal(reverse.velocity, moving.velocity);
  const after = advanceCarouselSpring(reverse, 1e-6);
  assert.ok(
    Math.abs((after.position - reverse.position) / 1e-6 - reverse.velocity) <
      0.001,
  );
  const settled = advanceCarouselSpring(reverse, 2);
  assert.ok(carouselSpringAtRest(settled));
});

test("a rest-to-rest step is monotonic without rebound and converges", () => {
  for (const target of [-1, 1]) {
    let spring = { position: 0, velocity: 0, target };
    let previous = 0;
    for (let i = 0; i < 180; i++) {
      spring = advanceCarouselSpring(spring, 1 / 120);
      assert.ok((spring.position - previous) * target >= 0);
      assert.ok(spring.position * target <= 1);
      previous = spring.position;
    }
    assert.ok(carouselSpringAtRest(spring));
  }
});

test("reduced motion snaps exactly and invalid elapsed time cannot corrupt motion", () => {
  const start = { position: 0.37, velocity: 5, target: 2 };
  assert.deepEqual(advanceCarouselSpring(start, 0, true), {
    position: 2,
    velocity: 0,
    target: 2,
  });
  for (const seconds of [0, -1, NaN, Infinity])
    assert.deepEqual(advanceCarouselSpring(start, seconds), start);
  assert.deepEqual(start, { position: 0.37, velocity: 5, target: 2 });
});
