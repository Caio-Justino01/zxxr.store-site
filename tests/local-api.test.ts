import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  createServer,
  request as httpRequest,
  type IncomingHttpHeaders,
} from "node:http";
import { once } from "node:events";
import {
  createLocalApiMiddleware,
  localApiOrigin,
  localApiPlugin,
  type LocalApiOptions,
} from "../server/dev-api.ts";
import { launchResponse } from "../server/launch.ts";
import type { Env } from "../server/api.ts";

type Result = { status: number; headers: IncomingHttpHeaders; body: string };
async function removeFixtureRoot(root: string) {
  const resolved = path.resolve(root);
  const base = path.resolve(tmpdir());
  assert(resolved.startsWith(base + path.sep));
  assert(/^zxxr-(?:local-api|vite-local-api)-/.test(path.basename(resolved)));
  await rm(resolved, { recursive: true, force: true });
}
async function fixture(overrides: Partial<LocalApiOptions> = {}) {
  const root = await mkdtemp(path.join(tmpdir(), "zxxr-local-api-"));
  const calls: {
    url: string;
    method: string;
    env: Env;
    body: string;
    cookie: string | null;
  }[] = [];
  let loads = 0;
  const middleware = createLocalApiMiddleware({
    root,
    loadApi: async () => {
      loads++;
      return async (request, env) => {
        calls.push({
          url: request.url,
          method: request.method,
          env,
          body: await request.text(),
          cookie: request.headers.get("cookie"),
        });
        const headers = new Headers({
          "Content-Type": "application/json",
          "Cache-Control": "private, no-store",
          Location: "/painel/analytics",
        });
        headers.append(
          "Set-Cookie",
          "session=synthetic; Path=/; HttpOnly; SameSite=Lax",
        );
        headers.append(
          "Set-Cookie",
          "challenge=synthetic; Path=/; HttpOnly; SameSite=Lax",
        );
        return new Response(JSON.stringify({ configured: true }), { headers });
      };
    },
    loadLaunch: async () => launchResponse,
    ...overrides,
  });
  const server = createServer((request, response) =>
    middleware(request, response, () => {
      response.statusCode = 404;
      response.end("not an API route");
    }),
  );
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address === "object");
  const origin = `http://127.0.0.1:${address.port}`;
  async function send(
    route: string,
    options: {
      method?: string;
      headers?: Record<string, string>;
      body?: string;
      chunks?: string[];
    } = {},
  ): Promise<Result> {
    return new Promise((resolve, reject) => {
      const request = httpRequest(
        `${origin}${route}`,
        {
          method: options.method ?? "GET",
          headers: options.headers,
        },
        (response) => {
          const chunks: Buffer[] = [];
          response.on("data", (chunk: Buffer) => chunks.push(chunk));
          response.once("error", reject);
          response.once("end", () =>
            resolve({
              status: response.statusCode!,
              headers: response.headers,
              body: Buffer.concat(chunks).toString("utf8"),
            }),
          );
        },
      );
      request.once("error", reject);
      for (const chunk of options.chunks ?? []) request.write(chunk);
      request.end(options.body);
    });
  }
  return {
    root,
    calls,
    origin,
    send,
    get loads() {
      return loads;
    },
    async close() {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      await removeFixtureRoot(root);
    },
  };
}

