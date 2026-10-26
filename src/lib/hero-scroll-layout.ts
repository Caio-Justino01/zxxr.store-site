import type { HeroPiecePosition } from "./hero-layout";

/** Convert the desired world-space movement into the rotated parent's axes. */
export function getLocalScrollDelta(
  from: HeroPiecePosition,
  to: HeroPiecePosition,
): HeroPiecePosition {
  const angle = (from.rotation * Math.PI) / 180;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return {
    x: dx * Math.cos(angle) + dy * Math.sin(angle),
    y: -dx * Math.sin(angle) + dy * Math.cos(angle),
    rotation: to.rotation - from.rotation,
  };
}
