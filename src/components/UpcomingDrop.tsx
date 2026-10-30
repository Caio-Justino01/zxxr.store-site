import { Link } from "react-router";
import { upcomingProducts, type Product } from "../config/products";
import { FrozenGarment, comingSoonCopy } from "./FrozenGarment";

export function UpcomingDrop() {
  return <section className="upcoming-drop" id="proximos-desejos" aria-labelledby="upcoming-title">
    <header><h2 id="upcoming-title">Próximos desejos</h2></header>
    <div className="upcoming-grid">{upcomingProducts.map(product => <Link className="upcoming-card" key={product.id} to={`/produto/${product.id}`}>
      <FrozenGarment product={product} /><h3>{product.name}</h3><p>{comingSoonCopy}</p>
    </Link>)}</div>
  </section>;
}

export function UpcomingProduct({ product }: { product: Product }) {
  return <main id="top" className="upcoming-page">
    <Link to="/#o-drop" className="back-link">Ver peças disponíveis</Link>
    <div className="upcoming-page-grid"><FrozenGarment product={product} active />
      <section><h1 tabIndex={-1}>{product.name}</h1><p>{comingSoonCopy}</p>
      </section>
    </div>
  </main>;
}
