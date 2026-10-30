import test from "node:test";
import assert from "node:assert/strict";
import { getHeroLayout } from "../src/lib/hero-layout.ts";

function bounds(
  width: number,
  position: { x: number; y: number; rotation: number; scale?: number },
) {
  const angle = (Math.abs(position.rotation) * Math.PI) / 180;
  const w = width * (position.scale ?? 1);
  const halfX = (w * (Math.cos(angle) + 0.75 * Math.sin(angle))) / 2;
  const halfY = (w * (0.75 * Math.cos(angle) + Math.sin(angle))) / 2;
  return {
    left: position.x - halfX,
    right: position.x + halfX,
    top: position.y - halfY,
    bottom: position.y + halfY,
  };
}

test("all complete scaled garments and ice fit their resting and opening frames", () => {
  for (const width of [320, 390, 768, 1024, 1100, 1440, 1920, 2560]) {
    const layout = getHeroLayout(width);
    assert.equal(layout.positions.length, 5);
    for (const pose of [...layout.positions, ...layout.stackPositions]) {
      const b = bounds(layout.pieceWidth, pose);
      assert.ok(
        b.left >= -width / 2 && b.right <= width / 2,
        `horizontal bounds ${width}`,
      );
      assert.ok(
        b.top + layout.stageHeight / 2 >= 0 &&
          b.bottom + layout.stageHeight / 2 <= layout.stageHeight,
        `vertical bounds ${width}`,
      );
    }
  }
});

test("available pair is larger and centered, with ice exclusively on the flanks", () => {
  for (const width of [1100, 1440, 2560]) {
    const { positions, pieceWidth } = getHeroLayout(width);
    const [flores, yaji, emotion, spiritual, zxxr] = positions;
    assert.equal(emotion.x, -spiritual.x);
    assert.equal(emotion.y, spiritual.y);
    assert.equal(emotion.scale, 1);
    assert.equal(spiritual.scale, 1);
    assert.ok(flores.scale! < 1 && yaji.scale! < 1 && zxxr.scale! < 1);
    const left = bounds(pieceWidth, emotion).left;
    const right = bounds(pieceWidth, spiritual).right;
    assert.ok(bounds(pieceWidth, flores).right < left);
    assert.ok(bounds(pieceWidth, yaji).right < left);
    assert.ok(bounds(pieceWidth, zxxr).left > right);
    assert.ok(
      bounds(pieceWidth, emotion).right < bounds(pieceWidth, spiritual).left,
    );
    // Only the icy edge envelopes meet in the staggered left-hand group.
    const a = bounds(pieceWidth, flores),
      b = bounds(pieceWidth, yaji);
    const overlap = Math.max(0, a.bottom - b.top);
    assert.ok(overlap / (a.bottom - a.top) < 0.15);
  }
});

test("the opening uses a uniformly sized compact lateral stack", () => {
  const { stackPositions, pieceWidth } = getHeroLayout(1440);
  for (let i = 1; i < stackPositions.length; i++) {
    assert.equal(stackPositions[i].scale, 0.7);
    assert.ok(
      Math.abs(
        stackPositions[i].x - stackPositions[i - 1].x - pieceWidth * 0.46,
      ) < 1e-8,
    );
  }
});

test("invalid measurements use a finite mobile fallback", () => {
  for (const width of [0, -1, NaN, Infinity])
    assert.deepEqual(getHeroLayout(width), getHeroLayout(320));
});
