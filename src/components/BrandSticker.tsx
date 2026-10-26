const artwork = {
  mascotRed: {
    src: "/brand/stickers/mascote-xx-com-rosto-vermelho.svg",
    width: 350,
    height: 294,
  },
  mascotPink: {
    src: "/brand/stickers/mascote-x-com-rosto-rosa.svg",
    width: 214,
    height: 290,
  },
  graffiti: {
    src: "/brand/stickers/grafite-tag-preto.svg",
    width: 857,
    height: 342,
  },
};

export function BrandSticker({
  art,
  className = "",
}: {
  art: keyof typeof artwork;
  className?: string;
}) {
  return (
    <span className={`brand-sticker ${className}`} aria-hidden="true">
      <img
        src={artwork[art].src}
        alt=""
        width={artwork[art].width}
        height={artwork[art].height}
        loading="lazy"
        decoding="async"
        draggable={false}
      />
    </span>
  );
}
