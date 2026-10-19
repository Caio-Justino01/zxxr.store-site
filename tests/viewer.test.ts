import test from "node:test";
import assert from "node:assert/strict";
import {
  clampViewerPan,
  clampViewerZoom,
  viewerPanLimits,
} from "../src/lib/viewer.ts";

test("contain-fit letterboxing does not allow empty pan space at normal zoom", () => {
  assert.deepEqual(
    clampViewerPan(
      { x: 100, y: -90 },
      { width: 360, height: 480 },
      { width: 923, height: 694 },
      1,
    ),
    { x: 0, y: 0 },
  );
});

test("zoomed pan stops at the actual image edge on each axis", () => {
  const viewport = { width: 400, height: 400 };
  const image = { width: 800, height: 600 };
  assert.deepEqual(viewerPanLimits(viewport, image, 2), { x: 200, y: 100 });
  assert.deepEqual(clampViewerPan({ x: 999, y: -999 }, viewport, image, 2), {
    x: 200,
    y: -100,
  });
  assert.deepEqual(clampViewerPan({ x: 25, y: -35 }, viewport, image, 2), {
    x: 25,
    y: -35,
  });
});

test("a zoom change safely re-clamps pan and invalid dimensions cannot create infinity", () => {
  assert.equal(clampViewerZoom(3), 2);
  assert.equal(clampViewerZoom(0), 1);
  assert.equal(clampViewerZoom(Number.NaN), 1);
  assert.deepEqual(
    clampViewerPan(
      { x: 190, y: 90 },
      { width: 400, height: 400 },
      { width: 800, height: 600 },
      1.2,
    ),
    { x: 40, y: 0 },
  );
  assert.deepEqual(
    viewerPanLimits({ width: 0, height: 0 }, { width: 0, height: 0 }, 2),
    { x: 0, y: 0 },
  );
});
