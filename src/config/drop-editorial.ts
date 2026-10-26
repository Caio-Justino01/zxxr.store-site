export type EditorialPhoto = {
  src: string;
  srcSet: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
};
export type DropStory = {
  productId: string;
  description: string;
  photos?: EditorialPhoto[];
};

// Add approved campaign photographs here as the shoot progresses.
// Original front/back product views remain available for every piece.
export const dropStories: DropStory[] = [
  {
    productId: "me-preservando",
    description:
      "Frente minimalista. Nas costas, “Me preservando, não me encontre”, acompanhada da assinatura de Razz.",
    photos: [
      {
        src: "/media/ensaio-drop/ensaiodrop1zxxrfoto01-1120.webp",
        srcSet:
          "/media/ensaio-drop/ensaiodrop1zxxrfoto01-640.webp 640w, /media/ensaio-drop/ensaiodrop1zxxrfoto01-1120.webp 1120w, /media/ensaio-drop/ensaiodrop1zxxrfoto01-1680.webp 1680w",
        width: 3369,
        height: 4200,
        alt: "Me preservando em uso: camiseta off-white vista de costas, no píer entre os barcos.",
        caption: "Me preservando, em uso.",
      },
    ],
  },
  {
    productId: "flores",
    description:
      "Três flores vermelhas na frente do off-white. A assinatura de Razz aparece de forma discreta junto à gola, nas costas.",
    photos: [
      {
        src: "/media/ensaio-drop/ensaiodrop1zxxrfoto02-1087.webp",
        srcSet:
          "/media/ensaio-drop/ensaiodrop1zxxrfoto02-640.webp 640w, /media/ensaio-drop/ensaiodrop1zxxrfoto02-1087.webp 1087w",
        width: 1087,
        height: 1447,
        alt: "Camiseta Flores sobre a grama, com a estampa vermelha original sob a luz natural.",
        caption: "Flores, sob a luz natural.",
      },
    ],
  },
  {
    productId: "boca",
    description:
      "Off-white com assinatura discreta na frente e a boca com o R em destaque nas costas.",
  },
  {
    productId: "spiritual-gangsta",
    description:
      "Preto estonado com inscrições em vermelho. Nas costas, Spiritual Gangsta e a assinatura de Razz.",
  },
  {
    productId: "zxxr-rosa",
    description:
      "A marca ZXXR em rosa sobre preto estonado. Nas costas, as letras aparecem em diagonal, com contorno branco.",
  },
];
