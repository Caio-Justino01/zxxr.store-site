import { useState } from "react";
import { Arrow } from "./Icons";
import "../music-artist.css";
export const SPOTIFY_ARTIST_URL =
  "https://open.spotify.com/intl-pt/artist/3KuwSQKBjfgg0OnFi57bYN";
export function MusicSection() {
  const [player, setPlayer] = useState(false);
  return (
    <section
      className="music-section music-artist"
      id="som"
      aria-labelledby="music-title"
    >
      <div className="music-heading">
        <p className="drop-label">
          <span className="red-dot" />
          No som / Na rua
        </p>
        <span className="music-credit">Música e direção criativa por Razz</span>
      </div>
      <div className="artist-layout">
        <div className="music-copy">
          <h2 id="music-title">
            O som por trás
            <br />
            do <em>drop.</em>
          </h2>
          <p className="artist-bio">
            A trajetória de Razz começa em Belo Horizonte, onde nasceu, e passa
            por Nova Lima, Minas Gerais, cidade em que cresceu. No repertório
            estão “Escolhas”, “Controla”, “Emoção” e “Rockstar”. Seu universo
            criativo reúne música, desenho e moda: maneiras diferentes de
            transformar ideias em expressão e construir a própria linguagem. É
            desse diálogo entre som e imagem que sua identidade vai tomando
            forma.
          </p>
          <a
            className="artist-bio-source"
            href={SPOTIFY_ARTIST_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Bio adaptada do Spotify <span aria-hidden="true">↗</span>
          </a>
          <a
            className="spotify-link"
            href={SPOTIFY_ARTIST_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg width="21" height="21" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="11" fill="currentColor" />
              <path
                d="M6 9c4-1.6 8-1.1 12 .6M7 12c3.7-1.2 7-1 10 .7M8 15c3-.8 5.7-.6 8 .7"
                fill="none"
                stroke="#101010"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
            Ouvir Razz no Spotify
            <Arrow />
          </a>
          {!player && (
            <button
              type="button"
              className="inline-player-button"
              onClick={() => setPlayer(true)}
            >
              Abrir player aqui na loja <span>＋</span>
            </button>
          )}
        </div>
        <figure className="artist-portrait">
          <img
            src="/media/artist/razz-spotify.webp"
            alt="Razz de boné e óculos escuros, sentado à porta de um carro."
            width="271"
            height="320"
            loading="lazy"
            decoding="async"
          />
          <figcaption>
            <strong>RAZZ</strong>
            <span>Música, desenho e moda.</span>
            <a
              href={SPOTIFY_ARTIST_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Foto do perfil no Spotify <span aria-hidden="true">↗</span>
            </a>
          </figcaption>
        </figure>
      </div>
      {player && (
        <div className="spotify-embed" id="razz-spotify-player">
          <iframe
            title="Ouça Razz no Spotify"
            src="https://open.spotify.com/embed/artist/3KuwSQKBjfgg0OnFi57bYN?utm_source=generator&theme=0"
            width="100%"
            height="352"
            loading="lazy"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          />
          <p>
            Se o player não carregar,{" "}
            <a
              href={SPOTIFY_ARTIST_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              abra o perfil de Razz no Spotify ↗
            </a>
            .
          </p>
        </div>
      )}
    </section>
  );
}
