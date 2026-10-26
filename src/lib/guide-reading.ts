import { clampReading, getDropLetterOpacity } from "./drop-reading.ts";

/** Finish at 72%, leaving the final scroll stretch for reading. */
export function getGuideReadingFrame(progress: number) {
  const position = clampReading(progress);
  return {
    title: clampReading(position / 0.22),
    steps: [0.2, 0.38, 0.56].map((start) =>
      clampReading((position - start) / 0.16),
    ),
  };
}

export function getGuideLetterOpacity(
  index: number,
  count: number,
  reveal: number,
) {
  return 0.2 + 0.8 * getDropLetterOpacity(index, count, reveal, 0);
}

export function guideStageFits(
  contentHeight: number,
  viewportHeight: number,
  inset: number,
) {
  return contentHeight <= viewportHeight - inset;
}
