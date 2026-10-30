export type ArcLayout = {
  width: number;
  visible: 1 | 2;
  pieceWidth: number;
  gap: number;
  step: number;
  peekX: number;
  imageHeight: number;
  height: number;
};

export function getArcLayout(width: number, visible: 1 | 2): ArcLayout {
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 320;
  const gap = Math.min(48, Math.max(20, safeWidth * 0.035));
  const pieceWidth =
    visible === 2
      ? Math.min(460, (Math.min(1000, safeWidth * 0.76) - gap) / 2)
      : Math.min(480, safeWidth * 0.74);
  const peek = Math.min(72, Math.max(44, safeWidth * 0.055));
  const peekX = safeWidth / 2 + (pieceWidth * 0.88) / 2 - peek;
  return {
    width: safeWidth,
    visible,
    pieceWidth,
    gap,
    step: visible === 2 ? pieceWidth + gap : peekX,
    peekX,
    imageHeight: pieceWidth * 0.75,
    height: Math.ceil(pieceWidth * 0.75 + 144),
  };
}

/** Circular distances are centered on the visible segment, not on one garment. */
export function arcDistance(
  index: number,
  first: number,
  count: number,
  visible: 1 | 2,
) {
  const center = (visible - 1) / 2;
  return (
    ((((index - first - center + count / 2) % count) + count) % count) -
    count / 2 +
    center
  );
}

function smoothStep(value: number) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

function cubicHermite(
  start: number,
  end: number,
  startSlope: number,
  endSlope: number,
  t: number,
) {
  const squared = t * t,
    cubed = squared * t;
  return (
    (2 * cubed - 3 * squared + 1) * start +
    (cubed - 2 * squared + t) * startSlope +
    (-2 * cubed + 3 * squared) * end +
    (cubed - squared) * endSlope
  );
}

export function arcPose(distance: number, layout: ArcLayout) {
  const { visible, step, peekX } = layout;
  const last = visible - 1;
  const outside = Math.max(0, -distance, distance - last);
  const edge = smoothStep(outside);
  const left = visible === 2 ? -step / 2 : 0;
  const right = -left;
  const sideStep = peekX - right;
  const centerSlope = visible === 2 ? step : peekX;
  const sideX =
    outside <= 1
      ? cubicHermite(right, peekX, centerSlope, sideStep, outside)
      : peekX + (outside - 1) * sideStep;
  const x =
    distance < 0 ? -sideX : distance > last ? sideX : left + distance * step;
  return {
    x,
    y: edge * 32,
    scale: 1 - edge * 0.12,
    rotation: Math.sign(distance - last / 2) * edge * 5,
    opacity: 1 - smoothStep(outside - 1),
    infoOpacity: 1 - smoothStep(outside / 0.6),
    zIndex: 10 - Math.round(outside * 3),
  };
}
