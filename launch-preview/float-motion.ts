const PI = Math.PI;
export function floatLayout(width: number, height: number) {
  const w = Math.max(0, Number.isFinite(width) ? width : 0);
  const h = Math.max(0, Number.isFinite(height) ? height : 0);
  const margin = w < 700 ? 8 : 16;
  const rotationFactor =
    Math.cos((1.5 * PI) / 180) + Math.sin((1.5 * PI) / 180);
  const size = Math.max(
    0,
    Math.min(
      520,
      (w - margin * 2) / rotationFactor,
      (h - margin * 2) / rotationFactor,
    ),
  );
  // Rotation needs a little extra room beyond the unrotated bounding box.
  const rotated =
    size * (Math.cos((1.5 * PI) / 180) + Math.sin((1.5 * PI) / 180));
  const reserve = (rotated - size) / 2;
  const inset = margin + reserve;
  return {
    size,
    inset,
    rangeX: Math.max(0, w - size - inset * 2),
    rangeY: Math.max(0, h - size - inset * 2),
    speed: w < 700 ? 12 : 22,
  };
}

/** A linear drift with a cosine deceleration/turn at each edge. Position and
 * velocity are continuous; a full direction change takes about 0.9 seconds. */
export function driftAxis(
  elapsed: number,
  range: number,
  speed: number,
  backwards = false,
) {
  if (!(range > 0) || !(speed > 0)) return { position: 0, velocity: 0 };
  if (range < 10) return { position: range / 2, velocity: 0 };
  const turn = Math.min(0.9, (range * PI) / (4 * speed));
  const radius = (speed * turn) / PI;
  const travel = (range - 2 * radius) / speed;
  const period = 2 * (travel + turn);
  const offset = backwards ? travel + turn + travel / 2 : travel / 2;
  const t = (((Math.max(0, elapsed) + offset) % period) + period) % period;
  if (t < travel) return { position: radius + speed * t, velocity: speed };
  if (t < travel + turn) {
    const phase = (PI * (t - travel)) / turn;
    return {
      position: range - radius + radius * Math.sin(phase),
      velocity: speed * Math.cos(phase),
    };
  }
  if (t < 2 * travel + turn)
    return {
      position: range - radius - speed * (t - travel - turn),
      velocity: -speed,
    };
  const phase = (PI * (t - 2 * travel - turn)) / turn;
  return {
    position: radius - radius * Math.sin(phase),
    velocity: -speed * Math.cos(phase),
  };
}
