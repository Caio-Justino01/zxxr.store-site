import { spawn } from "node:child_process";
import { readFile, writeFile, mkdir, readdir, access } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, ...value] = arg.replace(/^--/, "").split("=");
    return [key, value.join("=") || "true"];
  }),
);
const base = new URL(args.url ?? "http://127.0.0.1:5281/");
if (!["127.0.0.1", "localhost"].includes(base.hostname))
  throw new Error("This audit script only permits an isolated local build.");
const output = path.join(
  root,
  "previews",
  "analytics-seo-20261029",
  /^[a-z0-9-]+$/.test(args["output-name"] ?? "lighthouse")
    ? (args["output-name"] ?? "lighthouse")
    : "lighthouse",
);
await mkdir(output, { recursive: true });
const chrome =
  args.chrome ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
await access(chrome);
let lighthouse = args.lighthouse;
if (!lighthouse) {
  const cacheRoot = path.join(
    process.env.LOCALAPPDATA ?? "",
    "npm-cache",
    "_npx",
  );
  const found = [];
  for (const folder of await readdir(cacheRoot)) {
    const packageDir = path.join(
      cacheRoot,
      folder,
      "node_modules",
      "lighthouse",
    );
    try {
      const pkg = JSON.parse(
        await readFile(path.join(packageDir, "package.json"), "utf8"),
      );
      found.push({
        path: path.join(packageDir, "cli", "index.js"),
        version: pkg.version,
      });
    } catch {
      /* unrelated npm exec cache */
    }
  }
  found.sort((a, b) =>
    b.version.localeCompare(a.version, undefined, { numeric: true }),
  );
  lighthouse = found[0]?.path;
}
if (!lighthouse)
  throw new Error(
    "Install the official CLI into npm's cache: npm exec --yes --package=lighthouse -- lighthouse --version",
  );
const cliPackage = JSON.parse(
  await readFile(path.resolve(lighthouse, "../../package.json"), "utf8"),
);
const pages = [
  { name: "home", path: "/" },
  { name: "emocao", path: "/produto/boca" },
  { name: "spiritual", path: "/produto/spiritual-gangsta" },
];
const forms = (args.forms ?? "mobile,desktop").split(",");
const runs = Number(args.runs ?? 5);
const limit = Number(args.limit ?? Infinity);
let completed = 0;

