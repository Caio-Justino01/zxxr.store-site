import { useLayoutEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import { floatLayout } from "./float-motion.ts";
import {
  boatBob,
  makeDvdLeg,
  nextCorner,
  sampleDvdLeg,
  viewportBounds,
  type Bounds,
  type CornerSequence,
  type DvdLeg,
  type Pose,
  type PresentationPhase,
} from "./idle-motion.ts";

type Options = {
  idle: boolean;
  bobbing: boolean;
  reduced: boolean;
  onPhaseChange: (phase: PresentationPhase) => void;
};
type Controller = { sync: () => void };

export function useFloatDrift(
  stage: RefObject<HTMLDivElement | null>,
  options: Options,
) {
  const latest = useRef(options);
  const controller = useRef<Controller | null>(null);
  latest.current = options;
  useLayoutEffect(() => {
    const element = stage.current;
    const object = element?.querySelector<HTMLElement>(".float-drift");
    const tilt = element?.querySelector<HTMLElement>(".unicorn-float");
    const root = element?.closest<HTMLElement>(".launch-experience");
    if (!element || !object || !tilt || !root) return;
    const setX = gsap.quickSetter(object, "x", "px");
    const setY = gsap.quickSetter(object, "y", "px");
    const setRotation = gsap.quickSetter(tilt, "rotation", "deg");
    const view: Pose = { x: 0, y: 0, rotation: 0 };
    const rate = { value: 0 };
    let phase: PresentationPhase = "normal";
    let layout = floatLayout(0, 0);
    let bounds: Bounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    let center = { x: 0, y: 0 };
    let width = 0,
      height = 0,
      viewportWidth = 0,
      viewportHeight = 0,
      stageLeft = 0,
      stageTop = 0;
    let bobTime = 0;
    let onscreen = true;
    let disposed = false;
    let leg: DvdLeg | null = null;
    let sequence: CornerSequence = { bag: [], last: null, previous: null };
    let transition: gsap.core.Timeline | null = null;
    let rateTween: gsap.core.Tween | null = null;
    const ui = () => [
      ...root.querySelectorAll<HTMLElement>(
        ".waiting-brand,.waiting-caption,.preview-tools",
      ),
    ];
    const draw = () => {
      setX(view.x);
      setY(view.y);
      setRotation(view.rotation);
      element.dataset.motion = latest.current.reduced
        ? "reduced"
        : phase === "normal"
          ? rate.value < 0.001
            ? "paused"
            : "bobbing"
          : phase;
    };
    const setPhase = (next: PresentationPhase) => {
      phase = next;
      root.dataset.presentation = next;
      latest.current.onPhaseChange(next);
      draw();
    };
    const stopTransition = () => {
      transition?.kill();
      transition = null;
    };
    const beginLeg = (corner?: number) => {
      const target = corner ?? nextCorner(sequence);
      leg = makeDvdLeg(view, bounds, target, viewportWidth < 700);
      element.dataset.corner = String(target);
      element.dataset.legSpeed = leg.speed.toFixed(2);
    };
    const returnToCenter = (duration = 0.8) => {
      stopTransition();
      leg = null;
      setPhase("returning");
      transition = gsap.timeline({
        onComplete: () => {
          if (disposed) return;
          bobTime = 0;
          setPhase("normal");
        },
      });
      transition.to(view, {
        x: center.x,
        y: center.y,
        rotation: 0,
        duration,
        ease: "power2.out",
        onUpdate: draw,
      });
      transition.to(ui(), { opacity: 1, duration: 0.25, ease: "sine.out" });
    };
    const sync = () => {
      const opts = latest.current;
      rateTween?.kill();
      rateTween = gsap.to(rate, {
        value: opts.bobbing && !opts.reduced ? 1 : 0,
        duration: opts.reduced ? 0 : 0.4,
        ease: "sine.inOut",
      });
      if (opts.reduced) {
        stopTransition();
        leg = null;
        bobTime = 0;
        Object.assign(view, { ...center, rotation: 0 });
        gsap.set(ui(), { opacity: 1 });
        setPhase("normal");
        return;
      }
      if (opts.idle && phase !== "idle" && phase !== "entering-idle") {
        // Scrolling can change the stage origin without resizing its content.
        resize();
        stopTransition();
        sequence = { bag: [], last: null, previous: null };
        setPhase("entering-idle");
        transition = gsap.timeline({
          onComplete: () => {
            if (disposed || !latest.current.idle || latest.current.reduced)
              return;
            setPhase("idle");
            beginLeg();
          },
        });
        transition.to(ui(), { opacity: 0, duration: 0.35, ease: "sine.inOut" });
      } else if (!opts.idle && (phase === "idle" || phase === "entering-idle"))
        returnToCenter();
    };
    const resize = () => {
      const box = element.getBoundingClientRect();
      const vv = window.visualViewport;
      const vw = vv?.width ?? window.innerWidth;
      const vh = vv?.height ?? window.innerHeight;
      const oldBounds = bounds;
      const oldPhase = phase;
      const oldSize = layout.size;
      if (
        box.width === width &&
        box.height === height &&
        vw === viewportWidth &&
        vh === viewportHeight &&
        box.left === stageLeft &&
        box.top === stageTop
      )
        return;
      width = box.width;
      height = box.height;
      viewportWidth = vw;
      viewportHeight = vh;
      stageLeft = box.left;
      stageTop = box.top;
      layout = floatLayout(width, height);
      center = { x: (width - layout.size) / 2, y: (height - layout.size) / 2 };
      bounds = viewportBounds(
        vw,
        vh,
        layout.size,
        box.left,
        box.top,
        vv?.offsetLeft ?? 0,
        vv?.offsetTop ?? 0,
      );
      element.style.setProperty("--float-size", layout.size + "px");
      element.dataset.layoutWidth = String(Math.round(width));
      element.dataset.viewportWidth = String(Math.round(vw));
      if (oldSize > 0 && oldPhase !== "normal") {
        const nx =
          oldBounds.maxX > oldBounds.minX
            ? (view.x - oldBounds.minX) / (oldBounds.maxX - oldBounds.minX)
            : 0.5;
        const ny =
          oldBounds.maxY > oldBounds.minY
            ? (view.y - oldBounds.minY) / (oldBounds.maxY - oldBounds.minY)
            : 0.5;
        view.x =
          bounds.minX +
          Math.max(0, Math.min(1, nx)) * (bounds.maxX - bounds.minX);
        view.y =
          bounds.minY +
          Math.max(0, Math.min(1, ny)) * (bounds.maxY - bounds.minY);
        if (oldPhase === "idle") beginLeg(leg?.corner);
        else if (oldPhase === "returning") returnToCenter();
      } else {
        const bob = latest.current.reduced
          ? { x: 0, y: 0, rotation: 0 }
          : boatBob(bobTime);
        Object.assign(view, {
          x: center.x + bob.x,
          y: center.y + bob.y,
          rotation: bob.rotation,
        });
      }
      draw();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    const intersection = new IntersectionObserver(([entry]) => {
      onscreen = entry.isIntersecting;
    });
    intersection.observe(root);
    window.addEventListener("resize", resize, { passive: true });
    window.visualViewport?.addEventListener("resize", resize, {
      passive: true,
    });
    const tick = (_time: number, delta: number) => {
      if (!onscreen || document.visibilityState === "hidden") {
        transition?.pause();
        return;
      }
      if (transition?.paused()) transition.resume();
      const dt = Math.min(64, Math.max(0, delta)) / 1000;
      if (latest.current.reduced) return;
      if (phase === "normal") {
        if (rate.value > 0.001) {
          bobTime += dt * rate.value;
          const bob = boatBob(bobTime);
          Object.assign(view, {
            x: center.x + bob.x,
            y: center.y + bob.y,
            rotation: bob.rotation,
          });
          draw();
        } else if (element.dataset.motion !== "paused") draw();
      } else if (phase === "idle" && leg) {
        leg.elapsed = Math.min(leg.duration, leg.elapsed + dt);
        Object.assign(view, sampleDvdLeg(leg, leg.elapsed));
        draw();
        if (leg.elapsed >= leg.duration) beginLeg();
      }
    };
    resize();
    controller.current = { sync };
    sync();
    gsap.ticker.add(tick);
    return () => {
      disposed = true;
      controller.current = null;
      stopTransition();
      rateTween?.kill();
      observer.disconnect();
      intersection.disconnect();
      window.removeEventListener("resize", resize);
      window.visualViewport?.removeEventListener("resize", resize);
      gsap.ticker.remove(tick);
      gsap.set([object, tilt], { clearProps: "transform" });
      gsap.set(ui(), { clearProps: "opacity" });
    };
  }, [stage]);
  useLayoutEffect(() => {
    controller.current?.sync();
  }, [options.idle, options.bobbing, options.reduced]);
}
