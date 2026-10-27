import { useEffect, useRef } from "react";
import {
  createGradientRenderer,
  type GradientRenderer,
} from "../lib/gradient-renderer";
import "../gradient-v6.css";

/** A decorative background only: the product photographs remain ordinary HTML. */
export function GradientBackdrop({ className }: { className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = root.current;
    const canvas = surface.current;
    if (!element || !canvas) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobile = window.matchMedia("(max-width: 699px)");
    let renderer: GradientRenderer | null = null;
    let frame: number | null = null;
    let previous: number | null = null;
    let elapsed = 0;
    let onscreen = true;
    let lost = false;
    let disposed = false;

    function stop() {
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = null;
      previous = null;
    }

    function active() {
      return (
        !disposed &&
        !lost &&
        Boolean(renderer) &&
        onscreen &&
        document.visibilityState !== "hidden" &&
        !reduced.matches
      );
    }

    function draw(time: number) {
      frame = null;
      if (!active()) return;
      if (previous !== null)
        elapsed += Math.min(0.05, Math.max(0, (time - previous) / 1000));
      previous = time;
      renderer!.render(elapsed);
      frame = window.requestAnimationFrame(draw);
    }

    function sync() {
      if (disposed) return;
      stop();
      canvas!.hidden = !renderer || lost;
      element!.dataset.backgroundMode = renderer?.mode ?? "css";
      if (lost) {
        element!.dataset.backgroundState = "context-lost";
      } else if (!renderer) {
        element!.dataset.backgroundState = "fallback";
      } else if (reduced.matches) {
        elapsed = 0;
        renderer.render(0);
        element!.dataset.backgroundState = "static";
      } else if (active()) {
        element!.dataset.backgroundState = "running";
        frame = window.requestAnimationFrame(draw);
      } else {
        element!.dataset.backgroundState = "paused";
      }
    }

    function resize() {
      if (!renderer || lost || disposed) return;
      const bounds = element!.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) return;
      const dpr = Math.min(
        window.devicePixelRatio || 1,
        mobile.matches ? 1.5 : 2,
      );
      renderer.resize(bounds.width, bounds.height, dpr);
      renderer.render(reduced.matches ? 0 : elapsed);
    }

    function initialize() {
      try {
        renderer = createGradientRenderer(canvas!);
      } catch {
        renderer = null;
      }
      resize();
      sync();
    }

    function contextLost(event: Event) {
      event.preventDefault();
      lost = true;
      stop();
      // The browser has released these GPU resources along with the context.
      renderer = null;
      sync();
    }

    function contextRestored() {
      if (disposed) return;
      lost = false;
      initialize();
    }

    const visibility = () => sync();
    const preference = () => {
      resize();
      sync();
    };
    const observer =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(([entry]) => {
            onscreen = Boolean(entry?.isIntersecting);
            sync();
          })
        : null;
    const size =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;

    canvas.addEventListener("webglcontextlost", contextLost);
    canvas.addEventListener("webglcontextrestored", contextRestored);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("resize", resize, { passive: true });
    reduced.addEventListener("change", preference);
    mobile.addEventListener("change", preference);
    observer?.observe(element);
    size?.observe(element);
    initialize();

    return () => {
      disposed = true;
      stop();
      observer?.disconnect();
      size?.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("resize", resize);
      reduced.removeEventListener("change", preference);
      mobile.removeEventListener("change", preference);
      canvas.removeEventListener("webglcontextlost", contextLost);
      canvas.removeEventListener("webglcontextrestored", contextRestored);
      renderer?.dispose();
    };
  }, []);

  return (
    <div
      ref={root}
      className={["gradient-backdrop", className].filter(Boolean).join(" ")}
      aria-hidden="true"
      data-background-state="fallback"
      data-background-mode="css"
    >
      <canvas ref={surface} hidden tabIndex={-1} />
    </div>
  );
}
