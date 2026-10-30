export type HeroPiecePosition = {
  x: number;
  y: number;
  rotation: number;
  scale?: number;
};

export type HeroLayout = {
  pieceWidth: number;
  stageHeight: number;
  arcDepth: number;
  positions: HeroPiecePosition[];
  stackPositions: HeroPiecePosition[];
};

/**
 * Positions describe image CENTERS. Place the origin horizontally at 50% and
 * vertically at (stageHeight - arcDepth) / 2, then center each image on it.
 * Positive y moves downward. The larger available pair shares y=0.
 * The complete rotated rectangles fit, not just the narrower shirt silhouettes.
 */
export function getHeroLayout(width: number): HeroLayout {
  const availableWidth = Number.isFinite(width) && width > 0 ? width : 320;
  const padding = Math.min(24, availableWidth * 0.025);
  const pieceWidth = Math.min(
    340,
    Math.max(1, (availableWidth - padding * 2) / 5.1),
  );
  // Product order: Flores, Yaji, Emoção, Spiritual Gangsta, ZXXR.
  // The available pair straddles the exact center; ice is grouped on the flanks.
  const composition = [
    { x: -2.08, y: -0.22, rotation: -4, scale: 0.68 },
    { x: -1.8, y: 0.27, rotation: 3, scale: 0.68 },
    { x: -0.56, y: 0, rotation: -2, scale: 1 },
    { x: 0.56, y: 0, rotation: 2, scale: 1 },
    { x: 1.96, y: 0.1, rotation: 3, scale: 0.85 },
  ];
  const arcDepth = 0;
  const stageHeight = Math.ceil(pieceWidth * 1.2 + padding * 2);

  return {
    pieceWidth,
    stageHeight,
    arcDepth,
    positions: composition.map(({ x, y, ...pose }) => ({
      ...pose,
      x: x * pieceWidth,
      y: y * pieceWidth,
    })),
    // A compact lateral stack unfolds to the available pair and ice clusters.
    stackPositions: composition.map((_, index) => ({
      x: (index - 2) * pieceWidth * 0.46,
      y: 0,
      rotation: index - 2,
      scale: 0.7,
    })),
  };
}
