// Native 3D UV atlas preparation. Source pixels stay in the garment's printed
// regions; the original reference files remain unchanged alongside the maps.
const fs = require("fs"),
  path = require("path");
const sharp = require("sharp");
const root = path.resolve(__dirname, ".."),
  pub = path.join(root, "public");
const specs = [
  {
    id: "boca",
    file: "IMG_3296.PNG",
    color: [232, 228, 211],
    views: [
      { box: [104, 165, 920, 696], regions: [[544, 338, 82, 40]] },
      { box: [103, 963, 920, 697], regions: [[390, 1125, 335, 410]] },
    ],
  },
  {
    id: "flores",
    file: "IMG_3282.PNG",
    color: [232, 228, 211],
    views: [
      { box: [104, 165, 920, 696], regions: [[456, 337, 253, 247]] },
      { box: [103, 963, 920, 697], regions: [[535, 1007, 61, 34]] },
    ],
  },
  {
    id: "me-preservando",
    file: "IMG_3283.PNG",
    color: [232, 228, 211],
    views: [
      { box: [104, 165, 920, 696], regions: [[687, 334, 54, 52]] },
      { box: [103, 963, 920, 697], regions: [[270, 1076, 590, 89]] },
    ],
  },
  {
    id: "spiritual-gangsta",
    file: "IMG_3281.PNG",
    color: [40, 40, 42],
    dark: true,
    views: [
      { box: [160, 56, 768, 574], regions: [[486, 185, 121, 51]] },
      { box: [160, 720, 768, 574], regions: [[298, 783, 500, 124]] },
    ],
  },
  {
    id: "zxxr-rosa",
    file: "IMG_3271.PNG",
    color: [40, 40, 42],
    dark: true,
    whiteOutline: true,
    views: [
      { box: [160, 56, 768, 574], regions: [[452, 185, 166, 70]] },
      { box: [160, 720, 768, 574], regions: [[310, 935, 390, 345]] },
    ],
  },
];
async function main() {
  const manifest = [];
  for (const spec of specs) {
    const source = path.join(pub, "media/source", spec.file);
    const { data, info } = await sharp(source)
      .raw()
      .toBuffer({ resolveWithObject: true });
    for (const [vi, v] of spec.views.entries()) {
      const [bx, by, bw, bh] = v.box,
        rgba = Buffer.alloc(bw * bh * 3);
      for (let y = 0; y < bh; y++)
        for (let x = 0; x < bw; x++) {
          const sx = x + bx,
            sy = y + by,
            offset = (sy * info.width + sx) * info.channels;
          let color = spec.color;
          const sampled = [data[offset], data[offset + 1], data[offset + 2]];
          // Keep photographed cotton grain and washed-black variation. Guard
          // pixels outside the flat garment so the room never becomes fabric.
          const brightness = Math.max(...sampled);
          if (spec.dark ? brightness < 125 : Math.min(...sampled) > 172) {
            color = sampled;
          }
          if (
            v.regions.some(
              ([rx, ry, rw, rh]) =>
                sx >= rx && sx < rx + rw && sy >= ry && sy < ry + rh,
            )
          ) {
            // Exact source print pixels, including the pink piece's white outline.
            color = sampled;
          }
          const o = (y * bw + x) * 3;
          rgba[o] = color[0];
          rgba[o + 1] = color[1];
          rgba[o + 2] = color[2];
        }
      const view = vi ? "back" : "front";
      await sharp(rgba, { raw: { width: bw, height: bh, channels: 3 } })
        .resize(1536, 1024)
        .png()
        .toFile(path.join(pub, "media/prints", `${spec.id}-${view}.png`));
      await sharp(rgba, { raw: { width: bw, height: bh, channels: 3 } })
        .resize(768, 512)
        .webp({ quality: 93 })
        .toFile(
          path.join(pub, "media/prints", `${spec.id}-${view}-small.webp`),
        );
    }
    manifest.push({
      id: spec.id,
      source: "media/source/" + spec.file,
      color: spec.color,
      atlas: "1536x1024",
      sourceViews: spec.views,
      method:
        "Original ink sampled into native UV atlas; provisional art from reference mockups. No generative redraw of prints.",
    });
  }
  fs.writeFileSync(
    path.join(root, "docs/ASSET-MANIFEST.json"),
    JSON.stringify(manifest, null, 2),
  );
  console.log(
    `${specs.length * 2} UV atlases and responsive maps ready. Original print pixels retained.`,
  );
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
