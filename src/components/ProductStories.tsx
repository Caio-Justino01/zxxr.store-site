import { useEffect, useState } from "react";
import { products, isAvailable, type Product } from "../config/products";
import { formatPrice } from "../lib/pricing";
import { Arrow } from "./Icons";
import "../product-stories.css";

type Side = "front" | "back";
type ProductStoriesProps = {
  onExplore: (product: Product, side: Side) => void;
  onOrder: (product: Product, side: Side) => void;
};
type Dimensions = Record<Side, [number, number]>;

const descriptions: Record<string, string> = {
  boca: "Off-white com assinatura discreta na frente e a boca com o R em destaque nas costas.",
  flores:
    "Três flores vermelhas na frente do off-white. A assinatura de Razz aparece de forma discreta junto à gola, nas costas.",
  "me-preservando":
    "Frente minimalista. Nas costas, “Me preservando, não me encontre”, acompanhada da assinatura de Razz.",
  "spiritual-gangsta":
    "Preto marmorizado com inscrições em vermelho. Nas costas, Spiritual Gangsta e a assinatura de Razz.",
  "zxxr-rosa":
    "A marca ZXXR em rosa sobre preto marmorizado. Nas costas, as letras aparecem em diagonal, com contorno branco.",
};

// Native PNG crop dimensions; these are image metadata, not garment measures.
const dimensions: Record<string, Dimensions> = {
  boca: { front: [921, 691], back: [917, 701] },
  flores: { front: [923, 694], back: [917, 702] },
  "me-preservando": { front: [923, 694], back: [917, 701] },
  "spiritual-gangsta": { front: [761, 573], back: [761, 573] },
  "zxxr-rosa": { front: [761, 573], back: [761, 573] },
};

function OriginalView({
  product,
  side,
  onExplore,
}: {
  product: Product;
  side: Side;
  onExplore: ProductStoriesProps["onExplore"];
}) {
  const [failed, setFailed] = useState(false);
  const source = side === "front" ? product.front : product.back;
  const label = side === "front" ? "Frente" : "Costas";
  const [width, height] = dimensions[product.id]?.[side] ?? [923, 694];

  useEffect(() => setFailed(false), [source]);

  return (
    <figure className="ps-figure">
      <button
        type="button"
        className="ps-photo-frame"
        style={{ aspectRatio: `${width}/${height}` }}
        aria-label={`Explorar ${product.name}, ${label.toLowerCase()}`}
        onClick={() => onExplore(product, side)}
      >
        {failed ? (
          <span className="ps-photo-error" role="status">
            <span>Imagem indisponível.</span>
            <small>Ver detalhes da peça</small>
          </span>
        ) : (
          <img
            className="ps-photo"
            src={source}
            alt={`${product.name}, ${label.toLowerCase()}, referência original`}
            width={width}
            height={height}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
          />
        )}
      </button>
      <figcaption className="ps-caption">
        {label} <span aria-hidden="true">↗</span>
      </figcaption>
    </figure>
  );
}

export function ProductStories({ onExplore, onOrder }: ProductStoriesProps) {
  return (
    <section id="o-drop" className="ps-section" aria-labelledby="pieces-title">
      <div className="ps-inner">
        <header className="ps-section-header">
          <h2 id="pieces-title" className="ps-section-title">
            Cada peça, uma ideia.
          </h2>
          <div className="ps-intro">
            <p className="ps-intro-copy">
              Duas camisetas disponíveis. Uma edição criada por Razz.
            </p>
            <p className="ps-edition-note">
              Peças limitadas, feitas sob encomenda.
            </p>
          </div>
        </header>
        <div className="ps-stories">
          {products.filter(isAvailable).map((product, index) => (
            <article
              key={product.id}
              className={`ps-story ${index % 2 ? "ps-story-reverse" : ""}`}
              aria-labelledby={`ps-title-${product.id}`}
            >
              <div className="ps-images">
                <OriginalView
                  product={product}
                  side="front"
                  onExplore={onExplore}
                />
                <OriginalView
                  product={product}
                  side="back"
                  onExplore={onExplore}
                />
              </div>
              <div className="ps-copy">
                <p className="ps-meta">
                  {product.color}
                  <span aria-hidden="true"> · </span>
                  {product.fit}
                </p>
                <h3 id={`ps-title-${product.id}`} className="ps-product-title">
                  {product.name}
                </h3>
                <p className="ps-price">{formatPrice(product.price)}</p>
                <p className="ps-description">
                  {descriptions[product.id] ?? product.description}
                </p>
                <button
                  type="button"
                  className="ps-product-link"
                  onClick={() => onOrder(product, product.heroView ?? "back")}
                  aria-label={`Encomendar ${product.name}`}
                >
                  <span>Encomendar</span>
                  <Arrow />
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
