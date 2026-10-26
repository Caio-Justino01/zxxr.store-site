export type MusicRelease = {
  id: string;
  title: string;
  artists: readonly string[];
  cover: string;
  coverSource: string;
  year: number;
  duration: string;
  trackCount: number;
  releaseDate?: string;
  featured: boolean;
};

// Public Spotify catalog, checked on 2026-10-25. No authenticated API required.
export const artist = {
  id: "3KuwSQKBjfgg0OnFi57bYN",
  name: "Razz",
  url: "https://open.spotify.com/intl-pt/artist/3KuwSQKBjfgg0OnFi57bYN",
  portrait: "/media/artist/razz-spotify.webp",
  bio: "Nascido em Belo Horizonte e criado em Nova Lima, Razz trabalha com música, desenho e moda. Criador do drop Desejos, leva essas diferentes formas de expressão para o mesmo projeto.",
} as const;

export const releases: readonly MusicRelease[] = [
  {
    id: "5YNkyvIIsCT3eEv0XJk8Vi",
    title: "ESCOLHAS",
    artists: ["Razz"],
    cover: "/media/artist/releases/escolhas.jpg",
    coverSource:
      "https://i.scdn.co/image/ab67616d00001e02005b30b6a07708a7446a65bc",
    year: 2026,
    duration: "2:10",
    trackCount: 1,
    releaseDate: "2026-09-20",
    featured: true,
  },
  {
    id: "3tJOw8St4RKSxJiUiDfLLd",
    title: "emoção/controla",
    artists: ["diaz", "Razz"],
    cover: "/media/artist/releases/emocao-controla.jpg",
    coverSource:
      "https://i.scdn.co/image/ab67616d00001e02b06f177b1e46a8f8c2dc4f2f",
    year: 2026,
    duration: "5:29",
    trackCount: 2,
    featured: false,
  },
  {
    id: "2mT50xMc1crTaPg0JlsfUe",
    title: "ROCKSTAR",
    artists: ["Razz"],
    cover: "/media/artist/releases/rockstar.jpg",
    coverSource:
      "https://i.scdn.co/image/ab67616d00001e02da64b0ebd28982f98ca5806a",
    year: 2026,
    duration: "2:51",
    trackCount: 1,
    featured: false,
  },
];

export function releaseUrl(release: MusicRelease) {
  return `https://open.spotify.com/intl-pt/album/${release.id}`;
}

export function releaseEmbedUrl(release: MusicRelease) {
  return `https://open.spotify.com/embed/album/${release.id}?utm_source=generator&theme=0`;
}

export function releaseDateLabel(release: MusicRelease) {
  return release.releaseDate
    ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
        new Date(`${release.releaseDate}T00:00:00Z`),
      )
    : String(release.year);
}
