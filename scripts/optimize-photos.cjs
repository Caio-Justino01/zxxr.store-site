// Encoding only: generated source PNGs are preserved, no crop or artwork changes.
const sharp = require("sharp"),
  path = require("path"),
  fs = require("fs");
const root = path.resolve(__dirname, "..");
async function main() {
  for (const id of ["boca", "flores", "me-preservando", "spiritual-gangsta"]) {
    await sharp(
      path.join(root, "assets-originals/studio-photos", `${id}-v2.png`),
    )
      .webp({ quality: 94, effort: 6 })
      .toFile(path.join(root, "public/media/studio-photos", `${id}-v2.webp`));
  }
  fs.writeFileSync(
    path.join(root, "docs/PHOTOGRAPHIC-ASSETS.json"),
    JSON.stringify(
      {
        method:
          "ImageGen edits from user-supplied mockups. Oversized boxy cut, front/back studio contact sheets. Illustrative photographic visualization, not a photograph of a manufactured sample.",
        sourceVersion: "v2",
        sourceDirectory: "assets-originals/studio-photos",
        runtimeFormat:
          "WebP quality 94; no crop/color manipulation. Front/back framed by CSS.",
        artwork:
          "Based on original source mockups; 3D UV maps use original ink samples. Generated photographic artwork may differ in small details. Check against physical production files before sales.",
      },
      null,
      2,
    ),
  );
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
