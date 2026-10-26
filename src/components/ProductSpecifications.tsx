import type { Product } from "../config/products";
import "../product-specifications.css";

export function ProductSpecifications({ product }: { product: Product }) {
  return (
    <div className="product-specifications">
      <dl className="product-facts">
        <div><dt>Modelagem</dt><dd>Oversized · corte amplo</dd></div>
        <div><dt>Cor</dt><dd>{product.color}</dd></div>
        <div><dt>Acabamento</dt><dd>Gola canelada · ombros deslocados</dd></div>
      </dl>
      <details className="product-size-chart">
        <summary><span>Guia de caimento</span><span className="product-chart-plus" aria-hidden="true">+</span></summary>
        <div className="product-size-chart-body">
          <p>Modelagem oversized, com corte amplo e ombros deslocados. Veja as fotos das peças em uso para conhecer o caimento do drop.</p>
        </div>
      </details>
    </div>
  );
}
