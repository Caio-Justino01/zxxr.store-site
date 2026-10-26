import type { Product } from "./products";

export type PreviewImage = {
  id: string;
  label: string;
  src: string;
  srcSet?: string;
  width: number;
  height: number;
  frozen: boolean;
  alt: string;
};

// Public teaser data is independent of the store catalog. No commercial data or
// clear product asset URLs are imported by the prelaunch application.
export const previewProducts: Product[] = [
  { id: "boca", number: "01", dark: false },
  { id: "flores", number: "02", dark: false, heroView: "front" as const },
  { id: "me-preservando", number: "03", dark: false },
  { id: "spiritual-gangsta", number: "04", dark: true },
  { id: "zxxr-rosa", number: "05", dark: true },
].map((piece) => ({
  ...piece,
  name: `Peça ${piece.number}`,
  color: "",
  description: "",
  line: "",
  note: "",
  source: "",
  studioPhoto: `/media/frozen-v1/${piece.id}-front.webp`,
  front: `/media/frozen-v1/${piece.id}-front.webp`,
  back: `/media/frozen-v1/${piece.id}-back.webp`,
  textures: {
    front: `/media/frozen-v1/${piece.id}-front.webp`,
    back: `/media/frozen-v1/${piece.id}-back.webp`,
  },
}));

export const previewOrder = [
  "me-preservando",
  "flores",
  "boca",
  "spiritual-gangsta",
  "zxxr-rosa",
];
export const previewById = (id?: string) =>
  previewProducts.find((piece) => piece.id === id);

const campaignSizes: Record<string, [number, number]> = {
  boca: [1086, 1448],
  flores: [1087, 1447],
  "spiritual-gangsta": [1122, 1402],
  "zxxr-rosa": [1087, 1447],
};
const cutoutSizes: Record<
  string,
  { front: [number, number]; back: [number, number] }
> = {
  boca: { front: [921, 691], back: [917, 701] },
  flores: { front: [923, 694], back: [917, 702] },
  "me-preservando": { front: [923, 694], back: [917, 701] },
  "spiritual-gangsta": { front: [761, 573], back: [761, 573] },
  "zxxr-rosa": { front: [761, 573], back: [761, 573] },
};

export function getPreviewGallery(piece: Product): PreviewImage[] {
  const person = piece.id === "me-preservando";
  const [width, height] = person ? [1120, 1397] : campaignSizes[piece.id];
  const base = person
    ? "/media/ensaio-drop/ensaiodrop1zxxrfoto01"
    : `/media/frozen-v1/${piece.id}-campaign`;
  return [
    {
      id: "campaign",
      label: "Ensaio",
      src: `${base}-${width}.webp`,
      srcSet: `${base}-640.webp 640w, ${base}-${width}.webp ${width}w`,
      width,
      height,
      frozen: !person,
      alt: person
        ? "Camiseta em uso, vista de costas no píer entre os barcos."
        : "Fotografia da peça sob vidro congelado. Revelação em breve.",
    },
    ...(["front", "back"] as const).map((side) => ({
      id: side,
      label: side === "front" ? "Frente" : "Costas",
      src: piece[side],
      width: cutoutSizes[piece.id][side][0],
      height: cutoutSizes[piece.id][side][1],
      frozen: true,
      alt: `${side === "front" ? "Frente" : "Costas"} da peça sob vidro congelado.`,
    })),
  ];
}
