import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useId,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { Link } from "react-router";
import gsap from "gsap";
import type { Product } from "../config/products";
import {
  getArcLayout,
  arcDistance,
  arcPose,
  type ArcLayout,
} from "../lib/arc-carousel-layout";
import { rouletteGestureStep, wrapRouletteIndex } from "../lib/roulette-layout";
import {
  advanceCarouselSpring,
  carouselSpringAtRest,
  carouselSpringFrequency,
  retargetCarouselSpring,
  type CarouselSpring,
} from "../lib/carousel-spring";
import { FrozenGarment } from "./FrozenGarment";
import { FrozenSurface } from "./FrozenSurface";
import "../arc-carousel.css";
import { useSeoInitialRender } from "../seo/render-environment";
import { productPicture } from "../seo/images";
import { createCarouselScaleSetter } from "../lib/carousel-scale";

/** Pointer hardware may emit several events per frame; only the latest matters. */
function usePointerFrame<T>(apply: (value: T) => void) {
  const action = useRef(apply);
  action.current = apply;
  const pending = useRef<T | null>(null);
  const frame = useRef(0);
  const cancel = () => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    pending.current = null;
  };
  useEffect(() => cancel, []);
  return {
    cancel,
    queue(value: T) {
      pending.current = value;
      if (!frame.current)
        frame.current = requestAnimationFrame(() => {
          frame.current = 0;
          const value = pending.current;
          pending.current = null;
          if (value) action.current(value);
        });
    },
  };
}

type QuickMotion = Record<
  "rotationX" | "rotationY" | "x" | "y" | "scaleX" | "scaleY",
  ReturnType<typeof gsap.quickTo>
>;

function Garment({
  product,
  moving,
  reduced,
  detailFilter,
}: {
  product: Product;
  moving: boolean;
  reduced: boolean;
  detailFilter: string;
}) {
  const target = useRef<HTMLSpanElement>(null);
  const motion = useRef<QuickMotion | null>(null);
  const [failure, setFailure] = useState(0);
  const side =
    failure === 1
      ? product.heroView === "front"
        ? "back"
        : "front"
      : (product.heroView ?? "back");
  const picture = productPicture(product, side);
  const neutral = {
    rotationX: 0,
    rotationY: 0,
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
  };
  const point = usePointerFrame<{ x: number; y: number }>((point) => {
    if (!target.current || !motion.current || moving || reduced) return;
    const frame = target.current.parentElement!.getBoundingClientRect();
    const x = Math.max(
      -1,
      Math.min(1, ((point.x - frame.left) / frame.width) * 2 - 1),
    );
    const y = Math.max(
      -1,
      Math.min(1, ((point.y - frame.top) / frame.height) * 2 - 1),
    );
    const values = {
      rotationY: x * 1.8,
      rotationX: -y * 1.8,
      x: x * 3,
      y: y * 3,
      scaleX: 1.01,
      scaleY: 1.01,
    };
    for (const key of Object.keys(values) as (keyof QuickMotion)[]) {
      motion.current[key].tween.duration(0.6);
      motion.current[key](values[key]);
    }
  });
  const leave = () => {
    point.cancel();
    if (!target.current) return;
    if (reduced) {
      // Reset each follower's own start as well as the DOM when motion is reduced.
      // Re-enabling motion must not resume from a pre-reduction hover value.
      if (motion.current)
        for (const key of Object.keys(neutral) as (keyof QuickMotion)[]) {
          motion.current[key](neutral[key], neutral[key]);
          motion.current[key].tween.pause();
        }
      gsap.set(target.current, { ...neutral });
    } else if (motion.current)
      for (const key of Object.keys(neutral) as (keyof QuickMotion)[]) {
        motion.current[key].tween.duration(1.1);
        motion.current[key](neutral[key]);
      }
  };
  useLayoutEffect(() => {
    const node = target.current;
    if (!node) return;
    gsap.set(node, { ...neutral, transformPerspective: 900 });
    motion.current = Object.fromEntries(
      Object.keys(neutral).map((key) => [
        key,
        gsap.quickTo(node, key, { duration: 0.6, ease: "power2.out" }),
      ]),
    ) as QuickMotion;
    return () => {
      Object.values(motion.current ?? {}).forEach((setter) =>
        setter.tween.kill(),
      );
      motion.current = null;
    };
  }, []);
  useEffect(() => {
    const node = target.current;
    if (!node) return;
    if (reduced) leave();
    else if (moving) leave();
  }, [moving, reduced]);
  useEffect(() => {
    const node = target.current;
    return () => {
      if (node) gsap.killTweensOf(node);
    };
  }, []);
  return (
    <span
      className="ac-hover"
      ref={target}
      onPointerMove={(event) => {
        if (
          moving ||
          reduced ||
          event.pointerType !== "mouse" ||
          event.currentTarget.closest(":focus-visible")
        )
          return;
        point.queue({ x: event.clientX, y: event.clientY });
      }}
      onPointerLeave={leave}
    >
      {failure > 1 ? (
        <span className="ac-image-error">
          {product.name}
          <small>Imagem indisponível</small>
        </span>
      ) : (
        <img
          src={picture.src}
          srcSet={picture.srcSet}
          sizes="(max-width: 767px) 74vw, (max-width: 1099px) 38vw, 460px"
          alt={`Camiseta ${product.name}, ${side === "back" ? "costas" : "frente"}, imagem original`}
          width={picture.width}
          height={picture.height}
          draggable={false}
          decoding="async"
          fetchPriority="high"
          style={{
            filter: `url("#${detailFilter}") drop-shadow(0 14px 11px #11344928)`,
          }}
          onError={() => setFailure((n) => n + 1)}
        />
      )}
    </span>
  );
}

