import { useId, useState } from "react";
import type { Product } from "../config/products";
import { getPreviewGallery } from "../config/prelaunch";
import { FrozenSurface } from "./FrozenSurface";

export function PreviewGallery({ product }: { product: Product }) {
  const images = getPreviewGallery(product);
  const [selected, setSelected] = useState(0);
  const [failed, setFailed] = useState<string | null>(null);
  const frameId = useId();
  const photo = images[selected];
  const content = (
    <>
      <img
        key={photo.src}
        src={photo.src}
        srcSet={photo.srcSet}
        sizes="(max-width: 760px) calc(100vw - 40px), 46vw"
        width={photo.width}
        height={photo.height}
        alt={photo.alt}
        loading="lazy"
        decoding="async"
        draggable={false}
        onError={() => setFailed(photo.src)}
        hidden={failed === photo.src}
      />
      {failed === photo.src && (
        <span className="preview-photo-error">Imagem indisponível.</span>
      )}
    </>
  );
  return (
    <div
      className="ps-main-figure preview-gallery"
      aria-label={`Fotografias da ${product.name.toLowerCase()}`}
    >
      <div
        className="preview-photo"
        id={frameId}
        data-photo-frozen={photo.frozen}
      >
        {photo.frozen ? <FrozenSurface>{content}</FrozenSurface> : content}
      </div>
      <div
        className="preview-thumbnails"
        role="group"
        aria-label="Escolher fotografia"
      >
        {images.map((image, index) => (
          <button
            type="button"
            key={image.id}
            aria-pressed={selected === index}
            aria-controls={frameId}
            aria-label={`Ver ${image.label.toLowerCase()} da ${product.name.toLowerCase()}${image.frozen ? ", congelada" : ""}`}
            onClick={() => setSelected(index)}
          >
            <span
              className="preview-thumbnail"
              data-frozen={image.frozen || undefined}
            >
              <img
                src={image.src}
                width={image.width}
                height={image.height}
                alt=""
                loading="lazy"
                draggable={false}
              />
            </span>
            <span>{image.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
