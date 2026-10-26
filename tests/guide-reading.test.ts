import test from "node:test";
import assert from "node:assert/strict";
import {
  getGuideReadingFrame,
  getGuideLetterOpacity,
  guideStageFits,
} from "../src/lib/guide-reading.ts";

test("guide reads the title first, reveals steps in order, then holds the complete scene", () => {
  assert.deepEqual(getGuideReadingFrame(0), { title: 0, steps: [0, 0, 0] });
  const titleRead = getGuideReadingFrame(0.22);
  assert.equal(titleRead.title, 1);
  assert.ok(titleRead.steps[0] > 0);
  assert.equal(titleRead.steps[1], 0);
  const secondStep = getGuideReadingFrame(0.5);
  assert.equal(secondStep.steps[0], 1);
  assert.ok(secondStep.steps[1] > 0 && secondStep.steps[1] < 1);
  assert.equal(secondStep.steps[2], 0);
  for (const progress of [0.73, 0.85, 1, 2]) {
    assert.deepEqual(getGuideReadingFrame(progress), {
      title: 1,
      steps: [1, 1, 1],
    });
    for (let i = 0; i < 18; i++)
      assert.equal(getGuideLetterOpacity(i, 18, 1), 1);
  }
});

test("guide restores the same scene when scrolling backward", () => {
  const positions = [0, 0.1, 0.3, 0.5, 0.7, 1];
  const forward = positions.map(getGuideReadingFrame);
  const backward = positions
    .toReversed()
    .map(getGuideReadingFrame)
    .toReversed();
  assert.deepEqual(forward, backward);
  assert.equal(getGuideLetterOpacity(0, 18, 0), 0.2);
});

test("short screens use flow rather than clipping a sticky stage", () => {
  assert.equal(guideStageFits(660, 844, 72), true);
  assert.equal(guideStageFits(660, 568, 72), false);
  assert.equal(guideStageFits(380, 420, 88), false);
  assert.equal(guideStageFits(380, 900, 88), true);
});
