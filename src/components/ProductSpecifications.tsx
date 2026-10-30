import type { Product } from "../config/products";
import "../product-specifications.css";

export function ProductSpecifications({ product }: { product: Product }) {
  if (product.releaseStatus === "coming-soon") return null;
  return (
    <div className="product-specifications">
      <dl className="product-facts">
        <div><dt>Modelagem</dt><dd>{product.fit}</dd></div>
        <div><dt>Material</dt><dd>{product.material}</dd></div>
        <div><dt>Cor</dt><dd>{product.dark ? "Preto" : product.color}</dd></div>
        {product.finish && <div><dt>Acabamento</dt><dd>{product.finish}</dd></div>}
      </dl>
      <details className="product-size-chart">
        <summary><span>Guia de caimento</span><span className="product-chart-plus" aria-hidden="true">+</span></summary>
        <div className="product-size-chart-body">
          <p>Modelagem oversized boxy: corte amplo, corpo mais quadrado e ombros deslocados. Veja as fotos das peças em uso para conhecer o caimento do drop.</p>
        </div>
      </details>
    </div>
  );
}
