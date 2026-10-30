// A deterministic first render lets static HTML hydrate on every screen size.
// Browser measurements and saved state are restored after the first commit.
import { useSyncExternalStore } from "react";

let hydrationFinished = false;
const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

// Unlike a global flag, this remains correct when React hydrates a Suspense
// boundary after its parent has already committed effects.
export function useSeoInitialRender(): boolean {
  return !useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
}

export function isSeoInitialRender(): boolean {
  return (
    typeof document === "undefined" ||
    (!hydrationFinished &&
      document.documentElement.dataset.seoPrerendered === "true")
  );
}

export function finishSeoHydration(): void {
  hydrationFinished = true;
}

export function initialViewportWidth(): number {
  return isSeoInitialRender() ? 1440 : window.innerWidth;
}

export function initialReducedMotion(): boolean {
  return (
    !isSeoInitialRender() &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
