import type { GradientRenderer } from "./gradient-renderer.ts";

/** A decorative renderer must never take the public page down with it. */
export function createGradientLifecycle({
  stop,
  fallback,
  report,
}: {
  stop(): void;
  fallback(): void;
  report(error: unknown): void;
}) {
  let renderer: GradientRenderer | null = null;
  let failed = false;
  let disposed = false;

  const ignoreFailure = (operation: () => void) => {
    try {
      operation();
    } catch {
      /* Preserve the original graphics failure. */
    }
  };
  const fail = (error: unknown) => {
    if (failed) return;
    failed = true;
    // Clear ownership first: a failing dispose cannot be retried recursively.
    const current = renderer;
    renderer = null;
    ignoreFailure(stop);
    ignoreFailure(fallback);
    if (current) ignoreFailure(() => current.dispose());
    ignoreFailure(() => report(error));
  };
  const run = (operation: () => void) => {
    if (failed || disposed) return false;
    try {
      operation();
      return !failed;
    } catch (error) {
      fail(error);
      return false;
    }
  };
  const release = () => {
    const current = renderer;
    renderer = null;
    try {
      current?.dispose();
    } catch (error) {
      fail(error);
    }
  };

  return {
    get renderer() {
      return renderer;
    },
    get failed() {
      return failed;
    },
    run,
    initialize(create: () => GradientRenderer | null) {
      return run(() => {
        renderer = create();
      });
    },
    release,
    dispose() {
      if (disposed) return;
      disposed = true;
      try {
        stop();
      } catch (error) {
        fail(error);
      }
      release();
    },
  };
}
