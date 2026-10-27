export const clampReading = (value: number) => Math.min(1, Math.max(0, value));

/** Flow scenes animate their own text instead of needing to fit a whole screen. */
export function getFlowReadingFrame(top: number, viewportHeight: number) {
  const height = Math.max(1, viewportHeight);
  const reveal = clampReading((height * 0.94 - top) / (height * 0.32));
  const progress = clampReading((height - top) / (height * 1.4));
  return {
    reveal,
    exit: 0,
    progress,
    imageY: (0.5 - progress) * 12,
    stageOpacity: 1,
  };
}
export type ReadingGeometry = {
  top: number;
  height: number;
  stageHeight: number;
  viewportHeight: number;
};

/** No timer or direction state: the same position always restores the same text. */
export function getDropReadingFrame({
  top,
  height,
  stageHeight,
  viewportHeight,
}: ReadingGeometry) {
  const travel = Math.max(1, height - stageHeight);
  const approach = viewportHeight * 0.3;
  const reveal = clampReading((approach - top) / (approach + travel * 0.26));
  // Exit only AFTER the sticky stage releases and moves 28% offscreen.
  const exit = clampReading(
    (stageHeight * 0.72 - (top + height)) / (stageHeight * 0.52),
  );
  const progress = clampReading(-top / travel);
  return {
    reveal,
    exit,
    progress,
    imageY: (0.5 - progress) * 22,
    stageOpacity: 1 - clampReading((exit - 0.45) / 0.55),
  };
}

export function getDropLetterOpacity(
  index: number,
  count: number,
  reveal: number,
  exit: number,
) {
  const feather = 5;
  const ease = (value: number) => {
    const t = clampReading(value);
    return t * t * (3 - 2 * t);
  };
  return (
    ease((reveal * (count + feather) - index) / feather) *
    (1 - ease((exit * (count + feather) - index) / feather))
  );
}
