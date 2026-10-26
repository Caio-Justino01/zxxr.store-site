import type { Product } from "../config/products";
import "../product-specifications.css";

// Layout examples only. Replace with the manufacturer's measured size chart.
const provisionalMeasurements = [
  { size: "P", width: 58, length: 70 },
  { size: "M", width: 60, length: 73 },
  { size: "G", width: 62, length: 76 },
  { size: "GG", width: 64, length: 79 },
];

export function ProductSpecifications({ product }: { product: Product }) {
  return (
    <div className="product-specifications">
      <dl className="product-facts">
        <div><dt>Modelagem</dt><dd>Oversized · corte amplo</dd></div>
        <div><dt>Cor</dt><dd>{product.color}</dd></div>
        <div><dt>Malha</dt><dd>Algodão premium</dd></div>
        <div><dt>Acabamento</dt><dd>Gola canelada · ombros deslocados</dd></div>
      </dl>
      <details className="product-size-chart">
        <summary><span>Tabela de medidas</span><span className="product-chart-plus" aria-hidden="true">+</span></summary>
        <div className="product-size-chart-body">
          <table>
            <caption>Medidas em centímetros</caption>
            <thead><tr><th scope="col">Tamanho</th><th scope="col">Largura</th><th scope="col">Comprimento</th></tr></thead>
            <tbody>{provisionalMeasurements.map((row) => <tr key={row.size}><th scope="row">{row.size}</th><td>{row.width}</td><td>{row.length}</td></tr>)}</tbody>
          </table>
          <p>Meça uma camiseta sua em uma superfície plana. A largura vai de uma axila à outra; o comprimento, do ombro à barra.</p>
        </div>
      </details>
    </div>
  );
}
