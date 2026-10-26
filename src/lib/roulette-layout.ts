export function wrapRouletteIndex(index: number, count: number) {
  return count > 0 ? ((index % count) + count) % count : 0;
}

export function rouletteDistance(index: number, active: number, count: number) {
  const distance = wrapRouletteIndex(index - active, count);
  return distance > count / 2 ? distance - count : distance;
}

export function roulettePose(distance: number, step: number) {
  const magnitude = Math.abs(distance);
  return {
    x: distance * step,
    y: Math.min(magnitude, 1) * 24,
    scale: 1 - Math.min(magnitude, 1) * 0.22,
    rotation: Math.max(-4, Math.min(4, distance * 4)),
    opacity: Math.max(0, Math.min(1, (1.8 - magnitude) / 0.8)),
  };
}

export function rouletteGestureStep(
  distance: number,
  velocity: number,
  step: number,
) {
  if (Math.abs(distance) < step * 0.18 && Math.abs(velocity) < 0.35) return 0;
  const direction =
    Math.abs(distance) < 12 && Math.abs(velocity) >= 0.35 ? velocity : distance;
  return direction < 0 ? 1 : -1;
}

export function rouletteRebasedProgress(
  progress: number,
  previousBase: number,
  nextBase: number,
  count: number,
) {
  return progress - rouletteDistance(nextBase, previousBase, count);
}
