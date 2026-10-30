import type { HeroPiecePosition } from "./hero-layout";

/** Convert the desired world-space movement into the rotated parent's axes. */
export function getLocalScrollDelta(
  from: HeroPiecePosition,
  to: HeroPiecePosition,
): HeroPiecePosition {
  const angle = (from.rotation * Math.PI) / 180;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const scale = from.scale ?? 1;
  return {
    x: (dx * Math.cos(angle) + dy * Math.sin(angle)) / scale,
    y: (-dx * Math.sin(angle) + dy * Math.cos(angle)) / scale,
    rotation: to.rotation - from.rotation,
    scale: (to.scale ?? 1) / scale,
  };
}
