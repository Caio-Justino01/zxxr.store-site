import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type Context,
} from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { products, type Product } from "../config/products";
import type { Studio, Presentation } from "../scene/Studio";
import { ProductPhoto } from "./ProductPhoto";

type StudioContextValue = {
  status: "loading" | "ready" | "static";
  photos: boolean;
  setPhotos: (v: boolean) => void;
  mode: Presentation;
  setMode: (m: Presentation) => void;
  mobileIndex: number;
  selectMobile: (i: number) => void;
  view: (v: "front" | "back" | "detail" | "reset") => void;
  zoom: (n: number) => void;
  rotate: (n: number) => void;
  photoView: "front" | "back";
  hoveredIndex: number | null;
  focusProduct: (index: number | null) => void;
  openProduct: (id: string) => void;
};
// Keep provider and consumer bound to the same context during Vite refreshes.
const StudioContext =
  (import.meta.hot?.data.studioContext as
    | Context<StudioContextValue>
    | undefined) ?? createContext<StudioContextValue>(null!);
if (import.meta.hot) import.meta.hot.data.studioContext = StudioContext;
export const useStudio = () => useContext(StudioContext);

export function StudioProvider({ children }: { children: ReactNode }) {
  const location = useLocation(),
    navigate = useNavigate(),
    host = useRef<HTMLDivElement>(null),
    engine = useRef<Studio | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "static">(
    "loading",
  );
  const [photos, setPhotos] = useState(false),
    [hoveredIndex, setHoveredIndex] = useState<number | null>(null),
    [mode, setModeState] = useState<Presentation>("loose"),
    [mobileIndex, setMobileIndex] = useState(0),
    [photoView, setPhotoView] = useState<"front" | "back">("front");
  const state = useRef({
    path: location.pathname,
    index: mobileIndex,
    photos,
    photoView,
  });
  state.current = {
    path: location.pathname,
    index: mobileIndex,
    photos,
    photoView,
  };
  const go = useRef(navigate);
  go.current = navigate;
  useEffect(() => {
    let cancelled = false;
    let created: Studio | null = null;
    if (new URLSearchParams(window.location.search).has("fallback")) {
      setStatus("static");
      return;
    }
    import("../scene/Studio")
      .then(({ Studio }) => {
        if (cancelled || !host.current) return;
        try {
          created = new Studio(host.current, {
            onReady: () => {
              if (!cancelled) {
                setStatus("ready");
                created?.setProduct(
                  state.current.path.startsWith("/produto/")
                    ? state.current.path.split("/")[2]
                    : null,
                );
                created?.setMobileSelection(state.current.index);
                if (state.current.path.startsWith("/produto/"))
                  created?.view(state.current.photoView);
              }
            },
            onError: () => {
              if (!cancelled) setStatus("static");
            },
            onSelect: (id) => go.current("/produto/" + id),
            onHover: (index) => {
              if (!cancelled) setHoveredIndex(index);
            },
            onMobileSelection: (index) => {
              if (!cancelled) setMobileIndex(index);
            },
          });
          engine.current = created;
          const stage = document.querySelector<HTMLElement>(
            "[data-studio-stage]",
          );
          if (stage) {
            const r = stage.getBoundingClientRect();
            created.resize(r.width, r.height);
          }
        } catch {
          setStatus("static");
        }
      })
      .catch(() => setStatus("static"));
    return () => {
      cancelled = true;
      created?.dispose();
      engine.current = null;
    };
  }, []);
  useLayoutEffect(() => {
    const stage = document.querySelector<HTMLElement>("[data-studio-stage]");
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = host.current;
      if (!el) return;
      if (!stage) {
        el.hidden = true;
        engine.current?.setVisible(false);
        return;
      }
      const stageBounds = stage.getBoundingClientRect();
      const hero = stage.closest<HTMLElement>(".collection-hero");
      const heroBounds = hero?.getBoundingClientRect();
      // A single canvas includes the painted room behind the HTML headline.
      // Product scenes continue to follow their own stage bounds.
      const r = heroBounds
        ? {
            left: heroBounds.left,
            top: heroBounds.top,
            width: heroBounds.width,
            height: stageBounds.bottom - heroBounds.top,
            bottom: stageBounds.bottom,
          }
        : stageBounds;
      const visible =
        r.bottom > 0 &&
        r.top < window.innerHeight &&
        !photos &&
        status === "ready";
      el.hidden = !visible;
      el.style.left = r.left + "px";
      el.style.top = r.top + "px";
      el.style.width = r.width + "px";
      el.style.height = r.height + "px";
      engine.current?.resize(r.width, r.height);
      engine.current?.setVisible(visible);
      stage.dataset.scene = photos ? "static" : status;
    };
    const request = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    const observer = new ResizeObserver(request);
    if (stage) observer.observe(stage);
    const hero = stage?.closest(".collection-hero");
    if (hero) observer.observe(hero);
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
    };
  }, [location.pathname, photos, status]);
  useEffect(() => {
    const id = location.pathname.startsWith("/produto/")
      ? location.pathname.split("/")[2]
      : null;
    engine.current?.setProduct(id);
    setModeState(id ? "loose" : "rack");
    setPhotoView("front");
  }, [location.pathname]);
  const value: StudioContextValue = {
    status,
    photos,
    setPhotos,
    mode,
    setMode: (m) => {
      setModeState(m);
      engine.current?.setMode(m);
    },
    mobileIndex,
    selectMobile: (i) => {
      setMobileIndex(i);
      engine.current?.setMobileSelection(i);
    },
    photoView,
    hoveredIndex,
    focusProduct: (index) => {
      setHoveredIndex(index);
      engine.current?.hover(index);
    },
    openProduct: (id) => {
      if (status === "ready" && !photos && engine.current)
        engine.current.openProduct(id);
      else navigate("/produto/" + id);
    },
    view: (v) => {
      setPhotoView(v === "back" ? "back" : "front");
      engine.current?.view(v);
      if (v === "reset") setModeState("loose");
    },
    zoom: (n) => engine.current?.zoomBy(n),
    rotate: (n) => engine.current?.rotateBy(n),
  };
  return (
    <StudioContext.Provider value={value}>
      <div
        ref={host}
        className={`studio-canvas ${location.pathname === "/" ? "collection-canvas" : ""}`}
        data-webgl={status}
      />
      {children}
    </StudioContext.Provider>
  );
}

