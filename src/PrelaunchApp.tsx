import { useEffect, useLayoutEffect, useRef } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigationType,
  useParams,
} from "react-router";
import { previewProducts, previewOrder, previewById } from "./config/prelaunch";
import { CloudCollection } from "./components/CloudCollection";
import { GradientBackdrop } from "./components/GradientBackdrop";
import { DropCollage } from "./components/DropCollage";
import { DropTiles } from "./components/DropTiles";
import { BrandSticker } from "./components/BrandSticker";
import { DropCampaignBanner } from "./components/DropCampaignBanner";
import { DropGuide } from "./components/DropGuide";
import { MusicSection } from "./components/MusicSection";
import { FrozenProductInfo, FrostMark } from "./components/FrozenSurface";
import { PreviewGallery } from "./components/PreviewGallery";
import { useDropReading } from "./lib/use-drop-reading";
import { Arrow } from "./components/Icons";
import "./drop-editorial.css";
import "./product-page.css";

function PreviewRouteEffects() {
  const { pathname, hash, key } = useLocation();
  const navigationType = useNavigationType();
  const positions = useRef(new Map<string, number>());
  useLayoutEffect(() => {
    const previous = history.scrollRestoration;
    history.scrollRestoration = "manual";
    return () => {
      history.scrollRestoration = previous;
    };
  }, []);
  useLayoutEffect(() => {
    let first = 0,
      second = 0;
    const saved = positions.current.get(key) ?? 0;
    const save = () => positions.current.set(key, window.scrollY);
    const restore = () => {
      if (hash) {
        let id = hash.slice(1);
        try {
          id = decodeURIComponent(id);
        } catch {
          /* Literal anchors still work. */
        }
        document
          .getElementById(id)
          ?.scrollIntoView({ behavior: "instant", block: "start" });
      } else {
        window.scrollTo({
          top: navigationType === "POP" ? saved : 0,
          behavior: "instant",
        });
        if (navigationType !== "POP")
          document
            .querySelector<HTMLElement>("main h1")
            ?.focus({ preventScroll: true });
      }
      save();
    };
    first = requestAnimationFrame(() => {
      second = requestAnimationFrame(restore);
    });
    window.addEventListener("scroll", save, { passive: true });
    return () => {
      window.removeEventListener("scroll", save);
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [pathname, hash, key, navigationType]);
  useEffect(() => {
    document.title = "Desejos · Em breve · ZXXR Store";
  }, [pathname]);
  return null;
}

function PreviewHeader() {
  const { pathname } = useLocation();
  const jump = (id: string) => {
    if (pathname === "/")
      requestAnimationFrame(() =>
        document
          .getElementById(id)
          ?.scrollIntoView({ behavior: "instant", block: "start" }),
      );
  };
  return (
    <header
      className={`site-header ${pathname === "/" ? "collection-header" : ""}`}
    >
      <Link to="/" className="brand" aria-label="ZXXR Store, início">
        <img
          src="/brand/store-black.svg"
          alt="ZXXR Store"
          width="112"
          height="55"
        />
      </Link>
      <nav aria-label="Menu principal">
        <NavLink to="/" end>
          As peças
        </NavLink>
        <Link to="/#o-drop" onClick={() => jump("o-drop")}>
          O drop
        </Link>
        <Link to="/#som" onClick={() => jump("som")}>
          Som
        </Link>
      </nav>
      <span className="preview-launch-pill">
        <FrostMark />
        <span>Em breve</span>
      </span>
    </header>
  );
}

function PreviewFooter() {
  return (
    <footer className="site-footer">
      <Link to="/" aria-label="Voltar ao início">
        <img
          className="footer-mascot"
          src="/brand/mascot-black.svg"
          alt="Bonequinho ZXXR"
          width="72"
          height="62"
        />
      </Link>
      <p>
        Da música para a rua.
        <br />
        Uma criação de Razz.
      </p>
      <div>
        <span>zxxr.store</span>
        <small>Primeiro drop · Edição Razz</small>
      </div>
      <a href="#top" aria-label="Voltar ao topo">
        ↑
      </a>
    </footer>
  );
}

function GuidedTitle() {
  return (
    <>
      <span className="ps-sr-only">Da música para vestir.</span>
      <span className="ps-guided-visual" aria-hidden="true">
        {["Da música", "para vestir."].map((line) => (
          <span className="ps-guided-line" key={line}>
            {line.split(/(\s+)/).map((word, i) =>
              /^\s+$/.test(word) ? (
                word
              ) : (
                <span className="ps-guided-word" key={i}>
                  {[...word].map((letter, j) => (
                    <span data-drop-letter key={j}>
                      {letter}
                    </span>
                  ))}
                </span>
              ),
            )}
          </span>
        ))}
      </span>
    </>
  );
}

const chapters = previewOrder.map((id) => previewById(id)!);
function PreviewEditorial() {
  const root = useRef<HTMLElement>(null);
  useDropReading(root);
  const goToPiece = (id: string) => {
    const chapter = document.getElementById(`drop-${id}`);
    if (!chapter) return;
    const header =
      document.querySelector(".site-header")?.getBoundingClientRect().height ??
      0;
    const travel =
      chapter.dataset.layout === "sticky"
        ? Math.max(0, chapter.offsetHeight - (innerHeight - header))
        : 0;
    window.scrollTo({
      top:
        chapter.getBoundingClientRect().top + scrollY - header + travel * 0.4,
      behavior: "instant",
    });
  };
  return (
    <section
      id="o-drop"
      className="ps-section"
      aria-labelledby="pieces-title"
      ref={root}
    >
      <header className="ps-overview ps-chapter" data-drop-scene>
        <div className="ps-stage ps-overview-stage">
          <DropTiles />
          <DropCollage />
          <BrandSticker art="mascotRed" className="ps-brand-sticker" />
          <div className="ps-overview-copy">
            <h2 id="pieces-title" className="ps-section-title">
              <GuidedTitle />
            </h2>
            <p className="ps-intro-copy">
              Primeiro drop da ZXXR Store. Peças limitadas criadas por Razz,
              rapper e artista independente de Minas Gerais.
            </p>
            <p className="ps-explore-label">
              Um primeiro olhar. A revelação vem depois.
            </p>
            <nav
              className="ps-jump-links"
              aria-label="Explorar o ensaio do drop"
            >
              {chapters.map((piece) => (
                <a
                  key={piece.id}
                  className="liquid-glass ps-piece-pill"
                  href={`#drop-${piece.id}`}
                  onClick={(event) => {
                    event.preventDefault();
                    goToPiece(piece.id);
                  }}
                >
                  <span>{piece.name}</span>
                </a>
              ))}
            </nav>
          </div>
        </div>
      </header>
      <div className="ps-stories">
        {chapters.map((piece, index) => (
          <article
            key={piece.id}
            id={`drop-${piece.id}`}
            className={`ps-chapter ps-story ${index % 2 ? "ps-story-reverse" : ""}`}
            data-drop-scene
            data-product={piece.id}
            aria-label={piece.name}
          >
            <div className="ps-stage">
              <div className="ps-stage-inner">
                <PreviewGallery product={piece} />
                <FrozenProductInfo />
              </div>
            </div>
          </article>
        ))}
      </div>
      <DropCampaignBanner />
    </section>
  );
}

function PreviewCollection() {
  return (
    <main id="top" className="prelaunch-collection">
      <div className="collection-world">
        <div className="collection-sky">
          <GradientBackdrop />
        </div>
        <CloudCollection products={previewProducts} prelaunch />
      </div>
      <PreviewEditorial />
      <DropGuide prelaunch />
      <MusicSection />
      <section className="endnote">
        <p>EDIÇÃO RAZZ. REVELAÇÃO EM BREVE.</p>
        <img
          className="endnote-mascot"
          src="/brand/mascot-black.svg"
          alt="Bonequinho ZXXR com carinha"
          width="150"
          height="126"
        />
        <a className="text-link" href="#top">
          Voltar à coleção <span>↑</span>
        </a>
      </section>
    </main>
  );
}

function PreviewProductPage() {
  const { slug } = useParams();
  const product = previewById(slug);
  if (!product) return <Navigate to="/#o-drop" replace />;
  return (
    <main id="top" className="product-main preview-product-main">
      <h1 className="ps-sr-only" tabIndex={-1}>
        {product.name}. Revelação em breve.
      </h1>
      <Link to={`/#drop-${product.id}`} className="back-link">
        <Arrow back />
        Voltar ao ensaio
      </Link>
      <div className="product-grid">
        <PreviewGallery key={product.id} product={product} />
        <FrozenProductInfo />
      </div>
      <Link to="/#campanha-quadra" className="text-link preview-back-campaign">
        Ver o drop em movimento <Arrow />
      </Link>
    </main>
  );
}

export default function PrelaunchApp() {
  return (
    <div className="prelaunch-site">
      <a className="skip-link" href="#main-content">
        Pular para o conteúdo
      </a>
      <PreviewHeader />
      <div id="main-content">
        <Routes>
          <Route path="/" element={<PreviewCollection />} />
          <Route path="/produto/:slug" element={<PreviewProductPage />} />
          <Route path="/sacola" element={<Navigate to="/#o-drop" replace />} />
          <Route path="*" element={<Navigate to="/#o-drop" replace />} />
        </Routes>
      </div>
      <PreviewFooter />
      <PreviewRouteEffects />
    </div>
  );
}