test("local API validates both the remote address and the exact loopback Host authority", () => {
  const input = (remoteAddress: string, host: string, localPort = 5274) => ({
    headers: { host },
    rawHeaders: ["Host", host],
    socket: { remoteAddress, localPort },
  });
  for (const [remote, host] of [
    ["127.0.0.1", "127.0.0.1:5274"],
    ["::ffff:127.0.0.1", "localhost:5274"],
    ["::1", "[::1]:5274"],
  ])
    assert.equal(localApiOrigin(input(remote, host)), `http://${host}`);
  for (const [remote, host] of [
    ["192.168.1.4", "localhost:5274"],
    ["127.0.0.2", "localhost:5274"],
    ["127.0.0.1", "evil.example:5274"],
    ["127.0.0.1", "localhost.evil.test:5274"],
    ["127.0.0.1", "user@localhost:5274"],
    ["127.0.0.1", "localhost:5274/path"],
    ["127.0.0.1", "127.0.0.1:65536"],
    ["127.0.0.1", "127.0.0.1:5275"],
  ])
    assert.equal(localApiOrigin(input(remote, host)), null);
  const duplicate = input("127.0.0.1", "localhost:5274");
  duplicate.rawHeaders.push("Host", "localhost:5274");
  assert.equal(localApiOrigin(duplicate), null);
});

test("local API uses only whitelisted server variables and overrides callback origin with the local URL", async () => {
  const f = await fixture();
  try {
    await writeFile(
      path.join(f.root, ".dev.vars"),
      'SUPABASE_URL="https://synthetic.example.test"\nSUPABASE_PUBLISHABLE_KEY=synthetic-public\nSUPABASE_SERVICE_ROLE_KEY="synthetic-private"\nSTORE_MODE=live\nEMAIL_LOGIN_ENABLED=true\nAPP_ORIGIN=https://www.zxxr.store\nUNRELATED_SECRET=never-forward\nANALYTICS_TEST_ENABLED=true\n',
    );
    const first = await f.send("/api/auth/session");
    assert.equal(first.status, 200);
    assert.match(String(first.headers["content-type"]), /application\/json/);
    assert.equal(f.calls[0].env.SUPABASE_SERVICE_ROLE_KEY, "synthetic-private");
    assert.equal(f.calls[0].env.APP_ORIGIN, f.origin);
    assert.equal(f.calls[0].env.STORE_MODE, "live");
    assert.equal(f.calls[0].env.ANALYTICS_TEST_ENABLED, undefined);
    assert.equal("UNRELATED_SECRET" in f.calls[0].env, false);
    assert.equal(first.body.includes("synthetic-private"), false);
    await writeFile(
      path.join(f.root, ".dev.vars"),
      "EMAIL_LOGIN_ENABLED=false\n",
    );
    await f.send("/api/auth/session");
    assert.equal(f.loads, 2);
    assert.equal(f.calls[1].env.EMAIL_LOGIN_ENABLED, "false");
    assert.equal(f.calls[1].env.SUPABASE_SERVICE_ROLE_KEY, undefined);
  } finally {
    await f.close();
  }
});

test("local status exposes booleans only, permits missing config and never invokes the account handler", async () => {
  const f = await fixture();
  try {
    let response = await f.send("/api/_local/status");
    assert.deepEqual(JSON.parse(response.body), {
      configured: false,
      readOnly: true,
      realMetrics: false,
    });
    await writeFile(
      path.join(f.root, ".dev.vars"),
      "SUPABASE_URL=https://synthetic.example.test\nSUPABASE_PUBLISHABLE_KEY=synthetic\n",
    );
    response = await f.send("/api/_local/status");
    assert.deepEqual(JSON.parse(response.body), {
      configured: true,
      readOnly: true,
      realMetrics: false,
    });
    assert.equal(f.loads, 0);
    assert.match(String(response.headers["cache-control"]), /no-store/);
  } finally {
    await f.close();
  }
});

test("local launch uses the real response with gate disabled without modifying the production configuration", async () => {
  const f = await fixture();
  try {
    const response = await f.send("/api/launch");
    const body = JSON.parse(response.body);
    assert.equal(body.enabled, false);
    assert.equal(body.opensAt, "2026-10-31T03:00:00.000Z");
    assert.equal((await launchResponse().json()).enabled, true);
    assert.equal(f.loads, 0);
  } finally {
    await f.close();
  }
});

