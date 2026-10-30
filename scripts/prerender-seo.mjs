import { createServer } from "vite";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const out = path.resolve(root, process.argv[2] ?? "dist");
const template = await readFile(path.join(out, "index.html"), "utf8");
const server = await createServer({
  root,
  server: { middlewareMode: true },
  appType: "custom",
});
try {
  const [
    { renderPublicRoute },
    { applySeoToHtml, getSeoMetadata, publicSeoPaths },
  ] = await Promise.all([
    server.ssrLoadModule("/src/seo/entry-server.tsx"),
    server.ssrLoadModule("/src/seo/metadata.ts"),
  ]);
  const shell = applySeoToHtml(template, getSeoMetadata("/sacola"));
  await writeFile(path.join(out, "store-shell.html"), shell);
  for (const route of [...publicSeoPaths(), "/__not-found__"]) {
    const markup = await renderPublicRoute(route);
    if (!markup.includes("<main"))
      throw new Error(`Public HTML has no main content: ${route}`);
    const html = applySeoToHtml(template, getSeoMetadata(route))
      .replace(/<html\b/, '<html data-seo-prerendered="true"')
      .replace(/<div id="root"><\/div>/, `<div id="root">${markup}</div>`);
    if (!html.includes('data-seo-prerendered="true"') || !html.includes(markup))
      throw new Error(`Prerender insertion failed: ${route}`);
    const target =
      route === "/"
        ? path.join(out, "index.html")
        : route === "/__not-found__"
          ? path.join(out, "404.html")
          : path.join(out, `${route.slice(1)}.html`);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, html);
    console.log(`SEO HTML: ${route}`);
  }
} finally {
  await server.close();
}
