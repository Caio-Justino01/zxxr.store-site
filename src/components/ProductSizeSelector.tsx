import type { Ref } from "react";
import { sizes, type Size } from "../config/products";

export function ProductSizeSelector({ value, onChange, firstButtonRef }: {
  value: Size | null;
  onChange: (size: Size) => void;
  firstButtonRef?: Ref<HTMLButtonElement>;
}) {
  return (
    <fieldset className="product-size-selector">
      <legend>Escolha seu tamanho</legend>
      <div>{sizes.map((size, index) => (
        <button key={size} type="button" ref={index === 0 ? firstButtonRef : undefined}
          aria-pressed={value === size} onClick={() => onChange(size)}>{size}</button>
      ))}</div>
    </fieldset>
  );
}
