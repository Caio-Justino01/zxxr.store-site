import gsap from "gsap";

/**
 * GSAP 3.15 quickSetter expands the scale alias to "scaleX,scaleY" before
 * CSSPlugin chooses a setter, which can become an invalid DOM attribute name.
 * Keep both transform axes explicit while preserving uniform carousel scaling.
 */
export function createCarouselScaleSetter(target: HTMLElement) {
  const setX = gsap.quickSetter(target, "scaleX");
  const setY = gsap.quickSetter(target, "scaleY");
  return (value: number) => {
    setX(value);
    setY(value);
  };
}
