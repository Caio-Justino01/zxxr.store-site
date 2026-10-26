import { useRef, useState } from "react";
import {
  artist,
  releases,
  releaseUrl,
  releaseEmbedUrl,
  releaseDateLabel,
  type MusicRelease,
} from "../config/artist";
import "../music-artist.css";

export const SPOTIFY_ARTIST_URL = artist.url;

function SpotifyIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="currentColor" />
      <path
        d="M6 9c4-1.6 8-1.1 12 .6M7 12c3.7-1.2 7-1 10 .7M8 15c3-.8 5.7-.6 8 .7"
        fill="none"
        stroke="#0b0b0c"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true">
      <path d="m6 3 11 7-11 7Z" fill="currentColor" />
    </svg>
  );
}

export function MusicSection() {
  const [selected, setSelected] = useState<MusicRelease | null>(null);
  const [playerFailed, setPlayerFailed] = useState(false);
  const playerHeading = useRef<HTMLHeadingElement>(null);
  const featured = releases.find((release) => release.featured)!;
  const openPlayer = (release: MusicRelease) => {
    setSelected(release);
    setPlayerFailed(false);
    // Open the region without starting playback; keyboard focus follows it.
    requestAnimationFrame(() => {
      playerHeading.current?.focus({ preventScroll: true });
      playerHeading.current?.scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      });
    });
  };

  return (
    <section
      className="music-section music-artist"
      id="som"
      aria-labelledby="music-title"
    >
      <div className="razz-section-inner">
        <header className="razz-section-heading">
          <h2 id="music-title">Por trás de Desejos.</h2>
          <span>Música, desenho e moda.</span>
        </header>
        <div className="razz-panel">
          <div className="razz-profile">
            <img
              className="razz-portrait"
              src={artist.portrait}
              alt="Razz de boné e óculos escuros, sentado à porta de um carro."
              width="271"
              height="320"
              loading="lazy"
              decoding="async"
            />
            <div className="razz-profile-copy">
              <span className="razz-role">O criador do drop</span>
              <h3>{artist.name}</h3>
              <p>{artist.bio}</p>
              <a
                className="razz-profile-link"
                href={artist.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <SpotifyIcon /> Ver perfil no Spotify{" "}
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
          <div className="razz-catalog">
            <article
              className="razz-featured"
              aria-labelledby="release-featured-title"
            >
              <a
                className="razz-featured-cover"
                href={releaseUrl(featured)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Abrir ${featured.title} no Spotify`}
              >
                <img
                  src={featured.cover}
                  alt={`Capa oficial de ${featured.title}`}
                  width="300"
                  height="300"
                  loading="lazy"
                  decoding="async"
                />
              </a>
              <div className="razz-featured-info">
                <span className="razz-latest">
                  <span aria-hidden="true" />
                  Último lançamento
                </span>
                <h3 id="release-featured-title">{featured.title}</h3>
                <p className="razz-release-credits">
                  {featured.artists.join(", ")}
                </p>
                <p className="razz-release-meta">
                  <time dateTime={featured.releaseDate}>
                    {releaseDateLabel(featured)}
                  </time>
                  <span aria-hidden="true">·</span>
                  <span>{featured.duration}</span>
                </p>
                <button
                  type="button"
                  className="razz-play razz-play-featured"
                  data-release-id={featured.id}
                  onClick={() => openPlayer(featured)}
                  aria-controls="razz-spotify-player"
                  aria-expanded={selected?.id === featured.id}
                >
                  <PlayIcon /> Ouvir {featured.title}
                </button>
              </div>
            </article>
            <div className="razz-other-releases">
              <h3>Mais de Razz</h3>
              {releases
                .filter((release) => !release.featured)
                .map((release) => (
                  <article
                    className="razz-release-row"
                    key={release.id}
                    aria-labelledby={`release-${release.id}`}
                  >
                    <a
                      className="razz-row-cover"
                      href={releaseUrl(release)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Abrir ${release.title} no Spotify`}
                    >
                      <img
                        src={release.cover}
                        alt={`Capa oficial de ${release.title}`}
                        width="300"
                        height="300"
                        loading="lazy"
                        decoding="async"
                      />
                    </a>
                    <div className="razz-row-info">
                      <h4 id={`release-${release.id}`}>{release.title}</h4>
                      <p className="razz-release-credits">
                        {release.artists.join(", ")}
                      </p>
                      <p className="razz-release-meta">
                        {release.year}
                        <span aria-hidden="true">·</span>
                        {release.trackCount === 1
                          ? "Single"
                          : `${release.trackCount} faixas`}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="razz-play razz-play-small"
                      data-release-id={release.id}
                      onClick={() => openPlayer(release)}
                      aria-label={`Ouvir ${release.title}`}
                      aria-controls="razz-spotify-player"
                      aria-expanded={selected?.id === release.id}
                    >
                      <PlayIcon />
                    </button>
                  </article>
                ))}
              <p className="razz-catalog-note">
                O mesmo universo. Outras formas de sentir.
              </p>
            </div>
          </div>
          {selected && (
            <div
              className="razz-player"
              id="razz-spotify-player"
              role="region"
              aria-labelledby="razz-player-title"
            >
              <div className="razz-player-header">
                <h3 id="razz-player-title" ref={playerHeading} tabIndex={-1}>
                  Ouça {selected.title}
                </h3>
                <button
                  type="button"
                  className="razz-close-player"
                  aria-label="Fechar player"
                  onClick={() => {
                    const currentId = selected.id;
                    setSelected(null);
                    requestAnimationFrame(() =>
                      document
                        .querySelector<HTMLButtonElement>(
                          `[aria-controls="razz-spotify-player"][data-release-id="${currentId}"]`,
                        )
                        ?.focus({ preventScroll: true }),
                    );
                  }}
                >
                  Fechar <span aria-hidden="true">×</span>
                </button>
              </div>
              {!playerFailed && (
                <iframe
                  key={selected.id}
                  title={`Player oficial de ${selected.title} no Spotify`}
                  src={releaseEmbedUrl(selected)}
                  width="100%"
                  height="352"
                  allow="encrypted-media; fullscreen; picture-in-picture"
                  onError={() => setPlayerFailed(true)}
                />
              )}
              <p className="razz-player-fallback">
                {playerFailed
                  ? "O player não carregou."
                  : "Se o player não carregar, você também pode"}{" "}
                <a
                  href={releaseUrl(selected)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  abrir {selected.title} no Spotify{" "}
                  <span aria-hidden="true">↗</span>
                </a>
                .
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
