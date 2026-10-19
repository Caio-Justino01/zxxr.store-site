import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseAst } from "rolldown/parseAst";
import sharp from "sharp";
import { products } from "../src/config/products.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const publicRoot = resolve(root, "public");

function runtimeEntryGraph() {
  const pending = [resolve(root, "src/main.tsx")];
  const files = new Set<string>();
  const packages = new Set<string>();
  const modelUrls: string[] = [];
  const assetReferences: string[] = [];

  function follow(specifier: string, parent: string) {
    if (!specifier.startsWith(".")) {
      packages.add(specifier);
      return;
    }
    const base = resolve(dirname(parent), specifier);
    const path = [
      base,
      ...[".ts", ".tsx", ".js", ".jsx", ".mjs", ".css"].map(
        (extension) => base + extension,
      ),
      ...["index.ts", "index.tsx", "index.js"].map((name) =>
        resolve(base, name),
      ),
    ].find((path) => existsSync(path) && extname(path));
    assert.ok(path, `Unresolved runtime import ${specifier} from ${parent}`);
    pending.push(path);
  }

  while (pending.length) {
    const file = pending.pop()!;
    if (files.has(file)) continue;
    files.add(file);
    const text = readFileSync(file, "utf8");
    if (extname(file) === ".css") {
      const css = text.replace(/\/\*[\s\S]*?\*\//g, "");
      for (const match of css.matchAll(
        /@import\s+(?:url\(\s*)?["']([^"']+)["']/g,
      )) {
        assetReferences.push(`${file}: ${match[1]}`);
        if (match[1].startsWith(".")) follow(match[1], file);
        else if (/^[\w-][^:]*\.css$/i.test(match[1]))
          follow(`./${match[1]}`, file);
      }
      for (const match of css.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/g)) {
        assetReferences.push(`${file}: ${match[1]}`);
      }
      continue;
    }
    if (!/\.[cm]?[jt]sx?$/.test(file)) continue;
    const source = parseAst(
      text,
      { lang: file.endsWith("x") ? "tsx" : "ts" },
      file,
    );
    function visit(value: unknown) {
      if (!value || typeof value !== "object") return;
      if (Array.isArray(value)) {
        value.forEach(visit);
        return;
      }
      const node = value as Record<string, any>;
      if (
        node.type === "ImportDeclaration" &&
        node.source?.type === "Literal"
      ) {
        const onlyTypes =
          node.importKind === "type" ||
          (node.specifiers.length > 0 &&
            node.specifiers.every(
              (item: Record<string, any>) => item.importKind === "type",
            ));
        if (!onlyTypes) follow(node.source.value, file);
      } else if (
        ["ExportNamedDeclaration", "ExportAllDeclaration"].includes(
          node.type,
        ) &&
        node.exportKind !== "type" &&
        node.source?.type === "Literal"
      ) {
        follow(node.source.value, file);
      } else if (
        node.type === "ImportExpression" &&
        node.source?.type === "Literal"
      ) {
        follow(node.source.value, file);
      }
      if (node.type === "Literal" && typeof node.value === "string") {
        assetReferences.push(`${file}: ${node.value}`);
        if (/\.(glb|gltf)(?:[?#]|$)/i.test(node.value))
          modelUrls.push(`${file}: ${node.value}`);
      }
      if (node.type === "TemplateLiteral") {
        const reference = `${file}: ${text.slice(node.start, node.end)}`;
        assetReferences.push(reference);
        if (/\.(glb|gltf)(?:[?#]|$)/i.test(node.quasis.at(-1)?.value.raw ?? ""))
          modelUrls.push(reference);
      }
      Object.values(node).forEach(visit);
    }
    visit(source);
  }
  return {
    files: [...files],
    packages: [...packages],
    modelUrls,
    assetReferences,
  };
}

test("2D product images allow a native backdrop canvas without archived 3D garments", () => {
  const graph = runtimeEntryGraph();
  assert.ok(
    graph.files.length > 1,
    "The actual application entry must be inspected",
  );
  assert.deepEqual(
    graph.packages.filter((name) =>
      /^(three(?:\/|$)|@react-three\/|threepipe(?:\/|$))/.test(name),
    ),
    [],
    "Product images must not load Three.js/R3F/Threepipe; a native decorative backdrop canvas is allowed",
  );
  assert.deepEqual(
    graph.files.filter((file) => /[/\\](StudioView|Studio)\.tsx?$/.test(file)),
    [],
    "Archived v4 modules must remain outside the reachable runtime graph",
  );
  assert.deepEqual(
    graph.modelUrls,
    [],
    "No GLB/GLTF download belongs to the active presentation",
  );
  assert.ok(
    graph.files.some((file) => /[/\\]GradientBackdrop\.tsx$/.test(file)),
    "The active entry must include the native gradient backdrop",
  );
  assert.deepEqual(
    graph.files.filter((file) =>
      /[/\\](SkyBackdrop\.tsx|sky-v5\.css)$/.test(file),
    ),
    [],
    "Archived sky-photo components and styles must remain outside the active entry graph",
  );
  assert.deepEqual(
    graph.assetReferences.filter((reference) =>
      /(?:^|[\\/\s:"'`])(?:clouds?-v5|sky-v5\.css)(?:[\\/\s?\#"'`]|$)/i.test(
        reference,
      ),
    ),
    [],
    "Active component strings and CSS URLs must not request the archived cloud-v5 photo assets",
  );
});

test("current product photos keep the approved source cutouts at native quality", async () => {
  for (const product of products) {
    for (const side of ["front", "back"] as const) {
      const actual = resolve(publicRoot, product[side].replace(/^\//, ""));
      const approved = resolve(
        publicRoot,
        `media/reference-v3/${product.id}-${side}.png`,
      );
      const [photo, reference] = await Promise.all([
        sharp(actual).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
        sharp(approved)
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true }),
      ]);
      assert.equal(
        photo.info.width,
        reference.info.width,
        `${product.id} ${side}: native width`,
      );
      assert.equal(
        photo.info.height,
        reference.info.height,
        `${product.id} ${side}: native height`,
      );
      assert.equal(
        Buffer.compare(photo.data, reference.data),
        0,
        `${product.id} ${side}: cut, artwork or garment pixels changed`,
      );
    }
  }
});
