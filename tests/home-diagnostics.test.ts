import test from "node:test";
import assert from "node:assert/strict";
import {
  describeHomeFault,
  isHomeDiagnosticsEnabled,
  shouldInjectHomeFault,
  isHomeResizeObserverWarning,
  reportHomeFault,
  reportHomeStage,
  initHomeDiagnostics,
} from "../src/lib/home-diagnostics.ts";

test("home diagnostics require explicit opt-in and never activate on account routes", () => {
  assert.equal(isHomeDiagnosticsEnabled("?diagnostico=home"), true);
  assert.equal(isHomeDiagnosticsEnabled("?diagnostico=other"), false);
  assert.equal(isHomeDiagnosticsEnabled("?verificar=3110"), false);
  assert.equal(
    isHomeDiagnosticsEnabled("?diagnostico=home", "/conta/pedidos"),
    false,
  );
});

test("only the two browser ResizeObserver delivery warnings are ignored", () => {
  assert.equal(
    isHomeResizeObserverWarning(
      "ResizeObserver loop completed with undelivered notifications.",
      null,
    ),
    true,
  );
  assert.equal(
    isHomeResizeObserverWarning(
      "ResizeObserver loop limit exceeded",
      undefined,
    ),
    true,
  );
  assert.equal(
    isHomeResizeObserverWarning("TypeError: Cannot read property", null),
    false,
  );
  assert.equal(
    isHomeResizeObserverWarning(
      "ResizeObserver loop limit exceeded",
      new Error("actual exception"),
    ),
    false,
  );
  assert.equal(
    isHomeResizeObserverWarning("ResizeObserver is not defined", null),
    false,
  );
});

test("failure injection is limited to local and owned Pages previews", () => {
  const search = "?diagnostico=home&falha=hero";
  for (const host of [
    "localhost",
    "127.0.0.1",
    "[::1]",
    "abc123.zxxr-store.pages.dev",
  ]) {
    assert.equal(shouldInjectHomeFault("hero", host, search), true, host);
  }
  for (const host of [
    "zxxr.store",
    "www.zxxr.store",
    "zxxr-store.pages.dev",
    "example.pages.dev",
    "zxxr-store.pages.dev.attacker.test",
  ]) {
    assert.equal(shouldInjectHomeFault("hero", host, search), false, host);
  }
  assert.equal(shouldInjectHomeFault("guide", "localhost", search), false);
  assert.equal(
    shouldInjectHomeFault("hero", "localhost", "?falha=hero"),
    false,
  );
});

test("Safari stacks retain the first own asset frame without copying the description", () => {
  const fault = describeHomeFault(
    "hero",
    {
      name: "ReferenceError",
      stack:
        "startHero@https://www.zxxr.store/assets/store-SAFARI.js:8:31\nmount@https://www.zxxr.store/assets/store-SAFARI.js:18:44",
    },
    "https://www.zxxr.store",
  );
  assert.equal(fault.source, "store-SAFARI.js:8:31");
  const description = describeHomeFault(
    "runtime",
    {
      stack:
        "Error: customer@example.com input https://www.zxxr.store/assets/private.js:1:2\n at mount (https://www.zxxr.store/assets/store-REAL.js:5:6)",
    },
    "https://www.zxxr.store",
  );
  assert.equal(description.source, "store-REAL.js:5:6");
});

test("reports retain only an approved class and own compiled asset frame", () => {
  const fault = describeHomeFault(
    "hero",
    {
      name: "TypeError",
      message: "customer@example.com token=private",
      stack:
        "TypeError: customer@example.com\n at unsafe (https://other.test/assets/private.js:1:2)\n at animate (https://www.zxxr.store/assets/store-ABC123.js:27:64)",
    },
    "https://www.zxxr.store",
  );
  assert.deepEqual(fault, {
    stage: "hero",
    code: "HOME_HERO_FAILURE",
    name: "TypeError",
    source: "store-ABC123.js:27:64",
  });
  assert.equal(JSON.stringify(fault).includes("private"), false);
  assert.equal(JSON.stringify(fault).includes("customer"), false);
});

test("source URLs with queries, fragments or private routes are excluded", () => {
  assert.equal(
    describeHomeFault(
      "hero",
      new DOMException("Private details", "InvalidCharacterError"),
      "https://www.zxxr.store",
    ).name,
    "InvalidCharacterError",
  );
  for (const frame of [
    "https://www.zxxr.store/assets/store.js?token=secret:1:2",
    "https://www.zxxr.store/assets/store.js#customer:1:2",
    "https://www.zxxr.store/conta/private.js:1:2",
    "https://www.zxxr.store.evil.test/assets/store.js:1:2",
  ])
    assert.equal(
      describeHomeFault(
        "background",
        { stack: `Error\n at ${frame}` },
        "https://www.zxxr.store",
      ).source,
      null,
    );
  assert.equal(
    describeHomeFault(
      "hero",
      { name: "customer@example.com" },
      "https://www.zxxr.store",
    ).name,
    "Error",
  );
});

test("diagnostics safely ignore nonstandard thrown values and remain SSR-safe", () => {
  const thrown = Object.defineProperty({}, "name", {
    get() {
      throw new Error("blocked");
    },
  });
  assert.doesNotThrow(() => describeHomeFault("runtime", thrown, "invalid"));
  assert.equal(
    describeHomeFault("runtime", "secret", "https://www.zxxr.store").name,
    "Error",
  );
  assert.doesNotThrow(() => reportHomeFault("runtime", thrown));
  assert.doesNotThrow(() => reportHomeStage("hero"));
  assert.doesNotThrow(() => initHomeDiagnostics()());
});
