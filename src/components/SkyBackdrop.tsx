import { useEffect, useRef } from "react";
import gsap from "gsap";
import "../sky-v5.css";

type SkyBackdropProps = { className?: string };
const path = "/media/clouds-v5/";
const revision = "?v=5-final";

function Photo({ name }: { name: string }) {
  return (
    <picture>
      <source
        media="(max-width: 700px)"
        srcSet={`${path}${name}-mobile.webp${revision}`}
        type="image/webp"
      />
      <img
        src={`${path}${name}.webp${revision}`}
        alt=""
        decoding="async"
        loading="eager"
        fetchPriority={name === "distant-sky" ? "high" : "low"}
        draggable={false}
      />
    </picture>
  );
}

/** Photographic CC0 sky only. It never applies a filter to product content. */
export function SkyBackdrop({ className }: SkyBackdropProps) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const host = element.parentElement ?? element;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const planes = Array.from(
      element.querySelectorAll<HTMLDivElement>(".sky-v5__parallax"),
    );
    const drifts = Array.from(
      element.querySelectorAll<HTMLDivElement>(".sky-v5__drift"),
    );
    let onscreen = true;
    let visible = document.visibilityState !== "hidden";
    let running = false;
    let timeline: gsap.core.Timeline;
    let movers: Array<{
      x: ReturnType<typeof gsap.quickTo>;
      y: ReturnType<typeof gsap.quickTo>;
    }> = [];

    const context = gsap.context(() => {
      timeline = gsap.timeline({ paused: true, repeat: -1, yoyo: true });
      timeline
        .to(drifts[0]!, { x: 7, y: -4, duration: 60, ease: "sine.inOut" }, 0)
        .to(drifts[1]!, { x: -20, y: 10, duration: 48, ease: "sine.inOut" }, 0)
        .to(drifts[2]!, { x: 18, y: -12, duration: 54, ease: "sine.inOut" }, 0);
      movers = planes.map((plane) => ({
        x: gsap.quickTo(plane, "x", { duration: 1.25, ease: "power3.out" }),
        y: gsap.quickTo(plane, "y", { duration: 1.4, ease: "power3.out" }),
      }));
    }, element);

    function sync() {
      running = !reduced.matches && visible && onscreen;
      element!.dataset.skyState = reduced.matches
        ? "static"
        : running
          ? "running"
          : "paused";
      if (running) timeline.play();
      else {
        timeline.pause();
        movers.forEach(({ x, y }) => {
          x.tween.pause();
          y.tween.pause();
        });
        gsap.set(planes, { x: 0, y: 0 });
        if (reduced.matches) {
          timeline.progress(0).pause();
          gsap.set(drifts, { x: 0, y: 0 });
        }
      }
    }

    function pointer(event: PointerEvent) {
      if (!running || !fine.matches || event.pointerType !== "mouse") return;
      const bounds = host.getBoundingClientRect();
      const x = Math.max(
        -1,
        Math.min(1, ((event.clientX - bounds.left) / bounds.width - 0.5) * 2),
      );
      const y = Math.max(
        -1,
        Math.min(1, ((event.clientY - bounds.top) / bounds.height - 0.5) * 2),
      );
      [4, 9, 16].forEach((depth, index) => {
        movers[index]?.x(-x * depth);
        movers[index]?.y(-y * depth * 0.625);
      });
    }

    function leave() {
      if (!running || !fine.matches) return;
      movers.forEach(({ x, y }) => {
        x(0);
        y(0);
      });
    }

    function visibility() {
      visible = document.visibilityState !== "hidden";
      sync();
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        onscreen = Boolean(entry?.isIntersecting);
        sync();
      },
      { threshold: 0 },
    );
    observer.observe(host);
    host.addEventListener("pointermove", pointer, { passive: true });
    host.addEventListener("pointerleave", leave, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    reduced.addEventListener("change", sync);
    fine.addEventListener("change", leave);
    sync();

    return () => {
      observer.disconnect();
      host.removeEventListener("pointermove", pointer);
      host.removeEventListener("pointerleave", leave);
      document.removeEventListener("visibilitychange", visibility);
      reduced.removeEventListener("change", sync);
      fine.removeEventListener("change", leave);
      context.revert();
      delete element.dataset.skyState;
    };
  }, []);

  return (
    <div
      ref={root}
      className={["sky-v5", className].filter(Boolean).join(" ")}
      aria-hidden="true"
      data-sky-state="static"
    >
      <div className="sky-v5__parallax sky-v5__far">
        <div className="sky-v5__drift">
          <Photo name="distant-sky" />
        </div>
      </div>
      <div className="sky-v5__parallax sky-v5__mid">
        <div className="sky-v5__drift">
          <Photo name="mid-clouds" />
        </div>
      </div>
      <div className="sky-v5__parallax sky-v5__near">
        <div className="sky-v5__drift">
          <div className="sky-v5__cutout sky-v5__cutout--left">
            <Photo name="near-left" />
          </div>
          <div className="sky-v5__cutout sky-v5__cutout--right">
            <Photo name="near-right" />
          </div>
        </div>
      </div>
    </div>
  );
}