test("local bridge retains real authentication headers, multiple cookies and HEAD semantics", async () => {
  const f = await fixture();
  try {
    const result = await f.send("/api/auth/login", {
      method: "POST",
      headers: {
        Origin: f.origin,
        "Content-Type": "application/json",
        Cookie: "old=kept; other=kept",
      },
      body: '{"email":"synthetic@example.test","password":"synthetic-only"}',
    });
    assert.equal(result.status, 200);
    assert.equal(f.calls[0].method, "POST");
    assert.equal(f.calls[0].cookie, "old=kept; other=kept");
    assert.equal(JSON.parse(f.calls[0].body).password, "synthetic-only");
    assert.equal(result.headers["set-cookie"]?.length, 2);
    assert.equal(result.headers.location, "/painel/analytics");
    const head = await f.send("/api/auth/session", { method: "HEAD" });
    assert.equal(head.status, 200);
    assert.equal(head.body, "");
    assert.equal(f.calls[1].method, "GET");
  } finally {
    await f.close();
  }
});

test("commercial, administrative, profile, recovery and analytics mutations are rejected before the real handler", async () => {
  const f = await fixture();
  try {
    for (const route of [
      "/api/orders",
      "/api/admin/settings",
      "/api/profile",
      "/api/recovery/cart",
      "/api/recovery/preferences",
      "/api/analytics/events",
      "/api/auth/unknown",
      "/api/_local/status",
    ]) {
      const response = await f.send(route, {
        method: "POST",
        headers: { Origin: f.origin, "Content-Type": "application/json" },
        body: "{}",
      });
      assert.equal(response.status, 403, route);
      assert.equal(JSON.parse(response.body).error.code, "local_read_only");
    }
    assert.equal(f.loads, 0);
    await f.send("/api/admin/orders");
    assert.equal(
      f.loads,
      1,
      "GET still delegates authorization to the real handler",
    );
    assert.equal(f.calls[0].env.SUPABASE_SERVICE_ROLE_KEY, undefined);
  } finally {
    await f.close();
  }
});

test("authentication keeps the same-origin and JSON requirements and rejects hostile hosts", async () => {
  const f = await fixture();
  try {
    for (const headers of [
      { Origin: "https://evil.example", "Content-Type": "application/json" },
      { "Content-Type": "application/json" },
      {
        Origin: f.origin,
        "Content-Type": "application/json",
        "Sec-Fetch-Site": "cross-site",
      },
    ]) {
      const response = await f.send("/api/auth/login", {
        method: "POST",
        headers,
        body: "{}",
      });
      assert.equal(response.status, 403);
      assert.equal(JSON.parse(response.body).error.code, "csrf");
    }
    const type = await f.send("/api/auth/login", {
      method: "POST",
      headers: { Origin: f.origin, "Content-Type": "text/plain" },
      body: "{}",
    });
    assert.equal(type.status, 415);
    const host = await f.send("/api/auth/session", {
      headers: { Host: "evil.example" },
    });
    assert.equal(host.status, 403);
    assert.equal(JSON.parse(host.body).error.code, "local_only");
    assert.equal(f.loads, 0);
  } finally {
    await f.close();
  }
});

test("the bridge bounds declared and chunked request bodies to 32 KB", async () => {
  const f = await fixture();
  try {
    const large = "x".repeat(32_769);
    const declared = await f.send("/api/auth/login", {
      method: "POST",
      headers: {
        Origin: f.origin,
        "Content-Type": "application/json",
        "Content-Length": String(large.length),
      },
      body: large,
    });
    assert.equal(declared.status, 413);
    const chunked = await f.send("/api/auth/login", {
      method: "POST",
      headers: { Origin: f.origin, "Content-Type": "application/json" },
      chunks: ["x".repeat(20_000), "y".repeat(20_000)],
    });
    assert.equal(chunked.status, 413);
    const exact = await f.send("/api/auth/login", {
      method: "POST",
      headers: { Origin: f.origin, "Content-Type": "application/json" },
      body: " ".repeat(32_768),
    });
    assert.equal(exact.status, 200);
    assert.equal(f.loads, 1);
  } finally {
    await f.close();
  }
});

