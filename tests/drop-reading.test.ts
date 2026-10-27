import test from "node:test";
import assert from "node:assert/strict";
import {
  getDropLetterOpacity,
  getDropReadingFrame,
  getFlowReadingFrame,
} from "../src/lib/drop-reading.ts";

test("the complete paragraph stays readable throughout a long sticky plateau", () => {
  for (const viewportHeight of [568, 656, 844, 900, 1080]) {
    const height = viewportHeight * 2.3;
    const travel = height - viewportHeight;
    for (const progress of [0.27, 0.4, 0.65, 0.85, 1]) {
      const frame = getDropReadingFrame({
        top: -travel * progress,
        height,
        stageHeight: viewportHeight,
        viewportHeight,
      });
      assert.equal(frame.reveal, 1);
      assert.equal(frame.exit, 0);
      assert.equal(frame.stageOpacity, 1);
      for (let letter = 0; letter < 130; letter++)
        assert.equal(
          getDropLetterOpacity(letter, 130, frame.reveal, frame.exit),
          1,
        );
    }
  }
});

test("tall flow sections reveal at reading height without fading controls or needing pinning", () => {
  for (const height of [320, 568, 766, 1092]) {
    const outside = getFlowReadingFrame(height, height);
    const entering = getFlowReadingFrame(height * 0.8, height);
    const reading = getFlowReadingFrame(height * 0.55, height);
    assert.equal(outside.reveal, 0);
    assert.ok(entering.reveal > 0 && entering.reveal < 1);
    assert.equal(reading.reveal, 1);
    assert.equal(reading.stageOpacity, 1);
    assert.equal(getFlowReadingFrame(-height * 2, height).exit, 0);
    assert.deepEqual(getFlowReadingFrame(height * 0.8, height), entering);
    assert.ok(Number.isFinite(getFlowReadingFrame(0, 0).imageY));
  }
});
test("exit begins only after the actual stage has left the sticky position", () => {
  const viewportHeight = 800,
    height = 1840;
  assert.equal(
    getDropReadingFrame({
      top: viewportHeight - height,
      height,
      stageHeight: viewportHeight,
      viewportHeight,
    }).exit,
    0,
  );
  const leaving = getDropReadingFrame({
    top: viewportHeight * 0.5 - height,
    height,
    stageHeight: viewportHeight,
    viewportHeight,
  });
  assert.ok(leaving.exit > 0);
  assert.equal(leaving.reveal, 1);
});
test("scrolling back restores the same letters without one-shot state", () => {
  const positions = [400, 100, 0, -180, -600, -1040, -1400, -1700];
  const read = (top: number) =>
    getDropReadingFrame({
      top,
      height: 1840,
      stageHeight: 800,
      viewportHeight: 800,
    });
  const forward = positions.map(read);
  positions
    .toReversed()
    .map(read)
    .toReversed()
    .forEach((frame, index) => assert.deepEqual(frame, forward[index]));
  assert.equal(getDropLetterOpacity(99, 100, 1, 0), 1);
  assert.equal(getDropLetterOpacity(99, 100, 1, 1), 0);
  assert.equal(getDropLetterOpacity(0, 100, 0, 0), 0);
});
