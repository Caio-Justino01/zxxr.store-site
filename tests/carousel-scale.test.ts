import test from "node:test";
import assert from "node:assert/strict";
import gsap, { CSSPlugin } from "gsap";
import { createCarouselScaleSetter } from "../src/lib/carousel-scale.ts";

/**
 * Use the installed GSAP/CSSPlugin setter dispatch, with an initialized cache
 * matching an HTML slot after gsap.set(...). The only DOM stub is attribute
 * validation: commas are invalid in setAttribute's qualified-name argument.
 */
function slot() {
  const attributes: { name: string; value: unknown }[] = [];
  const frames: { x: number; y: number }[] = [];
  const node = {
    nodeType: 1,
    style: {},
    setAttribute(name: string, value: unknown) {
      attributes.push({ name, value });
      if (!/^[A-Za-z_:][A-Za-z0-9_.:-]*$/.test(name))
        throw new DOMException(
          "Invalid attribute name",
          "InvalidCharacterError",
        );
    },
  };
  const cache = {
    harness: CSSPlugin,
    set: CSSPlugin.getSetter,
    x: "0px",
    scaleX: 1,
    scaleY: 1,
    renderTransform(
      _ratio: number,
      current: { scaleX: number; scaleY: number },
    ) {
      frames.push({ x: current.scaleX, y: current.scaleY });
    },
  };
  Object.assign(node, { _gsap: cache });
  return { node: node as unknown as HTMLElement, cache, attributes, frames };
}

test("installed GSAP reproduces the invalid scale alias attribute", () => {
  const f = slot();
  const original = gsap.quickSetter(f.node, "scale");
  assert.throws(() => original(0.88), { name: "InvalidCharacterError" });
  assert.deepEqual(f.attributes, [{ name: "scaleX,scaleY", value: 0.88 }]);
  assert.deepEqual(f.frames, [], "the failed alias never renders a transform");
});

test("carousel scaling renders uniform transform values without writing attributes", () => {
  const f = slot();
  const scale = createCarouselScaleSetter(f.node);
  // Neighbor, transition and central poses reuse one setter across frames.
  for (const value of [0.88, 0.90625, 0.96875, 1, 1.02, 0]) {
    assert.doesNotThrow(() => scale(value));
    assert.equal(f.cache.scaleX, value);
    assert.equal(f.cache.scaleY, value);
    assert.deepEqual(f.frames.at(-1), { x: value, y: value });
  }
  assert.deepEqual(f.attributes, []);
});
