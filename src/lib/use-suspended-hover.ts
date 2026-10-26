import { useCallback, useLayoutEffect, useRef, type RefObject } from "react";
import gsap from "gsap";

/** Animate only the inner image; arc placement and product departure stay independent. */
export function useSuspendedHover(
  links: RefObject<(HTMLAnchorElement | null)[]>,
  enabled: boolean,
  layoutKey: number,
) {
  const motions = useRef(new Map<HTMLElement, gsap.core.Animation>());
  const active = useRef<number | null>(null);
  const targetAt = useCallback(
    (index: number) =>
      links.current[index]?.querySelector<HTMLElement>(".dh-swing"),
    [links],
  );

  const stop = useCallback(() => {
    motions.current.forEach((motion) => motion.kill());
    motions.current.clear();
    active.current = null;
  }, []);

  const reset = useCallback(() => {
    stop();
    links.current.forEach((_, index) => {
      const target = targetAt(index);
      if (target) gsap.set(target, { clearProps: "transform" });
    });
  }, [links, stop, targetAt]);

  const leave = useCallback(
    (index: number) => {
      const target = targetAt(index);
      if (active.current === index) active.current = null;
      if (!target) return;
      motions.current.get(target)?.kill();
      const neutral = { x: 0, y: 0, rotation: 0, scale: 1 };
      if (!enabled) {
        gsap.set(target, neutral);
        motions.current.delete(target);
        return;
      }
      const tween = gsap.to(target, {
        ...neutral,
        duration: 0.8,
        ease: "power3.out",
        onComplete: () => {
          if (motions.current.get(target) === tween)
            motions.current.delete(target);
        },
      });
      motions.current.set(target, tween);
    },
    [enabled, targetAt],
  );

  const enter = useCallback(
    (index: number, clientX: number) => {
      if (!enabled || active.current === index) return;
      const link = links.current[index];
      const target = targetAt(index);
      if (!link || !target) return;
      if (active.current !== null) leave(active.current);
      active.current = index;
      motions.current.get(target)?.kill();
      const bounds = link.getBoundingClientRect();
      const direction = clientX < bounds.left + bounds.width / 2 ? -1 : 1;
      const timeline = gsap.timeline({
        defaults: { ease: "sine.inOut" },
        onComplete: () => {
          if (motions.current.get(target) === timeline)
            motions.current.delete(target);
        },
      });
      motions.current.set(target, timeline);
      // Each leg starts from the current pose, including interrupted returns.
      timeline
        .to(target, {
          rotation: 3 * direction,
          x: -5 * direction,
          y: -4,
          scale: 1.015,
          duration: 0.5,
        })
        .to(target, {
          rotation: -1.3 * direction,
          x: 2 * direction,
          y: -2,
          scale: 1.009,
          duration: 0.6,
        })
        .to(target, {
          rotation: 0.5 * direction,
          x: -direction,
          y: -1,
          scale: 1.003,
          duration: 0.55,
        })
        .to(target, { rotation: 0, x: 0, y: 0, scale: 1, duration: 0.65 });
    },
    [enabled, leave, links, targetAt],
  );

  useLayoutEffect(() => {
    reset();
    return reset;
  }, [enabled, layoutKey, reset]);

  return { enter, leave, stop, reset };
}
