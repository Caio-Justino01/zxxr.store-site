import { useCallback, useEffect, useRef, useState } from "react";
import { IDLE_DELAY_MS, isIdleDue } from "./idle-motion.ts";

export function useLaunchIdle(enabled: boolean) {
  const [idle, setIdle] = useState(false);
  const enabledRef = useRef(enabled);
  const idleRef = useRef(false);
  const lastActivity = useRef(0);
  const schedule = useRef<() => void>(() => {});
  enabledRef.current = enabled;
  const wake = useCallback(() => {
    lastActivity.current = performance.now();
    if (idleRef.current) {
      idleRef.current = false;
      setIdle(false);
    }
    schedule.current();
  }, []);
  useEffect(() => {
    let timer: number | null = null;
    let lastPointer: { x: number; y: number } | null = null;
    const clear = () => {
      if (timer !== null) window.clearTimeout(timer);
      timer = null;
    };
    const check = () => {
      timer = null;
      if (!enabledRef.current || document.visibilityState === "hidden") return;
      if (isIdleDue(performance.now(), lastActivity.current, true, true)) {
        idleRef.current = true;
        setIdle(true);
      } else arm();
    };
    const arm = () => {
      if (
        timer !== null ||
        idleRef.current ||
        !enabledRef.current ||
        document.visibilityState === "hidden"
      )
        return;
      timer = window.setTimeout(
        check,
        Math.max(1, IDLE_DELAY_MS - (performance.now() - lastActivity.current)),
      );
    };
    schedule.current = arm;
    const pointer = (event: PointerEvent) => {
      if (
        !lastPointer ||
        lastPointer.x !== event.clientX ||
        lastPointer.y !== event.clientY
      )
        wake();
      lastPointer = { x: event.clientX, y: event.clientY };
    };
    const visibility = () => {
      clear();
      wake();
    };
    const focus = () => {
      clear();
      wake();
    };
    const blur = () => {
      clear();
      wake();
    };
    document.addEventListener("pointermove", pointer, { passive: true });
    document.addEventListener("pointerdown", wake, { passive: true });
    document.addEventListener("touchstart", wake, { passive: true });
    document.addEventListener("keydown", wake, true);
    document.addEventListener("wheel", wake, { passive: true });
    document.addEventListener("scroll", wake, { passive: true, capture: true });
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("focus", focus);
    window.addEventListener("blur", blur);
    window.addEventListener("resize", wake, { passive: true });
    wake();
    return () => {
      clear();
      schedule.current = () => {};
      document.removeEventListener("pointermove", pointer);
      document.removeEventListener("pointerdown", wake);
      document.removeEventListener("touchstart", wake);
      document.removeEventListener("keydown", wake, true);
      document.removeEventListener("wheel", wake);
      document.removeEventListener("scroll", wake, true);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("focus", focus);
      window.removeEventListener("blur", blur);
      window.removeEventListener("resize", wake);
    };
  }, [wake]);
  useEffect(() => {
    if (!enabled) {
      idleRef.current = false;
      setIdle(false);
    }
    wake();
  }, [enabled, wake]);
  return { idle, wake };
}
