import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { Link, useNavigate } from "react-router";
import gsap from "gsap";
import { products, type Product } from "../config/products";
import { Arrow } from "./Icons";
import { DropTitle } from "./DropTitle";

function CollectionImage({ product }: { product: Product }) {
  const [failure, setFailure] = useState(0);
  const originalSide = product.heroView ?? "back";
  const side =
    failure === 1 ? (originalSide === "back" ? "front" : "back") : originalSide;
  return failure > 1 ? (
    <span className="cc-image-error">
      {product.name}
      <small>Imagem indisponível. Explore a peça.</small>
    </span>
  ) : (
    <img
      src={product[side]}
      alt={`Camiseta oversized ${product.name}, ${side === "back" ? "costas" : "frente"}, imagem original`}
      width="923"
      height="700"
      draggable={false}
      decoding="async"
      loading="eager"
      onError={() => setFailure((n) => n + 1)}
    />
  );
}

export function CloudCollection() {
  const navigate = useNavigate();
  const root = useRef<HTMLElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const links = useRef<(HTMLAnchorElement | null)[]>([]);
  const departing = useRef(false);
  const requestedSelection = useRef<number | null>(null);
  const drag = useRef<{
    pointer: number;
    x: number;
    y: number;
    scroll: number;
    moved: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  const transition = useRef<gsap.core.Tween | null>(null);
  const [selected, setSelected] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(
    () => () => {
      transition.current?.kill();
      root.current
        ?.querySelectorAll(".cc-garment")
        .forEach((el) => gsap.killTweensOf(el));
    },
    [],
  );
  useEffect(() => {
    if (reduced)
      root.current?.querySelectorAll(".cc-garment").forEach((el) => {
        gsap.killTweensOf(el);
        gsap.set(el, { x: 0, y: 0, rotation: 0, scale: 1 });
      });
  }, [reduced]);

  function select(index: number, focus = false) {
    const container = rail.current,
      link = links.current[index];
    requestedSelection.current = index;
    setSelected(index);
    if (container && link && window.innerWidth < 1100) {
      container.scrollTo({
        left: link.offsetLeft - (links.current[0]?.offsetLeft ?? 0),
        behavior: reduced ? "instant" : "smooth",
      });
    }
    if (focus) link?.focus({ preventScroll: true });
  }
  function reveal(index: number | null, offset = 0) {
    if (departing.current) return;
    setHovered(index);
    links.current.forEach((link, i) => {
      const garment = link?.querySelector(".cc-garment");
      if (!garment) return;
      const active = index === i;
      gsap.to(garment, {
        y: !reduced && active ? -8 : 0,
        x: !reduced && active ? offset * 4 : 0,
        rotation: !reduced && active ? offset * 1.5 : 0,
        scale: !reduced && active ? 1.04 : 1,
        duration: reduced ? 0 : 0.55,
        ease: "power2.out",
        overwrite: true,
      });
    });
  }
  function open(event: MouseEvent<HTMLAnchorElement>, index: number) {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    )
      return;
    event.preventDefault();
    if (departing.current) return;
    departing.current = true;
    const element = links.current[index]?.querySelector(".cc-garment");
    if (root.current) root.current.dataset.transition = "departing";
    const complete = () => navigate(`/produto/${products[index].id}`);
    if (reduced || !element) {
      complete();
      return;
    }
    transition.current = gsap.to(element, {
      y: -24,
      scale: 1.04,
      rotation: 0,
      duration: 0.28,
      overwrite: true,
      ease: "power2.in",
      onComplete: complete,
    });
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    requestedSelection.current = null;
    if (
      event.pointerType !== "mouse" ||
      event.button !== 0 ||
      window.innerWidth >= 1100
    )
      return;
    drag.current = {
      pointer: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      scroll: event.currentTarget.scrollLeft,
      moved: false,
    };
  }
  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (!start || start.pointer !== event.pointerId) return;
    const dx = event.clientX - start.x,
      dy = event.clientY - start.y;
    if (!start.moved && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      start.moved = true;
      event.currentTarget.classList.add("cc-dragging");
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (start.moved) {
      event.preventDefault();
      event.currentTarget.scrollLeft = start.scroll - dx;
    }
  }
  function endDrag(event: PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    drag.current = null;
    event.currentTarget.classList.remove("cc-dragging");
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (start?.moved) {
      suppressClick.current = true;
      window.setTimeout(() => {
        suppressClick.current = false;
      }, 0);
    }
  }

  return (
    <section
      ref={root}
      className="cloud-collection"
      aria-labelledby="collection-title"
      data-presentation="original-2d-shader"
      data-transition="idle"
    >
      <div className="cc-intro">
        <div className="cc-edition">
          <span>Edição Razz</span>
          <span>Peças limitadas, feitas sob encomenda.</span>
        </div>
        <DropTitle />
        <div className="cc-authorship">
          <span>Created by</span>
          <img
            src="/brand/razz-seal-black.svg"
            alt="Razz"
            width="110"
            height="56"
          />
        </div>
      </div>
      <div className="cc-stage" id="as-pecas">
        <div
          className="cc-rail"
          ref={rail}
          aria-label="Cinco camisetas da edição Razz"
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onClickCapture={(event) => {
            if (suppressClick.current) {
              event.preventDefault();
              event.stopPropagation();
              suppressClick.current = false;
            }
          }}
          onWheel={() => {
            requestedSelection.current = null;
          }}
          onScroll={() => {
            const container = rail.current;
            if (
              !container ||
              window.innerWidth >= 1100 ||
              requestedSelection.current !== null
            )
              return;
            const first = links.current[0],
              second = links.current[1];
            if (first && second)
              setSelected(
                Math.min(
                  products.length - 1,
                  Math.max(
                    0,
                    Math.round(
                      container.scrollLeft /
                        (second.offsetLeft - first.offsetLeft),
                    ),
                  ),
                ),
              );
          }}
        >
          {products.map((product, index) => (
            <Link
              key={product.id}
              ref={(el) => {
                links.current[index] = el;
              }}
              to={`/produto/${product.id}`}
              draggable={false}
              className={`cc-piece ${hovered === index ? "cc-active" : ""}`}
              data-product={product.id}
              aria-label={`Explorar ${product.name}`}
              onClick={(event) => open(event, index)}
              onFocus={() => reveal(index)}
              onBlur={() => reveal(null)}
              onPointerEnter={(event) => {
                if (event.pointerType === "mouse") reveal(index);
              }}
              onPointerMove={(event) => {
                if (event.pointerType !== "mouse" || window.innerWidth < 1100)
                  return;
                const bounds = event.currentTarget.getBoundingClientRect();
                reveal(
                  index,
                  Math.max(
                    -1,
                    Math.min(
                      1,
                      ((event.clientX - bounds.left) / bounds.width - 0.5) * 2,
                    ),
                  ),
                );
              }}
              onPointerLeave={(event) => {
                if (event.pointerType === "mouse") reveal(null);
              }}
              onKeyDown={(event) => {
                const target =
                  event.key === "ArrowRight"
                    ? Math.min(4, index + 1)
                    : event.key === "ArrowLeft"
                      ? Math.max(0, index - 1)
                      : event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? 4
                          : null;
                if (target !== null) {
                  event.preventDefault();
                  select(target, true);
                }
              }}
            >
              <span className="cc-piece-image">
                <span className="cc-garment">
                  <CollectionImage product={product} />
                </span>
              </span>
              <span className="cc-piece-caption">
                <span>
                  <small>{product.color}</small>
                  <strong>{product.name}</strong>
                </span>
                <Arrow />
              </span>
            </Link>
          ))}
        </div>
      </div>
      <div className="cc-navigation" aria-label="Selecionar camiseta">
        {products.map((p, i) => (
          <button
            key={p.id}
            aria-label={`Mostrar ${p.name}`}
            aria-pressed={selected === i}
            onClick={() => select(i)}
          >
            {p.number}
          </button>
        ))}
      </div>
      <div className="cc-bottom">
        <span className="cc-desktop-hint">
          Escolha uma peça. Veja de perto.
        </span>
        <span className="cc-touch-hint">
          Deslize para explorar as cinco peças.
        </span>
        <span>01 drop. 05 peças.</span>
      </div>
    </section>
  );
}
