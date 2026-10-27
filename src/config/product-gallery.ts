import type { Product } from "./products";

export type GalleryImage = {
  id: string;
  label: string;
  alt: string;
  src: string;
  srcSet?: string;
  width: number;
  height: number;
  campaign: boolean;
};

const photo = (
  number: string,
  width: number,
  height: number,
  label: string,
  alt: string,
  revision = "",
): GalleryImage => ({
  id: `ensaio-${number}`,
  label,
  alt,
  src: `/media/ensaio-drop/ensaiodrop1zxxrfoto${number}${revision}-${width}.webp`,
  srcSet: `/media/ensaio-drop/ensaiodrop1zxxrfoto${number}${revision}-640.webp 640w, /media/ensaio-drop/ensaiodrop1zxxrfoto${number}${revision}-${width}.webp ${width}w`,
  width,
  height,
  campaign: true,
});

const campaign: Record<string, GalleryImage[]> = {
  "me-preservando": [
    photo(
      "01",
      1120,
      1397,
      "Ensaio",
      "Yaji, de costas no píer entre os barcos, com a frase original na camiseta.",
    ),
  ],
  flores: [
    photo(
      "02",
      1087,
      1447,
      "Ensaio",
      "Camiseta Flores sobre a grama, com as três flores vermelhas originais.",
    ),
  ],
  "spiritual-gangsta": [
    photo(
      "08",
      1122,
      1402,
      "Ensaio",
      "Spiritual Gangsta em preto estonado flutuando na piscina, com a inscrição vermelha original posicionada na parte superior das costas.",
      "-v2",
    ),
  ],
  boca: [
    photo(
      "07",
      1086,
      1448,
      "Ensaio",
      "Camiseta Emoção off-white sobre a traseira de uma Mercedes, com a estampa original nas costas.",
    ),
  ],
  "zxxr-rosa": [
    photo(
      "10",
      1086,
      1448,
      "Ensaio",
      "Camiseta ZXXR em preto estonado sobre a mesa de sinuca azul, com quatro símbolos em rosa e contorno branco nas costas.",
    ),
  ],
};

const originalDimensions: Record<
  string,
  { front: [number, number]; back: [number, number] }
> = {
  boca: { front: [921, 691], back: [917, 701] },
  flores: { front: [923, 694], back: [917, 702] },
  "me-preservando": { front: [923, 694], back: [917, 701] },
  "spiritual-gangsta": { front: [761, 573], back: [761, 573] },
  "zxxr-rosa": { front: [761, 573], back: [761, 573] },
};

export function getProductGallery(product: Product): GalleryImage[] {
  const photos = campaign[product.id] ?? [];
  const originals: GalleryImage[] = (["front", "back"] as const).map(
    (side) => ({
      id: side,
      label: side === "front" ? "Frente" : "Costas",
      alt: `${product.name}, ${side === "front" ? "frente" : "costas"}, imagem original da camiseta.`,
      src: product[side],
      width: originalDimensions[product.id]?.[side][0] ?? 761,
      height: originalDimensions[product.id]?.[side][1] ?? 573,
      campaign: false,
    }),
  );
  // First the campaign photograph, then the two actual product views.
  return [...photos.slice(0, 1), ...originals, ...photos.slice(1)];
}
