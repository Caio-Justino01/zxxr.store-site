import test from "node:test";
import assert from "node:assert/strict";
import { handleLaunchGate } from "../server/launch-gate.ts";
import { readFile } from "node:fs/promises";
const deadline = Date.parse("2026-10-31T00:00:00-03:00");
function context(path: string, method = "GET", env = {}) {
  let passed = 0,
    fetched = "";
  return {
    request: new Request("https://www.zxxr.store" + path, { method }),
    env: {
      ...env,
      ASSETS: {
        fetch: async (request: Request) => {
          fetched = new URL(request.url).pathname;
          return new Response("<html>WAITING</html>", {
            headers: { "Content-Type": "text/html" },
          });
        },
      },
    },
    next: async () => {
      passed++;
      return new Response("STORE");
    },
    get passed() {
      return passed;
    },
    get fetched() {
      return fetched;
    },
  };
}
test("all public HTML routes wait before midnight and become accessible exactly at the deadline", async () => {
  for (const path of [
    "/",
    "/index.html",
    "/produto/boca",
    "/produto/spiritual-gangsta",
    "/sacola",
    "/encomenda",
    "/unknown",
  ]) {
    const before = context(path);
    const response = await handleLaunchGate(before, deadline - 1);
    assert.equal(await response.text(), "<html>WAITING</html>");
    assert.equal(before.fetched, "/espera.html");
    assert.equal(before.passed, 0);
    assert.match(response.headers.get("Cache-Control")!, /no-store/);
    const after = context(path);
    assert.equal(
      await (await handleLaunchGate(after, deadline)).text(),
      "STORE",
    );
    assert.equal(after.passed, 1);
  }
});
test("catalog and new orders are blocked on the server without touching existing orders, login or admin", async () => {
  for (const [path, method] of [
    ["/api/catalog", "GET"],
    ["/api/catalog/", "GET"],
    ["/api/orders", "POST"],
    ["/api/orders/", "POST"],
  ]) {
    const c = context(path, method);
    const response = await handleLaunchGate(c, deadline - 1);
    assert.equal(response.status, 503);
    assert.equal(c.passed, 0);
    assert.equal((await response.json()).code, "launch_pending");
    assert.ok(Number(response.headers.get("Retry-After")) >= 1);
    assert.equal(
      await (await handleLaunchGate(context(path, method), deadline)).text(),
      "STORE",
    );
  }
  for (const path of [
    "/api/launch",
    "/api/auth/session",
    "/api/orders",
    "/api/orders/old-order",
    "/api/admin/orders",
    "/painel/pedidos",
    "/conta/pedidos",
    "/entrar",
    "/ajuda",
    "/privacidade",
    "/media/launch-v2/photo.webp",
  ]) {
    const c = context(path);
    assert.equal(
      await (await handleLaunchGate(c, deadline - 1)).text(),
      "STORE",
      path,
    );
  }
});
test("invalid opening dates fail closed; disabling the gate is explicit and HEAD has no body", async () => {
  assert.equal(
    (
      await handleLaunchGate(
        context("/", "GET", { LAUNCH_OPENS_AT: "bad" }),
        deadline + 1,
      )
    ).headers.get("X-ZXXR-Launch"),
    "waiting",
  );
  assert.equal(
    await (
      await handleLaunchGate(
        context("/", "GET", { LAUNCH_GATE_ENABLED: "false" }),
        deadline - 1,
      )
    ).text(),
    "STORE",
  );
  assert.equal(
    await (await handleLaunchGate(context("/", "HEAD"), deadline - 1)).text(),
    "",
  );
  assert.equal(
    (await handleLaunchGate(context("/espera.html"), deadline)).headers.get(
      "Location",
    ),
    "/",
  );
});
test("public opening repeats on each reload, removes preview-only controls in builds and fills all mosaic edges", async () => {
  const intro = await readFile(
    new URL("../launch-preview/LaunchPreview.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(intro, /sessionStorage/);
  assert.match(intro, /const shouldPlay = firstVisit\(\)/);
  const css = await readFile(
    new URL("../launch-preview/launch-preview.css", import.meta.url),
    "utf8",
  );
  assert.match(css, /\.mosaic-stage\s*\{[^}]*inset: 0;/);
  const mosaic = await readFile(
    new URL("../launch-preview/Mosaic.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(mosaic, /collage-heading/);
});
