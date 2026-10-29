import { useCallback, useEffect, useRef, useState } from "react";
import {
  anchorLaunchClock,
  readLaunchStatus,
  remainingSeconds,
  type LaunchClock,
  type LaunchStatus,
} from "./launch-state.ts";

export function useLaunchCountdown() {
  const [status, setStatus] = useState<LaunchStatus | null>(null);
  const [seconds, setSeconds] = useState<number | null>(null);
  const [connection, setConnection] = useState<
    "loading" | "ready" | "retrying"
  >("loading");
  const clock = useRef<LaunchClock | null>(null);
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const nextSync = useRef(Infinity);
  const failures = useRef(0);
  const zeroChecked = useRef(false);

  const sync = useCallback(async () => {
    const current = ++generation.current;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    const sent = performance.now();
    try {
      const response = await fetch("/api/launch", {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Launch status unavailable");
      const value = readLaunchStatus(await response.json());
      if (current !== generation.current) return;
      const received = performance.now();
      clock.current = anchorLaunchClock(value, sent, received);
      const remaining = clock.current
        ? remainingSeconds(clock.current, received)
        : null;
      zeroChecked.current = remaining === 0;
      failures.current = 0;
      nextSync.current =
        received + (remaining === 0 && !value.isOpen ? 3000 : 60_000);
      setSeconds(remaining);
      setStatus(value);
      setConnection("ready");
    } catch {
      if (current !== generation.current) return;
      const delay = [3000, 10_000, 30_000, 60_000][
        Math.min(failures.current++, 3)
      ];
      nextSync.current = performance.now() + delay;
      setConnection("retrying");
      // Keep the last authoritative anchor. Failure never grants access.
    } finally {
      window.clearTimeout(timeout);
      if (current === generation.current) request.current = null;
    }
  }, []);

  useEffect(() => {
    void sync();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      const now = performance.now();
      const remaining = clock.current
        ? remainingSeconds(clock.current, now)
        : null;
      setSeconds(remaining);
      if (remaining === 0 && !zeroChecked.current) {
        zeroChecked.current = true;
        if (!request.current) void sync();
      } else if (now >= nextSync.current && !request.current) void sync();
    }, 200);
    const resume = () => {
      if (document.visibilityState !== "hidden") void sync();
    };
    window.addEventListener("online", resume);
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      generation.current++;
      request.current?.abort();
      request.current = null;
      window.clearInterval(timer);
      window.removeEventListener("online", resume);
      window.removeEventListener("focus", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [sync]);
  return { status, seconds, connection, sync };
}
