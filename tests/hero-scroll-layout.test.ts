import test from "node:test";
import assert from "node:assert/strict";
import { getHeroLayout } from "../src/lib/hero-layout.ts";
import { getLocalScrollDelta } from "../src/lib/hero-scroll-layout.ts";

test("scroll wrappers reach the stack in world space despite the rotated arc parent", () => {
  for (const width of [320, 768, 1100, 1440, 1920, 2560]) {
    const { positions, stackPositions } = getHeroLayout(width);
    positions.forEach((from, index) => {
      const target = stackPositions[index];
      const delta = getLocalScrollDelta(from, target);
      const angle = (from.rotation * Math.PI) / 180;
      const finalX =
        from.x + delta.x * Math.cos(angle) - delta.y * Math.sin(angle);
      const finalY =
        from.y + delta.x * Math.sin(angle) + delta.y * Math.cos(angle);
      assert.ok(Math.abs(finalX - target.x) < 1e-8);
      assert.ok(Math.abs(finalY - target.y) < 1e-8);
      assert.equal(from.rotation + delta.rotation, target.rotation);
    });
  }
});
