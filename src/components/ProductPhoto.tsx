import { FrozenGarment } from "./FrozenGarment";
import type { Product } from "../config/products";
import { productPicture } from "../seo/images";

// Native reference pixels preserve the actual cut, seams and print positions.
export function ProductPhoto({
  product,
  view = "front",
  eager = false,
  className = "",
  effects = true,
}: {
  product: Product;
  view?: "front" | "back";
  eager?: boolean;
  className?: string;
  effects?: boolean;
}) {
  if (product.releaseStatus === "coming-soon")
    return <FrozenGarment product={product} effects={effects} />;
  const picture = productPicture(product, view);
  return (
    <span className={`product-photo native-photo ${className}`}>
      <span className={`photo-window ${view === "back" ? "photo-back" : ""}`}>
        <img
          src={picture.src}
          srcSet={picture.srcSet}
          sizes="(max-width: 767px) 90vw, (max-width: 1099px) 48vw, 700px"
          alt={`Camiseta ${product.fit.toLowerCase()} ${product.name}, ${product.color}, ${view === "front" ? "frente" : "costas"}, imagem original da peça`}
          width={picture.width}
          height={picture.height}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          decoding="async"
        />
      </span>
    </span>
  );
}
