export type PhotoShape = { id: string; width: number; height: number };
export type MosaicRect = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};
type Tree = {
  ratio: number;
  minWidth: number;
  minHeight: number;
  minArea: number;
  depth: number;
  index?: number;
  axis?: "x" | "y";
  a?: Tree;
  b?: Tree;
};
let cachedKey = "";
let cachedTrees: Tree[] = [];

/** Choose a layout close to the viewport ratio, then fill every edge.
 * Individual photos use object-fit: cover, never distortion. */
function candidates(photos: readonly PhotoShape[]) {
  const key = photos.map((p) => `${p.width}/${p.height}`).join(";");
  if (key === cachedKey) return cachedTrees;
  const memo = new Map<string, Tree[]>();
  function build(start: number, end: number): Tree[] {
    const interval = `${start}:${end}`;
    const saved = memo.get(interval);
    if (saved) return saved;
    if (end - start === 1) {
      const p = photos[start];
      return [
        {
          ratio: p.width / p.height,
          minWidth: 1,
          minHeight: 1,
          minArea: 1,
          depth: 0,
          index: start,
        },
      ];
    }
    const trees: Tree[] = [];
    for (let split = start + 1; split < end; split++) {
      for (const a of build(start, split))
        for (const b of build(split, end)) {
          const sum = a.ratio + b.ratio;
          const xShare = a.ratio / sum;
          const yShare = b.ratio / sum;
          const depth = Math.max(a.depth, b.depth) + 1;
          trees.push({
            axis: "x",
            a,
            b,
            ratio: sum,
            depth,
            minWidth: Math.min(a.minWidth * xShare, b.minWidth * (1 - xShare)),
            minHeight: Math.min(a.minHeight, b.minHeight),
            minArea: Math.min(a.minArea * xShare, b.minArea * (1 - xShare)),
          });
          trees.push({
            axis: "y",
            a,
            b,
            ratio: (a.ratio * b.ratio) / sum,
            depth,
            minWidth: Math.min(a.minWidth, b.minWidth),
            minHeight: Math.min(
              a.minHeight * yShare,
              b.minHeight * (1 - yShare),
            ),
            minArea: Math.min(a.minArea * yShare, b.minArea * (1 - yShare)),
          });
        }
    }
    memo.set(interval, trees);
    return trees;
  }
  cachedKey = key;
  cachedTrees = build(0, photos.length);
  return cachedTrees;
}

export function mosaicLayout(
  photos: readonly PhotoShape[],
  rawWidth: number,
  rawHeight: number,
) {
  const width = Number.isFinite(rawWidth) && rawWidth > 0 ? rawWidth : 320;
  const height = Number.isFinite(rawHeight) && rawHeight > 0 ? rawHeight : 600;
  if (!photos.length)
    return {
      rects: [] as MosaicRect[],
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      coverage: 0,
    };
  const minimumWidth = width < 500 ? 66 : width < 1100 ? 95 : 135;
  const minimumHeight = width < 500 ? 82 : width < 1100 ? 115 : 140;
  let best = candidates(photos)[0];
  let bestScore = -Infinity;
  for (const tree of candidates(photos)) {
    const w = Math.min(width, height * tree.ratio);
    const h = w / tree.ratio;
    const coverage = (w * h) / (width * height);
    const readability = Math.min(
      1,
      (tree.minWidth * w) / minimumWidth,
      (tree.minHeight * h) / minimumHeight,
    );
    const balance = Math.min(1, tree.minArea / 0.065);
    const score =
      coverage -
      0.65 * (1 - readability) ** 2 +
      balance * 0.08 -
      Math.max(0, tree.depth - 4) * 0.006;
    if (score > bestScore) {
      bestScore = score;
      best = tree;
    }
  }
  const w = width;
  const h = height;
  const x = 0;
  const y = 0;
  const rects: MosaicRect[] = [];
  function place(
    tree: Tree,
    left: number,
    top: number,
    boxWidth: number,
    boxHeight: number,
  ) {
    if (tree.index !== undefined) {
      rects.push({
        id: photos[tree.index].id,
        x: left,
        y: top,
        width: boxWidth,
        height: boxHeight,
      });
    } else if (tree.axis === "x") {
      const aw = (boxWidth * tree.a!.ratio) / (tree.a!.ratio + tree.b!.ratio);
      place(tree.a!, left, top, aw, boxHeight);
      place(tree.b!, left + aw, top, boxWidth - aw, boxHeight);
    } else {
      const ah = (boxHeight * tree.b!.ratio) / (tree.a!.ratio + tree.b!.ratio);
      place(tree.a!, left, top, boxWidth, ah);
      place(tree.b!, left, top + ah, boxWidth, boxHeight - ah);
    }
  }
  place(best, x, y, w, h);
  return {
    rects,
    width: w,
    height: h,
    x,
    y,
    coverage: (w * h) / (width * height),
  };
}