test("timeouts and internal failures return clean responses without leaking handler or configuration details", async () => {
  let handlerCalls = 0;
  const slow = await fixture({
    timeoutMs: 20,
    loadApi: async () => {
      await new Promise((resolve) => setTimeout(resolve, 70));
      return async () => {
        handlerCalls++;
        return new Response("too late");
      };
    },
  });
  try {
    const response = await slow.send("/api/auth/session");
    assert.equal(response.status, 504);
    assert.equal(JSON.parse(response.body).error.code, "local_timeout");
    await new Promise((resolve) => setTimeout(resolve, 90));
    assert.equal(
      handlerCalls,
      0,
      "a timed-out module load cannot subsequently call the real API",
    );
  } finally {
    await slow.close();
  }
  const bad = await fixture({
    loadApi: async () => {
      throw new Error("synthetic-private-do-not-expose");
    },
  });
  try {
    const response = await bad.send("/api/auth/session");
    assert.equal(response.status, 503);
    assert.equal(response.body.includes("synthetic-private"), false);
    assert.equal(JSON.parse(response.body).error.code, "local_api_unavailable");
  } finally {
    await bad.close();
  }
});

test("non-API requests pass through and the Vite plugin is serve-only", async () => {
  const f = await fixture();
  try {
    const response = await f.send("/produto/boca");
    assert.equal(response.body, "not an API route");
    assert.equal(f.loads, 0);
    const plugin = localApiPlugin();
    assert.equal(plugin.apply, "serve");
    assert.equal(plugin.name, "zxxr-local-api");
    assert.equal(typeof plugin.configureServer, "function");
  } finally {
    await f.close();
  }
});

test("server source, Functions and secret files cannot be fetched directly or through encoded /@fs paths", async () => {
  const f = await fixture();
  try {
    for (const route of [
      "/server/dev-api.ts",
      "/server/api.ts?import",
      "/functions/api/path.ts",
      "/.dev.vars",
      "/.dev.vars.example",
      "/.env.local",
      "/@fs/C:/synthetic/project/.dev.vars",
      "/@fs/C:/synthetic/project/server/api.ts",
      "/@fs/C:/synthetic/project/functions/_middleware.ts",
      "/@fs/C%3A/synthetic/project/%2Edev%2Evars",
      "/%2573erver/dev-api.ts",
      "/.wrangler/state/synthetic.sqlite",
      "/.git/config",
    ]) {
      const response = await f.send(route);
      assert.equal(response.status, 403, route);
      assert.equal(JSON.parse(response.body).error.code, "local_server_only");
    }
    assert.equal(f.loads, 0);
  } finally {
    await f.close();
  }
});

test("serve-only file guards do not prevent Vite from loading the API internally through SSR", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "zxxr-vite-local-api-"));
  const { createServer: createViteServer } = await import("vite");
  await mkdir(path.join(root, "server"));
  await writeFile(
    path.join(root, "server", "api.ts"),
    'export async function handleApi(request,env) { return new Response(JSON.stringify({synthetic:true,configured:!!env.SUPABASE_URL,origin:env.APP_ORIGIN}),{headers:{"Content-Type":"application/json"}}); }',
  );
  const server = await createViteServer({
    root,
    configFile: false,
    logLevel: "silent",
    plugins: [localApiPlugin()],
    server: { host: "127.0.0.1", port: 0, strictPort: true },
  });
  try {
    await server.listen();
    const address = server.httpServer!.address();
    assert(address && typeof address === "object");
    const origin = `http://127.0.0.1:${address.port}`;
    const response = await fetch(`${origin}/api/auth/session`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      synthetic: true,
      configured: false,
      origin,
    });
    const source = await fetch(`${origin}/server/api.ts`);
    assert.equal(source.status, 403);
    assert.equal((await source.json()).error.code, "local_server_only");
  } finally {
    await server.close();
    await removeFixtureRoot(root);
  }
});
