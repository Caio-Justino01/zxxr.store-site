import { useLayoutEffect, type RefObject } from "react";
import {
  getDropLetterOpacity,
  getDropReadingFrame,
  getFlowReadingFrame,
} from "./drop-reading";

export function useDropReading(root: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    let alive = true;
    let raf = 0;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const scenes = [
      ...element.querySelectorAll<HTMLElement>("[data-drop-scene]"),
    ].map((scene) => ({
      scene,
      stage: scene.querySelector<HTMLElement>(".ps-stage")!,
      letters: [...scene.querySelectorAll<HTMLElement>("[data-drop-letter]")],
      lastFrame: "",
      values: [] as string[],
    }));
    const render = () => {
      raf = 0;
      if (!alive) return;
      const headerHeight =
        document.querySelector(".site-header")?.getBoundingClientRect()
          .height ?? 0;
      const viewportHeight = Math.max(
        1,
        document.documentElement.clientHeight - headerHeight,
      );
      const measures = scenes.map((item) => ({
        ...item,
        rect: item.scene.getBoundingClientRect(),
        stageHeight: item.stage.getBoundingClientRect().height,
        fits: item.stage.scrollHeight <= viewportHeight + 2,
        textTop:
          (
            item.scene.querySelector<HTMLElement>("h2, h3") ?? item.stage
          ).getBoundingClientRect().top - headerHeight,
      }));
      element.dataset.motion = motion.matches ? "static" : "scroll";
      measures.forEach((item, index) => {
        const state = scenes[index];
        const flow =
          motion.matches ||
          !item.fits ||
          (window.innerWidth < 1024 && item.scene.matches(".ps-story")) ||
          (window.innerWidth < 1200 && item.scene.matches(".ps-overview"));
        const layout = flow ? "flow" : "sticky";
        if (state.scene.dataset.layout !== layout) {
          state.scene.dataset.layout = layout;
          state.lastFrame = "";
          schedule();
        }
        const frame = flow
          ? getFlowReadingFrame(item.textTop, viewportHeight)
          : getDropReadingFrame({
              top: item.rect.top - headerHeight,
              height: item.rect.height,
              stageHeight: item.stageHeight,
              viewportHeight,
            });
        const key = motion.matches
          ? "static"
          : `${frame.reveal.toFixed(4)}:${frame.exit.toFixed(4)}:${frame.progress.toFixed(4)}`;
        if (key === state.lastFrame) return;
        state.lastFrame = key;
        state.scene.dataset.readingPhase = motion.matches
          ? "static"
          : frame.exit > 0
            ? "leaving"
            : frame.reveal < 1
              ? "revealing"
              : "reading";
        state.scene.dataset.readingProgress = motion.matches
          ? "1"
          : frame.reveal.toFixed(3);
        state.scene.style.setProperty(
          "--scene-opacity",
          String(
            flow || item.scene.matches(".ps-story") ? 1 : frame.stageOpacity,
          ),
        );
        state.scene.style.setProperty(
          "--image-y",
          `${motion.matches ? 0 : frame.imageY.toFixed(2)}px`,
        );
        state.letters.forEach((letter, letterIndex) => {
          const value = motion.matches
            ? "1"
            : getDropLetterOpacity(
                letterIndex,
                state.letters.length,
                frame.reveal,
                frame.exit,
              ).toFixed(3);
          if (state.values[letterIndex] !== value) {
            letter.style.setProperty("--letter-opacity", value);
            state.values[letterIndex] = value;
          }
        });
      });
    };
    function schedule() {
      if (alive && !raf) raf = requestAnimationFrame(render);
    }
    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(schedule)
        : null;
    scenes.forEach(({ stage }) => observer?.observe(stage));
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    window.visualViewport?.addEventListener("resize", schedule);
    motion.addEventListener("change", schedule);
    element.addEventListener("focusin", schedule);
    void document.fonts?.ready.then(schedule);
    render();
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      observer?.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      motion.removeEventListener("change", schedule);
      element.removeEventListener("focusin", schedule);
      delete element.dataset.motion;
      scenes.forEach(({ scene, letters }) => {
        delete scene.dataset.layout;
        delete scene.dataset.readingPhase;
        delete scene.dataset.readingProgress;
        scene.style.removeProperty("--scene-opacity");
        scene.style.removeProperty("--image-y");
        letters.forEach((letter) =>
          letter.style.removeProperty("--letter-opacity"),
        );
      });
    };
  }, [root]);
}
