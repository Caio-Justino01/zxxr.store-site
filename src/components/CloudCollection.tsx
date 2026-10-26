import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { Link, useNavigate } from "react-router";
import gsap from "gsap";
import { productById, type Product } from "../config/products";
import { getHeroLayout } from "../lib/hero-layout";
import { useSuspendedHover } from "../lib/use-suspended-hover";
import { useHeroScroll } from "../lib/use-hero-scroll";
import { formatPrice } from "../lib/pricing";
import { Arrow } from "./Icons";
import { DropTitle } from "./DropTitle";
import { TouchRoulette } from "./TouchRoulette";

const INTRO_KEY = "zxxr-desejos-intro-v1";
const heroProducts = [
  "boca",
  "spiritual-gangsta",
  "flores",
  "zxxr-rosa",
  "me-preservando",
]
  .map(productById)
  .filter((product): product is Product => product !== undefined);
let introSeenInMemory = false;
let rememberedRouletteIndex = 0;
function hasSeenIntro() {
  try {
    return introSeenInMemory || sessionStorage.getItem(INTRO_KEY) === "seen";
  } catch {
    return introSeenInMemory;
  }
}
function rememberIntro() {
  introSeenInMemory = true;
  try {
    sessionStorage.setItem(INTRO_KEY, "seen");
  } catch {
    /* The collection also works with browser storage disabled. */
  }
}