async function assertIsolated() {
  const fetchJson = async (route) => {
    const response = await fetch(new URL(route, base), {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`${route}: HTTP ${response.status}`);
    return response.json();
  };
  const [launch, session] = await Promise.all([
    fetchJson("/api/launch"),
    fetchJson("/api/auth/session"),
  ]);
  if (launch.enabled !== false || session.configured !== false)
    throw new Error(
      "Refusing audit: gate must be disabled and the isolated backend must be unconfigured.",
    );
}
const median = (numbers) => {
  const sorted = [...numbers].sort((a, b) => a - b);
  return sorted.length % 2
    ? sorted[(sorted.length - 1) / 2]
    : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
};
async function summarize() {
  const results = [];
  for (const name of await readdir(output)) {
    if (!name.endsWith(".report.json")) continue;
    const report = JSON.parse(await readFile(path.join(output, name), "utf8"));
    const match =
      /^(home|emocao|spiritual)-(mobile|desktop)-(\d+)\.report\.json$/.exec(
        name,
      );
    if (!match) continue;
    results.push({
      page: match[1],
      form: match[2],
      run: Number(match[3]),
      report: name,
      scores: Object.fromEntries(
        Object.entries(report.categories ?? {}).map(([key, value]) => [
          key,
          value.score === null ? null : Math.round(value.score * 100),
        ]),
      ),
      lcpMs: report.audits["largest-contentful-paint"]?.numericValue,
      tbtMs: report.audits["total-blocking-time"]?.numericValue,
      cls: report.audits["cumulative-layout-shift"]?.numericValue,
      warnings: report.runWarnings ?? [],
      runtimeError: report.runtimeError ?? null,
      userAgent: report.userAgent,
      settings: report.configSettings,
    });
  }
  const groups = [];
  for (const page of pages)
    for (const form of forms) {
      const rows = results.filter(
        (row) =>
          row.page === page.name && row.form === form && !row.runtimeError,
      );
      if (!rows.length) continue;
      groups.push({
        page: page.path,
        form,
        runs: rows.length,
        medianScores: Object.fromEntries(
          ["performance", "accessibility", "best-practices", "seo"].map(
            (key) => [
              key,
              median(
                rows
                  .map((row) => row.scores[key])
                  .filter((value) => value !== null && value !== undefined),
              ),
            ],
          ),
        ),
        lcpMs: median(rows.map((row) => row.lcpMs)),
        tbtMs: median(rows.map((row) => row.tbtMs)),
        cls: median(rows.map((row) => row.cls)),
      });
    }
  const summary = {
    createdAt: new Date().toISOString(),
    localBuildUrl: base.href,
    lighthouseVersion: cliPackage.version,
    hardware: {
      platform: os.platform(),
      architecture: os.arch(),
      cpu: os.cpus()[0]?.model,
      logicalCpus: os.cpus().length,
      totalMemoryBytes: os.totalmem(),
      node: process.version,
    },
    limits: [
      "Local isolated production build; not PageSpeed Insights against the published domain.",
      "No operational backend or real purchase is exercised.",
      "Local/preview noindex is intentional and can lower the SEO category.",
      "Mobile uses Lighthouse's default simulated throttling; desktop uses the official desktop preset.",
      "INP field data and real-user Core Web Vitals are not measured by this run.",
      "Five sequential cold-profile runs per page/device; median values, not guarantees of production scores.",
    ],
    groups,
    results,
  };
  await writeFile(
    path.join(output, "summary.json"),
    JSON.stringify(summary, null, 2) + "\n",
  );
  return summary;
}
await assertIsolated();
for (const page of pages)
  for (const form of forms)
    for (let run = 1; run <= runs; run++) {
      const prefix = path.join(output, `${page.name}-${form}-${run}`);
      try {
        const existing = JSON.parse(
          await readFile(`${prefix}.report.json`, "utf8"),
        );
        if (!existing.runtimeError) {
          console.log(
            `SKIP ${page.name} ${form} ${run}: existing valid report`,
          );
          continue;
        }
      } catch {
        /* fresh run */
      }
      if (completed >= limit) {
        await summarize();
        process.exit(0);
      }
      await assertIsolated();
      const flags = [
        lighthouse,
        new URL(page.path, base).href,
        "--quiet",
        "--output=json",
        "--output=html",
        `--output-path=${prefix}`,
        "--only-categories=performance,accessibility,best-practices,seo",
        "--chrome-flags=--headless=new --no-first-run --no-default-browser-check",
        "--max-wait-for-load=45000",
      ];
      if (form === "desktop") flags.push("--preset=desktop");
      const started = Date.now();
      console.log(`START ${page.name} ${form} ${run}`);
      await new Promise((resolve, reject) => {
        const processHandle = spawn(process.execPath, flags, {
          cwd: root,
          env: { ...process.env, CHROME_PATH: chrome },
          windowsHide: true,
          stdio: ["ignore", "pipe", "pipe"],
        });
        let outputText = "";
        processHandle.stdout.on("data", (chunk) => {
          outputText += chunk.toString();
        });
        processHandle.stderr.on("data", (chunk) => {
          outputText += chunk.toString();
        });
        processHandle.on("error", reject);
        processHandle.on("exit", (code) =>
          code === 0
            ? resolve()
            : reject(
                new Error(
                  `Lighthouse exited ${code}: ${outputText.slice(-3500)}`,
                ),
              ),
        );
      });
      completed++;
      const summary = await summarize();
      const row = summary.results.find(
        (item) =>
          item.page === page.name && item.form === form && item.run === run,
      );
      console.log(
        `DONE ${page.name} ${form} ${run} ${Math.round((Date.now() - started) / 1000)}s ${JSON.stringify({ scores: row?.scores, lcpMs: row?.lcpMs, tbtMs: row?.tbtMs, cls: row?.cls, error: row?.runtimeError })}`,
      );
    }
console.log(JSON.stringify((await summarize()).groups, null, 2));
