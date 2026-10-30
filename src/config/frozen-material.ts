import type { Product } from "./products";

export type FrozenMaterialLayer = {
  src: string;
  srcSet: string;
  width: number;
  height: number;
};

const layer = (name: "shell" | "front" | "engraving"): FrozenMaterialLayer => ({
  src: `/media/ice-v8/${name}-1440.webp`,
  srcSet: [640, 1024, 1440]
    .map((width) => `/media/ice-v8/${name}-${width}.webp ${width}w`)
    .join(", "),
  width: 1440,
  height: 1800,
});

/** Every future piece uses this one ice matrix around its untouched cutout. */
export const frozenMaterial = {
  width: 1440,
  height: 1800,
  shell: layer("shell"),
  front: layer("front"),
  engraving: layer("engraving"),
  contentWidth: 0.82,
  contentHeight: 0.76,
  engravingWidth: 0.52,
} as const;

export function frozenGarmentView(
  product: Pick<Product, "heroView">,
): "front" | "back" {
  return product.heroView ?? "back";
}

/** Optical masks use the native canvas of each unmodified reference cutout. */
export function frozenGarmentOptics(product: Pick<Product, "id">) {
  const dimensions = {
    flores: [923, 694],
    "me-preservando": [917, 701],
    "zxxr-rosa": [761, 573],
  } as const;
  const size = dimensions[product.id as keyof typeof dimensions];
  if (!size) return undefined;
  const root = `/media/ice-v11-masks/${product.id}`;
  return {
    width: size[0],
    height: size[1],
    clear: `${root}-clear-mask.webp`,
    print: `${root}-print-mask.webp`,
    contact: `${root}-contact-mask.webp`,
  };
}
