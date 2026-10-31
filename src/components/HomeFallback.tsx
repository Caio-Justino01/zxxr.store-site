import { Link } from "react-router";
import { products } from "../config/products";
import { productPicture } from "../seo/images";
import { DropTitle } from "./DropTitle";

/** Plain HTML/SVG only: the recovery view never mounts the failed effects. */
export function HomeFallback({
  hero = false,
  anchor,
}: {
  hero?: boolean;
  anchor?: string;
}) {
  return (
    <section
      id={anchor}
      className={`home-recovery ${hero ? "home-recovery-hero" : ""}`}
    >
      {hero ? <DropTitle /> : <h2>Conheça as peças de Desejos.</h2>}
      {hero && (
        <>
          <p className="home-recovery-title">Desejos</p>
          <p>Peças limitadas, feitas sob encomenda.</p>
        </>
      )}
      <div className="home-recovery-products">
        {products
          .filter((product) => product.releaseStatus === "available")
          .map((product) => {
            const image = productPicture(product, product.heroView ?? "back");
            return (
              <Link key={product.id} to={`/produto/${product.id}`}>
                <img
                  {...image}
                  alt={`Camiseta ${product.name}`}
                  loading="eager"
                  decoding="async"
                />
                <strong>{product.name}</strong>
                <span>Explorar peça ↗</span>
              </Link>
            );
          })}
      </div>
      <Link className="home-recovery-help" to="/ajuda">
        Precisa de ajuda?
      </Link>
    </section>
  );
}