export function Stage({ product }: { product?: Product }) {
  const { status, photos, photoView, mobileIndex } = useStudio();
  const show = photos || status !== "ready";
  return (
    <div
      className={`studio-stage ${product ? "product-stage" : "collection-stage"}`}
      data-studio-stage
      data-scene={photos ? "static" : status}
      aria-label={
        product
          ? `Estúdio de ${product.name}`
          : `Arara com as ${products.length} camisetas da edição Razz, limitadas e sob encomenda`
      }
    >
      {show && (
        <div className={`image-fallback ${product ? "" : "rack-fallback"}`}>
          {product ? (
            <ProductPhoto product={product} view={photoView} eager />
          ) : (
            <>
              {products.map((p, i) => (
                <Link
                  key={p.id}
                  to={`/produto/${p.id}`}
                  className={`fallback-piece ${i === mobileIndex ? "mobile-selected" : ""}`}
                  aria-label={`Explorar ${p.name}`}
                >
                  <ProductPhoto
                    product={p}
                    view={p.heroView ?? "back"}
                    eager={i === mobileIndex}
                  />
                </Link>
              ))}
            </>
          )}
        </div>
      )}
      {status === "loading" && !photos && (
        <span className="scene-loading" role="status">
          <span />
          Preparando as peças…
        </span>
      )}
      {status === "static" && !photos && (
        <span className="scene-loading">Galeria de imagens</span>
      )}
    </div>
  );
}
