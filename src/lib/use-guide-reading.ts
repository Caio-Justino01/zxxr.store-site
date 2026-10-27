import { useLayoutEffect, type RefObject } from "react";
import { clampReading } from "./drop-reading";
import {
  getGuideLetterOpacity,
  getGuideReadingFrame,
  guideStageFits,
} from "./guide-reading";
import { getFlowReadingFrame } from "./drop-reading";

export function useGuideReading(ref: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const stage = root.querySelector<HTMLElement>(".dg-stage")!;
    const content = root.querySelector<HTMLElement>(".dg-content")!;
    const letters = [
      ...root.querySelectorAll<HTMLElement>("[data-guide-letter]"),
    ];
    const steps = [...root.querySelectorAll<HTMLElement>("[data-guide-step]")];
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let disposed = false;
    const update = () => {
      frame = 0;
      if (disposed) return;
      const viewportHeight =
        window.visualViewport?.height ?? window.innerHeight;
      const style = getComputedStyle(stage);
      const inset = parseFloat(style.top) || 0;
      const contentHeight =
        content.getBoundingClientRect().height +
        parseFloat(style.paddingTop) +
        parseFloat(style.paddingBottom);
      const sticky =
        !reducedMotion.matches &&
        guideStageFits(contentHeight, viewportHeight, inset);
      root.dataset.guideMode = sticky ? "sticky" : "flow";
      const bounds = root.getBoundingClientRect();
      const travel = Math.max(
        1,
        bounds.height - stage.getBoundingClientRect().height,
      );
      const progress = sticky ? clampReading((inset - bounds.top) / travel) : 1;
      const reading = getGuideReadingFrame(progress);
      const headerHeight =
        document.querySelector(".site-header")?.getBoundingClientRect()
          .height ?? 0;
      const titleTop =
        (root.querySelector("h2") ?? content).getBoundingClientRect().top -
        headerHeight;
      const flowTitle = getFlowReadingFrame(
        titleTop,
        viewportHeight - headerHeight,
      ).reveal;
      letters.forEach((letter, index) =>
        letter.style.setProperty(
          "--guide-letter",
          String(
            reducedMotion.matches
              ? 1
              : getGuideLetterOpacity(
                  index,
                  letters.length,
                  sticky ? reading.title : flowTitle,
                ),
          ),
        ),
      );
      steps.forEach((step, index) => {
        const value = reducedMotion.matches
          ? 1
          : sticky
            ? reading.steps[index]
            : getFlowReadingFrame(
                step.getBoundingClientRect().top - headerHeight,
                viewportHeight - headerHeight,
              ).reveal;
        step.style.setProperty("--guide-step", String(0.4 + value * 0.6));
        step.style.setProperty("--guide-shift", `${(1 - value) * 18}px`);
      });
    };
    const schedule = () => {
      if (!frame && !disposed) frame = requestAnimationFrame(update);
    };
    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(schedule)
        : null;
    observer?.observe(content);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("resize", schedule);
    reducedMotion.addEventListener("change", schedule);
    void document.fonts?.ready.then(schedule);
    root.addEventListener("focusin", schedule);
    update();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      root.removeEventListener("focusin", schedule);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      reducedMotion.removeEventListener("change", schedule);
      delete root.dataset.guideMode;
    };
  }, [ref]);
}
