import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import sharp from "sharp";
import { fileURLToPath } from "node:url";
const pub = new URL("../public/", import.meta.url);
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
