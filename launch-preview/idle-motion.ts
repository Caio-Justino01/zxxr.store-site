export const IDLE_DELAY_MS = 10_000;
export type PresentationPhase =
  "normal" | "entering-idle" | "idle" | "returning";
export type Pose = { x: number; y: number; rotation: number };
export type Bounds = { minX: number; minY: number; maxX: number; maxY: number };
export type CornerSequence = {
  bag: number[];
  last: number | null;
  previous: number | null;
};

export function isIdleDue(
  now: number,
  lastActivity: number,
  enabled: boolean,
  visible: boolean,
) {
  return enabled && visible && now - lastActivity >= IDLE_DELAY_MS;
}
export function boatBob(elapsed: number): Pose {
  const phase = (Math.max(0, elapsed) * Math.PI * 2) / 6;
  return {
    x: Math.sin(phase * 0.73) * 2,
    y: Math.sin(phase) * 4,
    rotation: Math.sin(phase * 0.81) * 0.6,
  };
}
export function viewportBounds(
  width: number,
  height: number,
  size: number,
  stageLeft: number,
  stageTop: number,
  viewportLeft = 0,
  viewportTop = 0,
): Bounds {
  const margin = width < 700 ? 10 : 16;
  const reserve =
    (size * (Math.cos(Math.PI / 120) + Math.sin(Math.PI / 120) - 1)) / 2;
  const inset = margin + reserve;
  const minX = viewportLeft + inset - stageLeft;
  const minY = viewportTop + inset - stageTop;
  return {
    minX,
    minY,
    maxX: Math.max(minX, viewportLeft + width - size - inset - stageLeft),
    maxY: Math.max(minY, viewportTop + height - size - inset - stageTop),
  };
}
export function cornerPoint(bounds: Bounds, corner: number) {
  return {
    x: corner & 1 ? bounds.maxX : bounds.minX,
    y: corner & 2 ? bounds.maxY : bounds.minY,
  };
}
export function nextCorner(
  sequence: CornerSequence,
  random: () => number = Math.random,
) {
  if (!sequence.bag.length) {
    sequence.bag = [0, 1, 2, 3];
    for (let i = 3; i > 0; i--) {
      const j = Math.min(i, Math.max(0, Math.floor(random() * (i + 1))));
      [sequence.bag[i], sequence.bag[j]] = [sequence.bag[j], sequence.bag[i]];
    }
    // Do not accept a cycle made exclusively of horizontal/vertical perimeter legs.
    if (!sequence.bag.some((v, i, a) => i > 0 && (v ^ a[i - 1]) === 3))
      [sequence.bag[1], sequence.bag[2]] = [sequence.bag[2], sequence.bag[1]];
  }
  let index = sequence.bag.findIndex(
    (value) => value !== sequence.last && value !== sequence.previous,
  );
  if (index < 0) index = 0;
  const next = sequence.bag.splice(index, 1)[0];
  sequence.previous = sequence.last;
  sequence.last = next;
  return next;
}

export function makeDvdLeg(
  from: Pose,
  bounds: Bounds,
  corner: number,
  mobile: boolean,
  random: () => number = Math.random,
) {
  const target = cornerPoint(bounds, corner);
  const distance = Math.hypot(target.x - from.x, target.y - from.y);
  const speed = mobile ? 18 + random() * 6 : 30 + random() * 15;
  const ramp = Math.min(0.45, distance / (2 * speed));
  return {
    from: { ...from },
    to: { ...target, rotation: (random() * 2 - 1) * 1.5 },
    corner,
    distance,
    speed,
    ramp,
    duration: distance / speed + ramp,
    elapsed: 0,
  };
}
export type DvdLeg = ReturnType<typeof makeDvdLeg>;
/** Constant speed through the middle, cosine acceleration/deceleration at corners. */
export function sampleDvdLeg(leg: DvdLeg, elapsed: number): Pose {
  if (leg.distance < 1e-6 || elapsed >= leg.duration) return { ...leg.to };
  const t = Math.max(0, elapsed),
    { ramp: r, speed: s, distance: d } = leg;
  let travelled: number;
  if (t < r)
    travelled = (s / 2) * (t - (r / Math.PI) * Math.sin((Math.PI * t) / r));
  else if (t < leg.duration - r) travelled = (s * r) / 2 + s * (t - r);
  else {
    const remaining = leg.duration - t;
    travelled =
      d -
      (s / 2) *
        (remaining - (r / Math.PI) * Math.sin((Math.PI * remaining) / r));
  }
  const progress = Math.min(1, Math.max(0, travelled / d));
  const rotate = (1 - Math.cos(Math.PI * Math.min(1, t / leg.duration))) / 2;
  return {
    x: leg.from.x + (leg.to.x - leg.from.x) * progress,
    y: leg.from.y + (leg.to.y - leg.from.y) * progress,
    rotation:
      leg.from.rotation + (leg.to.rotation - leg.from.rotation) * rotate,
  };
}
