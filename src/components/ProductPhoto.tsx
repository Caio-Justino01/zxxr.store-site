import type { Product } from "../config/products";

// Native reference pixels preserve the actual cut, seams and print positions.
export function ProductPhoto({
  product,
  view = "front",
  eager = false,
  className = "",
}: {
  product: Product;
  view?: "front" | "back";
  eager?: boolean;
  className?: string;
}) {
  return (
    <span className={`product-photo native-photo ${className}`}>
      <span className={`photo-window ${view === "back" ? "photo-back" : ""}`}>
        <img
          src={view === "front" ? product.front : product.back}
          alt={`Camiseta oversized ${product.name}, ${view === "front" ? "frente" : "costas"}, imagem original da peça`}
          width="923"
          height="694"
          loading={eager ? "eager" : "lazy"}
          decoding="async"
        />
      </span>
    </span>
  );
}
