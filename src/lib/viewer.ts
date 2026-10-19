export type ViewerPoint = { x: number; y: number };
export type ViewerSize = { width: number; height: number };

export function clampViewerZoom(value: number) {
  return Number.isFinite(value) ? Math.max(1, Math.min(2, value)) : 1;
}

/** Bounds use the painted contain-fit image, including any letterbox space. */
export function viewerPanLimits(
  viewport: ViewerSize,
  image: ViewerSize,
  zoom: number,
): ViewerPoint {
  if (
    ![viewport.width, viewport.height, image.width, image.height].every(
      Number.isFinite,
    ) ||
    viewport.width <= 0 ||
    viewport.height <= 0 ||
    image.width <= 0 ||
    image.height <= 0
  )
    return { x: 0, y: 0 };
  const fit = Math.min(
    viewport.width / image.width,
    viewport.height / image.height,
  );
  const scale = clampViewerZoom(zoom);
  return {
    x: Math.max(0, (image.width * fit * scale - viewport.width) / 2),
    y: Math.max(0, (image.height * fit * scale - viewport.height) / 2),
  };
}

export function clampViewerPan(
  point: ViewerPoint,
  viewport: ViewerSize,
  image: ViewerSize,
  zoom: number,
): ViewerPoint {
  const limits = viewerPanLimits(viewport, image, zoom);
  const x = Number.isFinite(point.x) ? point.x : 0;
  const y = Number.isFinite(point.y) ? point.y : 0;
  return {
    x: limits.x === 0 ? 0 : Math.max(-limits.x, Math.min(limits.x, x)),
    y: limits.y === 0 ? 0 : Math.max(-limits.y, Math.min(limits.y, y)),
  };
}
