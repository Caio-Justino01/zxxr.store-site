import type { Product } from "../config/products.ts";

const dimensions: Record<
  string,
  { front: [number, number]; back: [number, number] }
> = {
  boca: { front: [921, 691], back: [917, 701] },
  "spiritual-gangsta": { front: [761, 573], back: [761, 573] },
};

/** Derivatives preserve the original native pixels; no enlargement or new detail. */
export function productPicture(product: Product, side: "front" | "back") {
  const size = dimensions[product.id]?.[side];
  if (!size)
    return { src: product[side], srcSet: undefined, width: 923, height: 694 };
  const base = `/media/products/${product.id}-${side}`;
  const widths = [...new Set([320, 640, size[0]])].filter(
    (width) => width <= size[0],
  );
  return {
    src: `${base}-${size[0]}.webp`,
    srcSet: widths.map((width) => `${base}-${width}.webp ${width}w`).join(", "),
    width: size[0],
    height: size[1],
  };
}
