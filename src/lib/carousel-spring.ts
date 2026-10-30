export type CarouselSpring = {
  position: number;
  velocity: number;
  target: number;
};

export const carouselSpringFrequency = 12;

/** Exact critically damped solution, independent of the display's frame rate. */
export function advanceCarouselSpring(
  spring: CarouselSpring,
  seconds: number,
  reduced = false,
): CarouselSpring {
  if (reduced)
    return { position: spring.target, velocity: 0, target: spring.target };
  if (!Number.isFinite(seconds) || seconds <= 0) return { ...spring };
  const displacement = spring.position - spring.target;
  const coefficient = spring.velocity + carouselSpringFrequency * displacement;
  const decay = Math.exp(-carouselSpringFrequency * seconds);
  return {
    position: spring.target + (displacement + coefficient * seconds) * decay,
    velocity:
      (spring.velocity - carouselSpringFrequency * coefficient * seconds) *
      decay,
    target: spring.target,
  };
}

/** A new command changes destination without throwing away existing momentum. */
export function retargetCarouselSpring(
  spring: CarouselSpring,
  target: number,
): CarouselSpring {
  return { ...spring, target };
}

export function carouselSpringAtRest(spring: CarouselSpring) {
  return (
    Math.abs(spring.position - spring.target) < 0.0005 &&
    Math.abs(spring.velocity) < 0.005
  );
}