type Props = {
  products: Product[];
  activeIndex: number;
  onSelect(index: number): void;
  onOpen(event: MouseEvent<HTMLAnchorElement>, index: number): void;
  reduced: boolean;
  enabled: boolean;
  hoverEnabled: boolean;
  prelaunch?: boolean;
};

type Gesture = {
  id: number;
  x: number;
  y: number;
  lastX: number;
  lastTime: number;
  velocity: number;
  horizontal: boolean;
  rejected: boolean;
  origin: number;
  target: number;
  dragX: number;
};

type SlotSetters = {
  node: HTMLElement;
  details: HTMLElement;
  x(value: number): void;
  y(value: number): void;
  scale(value: number): void;
  opacity(value: number): void;
  rotation(value: number): void;
  infoOpacity(value: number): void;
  accessible?: boolean;
};

const numberSetter = (
  node: HTMLElement,
  property: "x" | "y" | "rotation" | "opacity",
  unit?: string,
) => gsap.quickSetter(node, property, unit) as (value: number) => void;

type GlassMotion = Record<"x" | "y" | "light", ReturnType<typeof gsap.quickTo>>;

export function ArcCarousel({
  products,
  activeIndex,
  onSelect,
  onOpen,
  reduced,
  enabled,
  hoverEnabled,
  prelaunch,
}: Props) {
  const seoInitialRender = useSeoInitialRender();
  const initialWidth = seoInitialRender ? 1440 : innerWidth;
  const detailFilter = `garment-detail-${useId().replaceAll(":", "")}`;
  const viewport = useRef<HTMLDivElement>(null);
  const slots = useRef<(HTMLElement | null)[]>([]);
  const anchors = useRef<(HTMLAnchorElement | null)[]>([]);
  const setters = useRef<SlotSetters[]>([]);
  const spring = useRef<CarouselSpring>({
    position: activeIndex,
    velocity: 0,
    target: activeIndex,
  });
  const ticking = useRef(false);
  const tickAction = useRef<(seconds: number) => void>(() => {});
  const frame = useRef((_time: number, milliseconds: number) =>
    tickAction.current(milliseconds / 1000),
  );
  const movingRef = useRef(false);
  const callbacks = useRef({ onSelect, reduced, enabled });
  callbacks.current = { onSelect, reduced, enabled };
  const glassMotions = useRef(new Map<HTMLElement, GlassMotion>());
  const layoutRef = useRef(getArcLayout(320, 1));
  const gesture = useRef<Gesture | null>(null);
  const suppressClick = useRef(false);
  const focusAfter = useRef(false);
  const [layout, setLayout] = useState<ArcLayout>(() =>
    getArcLayout(Math.min(initialWidth, 1600), initialWidth >= 768 ? 2 : 1),
  );
  const [moving, setMoving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const count = products.length;

  const setInMotion = (value: boolean) => {
    if (movingRef.current !== value) {
      movingRef.current = value;
      setMoving(value);
    }
  };
  const stopTicker = () => {
    if (!ticking.current) return;
    gsap.ticker.remove(frame.current);
    ticking.current = false;
  };
  const startTicker = () => {
    if (ticking.current) return;
    ticking.current = true;
    gsap.ticker.add(frame.current);
  };

  const paint = () => {
    const geometry = layoutRef.current;
    setters.current.forEach((slot, i) => {
      const distance = arcDistance(
        i,
        spring.current.position,
        count,
        geometry.visible,
      );
      const pose = arcPose(distance, geometry);
      slot.x(pose.x);
      slot.y(pose.y);
      slot.scale(pose.scale);
      slot.opacity(pose.opacity);
      slot.rotation(pose.rotation);
      slot.infoOpacity(pose.infoOpacity);
      const visibility = pose.infoOpacity > 0.001 ? "visible" : "hidden";
      if (slot.details.style.visibility !== visibility)
        slot.details.style.visibility = visibility;
      if (slot.node.style.zIndex !== String(pose.zIndex))
        slot.node.style.zIndex = String(pose.zIndex);
      const visible =
        callbacks.current.enabled &&
        distance >= -1 &&
        distance <= geometry.visible;
      if (slot.accessible !== visible) {
        slot.node.inert = !visible;
        slot.node.setAttribute("aria-hidden", String(!visible));
        slot.accessible = visible;
      }
      const detailsInert =
        !visible || movingRef.current || pose.infoOpacity < 0.999;
      if (slot.details.inert !== detailsInert)
        slot.details.inert = detailsInert;
    });
  };
  const release = () => {
    const id = gesture.current?.id;
    gesture.current = null;
    try {
      if (id !== undefined && viewport.current?.hasPointerCapture(id))
        viewport.current.releasePointerCapture(id);
    } catch {
      /* Already cancelled by browser. */
    }
    setDragging(false);
  };
  const commit = () => {
    const first = wrapRouletteIndex(spring.current.target, count);
    callbacks.current.onSelect(first);
    setInMotion(false);
    const names = Array.from(
      { length: layoutRef.current.visible },
      (_, n) => products[(first + n) % count].name,
    );
    setAnnouncement(names.join(" e "));
    if (focusAfter.current) {
      focusAfter.current = false;
      requestAnimationFrame(() =>
        anchors.current[first]?.focus({ preventScroll: true }),
      );
    }
  };
  const settle = () => {
    if (callbacks.current.reduced) {
      stopTicker();
      spring.current = advanceCarouselSpring(spring.current, 0, true);
      commit();
      paint();
      return;
    }
    setInMotion(true);
    startTicker();
  };
  tickAction.current = (seconds) => {
    if (gesture.current?.horizontal) {
      paint();
      return;
    }
    spring.current = advanceCarouselSpring(
      spring.current,
      seconds,
      callbacks.current.reduced,
    );
    if (carouselSpringAtRest(spring.current)) {
      spring.current = advanceCarouselSpring(spring.current, 0, true);
      stopTicker();
      commit();
    }
    paint();
  };
  const select = (direction: number, keyboard = false) => {
    if (!enabled || !count) return;
    release();
    focusAfter.current = keyboard;
    // Keep keyboard input on a stable ancestor while individual slides cross.
    if (keyboard) viewport.current?.focus({ preventScroll: true });
    spring.current = retargetCarouselSpring(
      spring.current,
      spring.current.target + direction,
    );
    settle();
  };
  useLayoutEffect(() => {
    setters.current = slots.current.map((node) => {
      if (!node) throw new Error("Carousel product node is missing");
      const tilt = node.querySelector<HTMLElement>(".ac-tilt")!;
      const details = node.querySelector<HTMLElement>(".ac-details")!;
      gsap.set(node, { xPercent: -50 });
      return {
        node,
        details,
        x: numberSetter(node, "x", "px"),
        y: numberSetter(node, "y", "px"),
        scale: createCarouselScaleSetter(node),
        opacity: numberSetter(node, "opacity"),
        rotation: numberSetter(tilt, "rotation", "deg"),
        infoOpacity: numberSetter(details, "opacity"),
      };
    });
    return () => {
      stopTicker();
      glassMotions.current.forEach((setters) =>
        Object.values(setters).forEach((setter) => setter.tween.kill()),
      );
      glassMotions.current.clear();
      setters.current = [];
    };
  }, [count]);
  useLayoutEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const resize = () => {
      const wasDragging = gesture.current?.horizontal;
      release();
      const geometry = getArcLayout(
        node.clientWidth,
        innerWidth >= 768 ? 2 : 1,
      );
      layoutRef.current = geometry;
      setLayout(geometry);
      paint();
      if (wasDragging) settle();
      setAnnouncement(
        Array.from(
          { length: geometry.visible },
          (_, n) =>
            products[wrapRouletteIndex(spring.current.target + n, count)].name,
        ).join(" e "),
      );
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(node);
    window.addEventListener("resize", resize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
      stopTicker();
      release();
    };
  }, [count]);
  useLayoutEffect(paint, [layout, activeIndex, enabled]);
  useEffect(() => {
    if (!enabled) {
      stopTicker();
      release();
      spring.current = advanceCarouselSpring(spring.current, 0, true);
      setInMotion(false);
      paint();
    }
  }, [enabled]);
  useEffect(() => {
    if (reduced) {
      spring.current = advanceCarouselSpring(spring.current, 0, true);
      stopTicker();
      commit();
      paint();
    }
  }, [reduced]);

  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (
      !enabled ||
      !event.isPrimary ||
      event.button !== 0 ||
      (event.target as HTMLElement).closest(".ac-details")
    )
      return;
    suppressClick.current = false;
    gesture.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      lastX: event.clientX,
      lastTime: event.timeStamp,
      velocity: 0,
      horizontal: false,
      rejected: false,
      origin: spring.current.position,
      target: spring.current.target,
      dragX: event.clientX,
    };
  };
  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.id !== event.pointerId || g.rejected) return;
    const dx = event.clientX - g.x,
      dy = event.clientY - g.y;
    if (!g.horizontal) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 12) return;
      if (Math.abs(dx) <= Math.abs(dy) * 1.15) {
        g.rejected = true;
        suppressClick.current = true;
        return;
      }
      g.horizontal = true;
      // The running spring remains untouched until this is a real horizontal drag.
      g.origin = spring.current.position;
      g.dragX = event.clientX;
      suppressClick.current = true;
      try {
        viewport.current?.setPointerCapture(g.id);
      } catch {
        release();
        settle();
        return;
      }
      setDragging(true);
      setInMotion(true);
      startTicker();
    }
    if (event.timeStamp > g.lastTime)
      g.velocity = (event.clientX - g.lastX) / (event.timeStamp - g.lastTime);
    g.lastX = event.clientX;
    g.lastTime = event.timeStamp;
    spring.current.position = Math.max(
      Math.min(g.target - 1, g.origin),
      Math.min(
        Math.max(g.target + 1, g.origin),
        g.origin - (event.clientX - g.dragX) / layoutRef.current.step,
      ),
    );
    spring.current.velocity = (-g.velocity * 1000) / layoutRef.current.step;
  };
  const pointerEnd = (
    event: PointerEvent<HTMLDivElement>,
    cancelled = false,
  ) => {
    const g = gesture.current;
    if (!g || g.id !== event.pointerId) return;
    const horizontal = g.horizontal;
    const velocity =
      cancelled || event.timeStamp - g.lastTime > 100 ? 0 : g.velocity;
    const direction =
      !cancelled && horizontal
        ? rouletteGestureStep(
            event.clientX - g.x,
            velocity,
            layoutRef.current.step,
          )
        : 0;
    spring.current = retargetCarouselSpring(
      spring.current,
      g.target + direction,
    );
    // Respect the hand's release speed without crossing the chosen snap point.
    if (horizontal) {
      spring.current.velocity = (-velocity * 1000) / layoutRef.current.step;
      const difference = spring.current.target - spring.current.position;
      if (spring.current.velocity * difference > 0)
        spring.current.velocity =
          Math.sign(difference) *
          Math.min(
            Math.abs(spring.current.velocity),
            carouselSpringFrequency * Math.abs(difference),
          );
    }
    release();
    if (horizontal) settle();
  };
  const open = (event: MouseEvent<HTMLAnchorElement>, index: number) => {
    if (suppressClick.current && event.detail !== 0) {
      event.preventDefault();
      return;
    }
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    )
      return;
    stopTicker();
    onSelect(wrapRouletteIndex(spring.current.target, count));
    onOpen(event, index);
  };
  const glassPoint = usePointerFrame<{
    node: HTMLElement;
    x: number;
    y: number;
  }>((point) => {
    if (reduced || movingRef.current) return;
    const bounds = point.node.getBoundingClientRect();
    let motion = glassMotions.current.get(point.node);
    if (!motion) {
      gsap.set(point.node, {
        "--glass-x": "50%",
        "--glass-y": "50%",
        "--glass-light": 0,
      });
      motion = {
        x: gsap.quickTo(point.node, "--glass-x", {
          duration: 0.7,
          ease: "power2.out",
        }),
        y: gsap.quickTo(point.node, "--glass-y", {
          duration: 0.7,
          ease: "power2.out",
        }),
        light: gsap.quickTo(point.node, "--glass-light", {
          duration: 0.7,
          ease: "power2.out",
        }),
      };
      glassMotions.current.set(point.node, motion);
    }
    motion.x(((point.x - bounds.left) / bounds.width) * 100);
    motion.y(((point.y - bounds.top) / bounds.height) * 100);
    motion.light.tween.duration(0.7);
    motion.light(0.16);
  });
  const centerIndices = Array.from(
    { length: layout.visible },
    (_, n) => (activeIndex + n) % count,
  );
  return (
    <div
      className="arc-carousel"
      data-visible-count={layout.visible}
      data-first-product={products[activeIndex]?.id}
      data-moving={moving}
      role="region"
      aria-roledescription="carrossel"
      aria-label="Camisetas do drop Desejos"
    >
      <svg className="ac-filter-defs" aria-hidden="true" width="0" height="0">
        <defs>
          <filter
            id={detailFilter}
            colorInterpolationFilters="sRGB"
            x="-5%"
            y="-5%"
            width="110%"
            height="110%"
          >
            {/* Mild edge recovery at display size; the source artwork stays intact. */}
            <feConvolveMatrix
              order="3"
              kernelMatrix="0 -0.08 0 -0.08 1.32 -0.08 0 -0.08 0"
              divisor="1"
              preserveAlpha="true"
            />
            <feComponentTransfer>
              <feFuncR type="linear" slope="1.035" intercept="-0.0175" />
              <feFuncG type="linear" slope="1.035" intercept="-0.0175" />
              <feFuncB type="linear" slope="1.035" intercept="-0.0175" />
            </feComponentTransfer>
          </filter>
        </defs>
      </svg>
      <div
        className={`ac-viewport ${dragging ? "ac-dragging" : ""}`}
        ref={viewport}
        tabIndex={-1}
        style={
          {
            height: layout.height,
            "--ac-width": `${layout.pieceWidth}px`,
            "--ac-image-height": `${layout.imageHeight}px`,
          } as React.CSSProperties
        }
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={(e) => pointerEnd(e)}
        onPointerCancel={(e) => pointerEnd(e, true)}
        onLostPointerCapture={(e) => {
          if (gesture.current?.id === e.pointerId) pointerEnd(e, true);
        }}
        onDragStart={(e) => e.preventDefault()}
        onClickCapture={(e) => {
          if (suppressClick.current && e.detail !== 0) {
            e.preventDefault();
            e.stopPropagation();
            suppressClick.current = false;
          }
        }}
        onKeyDown={(event) => {
          if (!enabled || event.altKey || event.metaKey || event.ctrlKey)
            return;
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            select(event.key === "ArrowRight" ? 1 : -1, true);
          }
        }}
      >
        {products.map((product, i) => {
          const central = centerIndices.includes(i);
          const relative = wrapRouletteIndex(i - activeIndex, count);
          const previous = relative === count - 1,
            next = relative === layout.visible;
          const accessible = enabled && (central || previous || next);
          const image = (
            <span className="ac-tilt">
              {product.releaseStatus === "coming-soon" &&
              product.source &&
              !prelaunch ? (
                <FrozenGarment
                  product={product}
                  active={central && !moving}
                  effects={!moving && (central || previous || next)}
                  interactive={central && !moving && hoverEnabled}
                />
              ) : (
                <Garment
                  product={product}
                  moving={moving || !hoverEnabled || !central}
                  reduced={reduced}
                  detailFilter={detailFilter}
                />
              )}
            </span>
          );
          return (
            <article
              className="ac-slot"
              key={product.id}
              data-product={product.id}
              data-central={central}
              data-release={product.releaseStatus}
              ref={(node) => {
                slots.current[i] = node;
              }}
              aria-hidden={!accessible}
              inert={!accessible}
            >
              <Link
                ref={(node) => {
                  anchors.current[i] = node;
                }}
                className={central ? "ac-image-link" : "ac-preview"}
                to={`/produto/${product.id}`}
                draggable={false}
                role={central ? undefined : "button"}
                tabIndex={accessible ? 0 : -1}
                aria-disabled={!accessible || undefined}
                aria-label={
                  central
                    ? `Explorar ${product.name}`
                    : previous
                      ? `Peça anterior: ${product.name}`
                      : `Próxima peça: ${product.name}`
                }
                aria-describedby={
                  central ? `ac-details-${product.id}` : undefined
                }
                onClick={(event) => {
                  if (
                    event.metaKey ||
                    event.ctrlKey ||
                    event.shiftKey ||
                    event.altKey ||
                    event.button !== 0
                  )
                    return;
                  if (!accessible) {
                    event.preventDefault();
                    return;
                  }
                  if (central) open(event, i);
                  else {
                    event.preventDefault();
                    select(previous ? -1 : 1);
                  }
                }}
                onKeyDown={(event) => {
                  if (!central && event.key === " ") {
                    event.preventDefault();
                    if (accessible) select(previous ? -1 : 1, true);
                  }
                }}
              >
                {image}
              </Link>
              <div
                className="ac-details"
                data-coming={product.releaseStatus === "coming-soon"}
                id={`ac-details-${product.id}`}
                aria-hidden={!central}
                inert={!central}
                onPointerMove={(event) => {
                  if (reduced || event.pointerType !== "mouse") return;
                  glassPoint.queue({
                    node: event.currentTarget,
                    x: event.clientX,
                    y: event.clientY,
                  });
                }}
                onPointerLeave={(event) => {
                  glassPoint.cancel();
                  const light = glassMotions.current.get(
                    event.currentTarget,
                  )?.light;
                  if (light) {
                    light.tween.duration(1.25);
                    light(0);
                  }
                }}
              >
                {prelaunch ? (
                  <FrozenSurface kind="inline" />
                ) : product.releaseStatus === "coming-soon" ? (
                  <>
                    <strong>{product.name}</strong>
                    <span className="ac-coming">Em 2027</span>
                  </>
                ) : (
                  <>
                    <span className="ac-facts">
                      {product.color} · {product.fit}
                    </span>
                    <strong>{product.name}</strong>
                    <Link
                      className="ac-explore"
                      to={`/produto/${product.id}`}
                      onClick={(e) => open(e, i)}
                    >
                      Explorar peça <span aria-hidden="true">↗</span>
                    </Link>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <nav className="ac-controls" aria-label="Navegar pelas camisetas">
        <button
          onClick={() => select(-1)}
          disabled={!enabled}
          aria-label="Camiseta anterior"
        >
          ←
        </button>
        <span aria-hidden="true">
          {activeIndex + 1}
          {layout.visible === 2
            ? ` — ${((activeIndex + 1) % count) + 1}`
            : ""}{" "}
          / {count}
        </span>
        <button
          onClick={() => select(1)}
          disabled={!enabled}
          aria-label="Próxima camiseta"
        >
          →
        </button>
      </nav>
      <span
        className="ac-sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement || centerIndices.map((i) => products[i].name).join(" e ")}
      </span>
    </div>
  );
}
