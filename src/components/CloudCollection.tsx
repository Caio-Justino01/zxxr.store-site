import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { useNavigate } from "react-router";
import gsap from "gsap";
import type { Product } from "../config/products";
import { getHeroLayout } from "../lib/hero-layout";
import { useHeroScroll } from "../lib/use-hero-scroll";
import { DropTitle } from "./DropTitle";
import { ArcCarousel } from "./ArcCarousel";
import {
  isSeoInitialRender,
  useSeoInitialRender,
} from "../seo/render-environment";

const INTRO_KEY = "zxxr-desejos-intro-v1";
const heroOrder = [
  "flores",
  "me-preservando",
  "boca",
  "spiritual-gangsta",
  "zxxr-rosa",
];
let introSeenInMemory = false;
let rememberedFirstProduct = "boca";
function hasSeenIntro() {
  if (isSeoInitialRender()) return false;
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
    /* Memory fallback remains usable. */
  }
}

export function CloudCollection({
  products,
  prelaunch = false,
}: {
  products: Product[];
  prelaunch?: boolean;
  priceLabel?: (price?: number) => string;
}) {
  const heroProducts = useMemo(
    () =>
      heroOrder
        .map((id) => products.find((p) => p.id === id))
        .filter((p): p is Product => Boolean(p)),
    [products],
  );
  const navigate = useNavigate();
  const seoInitialRender = useSeoInitialRender();
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const intro = useRef<gsap.core.Timeline | null>(null);
  const introProgress = useRef(0);
  const introDone = useRef(
    (!seoInitialRender && hasSeenIntro()) ||
      (!seoInitialRender && Boolean(location.hash && location.hash !== "#top")),
  );
  const departing = useRef(false);
  const departure = useRef<gsap.core.Tween | null>(null);
  const handoff = useRef<gsap.core.Tween | null>(null);
  const [width, setWidth] = useState(() =>
    Math.min(1600, seoInitialRender ? 1440 : innerWidth),
  );
  const [ready, setReady] = useState(introDone.current);
  const [reduced, setReduced] = useState(
    () =>
      !seoInitialRender &&
      matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(
      0,
      heroProducts.findIndex((p) => p.id === rememberedFirstProduct),
    ),
  );
  const [scrollInactive, setScrollInactive] = useState(false);
  const layout = useMemo(() => getHeroLayout(width), [width]);
  const onScrollActivity = useCallback(
    (inactive: boolean) => setScrollInactive(inactive),
    [],
  );
  // The entire carousel owns one scroll wrapper on every input type and screen.
  useHeroScroll(root, {
    ready,
    reduced,
    touchMode: true,
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
        if (!handoff.current?.isActive())
          handoff.current = intro.current.tweenTo(intro.current.duration(), {
            duration: 0.2,
            ease: "power1.out",
          });
        return;
      }
      handoff.current?.kill();
      intro.current?.progress(1);
      completeIntro();
    },
    [completeIntro],
  );

  useLayoutEffect(() => {
    const node = stage.current;
    if (!node) return;
    const resize = () => setWidth(node.clientWidth);
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(motion.matches);
    motion.addEventListener("change", update);
    return () => motion.removeEventListener("change", update);
  }, []);
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    let onscreen = true;
    const context = gsap.context(() => {
      const reveals = element.querySelectorAll("[data-desejos-reveal]");
      const underline = element.querySelectorAll("[data-desejos-underline]");
      const meta = element.querySelectorAll(
        ".dh-drop-meta, .dh-edition, .dh-bottom",
      );
      const carousel = element.querySelector(".dh-carousel-reveal");
      if (introDone.current || reduced) {
        gsap.set([reveals, underline], { strokeDashoffset: 0 });
        gsap.set(meta, { autoAlpha: 1, y: 0 });
        gsap.set(carousel, { autoAlpha: 1, y: 0, scale: 1 });
        completeIntro();
        return;
      }
      gsap.set([reveals, underline], { strokeDashoffset: 1 });
      gsap.set(meta, { autoAlpha: 0, y: 5 });
      gsap.set(carousel, { autoAlpha: 0, y: 18, scale: 0.96 });
      element.dataset.introPhase = "background";
      const timeline = gsap.timeline({
        onComplete: completeIntro,
        onUpdate: () => {
          const time = timeline.time();
          element.dataset.introPhase =
            time < 0.25 ? "background" : time < 1.4 ? "lettering" : "spread";
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
        )
        .to(
          carousel,
          { autoAlpha: 1, y: 0, scale: 1, duration: 1.45, ease: "sine.inOut" },
          1.4,
        )
        .to(".dh-bottom", { autoAlpha: 1, y: 0, duration: 0.4 }, 2.95);
      if (introProgress.current) timeline.progress(introProgress.current);
    }, element);
    const sync = () => {
      if (introDone.current || handoff.current?.isActive()) return;
      if (onscreen && !document.hidden) intro.current?.resume();
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
      if (!introDone.current && intro.current)
        introProgress.current = intro.current.progress();
      observer.disconnect();
      handoff.current?.kill();
      handoff.current = null;
      document.removeEventListener("visibilitychange", sync);
      context.revert();
      intro.current = null;
    };
  }, [reduced, completeIntro]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (["Tab", "Enter", " ", "Escape"].includes(event.key)) finishIntro();
    };
    let previousScroll = scrollY;
    const scroll = () => {
      if (Math.abs(scrollY - previousScroll) > 2) finishIntro(true);
      previousScroll = scrollY;
    };
    window.addEventListener("keydown", key);
    window.addEventListener("scroll", scroll, { passive: true });
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("scroll", scroll);
      departure.current?.kill();
      handoff.current?.kill();
    };
  }, [finishIntro]);

  function select(index: number) {
    rememberedFirstProduct = heroProducts[index].id;
    setActiveIndex(index);
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
    departing.current = true;
    if (root.current) root.current.dataset.transition = "departing";
    const target = event.currentTarget
      .closest(".ac-slot")
      ?.querySelector(".ac-tilt");
    const complete = () => navigate(`/produto/${heroProducts[index].id}`);
    if (reduced || !target) complete();
    else
      departure.current = gsap.to(target, {
        y: -14,
        scale: 1.02,
        opacity: 0,
        duration: 0.25,
        ease: "sine.in",
        overwrite: true,
        onComplete: complete,
      });
  }
  return (
    <section
      ref={root}
      className="cloud-collection desejos-hero"
      aria-labelledby="collection-title"
      data-presentation="original-2d-shader"
      data-transition="idle"
      data-intro-phase={ready ? "ready" : "background"}
      data-touch-mode="true"
      data-selected-product={heroProducts[activeIndex]?.id}
      onPointerDownCapture={(event) => {
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
          <p className="dh-edition">
            {prelaunch
              ? "Primeiro drop. Revelação em breve."
              : "Peças limitadas, feitas sob encomenda."}
          </p>
        </div>
      </div>
      <div
        className="dh-stage arc-stage"
        ref={stage}
        id="as-pecas"
        aria-label="Drop Desejos, duas camisetas disponíveis e três em breve"
      >
        <div className="dh-scroll-carousel">
          <div className="dh-carousel-reveal">
            <ArcCarousel
              products={heroProducts}
              activeIndex={activeIndex}
              onSelect={select}
              onOpen={open}
              reduced={reduced}
              enabled={ready}
              hoverEnabled={ready && !scrollInactive && !departing.current}
              prelaunch={prelaunch}
            />
          </div>
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
