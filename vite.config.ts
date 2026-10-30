import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import fs from "node:fs";
import path from "node:path";
import { staticSecurityHeaders } from "./server/security.ts";
import { localApiPlugin } from "./server/dev-api.ts";
export default defineConfig(({ mode }) => ({
  publicDir: mode === "prelaunch" ? "public-prelaunch" : "public-store",
  plugins: [
    localApiPlugin(),
    react(),
    tailwind(),
    {
      name: "store-entry",
      transformIndexHtml(html) {
        return mode === "prelaunch"
          ? html.replace("/src/main.tsx", "/src/prelaunch-main.tsx")
          : html;
      },
      generateBundle(_options, bundle) {
        if (mode !== "prelaunch") {
          this.emitFile({
            type: "asset",
            fileName: "_routes.json",
            source: JSON.stringify({
              version: 1,
              include: ["/*"],
              exclude: [
                "/assets/*",
                "/brand/*",
                "/fonts/*",
                "/media/*",
                "/favicon.ico",
              ],
            }),
          });
          this.emitFile({
            type: "asset",
            fileName: "_headers",
            source: staticSecurityHeaders(),
          });
          this.emitFile({
            type: "asset",
            fileName: "robots.txt",
            source:
              "User-agent: *\nDisallow: /api/\nDisallow: /conta/\nDisallow: /painel/\nDisallow: /encomenda\nDisallow: /recuperar-acesso\n",
          });
        }
        if (mode !== "prelaunch") return;
        for (const entry of Object.values(bundle)) {
          if (entry.type !== "chunk") continue;
          for (const id of entry.moduleIds) {
            if (
              /\/src\/(?:App\.tsx|config\/products\.ts|config\/product-gallery\.ts|lib\/(?:cart|pricing|format-price)\.ts|components\/(?:GarmentViewer|ProductSpecifications|ProductSizeSelector)\.tsx)(?:\?|$)/.test(
                id.replaceAll("\\", "/"),
              )
            ) {
              this.error(`Store-only module found in prelaunch build: ${id}`);
            }
          }
        }
        const publicRoot = fileURLToPath(
          new URL("./public-prelaunch", import.meta.url),
        );
        function audit(relative = "") {
          for (const item of fs.readdirSync(path.join(publicRoot, relative), {
            withFileTypes: true,
          })) {
            const name = relative ? `${relative}/${item.name}` : item.name;
            if (item.isDirectory()) audit(name);
            else if (
              !/^(?:brand\/|fonts\/|media\/artist\/|media\/frozen-v1\/|404\.html$|media\/ensaio-drop\/(?:collage-(?:garden|chairs|beach)-v1-(?:480|800)\.webp|ensaiodrop1zxxrfoto01-(?:640|1120|1680)\.webp|ensaiodrop1zxxrfoto06-banner-v1-(?:960|1440|1920|portrait-640|portrait-1086)\.webp)$)/.test(
                name,
              )
            ) {
              throw new Error(`Unapproved public prelaunch asset: ${name}`);
            }
          }
        }
        audit();
      },
      configureServer(server) {
        if (mode !== "prelaunch") return;
        server.middlewares.use((req, res, next) => {
          // Old clear product URLs must not fall through to the development SPA.
          if (
            /^\/media\/(?:reference-v3|source|artwork-v4|products|prints|draped|studio-photos|scenes|sky-studio-v4|clouds-v5)\//.test(
              req.url ?? "",
            )
          ) {
            res.statusCode = 404;
            res.end("Not found");
          } else next();
        });
      },
    },
  ],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    strictPort: true,
    watch: {
      ignored: [
        "**/previews/**",
        "**/work/antes-*/**",
        "**/work/qa-analytics-seo/**",
        "**/entrega/**",
      ],
    },
  },
  build: {
    outDir: mode === "prelaunch" ? "dist-prelaunch" : "dist",
    rollupOptions: {
      input:
        mode === "prelaunch"
          ? undefined
          : {
              store: fileURLToPath(new URL("./index.html", import.meta.url)),
              waiting: fileURLToPath(new URL("./espera.html", import.meta.url)),
            },
      output: {
        manualChunks(id) {
          if (id.includes("/three/")) return "three";
          if (id.includes("/gsap/")) return "motion";
        },
      },
    },
  },
}));
