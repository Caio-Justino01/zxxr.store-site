import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseEnv } from "node:util";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Connect, Plugin } from "vite";
import type { Env } from "./api.ts";
import type { LaunchEnv } from "./launch.ts";
import { HttpError, requireSameOrigin } from "./http.ts";

type ApiHandler = (request: Request, env: Env) => Promise<Response>;
type LaunchHandler = (env?: LaunchEnv) => Response;
type LocalRequest = Pick<IncomingMessage, "headers" | "rawHeaders"> & {
  socket: {
    remoteAddress?: string;
    localPort?: number;
    encrypted?: boolean;
  };
};

export type LocalApiOptions = {
  root: string;
  loadApi?: () => Promise<ApiHandler>;
  loadLaunch?: () => Promise<LaunchHandler>;
  timeoutMs?: number;
};

// These values stay in the Vite server process. Never use VITE_* or expose env.
const environmentKeys = [
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STORE_CONTACT",
  "STORE_MODE",
  "TURNSTILE_SITE_KEY",
  "EMAIL_LOGIN_ENABLED",
  "GOOGLE_LOGIN_ENABLED",
] as const satisfies readonly (keyof Env)[];
const authMutations = new Set([
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/recover",
  "/api/auth/password",
  "/api/auth/logout",
  "/api/auth/mfa/enroll",
  "/api/auth/mfa/verify",
]);
const maxBodyBytes = 32_768;

