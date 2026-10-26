export type HeroPiecePosition = {
  x: number;
  y: number;
  rotation: number;
};

export type HeroLayout = {
  pieceWidth: number;
  stageHeight: number;
  arcDepth: number;
  positions: HeroPiecePosition[];
  stackPositions: HeroPiecePosition[];
};

const IMAGE_HEIGHT_RATIO = 700 / 923;
const ROTATIONS = [-6, -3, 0, 3, 6];

/** Horizontal envelope of one uniformly scaled, rotated original image. */
function widthFactor(rotation: number) {
  const radians = (Math.abs(rotation) * Math.PI) / 180;
  return Math.cos(radians) + IMAGE_HEIGHT_RATIO * Math.sin(radians);
}

/**
 * Positions describe image CENTERS. Place the origin horizontally at 50% and
 * vertically at (stageHeight - arcDepth) / 2, then center each image on it.
 * Positive y moves downward, so the center at y=0 is the top of the arch.
 * The complete rotated rectangles fit, not just the narrower shirt silhouettes.
 */
export function getHeroLayout(width: number): HeroLayout {
  const availableWidth = Number.isFinite(width) && width > 0 ? width : 320;
  const padding = Math.min(24, availableWidth * 0.025);
  const gap = availableWidth >= 1024 ? 12 : 4;
  const totalWidthFactor = ROTATIONS.reduce(
    (total, rotation) => total + widthFactor(rotation),
    0,
  );
  const pieceWidth = Math.min(
    300,
    Math.max(1, (availableWidth - padding * 2 - gap * 4) / totalWidthFactor),
  );
  const envelopes = ROTATIONS.map(
    (rotation) => pieceWidth * widthFactor(rotation),
  );
  const innerX = (envelopes[2] + envelopes[3]) / 2 + gap;
  const outerX = innerX + (envelopes[3] + envelopes[4]) / 2 + gap;
  const arcDepth = pieceWidth * 0.48;
  const maxRotatedHeight =
    pieceWidth *
    (IMAGE_HEIGHT_RATIO * Math.cos(Math.PI / 30) + Math.sin(Math.PI / 30));
  const stageHeight = Math.ceil(maxRotatedHeight + arcDepth + padding * 2);
  const xCoordinates = [-outerX, -innerX, 0, innerX, outerX];

  return {
    pieceWidth,
    stageHeight,
    arcDepth,
    positions: ROTATIONS.map((rotation, index) => ({
      x: xCoordinates[index],
      y: arcDepth * ((index - 2) / 2) ** 2,
      rotation,
    })),
    // Adjacent unrotated image widths overlap by 35% in the opening stack.
    stackPositions: ROTATIONS.map((_, index) => ({
      x: (index - 2) * pieceWidth * 0.65,
      y: arcDepth * 0.45,
      rotation: index - 2,
    })),
  };
}
