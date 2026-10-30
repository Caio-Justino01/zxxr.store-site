import { useRef, useState } from "react";
import { Link } from "react-router";
import {
  products,
  isAvailable,
  type Product,
  type Size,
} from "../config/products";
import { UpcomingDrop } from "./UpcomingDrop";
import { dropStories } from "../config/drop-editorial";
import { useDropReading } from "../lib/use-drop-reading";
import { formatPrice } from "../lib/pricing";
import { Arrow } from "./Icons";
import { DropCollage } from "./DropCollage";
import { DropTiles } from "./DropTiles";
import { BrandSticker } from "./BrandSticker";
import { DropCampaignBanner } from "./DropCampaignBanner";
import { GarmentViewer } from "./GarmentViewer";
import { ProductSpecifications } from "./ProductSpecifications";
import { ProductSizeSelector } from "./ProductSizeSelector";
import { preorder } from "../config/preorder";
import "../drop-editorial.css";
import "../drop-product-gallery.css";

type Props = {
  onAdd: (product: Product, size: Size) => void;
};

function GuidedText({ lines }: { lines: string[] }) {
  return (
    <>
      <span className="ps-sr-only">{lines.join(" ")}</span>
      <span aria-hidden="true" className="ps-guided-visual">
        {lines.map((line, lineIndex) => (
          <span className="ps-guided-line" key={lineIndex}>
            {line.split(/(\s+)/).map((word, wordIndex) =>
              /^\s+$/.test(word) ? (
                word
              ) : (
                <span className="ps-guided-word" key={wordIndex}>
                  {Array.from(word).map((letter, index) => (
                    <span data-drop-letter key={index}>
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

const stories = dropStories.flatMap((story) => {
  const product = products.find((item) => item.id === story.productId);
  return isAvailable(product) ? [{ story, product }] : [];
});

export function DropEditorial({ onAdd }: Props) {
  const root = useRef<HTMLElement>(null);
  const [selectedSizes, setSelectedSizes] = useState<Record<string, Size>>({});
  const [added, setAdded] = useState<Record<string, boolean>>({});
  useDropReading(root);
  const goToPiece = (id: string) => {
    const chapter = document.getElementById(`drop-${id}`);
    if (!chapter) return;
    const headerHeight =
      document.querySelector(".site-header")?.getBoundingClientRect().height ??
      0;
    const distance =
      chapter.dataset.layout === "sticky"
        ? Math.max(
            0,
            chapter.offsetHeight - (window.innerHeight - headerHeight),
          )
        : 0;
    window.scrollTo({
      top:
        chapter.getBoundingClientRect().top +
        window.scrollY -
        headerHeight +
        distance * 0.4,
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
              <GuidedText lines={["Da música", "para vestir."]} />
            </h2>
            <p className="ps-intro-copy">
              Primeiro drop da ZXXR Store. Peças limitadas criadas por Razz,
              rapper e artista independente de Minas Gerais.
            </p>
            <p className="ps-explore-label">Explore cada peça.</p>
            <nav
              className="ps-jump-links"
              aria-label="Escolher uma peça do drop"
            >
              {stories.map(({ product }) => (
                <a
                  key={product.id}
                  className="liquid-glass ps-piece-pill"
                  href={`#drop-${product.id}`}
                  onClick={(event) => {
                    event.preventDefault();
                    goToPiece(product.id);
                  }}
                >
                  <span>{product.name}</span>
                </a>
              ))}
            </nav>
          </div>
        </div>
      </header>
      <div className="ps-stories">
        {stories.map(({ product }, index) => (
          <article
            key={product.id}
            id={`drop-${product.id}`}
            className={`ps-chapter ps-story ${index % 2 ? "ps-story-reverse" : ""}`}
            data-drop-scene
            data-product={product.id}
            aria-labelledby={`ps-title-${product.id}`}
          >
            <div className="ps-stage">
              <div className="ps-stage-inner">
                <GarmentViewer product={product} compact />
                <div className="ps-copy">
                  <h3
                    id={`ps-title-${product.id}`}
                    className="ps-product-title"
                  >
                    {product.name}
                  </h3>
                  <p className="ps-description">{product.description}</p>
                  <ProductSpecifications product={product} />
                  <ProductSizeSelector
                    value={selectedSizes[product.id] ?? "M"}
                    onChange={(size) => {
                      setSelectedSizes((previous) => ({
                        ...previous,
                        [product.id]: size,
                      }));
                      setAdded((previous) => ({
                        ...previous,
                        [product.id]: false,
                      }));
                    }}
                  />
                  <div className="ps-order-row">
                    <p className="ps-price">
                      {formatPrice(product.price)}
                      <small>Sob encomenda</small>
                    </p>
                    <button
                      type="button"
                      className="ps-product-link liquid-glass"
                      disabled={added[product.id] || !preorder.open}
                      onClick={() => {
                        onAdd(product, selectedSizes[product.id] ?? "M");
                        setAdded((previous) => ({
                          ...previous,
                          [product.id]: true,
                        }));
                      }}
                      aria-label={`${!preorder.open ? "Encomendas encerradas" : added[product.id] ? "Adicionado à sacola" : "Adicionar à sacola"}: ${product.name}, tamanho ${selectedSizes[product.id] ?? "M"}`}
                    >
                      <span>
                        {!preorder.open
                          ? "Encomendas encerradas"
                          : added[product.id]
                            ? "Adicionado à sacola"
                            : "Adicionar à sacola"}
                      </span>
                      {added[product.id] ? (
                        <span aria-hidden="true">✓</span>
                      ) : (
                        <Arrow />
                      )}
                    </button>
                  </div>
                  <div className="ps-purchase-links">
                    <Link to={`/produto/${product.id}`}>
                      Ver todos os detalhes
                    </Link>
                    {added[product.id] && <Link to="/sacola">Ver sacola</Link>}
                  </div>
                  <span className="ps-sr-only" role="status">
                    {added[product.id]
                      ? `${product.name}, tamanho ${selectedSizes[product.id] ?? "M"}, na sua sacola.`
                      : ""}
                  </span>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
      <UpcomingDrop />
      <DropCampaignBanner />
    </section>
  );
}
