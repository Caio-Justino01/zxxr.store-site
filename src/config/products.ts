export const sizes = ["P", "M", "G", "GG"] as const;
export type Size = (typeof sizes)[number];
export type Product = {
  id: string;
  releaseStatus: "available" | "coming-soon";
  number: string;
  name: string;
  color: string;
  dark: boolean;
  fit: string;
  material: string;
  finish?: string;
  description: string;
  line: string;
  note: string;
  price?: number;
  source: string;
  studioPhoto: string;
  front: string;
  back: string;
  textures: { front: string; back: string };
  heroView?: "front" | "back";
  frozenImage?: { src: string; srcSet?: string; width: number; height: number };
};
export const products: Product[] = [
  {
    id: "boca",
    releaseStatus: "available",
    number: "01",
    name: "Emoção",
    price: 149.9,
    color: "Off-white",
    dark: false,
    fit: "Oversized boxy",
    material: "Algodão Madri",
    description:
      "Assinatura pequena no peito e a boca com o R em destaque nas costas. Off-white para deixar o desenho falar.",
    line: "O som também veste.",
    note: "Uma boca aberta. Uma assinatura. O resto é volume.",
    source: "IMG_3296 1.jpg",
    studioPhoto: "/media/reference-v3/boca-front.png",
    front: "/media/reference-v3/boca-front.png",
    back: "/media/reference-v3/boca-back.png",
    textures: {
      front: "/media/artwork-v4/boca-front.png",
      back: "/media/artwork-v4/boca-back.png",
    },
  },
  {
    id: "flores",
    frozenImage: {"src": "/media/ice-v6/flores-ice-v6-1440.webp", "srcSet": "/media/ice-v6/flores-ice-v6-640.webp 640w, /media/ice-v6/flores-ice-v6-1024.webp 1024w, /media/ice-v6/flores-ice-v6-1440.webp 1440w", "width": 1440, "height": 1080},
    releaseStatus: "coming-soon",
    heroView: "front",
    number: "02",
    name: "Flores",
    price: 149.9,
    color: "Off-white",
    dark: false,
    fit: "Oversized boxy",
    material: "Algodão Madri",
    description:
      "Três flores vermelhas atravessam a frente. Nas costas, a assinatura de Razz aparece junto à gola.",
    line: "Florescem outros caminhos.",
    note: "Vermelho sobre off-white. Um gesto que ocupa o seu espaço.",
    source: "IMG_3282 1.jpg",
    studioPhoto: "/media/reference-v3/flores-front.png",
    front: "/media/reference-v3/flores-front.png",
    back: "/media/reference-v3/flores-back.png",
    textures: {
      front: "/media/artwork-v4/flores-front.png",
      back: "/media/artwork-v4/flores-back.png",
    },
  },
  {
    id: "me-preservando",
    frozenImage: {"src": "/media/ice-v6/yaji-ice-v6-1440.webp", "srcSet": "/media/ice-v6/yaji-ice-v6-640.webp 640w, /media/ice-v6/yaji-ice-v6-1024.webp 1024w, /media/ice-v6/yaji-ice-v6-1440.webp 1440w", "width": 1440, "height": 1080},
    releaseStatus: "coming-soon",
    number: "03",
    name: "Yaji",
    price: 149.9,
    color: "Off-white",
    dark: false,
    fit: "Oversized boxy",
    material: "Algodão Madri",
    description:
      "“Me preservando, não me encontre.” A frase em vermelho percorre os ombros; a frente leva uma assinatura discreta.",
    line: "O silêncio tem presença.",
    note: "Às vezes, vestir uma ideia é tudo que você precisa dizer.",
    source: "IMG_3283 1.jpg",
    studioPhoto: "/media/reference-v3/me-preservando-front.png",
    front: "/media/reference-v3/me-preservando-front.png",
    back: "/media/reference-v3/me-preservando-back.png",
    textures: {
      front: "/media/artwork-v4/me-preservando-front.png",
      back: "/media/artwork-v4/me-preservando-back.png",
    },
  },
  {
    id: "spiritual-gangsta",
    releaseStatus: "available",
    number: "04",
    name: "Spiritual Gangsta",
    price: 169.9,
    color: "Preto marmorizado",
    dark: true,
    fit: "Oversized boxy",
    material: "100% algodão · fio 30.1",
    finish: "Marmorizado",
    description:
      "Spiritual Gangsta ocupa a parte de cima das costas em vermelho. O acabamento marmorizado dá variação ao preto da peça.",
    line: "Na sua frequência.",
    note: "Da música para a rua. Feita para acompanhar o seu próprio ritmo.",
    source: "IMG_3281 1.jpg",
    studioPhoto: "/media/reference-v3/spiritual-gangsta-front.png",
    front: "/media/reference-v3/spiritual-gangsta-front.png",
    back: "/media/reference-v3/spiritual-gangsta-back.png",
    textures: {
      front: "/media/artwork-v4/spiritual-gangsta-front.png",
      back: "/media/artwork-v4/spiritual-gangsta-back.png",
    },
  },
  {
    id: "zxxr-rosa",
    frozenImage: {"src": "/media/ice-v6/zxxr-ice-v6-1440.webp", "srcSet": "/media/ice-v6/zxxr-ice-v6-640.webp 640w, /media/ice-v6/zxxr-ice-v6-1024.webp 1024w, /media/ice-v6/zxxr-ice-v6-1440.webp 1440w", "width": 1440, "height": 1080},
    releaseStatus: "coming-soon",
    number: "05",
    name: "ZXXR",
    price: 169.9,
    color: "Preto marmorizado",
    dark: true,
    fit: "Oversized boxy",
    material: "100% algodão · fio 30.1",
    finish: "Marmorizado",
    description:
      "Quatro letras em rosa, contorno branco e uma diagonal que atravessa as costas. Na frente, a marca aparece menor.",
    line: "Uma assinatura em movimento.",
    note: "Letras em rosa, contorno branco e o corte amplo da edição Razz.",
    source: "IMG_3271 1.jpg",
    studioPhoto: "/media/reference-v3/zxxr-rosa-front.png",
    front: "/media/reference-v3/zxxr-rosa-front.png",
    back: "/media/reference-v3/zxxr-rosa-back.png",
    textures: {
      front: "/media/artwork-v4/zxxr-rosa-front.png",
      back: "/media/artwork-v4/zxxr-rosa-back.png",
    },
  },
];
export const productById = (id?: string) => products.find((p) => p.id === id);

export const isAvailable = (product: Product | undefined): product is Product & { releaseStatus: "available" } => product?.releaseStatus === "available";
export const availableProducts = products.filter(isAvailable);
export const upcomingProducts = products.filter(p => !isAvailable(p));