function isServerOnlyPath(rawUrl: string) {
  let pathname = rawUrl.split(/[?#]/, 1)[0];
  try {
    // Vite accepts encoded /@fs paths too; none may expose server source or env.
    for (let attempt = 0; attempt < 3; attempt++) {
      const decoded = decodeURIComponent(pathname);
      if (decoded === pathname) break;
      pathname = decoded;
    }
  } catch {
    return true;
  }
  pathname = pathname.replaceAll("\\", "/");
  return (
    /(?:^|\/)(?:server|functions|\.wrangler|\.git)(?:\/|$)/i.test(pathname) ||
    /(?:^|\/)\.(?:dev\.vars|env)(?:\.|\/|$)/i.test(pathname)
  );
}

/** A hostile Host header must never turn this bridge into an open API proxy. */
export function localApiOrigin(request: LocalRequest): string | null {
  const remote = request.socket.remoteAddress?.toLowerCase();
  if (
    remote !== "127.0.0.1" &&
    remote !== "::1" &&
    remote !== "::ffff:127.0.0.1"
  )
    return null;
  const host = request.headers.host;
  if (
    !host ||
    !/^(?:localhost|127\.0\.0\.1|\[::1\])(?::[1-9]\d{0,4})?$/i.test(host)
  )
    return null;
  let hostCount = 0;
  for (let index = 0; index < request.rawHeaders.length; index += 2)
    if (request.rawHeaders[index].toLowerCase() === "host") hostCount++;
  if (hostCount !== 1) return null;
  let origin: URL;
  try {
    origin = new URL(
      `${request.socket.encrypted ? "https" : "http"}://${host}`,
    );
  } catch {
    return null;
  }
  const port = Number(origin.port || (request.socket.encrypted ? 443 : 80));
  if (
    port > 65_535 ||
    (request.socket.localPort && port !== request.socket.localPort)
  )
    return null;
  return origin.origin;
}

async function localEnvironment(root: string): Promise<Env> {
  let source: string;
  try {
    source = await readFile(path.join(root, ".dev.vars"), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
  const parsed = parseEnv(source);
  const env: Env = {};
  for (const key of environmentKeys)
    if (typeof parsed[key] === "string") env[key] = parsed[key];
  return env;
}

function errorResponse(status: number, code: string, message: string) {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function bodyBytes(
  request: IncomingMessage,
  signal: AbortSignal,
): Promise<Buffer> {
  const length = request.headers["content-length"];
  if (length && (!/^\d+$/.test(length) || Number(length) > maxBodyBytes)) {
    request.resume();
    return Promise.reject(
      new HttpError(413, "Solicitação muito grande.", "body_too_large"),
    );
  }
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    const cleanup = () => {
      request.off("data", onData);
      request.off("end", onEnd);
      request.off("error", onError);
      request.off("aborted", onAborted);
      signal.removeEventListener("abort", onAbort);
    };
    const fail = (error: Error) => {
      cleanup();
      request.resume();
      reject(error);
    };
    const onData = (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxBodyBytes)
        fail(new HttpError(413, "Solicitação muito grande.", "body_too_large"));
      else chunks.push(chunk);
    };
    const onEnd = () => {
      cleanup();
      resolve(Buffer.concat(chunks, size));
    };
    const onError = () =>
      fail(new HttpError(400, "Confira os dados enviados.", "invalid_request"));
    const onAborted = () =>
      fail(new HttpError(400, "Solicitação interrompida.", "invalid_request"));
    const onAbort = () =>
      fail(
        new HttpError(
          504,
          "A consulta local demorou. Tente novamente.",
          "local_timeout",
        ),
      );
    request.on("data", onData);
    request.once("end", onEnd);
    request.once("error", onError);
    request.once("aborted", onAborted);
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) onAbort();
  });
}

async function sendResponse(
  response: Response,
  target: ServerResponse,
  head: boolean,
) {
  const bytes = head ? undefined : Buffer.from(await response.arrayBuffer());
  if (target.destroyed || target.writableEnded) return;
  target.statusCode = response.status;
  response.headers.forEach((value, name) => {
    if (name.toLowerCase() !== "set-cookie") target.setHeader(name, value);
  });
  const cookies = response.headers.getSetCookie();
  if (cookies.length) target.setHeader("Set-Cookie", cookies);
  target.end(bytes);
}

/** Local read-only bridge; authentication still uses the real account and MFA. */
export function createLocalApiMiddleware(
  options: LocalApiOptions,
): Connect.NextHandleFunction {
  const loadApi =
    options.loadApi ?? (async () => (await import("./api.ts")).handleApi);
  const loadLaunch =
    options.loadLaunch ??
    (async () => (await import("./launch.ts")).launchResponse);
  const timeoutMs = options.timeoutMs ?? 12_000;
  return (request, response, next) => {
    const rawUrl = request.url ?? "/";
    if (isServerOnlyPath(rawUrl)) {
      request.resume();
      void sendResponse(
        errorResponse(
          403,
          "local_server_only",
          "Arquivo reservado ao servidor local.",
        ),
        response,
        request.method === "HEAD",
      );
      return;
    }
    if (!/^\/api(?:\/|\?|$)/.test(rawUrl)) {
      next();
      return;
    }
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = async () => {
      const origin = localApiOrigin(request);
      if (!origin)
        return errorResponse(
          403,
          "local_only",
          "Esta prévia aceita apenas acesso local.",
        );
      const url = new URL(rawUrl, origin);
      const method = request.method ?? "GET";
      const readOnly = method === "GET" || method === "HEAD";
      const route = url.pathname.replace(/\/$/, "");
      if (!readOnly && !(method === "POST" && authMutations.has(route))) {
        request.resume();
        return errorResponse(
          403,
          "local_read_only",
          "Esta prévia permite consultar a loja, mas não alterar pedidos ou configurações.",
        );
      }
      const headers = new Headers();
      for (const [name, value] of Object.entries(request.headers))
        if (value !== undefined)
          for (const part of Array.isArray(value) ? value : [value])
            headers.append(name, part);
      const body = await bodyBytes(request, controller.signal);
      const forwarded = new Request(url, {
        method: method === "HEAD" ? "GET" : method,
        headers,
        signal: controller.signal,
        body:
          !readOnly && body.length ? new Uint8Array(body).buffer : undefined,
      });
      // Reject cross-origin authentication before loading any configuration.
      requireSameOrigin(forwarded);
      const env = await localEnvironment(options.root);
      if (controller.signal.aborted)
        throw new HttpError(
          504,
          "A consulta local demorou. Tente novamente.",
          "local_timeout",
        );
      env.APP_ORIGIN = origin;
      if (route === "/api/_local/status")
        return new Response(
          JSON.stringify({
            configured: !!(env.SUPABASE_URL && env.SUPABASE_PUBLISHABLE_KEY),
            readOnly: true,
            realMetrics: false,
          }),
          {
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "Cache-Control": "private, no-store",
              "X-Content-Type-Options": "nosniff",
            },
          },
        );
      if (route === "/api/launch") {
        const launch = await loadLaunch();
        if (controller.signal.aborted)
          throw new HttpError(
            504,
            "A consulta local demorou. Tente novamente.",
            "local_timeout",
          );
        return launch({ LAUNCH_GATE_ENABLED: "false" });
      }
      const api = await loadApi();
      if (controller.signal.aborted)
        throw new HttpError(
          504,
          "A consulta local demorou. Tente novamente.",
          "local_timeout",
        );
      return api(forwarded, env);
    };
    const timeout = new Promise<Response>((resolve) => {
      timer = setTimeout(() => {
        resolve(
          errorResponse(
            504,
            "local_timeout",
            "A consulta local demorou. Tente novamente.",
          ),
        );
        controller.abort();
      }, timeoutMs);
    });
    void Promise.race([run(), timeout])
      .catch((error: unknown) =>
        error instanceof HttpError
          ? errorResponse(error.status, error.code, error.message)
          : errorResponse(
              503,
              "local_api_unavailable",
              "O servidor local de contas está indisponível. Tente novamente.",
            ),
      )
      .then((result) =>
        sendResponse(result, response, request.method === "HEAD"),
      )
      .catch(() => {
        if (!response.destroyed && !response.writableEnded) {
          response.statusCode = 503;
          response.end();
        }
      })
      .finally(() => {
        if (timer) clearTimeout(timer);
      });
  };
}

/** Vite loads handlers through SSR on every request, including after an HMR edit. */
export function localApiPlugin(): Plugin {
  return {
    name: "zxxr-local-api",
    apply: "serve",
    config(config) {
      return {
        server: {
          fs: {
            deny: [
              ...(config.server?.fs?.deny ?? [
                ".env",
                ".env.*",
                "*.{crt,pem}",
                "**/.git/**",
              ]),
              "**/.dev.vars",
              "**/.dev.vars.*",
              "**/server/**",
              "**/functions/**",
              "**/.wrangler/**",
            ],
          },
        },
      };
    },
    configureServer(server) {
      server.middlewares.use(
        createLocalApiMiddleware({
          root: server.config.root,
          loadApi: async () =>
            (await server.ssrLoadModule("/server/api.ts"))
              .handleApi as ApiHandler,
          loadLaunch: async () =>
            (await server.ssrLoadModule("/server/launch.ts"))
              .launchResponse as LaunchHandler,
        }),
      );
    },
  };
}