function CollectionImage({
  product,
  decorative = false,
}: {
  product: Product;
  decorative?: boolean;
}) {
  const [failure, setFailure] = useState(0);
  const originalSide = product.heroView ?? "back";
  const side =
    failure === 1 ? (originalSide === "back" ? "front" : "back") : originalSide;
  return failure > 1 ? (
    <span className="dh-image-error">
      {product.name}
      <small>Imagem indisponível. Explore a peça.</small>
    </span>
  ) : (
    <img
      src={product[side]}
      alt={
        decorative
          ? ""
          : `Camiseta oversized ${product.name}, ${side === "back" ? "costas" : "frente"}, imagem original`
      }
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
  const stage = useRef<HTMLDivElement>(null);
  const links = useRef<(HTMLAnchorElement | null)[]>([]);
  const intro = useRef<gsap.core.Timeline | null>(null);
  const introProgress = useRef(0);
  const introDone = useRef(
    hasSeenIntro() || Boolean(location.hash && location.hash !== "#top"),
  );
  const departing = useRef(false);
  const departure = useRef<gsap.core.Tween | null>(null);
  const introHandoff = useRef<gsap.core.Tween | null>(null);
  const [width, setWidth] = useState(() =>
    Math.min(1680, window.innerWidth * 0.94),
  );
  const [ready, setReady] = useState(introDone.current);
  const [reduced, setReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [touchMode, setTouchMode] = useState(
    () =>
      matchMedia("(max-width: 1099px), (hover: none), (pointer: coarse)")
        .matches,
  );
  const [active, setActive] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [rouletteIndex, setRouletteIndex] = useState(rememberedRouletteIndex);
  const [scrollInactive, setScrollInactive] = useState(false);
  const layout = useMemo(() => getHeroLayout(width), [width]);
  const swing = useSuspendedHover(
    links,
    !touchMode && !reduced && !scrollInactive,
    width,
  );
  const onScrollActivity = useCallback((inactive: boolean) => {
    setScrollInactive(inactive);
  }, []);
  useHeroScroll(root, {
    ready,
    reduced,
    touchMode,
    layout,
    onActivity: onScrollActivity,
  });

  const completeIntro = useCallback(() => {
    introDone.current = true;
    introProgress.current = 1;
    rememberIntro();
    setReady(true);
    if (root.current) root.current.dataset.introPhase = "ready";
  }, []);
  const finishIntro = useCallback(
    (smooth = false) => {
      if (introDone.current) return;
      if (smooth && intro.current) {
        if (!introHandoff.current?.isActive())
          introHandoff.current = intro.current.tweenTo(
            intro.current.duration(),
            {
              duration: 0.2,
              ease: "power1.out",
            },
          );
        return;
      }
      introHandoff.current?.kill();
      intro.current?.progress(1);
      completeIntro();
    },
    [completeIntro],
  );

  useLayoutEffect(() => {
    if (!stage.current) return;
    const measure = () =>
      setWidth(stage.current!.getBoundingClientRect().width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage.current);
    return () => observer.disconnect();
  }, [touchMode]);
  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const touch = matchMedia(
      "(max-width: 1099px), (hover: none), (pointer: coarse)",
    );
    const updateMotion = () => setReduced(motion.matches);
    const updateTouch = () => {
      setTouchMode(touch.matches);
      setHovered(null);
    };
    motion.addEventListener("change", updateMotion);
    touch.addEventListener("change", updateTouch);
    return () => {
      motion.removeEventListener("change", updateMotion);
      touch.removeEventListener("change", updateTouch);
    };
  }, []);

  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    let onscreen = true;
    const context = gsap.context(() => {
      const slots = gsap.utils.toArray<HTMLElement>(".dh-position", element);
      const reveals = element.querySelectorAll<SVGPathElement>(
        "[data-desejos-reveal]",
      );
      const underline = element.querySelectorAll<SVGPathElement>(
        "[data-desejos-underline]",
      );
      const meta = element.querySelectorAll(
        ".dh-drop-meta, .dh-edition, .dh-info, .dh-bottom",
      );
      const carousel = element.querySelector(".dh-carousel-reveal");
      slots.forEach((slot, i) =>
        gsap.set(slot, {
          xPercent: -50,
          yPercent: -50,
          ...layout.positions[i],
          autoAlpha: 1,
        }),
      );
      if (introDone.current || reduced) {
        gsap.set(reveals, { strokeDashoffset: 0 });
        gsap.set(underline, { strokeDashoffset: 0 });
        gsap.set(meta, { autoAlpha: 1, y: 0 });
        if (carousel) gsap.set(carousel, { autoAlpha: 1, y: 0 });
        completeIntro();
        return;
      }
      gsap.set(reveals, { strokeDashoffset: 1 });
      gsap.set(underline, { strokeDashoffset: 1 });
      gsap.set(meta, { autoAlpha: 0, y: 5 });
      if (carousel) gsap.set(carousel, { autoAlpha: 0, y: 15 });
      slots.forEach((slot, i) =>
        gsap.set(slot, {
          ...layout.stackPositions[i],
          autoAlpha: 0,
          y: layout.stackPositions[i].y + 15,
        }),
      );
      element.dataset.introPhase = "background";
      const timeline = gsap.timeline({
        onComplete: completeIntro,
        onUpdate: () => {
          const time = timeline.time();
          element.dataset.introPhase =
            time < 0.25
              ? "background"
              : time < 1.4
                ? "lettering"
                : time < 1.95
                  ? "stack"
                  : "spread";
          element.dataset.introTime = time.toFixed(2);
        },
      });
      intro.current = timeline;
      timeline
        .to(
          reveals,
          {
            strokeDashoffset: 0,
            duration: 0.48,
            stagger: { amount: 0.49 },
            ease: "power1.inOut",
          },
          0.25,
        )
        .to(
          underline,
          { strokeDashoffset: 0, duration: 0.24, ease: "power2.out" },
          1.06,
        )
        .to(
          ".dh-drop-meta, .dh-edition",
          { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.04 },
          1.05,
        );
      if (carousel)
        timeline.to(
          carousel,
          { autoAlpha: 1, y: 0, duration: 0.7, ease: "power3.out" },
          1.4,
        );
      slots.forEach((slot, i) => {
        timeline.to(
          slot,
          {
            autoAlpha: 1,
            y: layout.stackPositions[i].y,
            duration: 0.36,
            ease: "power2.out",
          },
          1.4 + i * 0.045,
        );
        timeline.to(
          slot,
          { ...layout.positions[i], duration: 1.45, ease: "power3.inOut" },
          1.95,
        );
      });
      timeline.to(
        ".dh-info, .dh-bottom",
        { autoAlpha: 1, y: 0, duration: 0.4 },
        2.95,
      );
      if (introProgress.current) timeline.progress(introProgress.current);
    }, element);
    const sync = () => {
      if (introDone.current) return;
      if (introHandoff.current?.isActive()) return;
      if (onscreen && document.visibilityState !== "hidden")
        intro.current?.resume();
      else intro.current?.pause();
    };
    const observer = new IntersectionObserver(([entry]) => {
      onscreen = entry.isIntersecting;
      sync();
    });
    observer.observe(element);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      if (!introDone.current && intro.current && intro.current.progress() < 1)
        introProgress.current = intro.current.progress();
      observer.disconnect();
      introHandoff.current?.kill();
      introHandoff.current = null;
      document.removeEventListener("visibilitychange", sync);
      context.revert();
      intro.current = null;
    };
  }, [width, reduced, touchMode, completeIntro]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (["Tab", "Enter", " ", "Escape"].includes(event.key)) finishIntro();
    };
    let lastScroll = window.scrollY;
    const onScroll = () => {
      if (Math.abs(window.scrollY - lastScroll) > 2) finishIntro(true);
      lastScroll = window.scrollY;
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
      departure.current?.kill();
      introHandoff.current?.kill();
    };
  }, [finishIntro]);
  function selectRoulette(index: number) {
    rememberedRouletteIndex = index;
    setRouletteIndex(index);
    setActive(index);
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
    finishIntro();
    event.preventDefault();
    if (departing.current) return;
    swing.stop();
    departing.current = true;
    if (root.current) root.current.dataset.transition = "departing";
    const target = touchMode
      ? root.current?.querySelector<HTMLElement>(
          `.tr-position[data-product="${heroProducts[index].id}"] .tr-shirt`,
        )
      : links.current[index]?.querySelector(".dh-garment");
    const complete = () => navigate(`/produto/${heroProducts[index].id}`);
    if (reduced || !target) complete();
    else
      departure.current = gsap.to(target, {
        y: -22,
        scale: 1.04,
        opacity: 0,
        duration: 0.25,
        ease: "power2.in",
        overwrite: true,
        onComplete: complete,
      });
  }
  const displayedIndex = touchMode ? rouletteIndex : active;
  const displayed =
    displayedIndex === null ? null : heroProducts[displayedIndex];
  return (
    <section
      ref={root}
      className="cloud-collection desejos-hero"
      aria-labelledby="collection-title"
      data-presentation="original-2d-shader"
      data-transition="idle"
      data-intro-phase={ready ? "ready" : "background"}
      data-touch-mode={touchMode}
      data-selected-product={touchMode ? heroProducts[rouletteIndex].id : ""}
      onPointerDownCapture={(event) => {
        // A finger may be starting a vertical scroll, which uses the smooth handoff.
        if (event.pointerType === "mouse") finishIntro();
      }}
    >
      {!ready && (
        <button className="dh-skip" onClick={() => finishIntro()}>
          Pular abertura <span aria-hidden="true">↗</span>
        </button>
      )}
      <div className="dh-scroll-intro">
        <div className="dh-intro">
          <DropTitle />
          <div className="dh-drop-meta">
            <p className="dh-drop-name">Desejos</p>
            <span className="dh-authorship">
              <span>Created by</span>
              <img
                src="/brand/razz-seal-black.svg"
                alt="Razz"
                width="110"
                height="56"
              />
            </span>
          </div>
          <p className="dh-edition">Peças limitadas, feitas sob encomenda.</p>
        </div>
      </div>
      <div
        className={`dh-stage ${touchMode ? "dh-stage-touch" : ""}`}
        ref={stage}
        id="as-pecas"
        style={{ height: touchMode ? undefined : layout.stageHeight }}
        aria-label="Cinco camisetas do drop Desejos, edição Razz"
      >
        {touchMode ? (
          <div className="dh-scroll-carousel">
            <div className="dh-carousel-reveal">
              <TouchRoulette
                products={heroProducts}
                activeIndex={rouletteIndex}
                onSelect={selectRoulette}
                onOpen={open}
                reduced={reduced}
                enabled={ready}
              />
            </div>
          </div>
        ) : (
          heroProducts.map((product, index) => (
            <div
              className={`dh-position ${hovered === index ? "dh-position-active" : ""}`}
              key={product.id}
              style={{
                width: layout.pieceWidth,
                top: (layout.stageHeight - layout.arcDepth) / 2,
                transform: `translate(-50%, -50%) translate(${layout.positions[index].x}px, ${layout.positions[index].y}px) rotate(${layout.positions[index].rotation}deg)`,
              }}
            >
              <div className="dh-scroll-piece">
                <Link
                  ref={(el) => {
                    links.current[index] = el;
                  }}
                  to={`/produto/${product.id}`}
                  draggable={false}
                  className="dh-piece"
                  data-product={product.id}
                  aria-label={`Explorar ${product.name}`}
                  aria-describedby={
                    displayed?.id === product.id ? "dh-product-info" : undefined
                  }
                  onClick={(event) => open(event, index)}
                  onFocus={(event) => {
                    setActive(index);
                    if (!touchMode) setHovered(index);
                    if (event.currentTarget.matches(":focus-visible"))
                      swing.leave(index);
                  }}
                  onBlur={() => {
                    if (!departing.current) swing.leave(index);
                    setHovered(null);
                  }}
                  onPointerEnter={(event) => {
                    if (
                      event.pointerType === "mouse" &&
                      !touchMode &&
                      introDone.current &&
                      !departing.current
                    ) {
                      setActive(index);
                      setHovered(index);
                      swing.enter(index, event.clientX);
                    }
                  }}
                  onPointerMove={(event) => {
                    if (
                      event.pointerType === "mouse" &&
                      !touchMode &&
                      !introDone.current &&
                      !departing.current
                    ) {
                      finishIntro();
                      setActive(index);
                      setHovered(index);
                      swing.enter(index, event.clientX);
                    }
                  }}
                  onPointerLeave={() => {
                    if (!departing.current) swing.leave(index);
                    setHovered(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.ctrlKey || event.metaKey || event.altKey) return;
                    const next =
                      event.key === "ArrowRight"
                        ? Math.min(heroProducts.length - 1, index + 1)
                        : event.key === "ArrowLeft"
                          ? Math.max(0, index - 1)
                          : event.key === "Home"
                            ? 0
                            : event.key === "End"
                              ? heroProducts.length - 1
                              : null;
                    if (next !== null) {
                      event.preventDefault();
                      finishIntro();
                      links.current[next]?.focus({ preventScroll: true });
                    }
                  }}
                >
                  <span className="dh-garment">
                    <span className="dh-swing">
                      <CollectionImage product={product} />
                    </span>
                  </span>
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="dh-scroll-info">
        <div
          className="dh-info"
          id="dh-product-info"
          aria-live="polite"
          aria-atomic="true"
        >
          {displayed ? (
            <>
              <div className="dh-product-name">
                <span>{displayed.color} · Oversized</span>
                <strong>{displayed.name}</strong>
              </div>
              <span className="dh-price">{formatPrice(displayed.price)}</span>
              <Link
                className="dh-explore"
                to={`/produto/${displayed.id}`}
                onClick={(event) => open(event, displayedIndex!)}
              >
                Explorar peça <Arrow />
              </Link>
            </>
          ) : (
            <p className="dh-explore-hint">
              {touchMode
                ? "Toque em uma camiseta para ver de perto."
                : "Passe pelas peças. Encontre o seu desejo."}
              <span aria-hidden="true">↗</span>
            </p>
          )}
        </div>
      </div>
      <div className="dh-scroll-bottom">
        <div className="dh-bottom">
          <a href="#o-drop">
            Conheça cada peça <span aria-hidden="true">↓</span>
          </a>
        </div>
      </div>
    </section>
  );
}
