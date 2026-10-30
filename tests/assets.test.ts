import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { products } from "../src/config/products.ts";
import sharp from "sharp";
import { fileURLToPath } from "node:url";
const pub = new URL("../public/", import.meta.url);
test("all five products have shipped reference, gallery and texture assets", () => {
  assert.equal(products.length, 5);
  for (const p of products) {
    for (const path of [
      p.front,
      p.back,
      p.studioPhoto,
      p.textures.front,
      p.textures.back,
      "/media/source/" + p.source,
    ])
      assert.ok(existsSync(new URL(path.slice(1), pub)), `${p.id}: ${path}`);
  }
});
test("archived garment export includes native geometry, morphs and animated weights", {
  skip: !existsSync(new URL("models/oversized-shared-v4.glb", pub)) && "Archived 3D models are outside this 2D release; the active no-3D graph remains tested.",
}, () => {
  for (const cut of ["shared", "offwhite", "black"]) {
    const mobile = readFileSync(
      new URL(`models/oversized-${cut}-v4-mobile.glb`, pub),
    );
    const data = readFileSync(new URL(`models/oversized-${cut}-v4.glb`, pub));
    assert.equal(mobile.subarray(0, 4).toString(), "glTF");
    assert.ok(mobile.length < data.length, "mobile model must be lighter");
    assert.equal(data.subarray(0, 4).toString(), "glTF");
    assert.equal(data.readUInt32LE(4), 2);
    const gltf = JSON.parse(
      data.subarray(20, 20 + data.readUInt32LE(12)).toString(),
    );
    assert.ok(gltf.meshes.length >= 2);
    assert.ok(
      gltf.meshes.every((m: { extras?: { targetNames: string[] } }) =>
        ["Worn", "WindA", "WindB"].every((n) =>
          m.extras?.targetNames.includes(n),
        ),
      ),
    );
    assert.ok(
      gltf.animations.some((a: { channels: { target: { path: string } }[] }) =>
        a.channels.some((c) => c.target.path === "weights"),
      ),
    );
  }
});

test("pink artwork retains its white outline in the UV texture", async () => {
  const { data, info } = await sharp(
    fileURLToPath(new URL("media/artwork-v4/zxxr-rosa-back.png", pub)),
  )
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let white = 0,
    pink = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i + 3] < 200) continue;
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    if (Math.min(r, g, b) > 215) white++;
    if (r > 170 && b > 80 && r - g > 65) pink++;
  }
  assert.ok(white > 1000, "white outline was lost");
  assert.ok(pink > 1000, "pink ink was lost");
});

test("separate print layers preserve source RGB, position and native resolution", async () => {
  for (const p of products)
    for (const side of ["front", "back"] as const) {
      const art = await sharp(
        fileURLToPath(new URL(p.textures[side].slice(1), pub)),
      )
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const source = await sharp(
        fileURLToPath(new URL(`media/reference-v3/${p.id}-${side}.png`, pub)),
      )
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      assert.equal(art.info.width, source.info.width);
      assert.equal(art.info.height, source.info.height);
      let ink = 0,
        blank = 0;
      for (let i = 0; i < art.data.length; i += 4) {
        if (art.data[i + 3] > 0) {
          ink++;
          for (let c = 0; c < 3; c++)
            assert.equal(
              art.data[i + c],
              source.data[i + c],
              `${p.id} ${side}: changed artwork sample`,
            );
        } else blank++;
      }
      assert.ok(
        ink > 10 && blank > art.info.width * art.info.height * 0.4,
        "cloth and print are not separated",
      );
    }
});

test("gallery retains native dimensions and original garment pixels", async () => {
  const manifest = JSON.parse(
    readFileSync(
      new URL("../docs/REFERENCE-MANIFEST-v3.json", import.meta.url),
      "utf8",
    ),
  );
  for (const entry of manifest)
    for (const view of entry.views) {
      const [left, top, width, height] = view.box;
      const original = await sharp(
        fileURLToPath(new URL(`media/source/${entry.source}`, pub)),
      )
        .extract({ left, top, width, height })
        .removeAlpha()
        .raw()
        .toBuffer();
      const { data, info } = await sharp(
        fileURLToPath(
          new URL(`media/reference-v3/${entry.id}-${view.side}.png`, pub),
        ),
      )
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      assert.equal(info.width, width);
      assert.equal(info.height, height);
      let difference = 0,
        count = 0,
        visible = 0;
      for (let i = 0; i < width * height; i++)
        if (data[i * 4 + 3] === 255) {
          visible++;
          for (let c = 0; c < 3; c++) {
            difference += Math.abs(data[i * 4 + c] - original[i * 3 + c]);
            count++;
          }
        }
      assert.ok(
        visible > width * height * 0.55,
        "exterior contour lost garment pixels",
      );
      assert.ok(
        difference / count < 0.5,
        `${entry.id} ${view.side}: artwork pixels changed`,
      );
    }
});
