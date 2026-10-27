import "../drop-campaign-banner.css";

const base = "/media/ensaio-drop/ensaiodrop1zxxrfoto06-banner-v1";

export function DropCampaignBanner() {
  return (
    <figure className="drop-campaign-banner" id="campanha-quadra">
      <picture>
        <source
          media="(max-width: 767px)"
          srcSet={`${base}-portrait-640.webp 640w, ${base}-portrait-1086.webp 1086w`}
          sizes="100vw"
          width="1086"
          height="1448"
        />
        <img
          src={`${base}-1920.webp`}
          srcSet={`${base}-960.webp 960w, ${base}-1440.webp 1440w, ${base}-1920.webp 1920w`}
          sizes="100vw"
          width="1920"
          height="800"
          alt="Três pessoas na quadra de basquete: Emoção off-white na pessoa central e na pessoa à esquerda, e ZXXR preta na pessoa à direita."
          loading="lazy"
          decoding="async"
        />
      </picture>
    </figure>
  );
}
