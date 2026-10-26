import { useLayoutEffect, type RefObject } from "react";
import { clampReading } from "./drop-reading";
import {
  getGuideLetterOpacity,
  getGuideReadingFrame,
  guideStageFits,
} from "./guide-reading";

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
      letters.forEach((letter, index) =>
        letter.style.setProperty(
          "--guide-letter",
          String(getGuideLetterOpacity(index, letters.length, reading.title)),
        ),
      );
      steps.forEach((step, index) => {
        const value = reading.steps[index];
        step.style.setProperty("--guide-step", String(value));
        step.style.setProperty("--guide-shift", `${(1 - value) * 18}px`);
      });
    };
    const schedule = () => {
      if (!frame && !disposed) frame = requestAnimationFrame(update);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(content);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("resize", schedule);
    reducedMotion.addEventListener("change", schedule);
    document.fonts.ready.then(schedule);
    update();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      reducedMotion.removeEventListener("change", schedule);
      delete root.dataset.guideMode;
    };
  }, [ref]);
}
