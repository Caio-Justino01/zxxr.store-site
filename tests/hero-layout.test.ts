import test from "node:test";
import assert from "node:assert/strict";
import { getHeroLayout } from "../src/lib/hero-layout.ts";

const ratio = 700 / 923;

function rotatedSize(width: number, degrees: number) {
  const angle = (Math.abs(degrees) * Math.PI) / 180;
  return {
    width: width * (Math.cos(angle) + ratio * Math.sin(angle)),
    height: width * (ratio * Math.cos(angle) + Math.sin(angle)),
  };
}

test("five complete shirts fit the stage at phone, tablet and desktop widths", () => {
  for (const width of [320, 360, 390, 699, 768, 1024, 1280, 1440, 1920, 2560]) {
    const layout = getHeroLayout(width);
    const originY = (layout.stageHeight - layout.arcDepth) / 2;
    assert.equal(layout.positions.length, 5);
    assert.ok(layout.pieceWidth > 0 && layout.pieceWidth <= 300);
    for (const position of [...layout.positions, ...layout.stackPositions]) {
      const size = rotatedSize(layout.pieceWidth, position.rotation);
      assert.ok(
        position.x - size.width / 2 >= -width / 2,
        `left edge at ${width}`,
      );
      assert.ok(
        position.x + size.width / 2 <= width / 2,
        `right edge at ${width}`,
      );
      assert.ok(
        originY + position.y - size.height / 2 >= 0,
        `top edge at ${width}`,
      );
      assert.ok(
        originY + position.y + size.height / 2 <= layout.stageHeight,
        `bottom edge at ${width}`,
      );
    }
  }
});

test("the arch is symmetric with its center highest and mild, symmetric tilts", () => {
  const { positions, arcDepth } = getHeroLayout(1440);
  assert.deepEqual(
    positions.map(({ rotation }) => rotation),
    [-6, -3, 0, 3, 6],
  );
  assert.deepEqual(positions[2], { x: 0, y: 0, rotation: 0 });
  assert.ok(positions[0].y > positions[1].y && positions[1].y > positions[2].y);
  assert.equal(positions[0].y, arcDepth);
  for (const index of [0, 1]) {
    const left = positions[index];
    const right = positions[4 - index];
    assert.equal(left.x, -right.x);
    assert.equal(left.y, right.y);
    assert.equal(left.rotation, -right.rotation);
  }
});

test("rotated image envelopes retain the intended gap without shirt overlap", () => {
  for (const width of [320, 390, 768, 1024, 1440, 2560]) {
    const { pieceWidth, positions } = getHeroLayout(width);
    const expectedGap = width >= 1024 ? 12 : 4;
    for (let index = 1; index < positions.length; index++) {
      const previous = positions[index - 1];
      const next = positions[index];
      const right =
        previous.x + rotatedSize(pieceWidth, previous.rotation).width / 2;
      const left = next.x - rotatedSize(pieceWidth, next.rotation).width / 2;
      assert.ok(
        Math.abs(left - right - expectedGap) < 0.000001,
        `gap at ${width}`,
      );
    }
  }
});

test("the opening stack overlaps nominal image widths by 35 percent", () => {
  const { pieceWidth, stackPositions } = getHeroLayout(1280);
  assert.equal(stackPositions.length, 5);
  for (let index = 1; index < stackPositions.length; index++) {
    const distance = stackPositions[index].x - stackPositions[index - 1].x;
    assert.ok(Math.abs((pieceWidth - distance) / pieceWidth - 0.35) < 0.000001);
    assert.equal(stackPositions[index].y, stackPositions[0].y);
  }
});

test("invalid pre-measurement sizes use a finite mobile layout", () => {
  const mobile = getHeroLayout(320);
  for (const width of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.deepEqual(getHeroLayout(width), mobile);
  }
});
