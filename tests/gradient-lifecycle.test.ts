import test from "node:test";
import assert from "node:assert/strict";
import { createGradientLifecycle } from "../src/lib/gradient-lifecycle.ts";
import type { GradientRenderer } from "../src/lib/gradient-renderer.ts";

function fixture(failure?: "create" | "resize" | "render" | "dispose") {
  const fault = new Error(failure);
  const calls = {
    create: 0,
    resize: 0,
    render: 0,
    dispose: 0,
    stop: 0,
    fallback: 0,
  };
  const reported: unknown[] = [];
  let scheduled = true;
  const renderer: GradientRenderer = {
    mode: "flow",
    resize() {
      calls.resize++;
      if (failure === "resize") throw fault;
    },
    render() {
      calls.render++;
      if (failure === "render") throw fault;
    },
    dispose() {
      calls.dispose++;
      if (failure === "dispose") throw fault;
    },
  };
  const lifecycle = createGradientLifecycle({
    stop() {
      calls.stop++;
      scheduled = false;
    },
    fallback() {
      calls.fallback++;
    },
    report(error) {
      reported.push(error);
    },
  });
  const initialize = () =>
    lifecycle.initialize(() => {
      calls.create++;
      if (failure === "create") throw fault;
      return renderer;
    });
  return {
    lifecycle,
    calls,
    reported,
    fault,
    initialize,
    get scheduled() {
      return scheduled;
    },
  };
}

test("graphics creation, resize and render failures reveal fallback and stop permanently", () => {
  for (const failure of ["create", "resize", "render"] as const) {
    const f = fixture(failure);
    assert.doesNotThrow(() => {
      f.initialize();
      f.lifecycle.run(() => f.lifecycle.renderer!.resize(390, 844, 1.5));
      f.lifecycle.run(() => f.lifecycle.renderer!.render(0));
    });
    assert.equal(f.lifecycle.failed, true);
    assert.equal(f.lifecycle.renderer, null);
    assert.equal(f.scheduled, false);
    assert.equal(f.calls.fallback, 1);
    assert.deepEqual(f.reported, [f.fault]);
    assert.equal(f.calls.dispose, failure === "create" ? 0 : 1);
    assert.equal(
      f.initialize(),
      false,
      "a restored context must not restart a failed renderer",
    );
    assert.equal(
      f.lifecycle.run(() => assert.fail("callback restarted")),
      false,
    );
    f.lifecycle.dispose();
    f.lifecycle.dispose();
    assert.equal(f.calls.create, 1);
    assert.equal(f.calls.dispose, failure === "create" ? 0 : 1);
  }
});

test("dispose errors stay local and resources are never disposed twice", () => {
  for (const cleanup of ["release", "dispose"] as const) {
    const f = fixture("dispose");
    f.initialize();
    assert.doesNotThrow(() => f.lifecycle[cleanup]());
    f.lifecycle.dispose();
    assert.equal(f.calls.dispose, 1);
    assert.equal(f.scheduled, false);
    assert.equal(f.calls.fallback, 1);
    assert.deepEqual(f.reported, [f.fault]);
  }
});

test("healthy rendering and context restoration keep their inputs and lifecycle", () => {
  const f = fixture();
  assert.equal(f.initialize(), true);
  assert.equal(
    f.lifecycle.run(() => {
      f.lifecycle.renderer!.resize(390, 844, 1.5);
      f.lifecycle.renderer!.render(0);
    }),
    true,
  );
  f.lifecycle.release();
  assert.equal(f.initialize(), true);
  assert.equal(
    f.lifecycle.run(() => f.lifecycle.renderer!.render(0.05)),
    true,
  );
  f.lifecycle.dispose();
  assert.deepEqual(f.calls, {
    create: 2,
    resize: 1,
    render: 2,
    dispose: 2,
    stop: 1,
    fallback: 0,
  });
  assert.deepEqual(f.reported, []);
  assert.equal(
    f.lifecycle.run(() => assert.fail("disposed callback ran")),
    false,
  );
});

test("fallback and cleanup failures cannot replace or propagate the original error", () => {
  const fault = new Error("draw");
  const reports: unknown[] = [];
  const lifecycle = createGradientLifecycle({
    stop() {
      throw new Error("cancel");
    },
    fallback() {
      throw new Error("fallback");
    },
    report(error) {
      reports.push(error);
    },
  });
  lifecycle.initialize(() => ({
    mode: "waves",
    resize() {},
    render() {
      throw fault;
    },
    dispose() {
      throw new Error("dispose");
    },
  }));
  assert.doesNotThrow(() => lifecycle.run(() => lifecycle.renderer!.render(0)));
  assert.deepEqual(reports, [fault]);
});
