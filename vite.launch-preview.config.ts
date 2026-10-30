import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { getLaunchStatus } from "./server/launch.ts";
import { launchConfig } from "./launch-preview/config.ts";

function previewClock(): Plugin {
  let opensAt: string = launchConfig.opensAt;
  let offline = false;
  let failImages = false;
  return {
    name: "isolated-launch-preview-clock",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const route = (req.url ?? "").split("?")[0];
        if (
          failImages &&
          /^\/media\/(?:launch-v[12]|ensaio-drop)\//.test(route)
        ) {
          res.statusCode = 404;
          res.setHeader("Cache-Control", "no-store");
          res.end("Preview image failure simulation");
          return;
        }
        if (route === "/__preview/launch" && req.method === "POST") {
          if (
            req.headers.origin &&
            req.headers.origin !== `http://${req.headers.host}`
          ) {
            res.statusCode = 403;
            res.end();
            return;
          }
          try {
            let body = "";
            for await (const chunk of req) {
              body += chunk;
              if (body.length > 2048) throw new Error("Request too large");
            }
            const data = JSON.parse(body);
            if (data.scenario === "actual") {
              opensAt = launchConfig.opensAt;
              offline = false;
              failImages = false;
            } else if (data.scenario === "last-seconds") {
              opensAt = new Date(Date.now() + 12_000).toISOString();
              offline = false;
            } else if (data.scenario === "open") {
              opensAt = new Date(Date.now() - 1000).toISOString();
              offline = false;
            } else if (data.scenario === "offline") offline = true;
            else if (data.scenario === "images-fail") failImages = true;
            else if (
              data.scenario === "custom" &&
              typeof data.opensAt === "string" &&
              Number.isFinite(Date.parse(data.opensAt))
            ) {
              opensAt = data.opensAt;
              offline = false;
            } else throw new Error("Unknown scenario");
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Cache-Control", "no-store");
            res.end(JSON.stringify({ ok: true }));
          } catch {
            res.statusCode = 400;
            res.end("Invalid preview scenario");
          }
          return;
        }
        if (route !== "/api/launch" || req.method !== "GET") return next();
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Cache-Control", "no-store, max-age=0");
        if (offline) {
          res.statusCode = 503;
          res.end(JSON.stringify({ error: "Preview offline simulation" }));
          return;
        }
        res.end(
          JSON.stringify(
            getLaunchStatus({
              LAUNCH_GATE_ENABLED: "true",
              LAUNCH_OPENS_AT: opensAt,
            }),
          ),
        );
      });
    },
  };
}

export default defineConfig({
  root: fileURLToPath(new URL("./launch-preview", import.meta.url)),
  publicDir: fileURLToPath(new URL("./public-store", import.meta.url)),
  plugins: [react(), previewClock()],
  server: {
    host: "127.0.0.1",
    port: 5277,
    strictPort: true,
    fs: { allow: [fileURLToPath(new URL(".", import.meta.url))] },
  },
  build: {
    outDir: fileURLToPath(new URL("./dist-launch-preview", import.meta.url)),
    emptyOutDir: true,
  },
});
