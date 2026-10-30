import { useLayoutEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { HeroLayout } from "./hero-layout";
import { getLocalScrollDelta } from "./hero-scroll-layout";

gsap.registerPlugin(ScrollTrigger);

type HeroScrollOptions = {
  ready: boolean;
  reduced: boolean;
  touchMode: boolean;
  layout: HeroLayout;
  /** True while scrolling has moved the hero away from its resting pose. */
  onActivity?: (inactive: boolean) => void;
};

/** Scroll owns only its own wrappers; intro, swing and departure remain separate. */
export function useHeroScroll(
  root: RefObject<HTMLElement | null>,
  { ready, reduced, touchMode, layout, onActivity }: HeroScrollOptions,
) {
  const callback = useRef(onActivity);
  callback.current = onActivity;
  const currentLayout = useRef(layout);
  currentLayout.current = layout;
  // getHeroLayout returns an object per render; hover changes must not rebuild GSAP.
  const layoutKey = [
    layout.pieceWidth,
    layout.stageHeight,
    ...layout.positions.flatMap(({ x, y, rotation, scale }) => [x, y, rotation, scale]),
    ...layout.stackPositions.flatMap(({ x, y, rotation, scale }) => [x, y, rotation, scale]),
  ].join(",");

  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    element.inert = false;
    element.dataset.scrollProgress = "0.000";
    callback.current?.(false);
    if (!ready || reduced) return;

    let alive = true;
    let refreshFrame = 0;
    let inactive = false;
    let trigger: ScrollTrigger | undefined;
    let timeline: gsap.core.Timeline | undefined;
    const syncAccessibility = (progress: number) => {
      element.dataset.scrollProgress = progress.toFixed(3);
      element.inert = progress >= 0.999;
      const nextInactive = progress > 0.01;
      if (inactive !== nextInactive) {
        inactive = nextInactive;
        callback.current?.(inactive);
      }
    };
    const synchronizeScroll = (refresh: boolean, initial = false) => {
      if (!trigger || !timeline) return;
      const visibleProgress = timeline.totalProgress();
      // Timeline-backed triggers defer their initial measurement by one tick.
      // Consume that initialization, then invalidate GSAP's cached scroll read
      // before measuring. A stopped finger must not need another scroll event.
      trigger.update();
      ScrollTrigger.update();
      if (refresh) trigger.refresh();
      trigger.update();
      const targetProgress = trigger.progress;
      // An anchor below the hero is hidden immediately. An early-scroll handoff
      // catches up from the visible pose using the same 0.35s scrub tween.
      const startingProgress =
        initial && targetProgress >= 0.999 ? targetProgress : visibleProgress;
      timeline.totalProgress(startingProgress, true);
      syncAccessibility(startingProgress);
      const scrubTween = trigger.getTween();
      if (scrubTween)
        scrubTween.resetTo("totalProgress", targetProgress, startingProgress);
      else timeline.totalProgress(targetProgress);
    };
    const context = gsap.context(() => {
      timeline = gsap.timeline({
        paused: true,
        defaults: { duration: 1, ease: "none" },
        onUpdate() {
          syncAccessibility(this.progress());
        },
      });
      timeline.fromTo(
        ".dh-scroll-intro",
        { y: 0, autoAlpha: 1 },
        { y: -12, autoAlpha: 0 },
        0,
      );
      if (touchMode) {
        timeline.fromTo(
          ".dh-scroll-carousel",
          { y: 0, scale: 1, autoAlpha: 1 },
          { y: -24, scale: 0.96, autoAlpha: 0 },
          0,
        );
      } else {
        const { positions, stackPositions } = currentLayout.current;
        element
          .querySelectorAll<HTMLElement>(".dh-scroll-piece")
          .forEach((piece, index) => {
            if (!positions[index] || !stackPositions[index]) return;
            const delta = getLocalScrollDelta(
              positions[index],
              stackPositions[index],
            );
            timeline!.fromTo(
              piece,
              { x: 0, y: 0, rotation: 0, scale: 1, autoAlpha: 1 },
              { ...delta, autoAlpha: 0 },
              0,
            );
          });
      }
      timeline.fromTo(
        ".dh-scroll-info, .dh-scroll-bottom",
        { y: 0, autoAlpha: 1 },
        { y: -8, autoAlpha: 0 },
        0,
      );
      trigger = ScrollTrigger.create({
        trigger: element,
        animation: timeline,
        start: "top top",
        end: "bottom top",
        scrub: 0.35,
        pin: false,
        invalidateOnRefresh: true,
      });
      synchronizeScroll(true, true);
    }, element);

    const scheduleRefresh = () => {
      if (!alive || refreshFrame) return;
      refreshFrame = requestAnimationFrame(() => {
        refreshFrame = 0;
        if (alive) synchronizeScroll(true);
      });
    };
    const images = [...element.querySelectorAll("img")];
    images.forEach((image) => {
      image.addEventListener("load", scheduleRefresh);
      image.addEventListener("error", scheduleRefresh);
    });
    void document.fonts?.ready.then(() => {
      if (alive) scheduleRefresh();
    });
    const initialBounds = element.getBoundingClientRect();
    let lastWidth = initialBounds.width;
    let lastHeight = initialBounds.height;
    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(([entry]) => {
            if (!entry) return;
            const { width, height } = entry.target.getBoundingClientRect();
            if (
              Math.abs(width - lastWidth) < 0.5 &&
              Math.abs(height - lastHeight) < 0.5
            )
              return;
            lastWidth = width;
            lastHeight = height;
            scheduleRefresh();
          })
        : null;
    observer?.observe(element);
    const resized = () => {
      const box = element.getBoundingClientRect();
      if (
        Math.abs(box.width - lastWidth) > 0.5 ||
        Math.abs(box.height - lastHeight) > 0.5
      )
        scheduleRefresh();
    };
    window.addEventListener("resize", resized);
    scheduleRefresh();

    return () => {
      alive = false;
      cancelAnimationFrame(refreshFrame);
      observer?.disconnect();
      window.removeEventListener("resize", resized);
      images.forEach((image) => {
        image.removeEventListener("load", scheduleRefresh);
        image.removeEventListener("error", scheduleRefresh);
      });
      trigger?.kill();
      context.revert();
      element.inert = false;
      delete element.dataset.scrollProgress;
      callback.current?.(false);
    };
  }, [root, ready, reduced, touchMode, layoutKey]);
}
