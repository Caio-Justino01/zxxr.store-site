import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type CSSProperties,
} from "react";
import { Link } from "react-router";
import gsap from "gsap";
import type { Product } from "../config/products";
import { getProductGallery } from "../config/product-gallery";
import {
  clampViewerPan,
  clampViewerZoom,
  type ViewerPoint,
  type ViewerSize,
} from "../lib/viewer";
import "../viewer-v5.css";

type Side = string;
type ImageStatus = "loading" | "ready" | "error";
const initialStatus = (views: string[]): Record<Side, ImageStatus> =>
  Object.fromEntries(views.map((view) => [view, "loading"]));

export function GarmentViewer({
  product,
  initialView,
  compact = false,
}: {
  product: Product;
  initialView?: Side;
  compact?: boolean;
}) {
  const gallery = useMemo(() => getProductGallery(product), [product]);
  const sides = useMemo(() => gallery.map((image) => image.id), [gallery]);
  const startingView =
    initialView && sides.includes(initialView) ? initialView : sides[0];
  const [side, setSide] = useState<Side>(startingView);
  const selectedImage =
    gallery.find((image) => image.id === side) ?? gallery[0];
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<ViewerPoint>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [viewportSize, setViewportSize] = useState<ViewerSize>({
    width: 0,
    height: 0,
  });
  const [images, setImages] = useState({
    productId: product.id,
    statuses: initialStatus(sides),
    sizes: {} as Partial<Record<Side, ViewerSize>>,
  });
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const viewport = useRef<HTMLDivElement>(null);
  const imageNodes = useRef<Partial<Record<Side, HTMLImageElement>>>({});
  const productId = useRef(product.id);
  productId.current = product.id;
  const drag = useRef<{
    pointer: number;
    x: number;
    y: number;
    origin: ViewerPoint;
  } | null>(null);
  const hintId = useId();
  const status =
    images.productId === product.id ? images.statuses[side] : "loading";
  const naturalSize =
    images.productId === product.id && images.sizes[side]
      ? images.sizes[side]!
      : { width: 4, height: 3 };
  const isZoomed = zoom > 1;

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useLayoutEffect(() => {
    drag.current = null;
    setDragging(false);
    setSide(startingView);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [product.id, startingView]);

  useLayoutEffect(() => {
    setImages({
      productId: product.id,
      statuses: initialStatus(sides),
      sizes: {},
    });
  }, [product.id, sides]);

  useLayoutEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const update = () => {
      const width = node.clientWidth;
      const height = node.clientHeight;
      setViewportSize((old) =>
        old.width === width && old.height === height ? old : { width, height },
      );
    };
    update();
    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    observer?.observe(node);
    window.addEventListener("resize", update);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  useLayoutEffect(() => {
    setPan((previous) =>
      clampViewerPan(previous, viewportSize, naturalSize, zoom),
    );
  }, [
    zoom,
    viewportSize.width,
    viewportSize.height,
    naturalSize.width,
    naturalSize.height,
    side,
  ]);

  useLayoutEffect(() => {
    const nodes = sides.map((view) => imageNodes.current[view]).filter(Boolean);
    const transition = gsap.to(nodes, {
      opacity: (index: number) => (sides[index] === side ? 1 : 0),
      duration: reduced ? 0.15 : 0.24,
      ease: "power1.out",
      overwrite: true,
    });
    return () => {
      transition.kill();
    };
  }, [side, product.id, reduced, sides]);

  const stopPan = () => {
    const pointer = drag.current?.pointer;
    drag.current = null;
    setDragging(false);
    if (pointer !== undefined && viewport.current?.hasPointerCapture(pointer))
      viewport.current.releasePointerCapture(pointer);
  };
  const selectSide = (next: Side) => {
    stopPan();
    setSide(next);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };
  const restore = () => {
    stopPan();
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };
  const changeZoom = (next: number) => {
    stopPan();
    const value = clampViewerZoom(Math.round(next * 100) / 100);
    setZoom(value);
    setPan((previous) =>
      clampViewerPan(previous, viewportSize, naturalSize, value),
    );
  };
  const details = () => {
    stopPan();
    setZoom(1.7);
    setPan({ x: 0, y: 0 });
  };
  const down = (event: PointerEvent<HTMLDivElement>) => {
    if (!isZoomed || status !== "ready" || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    drag.current = {
      pointer: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      origin: pan,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!start || start.pointer !== event.pointerId) return;
    setPan(
      clampViewerPan(
        {
          x: start.origin.x + event.clientX - start.x,
          y: start.origin.y + event.clientY - start.y,
        },
        viewportSize,
        naturalSize,
        zoom,
      ),
    );
  };
  const keyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    // The enclosing modal owns Escape; the standalone viewer still restores.
    if (event.key === "Escape" && event.currentTarget.closest("dialog[open]"))
      return;
    if (event.key === "Home" || event.key === "Escape" || event.key === "0") {
      event.preventDefault();
      restore();
      return;
    }
    if (status !== "ready") return;
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      changeZoom(zoom + 0.2);
    } else if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      changeZoom(zoom - 0.2);
    } else if (event.key.startsWith("Arrow")) {
      if (isZoomed) {
        event.preventDefault();
        const step = event.shiftKey ? 80 : 36;
        const direction: Record<string, ViewerPoint> = {
          ArrowLeft: { x: step, y: 0 },
          ArrowRight: { x: -step, y: 0 },
          ArrowUp: { x: 0, y: step },
          ArrowDown: { x: 0, y: -step },
        };
        const delta = direction[event.key];
        if (delta)
          setPan((previous) =>
            clampViewerPan(
              { x: previous.x + delta.x, y: previous.y + delta.y },
              viewportSize,
              naturalSize,
              zoom,
            ),
          );
      } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        const direction = event.key === "ArrowRight" ? 1 : -1;
        selectSide(
          sides[
            (sides.indexOf(side) + direction + sides.length) % sides.length
          ],
        );
      }
    }
  };
  const imageState = (
    view: Side,
    next: ImageStatus,
    node: HTMLImageElement,
  ) => {
    if (productId.current !== product.id) return;
    setImages((previous) => {
      const current =
        previous.productId === product.id
          ? previous
          : {
              productId: product.id,
              statuses: initialStatus(sides),
              sizes: {},
            };
      return {
        ...current,
        statuses: { ...current.statuses, [view]: next },
        sizes: {
          ...current.sizes,
          ...(next === "ready"
            ? {
                [view]: {
                  width: node.naturalWidth,
                  height: node.naturalHeight,
                },
              }
            : {}),
        },
      };
    });
  };

  return (
    <section
      className={`gv-viewer ${compact ? "gv-compact" : ""}`}
      aria-label={`Imagens de ${product.name}`}
    >
      <div
        ref={viewport}
        className={`gv-stage ${selectedImage.campaign ? "gv-campaign" : "gv-original"} ${isZoomed ? "gv-zoomed" : ""} ${dragging ? "gv-panning" : ""}`}
        tabIndex={0}
        role="group"
        aria-label={`${product.name}, ${selectedImage.label.toLowerCase()}`}
        aria-describedby={hintId}
        aria-busy={status === "loading"}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={stopPan}
        onPointerCancel={stopPan}
        onLostPointerCapture={stopPan}
        onKeyDown={keyDown}
        data-view={side}
        data-zoom={zoom.toFixed(2)}
        style={
          {
            "--gv-image-ratio": selectedImage.width / selectedImage.height,
          } as CSSProperties
        }
      >
        <div
          className="gv-image-stack"
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
          }}
        >
          {gallery.map((image) => (
            <img
              key={`${product.id}-${image.id}`}
              ref={(node) => {
                if (node) imageNodes.current[image.id] = node;
                else delete imageNodes.current[image.id];
              }}
              className={`gv-image ${image.campaign ? "gv-campaign-image" : "gv-original-image"}`}
              style={{ opacity: image.id === side ? 1 : 0 }}
              src={image.src}
              srcSet={image.srcSet}
              sizes="(max-width: 760px) 90vw, (max-width: 1200px) 48vw, 640px"
              width={image.width}
              height={image.height}
              alt={image.alt}
              aria-hidden={image.id !== side}
              draggable={false}
              decoding="async"
              loading={compact ? "lazy" : "eager"}
              onLoad={(event) =>
                imageState(image.id, "ready", event.currentTarget)
              }
              onError={(event) =>
                imageState(image.id, "error", event.currentTarget)
              }
            />
          ))}
        </div>
        <span className="gv-photo-label liquid-glass" aria-hidden="true">
          {selectedImage.label}
          <span>
            {sides.indexOf(side) + 1} / {sides.length}
          </span>
        </span>
        {status === "loading" && (
          <span className="gv-status" role="status">
            Carregando imagem…
          </span>
        )}
        {status === "error" && (
          <div className="gv-error" role="status">
            <p>Não foi possível carregar esta imagem.</p>
            <a
              href={`/media/source/${encodeURIComponent(product.source)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir arquivo de referência
            </a>
            <Link to="/">Voltar à coleção</Link>
          </div>
        )}
      </div>
      <div
        className="gv-thumbnails"
        role="group"
        aria-label={`Galeria de ${product.name}`}
      >
        {gallery.map((image) => (
          <button
            type="button"
            key={image.id}
            className={`gv-thumbnail ${image.campaign ? "gv-thumbnail-campaign" : ""}`}
            aria-label={`Ver ${image.label.toLowerCase()} de ${product.name}`}
            aria-pressed={side === image.id}
            onClick={() => selectSide(image.id)}
          >
            <span className="gv-thumbnail-frame">
              <img
                src={image.src}
                alt=""
                width="72"
                height="72"
                loading="lazy"
                decoding="async"
              />
            </span>
            <span>{image.label}</span>
          </button>
        ))}
      </div>
      <div className="gv-toolbar">
        <div className="gv-actions">
          <button
            type="button"
            className="gv-control"
            onClick={details}
            disabled={status !== "ready"}
          >
            Ampliar foto
          </button>
          {(isZoomed || pan.x !== 0 || pan.y !== 0) && (
            <button type="button" className="gv-control" onClick={restore}>
              Restaurar foto
            </button>
          )}
        </div>
      </div>
      <div className="gv-footer">
        <p id={hintId} className="gv-hint">
          {isZoomed
            ? "Arraste para explorar os detalhes."
            : "Aproxime para ver a estampa."}
          <span>Teclado: +, − e setas.</span>
        </p>
        <div
          className="gv-zoom-controls"
          role="group"
          aria-label="Zoom da imagem"
        >
          <button
            type="button"
            className="gv-control gv-zoom-button"
            onClick={() => changeZoom(zoom - 0.2)}
            aria-label="Diminuir zoom"
            disabled={zoom <= 1 || status !== "ready"}
          >
            <span aria-hidden="true">−</span>
          </button>
          <output
            className="gv-zoom-value"
            aria-live="polite"
            aria-atomic="true"
          >
            {Math.round(zoom * 100)}%
          </output>
          <button
            type="button"
            className="gv-control gv-zoom-button"
            onClick={() => changeZoom(zoom + 0.2)}
            aria-label="Aumentar zoom"
            disabled={zoom >= 2 || status !== "ready"}
          >
            <span aria-hidden="true">+</span>
          </button>
        </div>
      </div>
    </section>
  );
}
