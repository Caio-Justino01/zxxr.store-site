import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { Link } from "react-router";
import gsap from "gsap";
import type { Product } from "../config/products";
import {
  rouletteDistance,
  rouletteGestureStep,
  roulettePose,
  rouletteRebasedProgress,
  wrapRouletteIndex,
} from "../lib/roulette-layout";
import "../touch-roulette.css";
import { FrozenGarment } from "./FrozenGarment";

type Props = {
  products: Product[];
  activeIndex: number;
  onSelect(index: number): void;
  onOpen(event: MouseEvent<HTMLAnchorElement>, index: number): void;
  reduced: boolean;
  enabled: boolean;
};

function ShirtImage({ product }: { product: Product }) {
  const [failure, setFailure] = useState(0);
  const original = product.heroView ?? "back";
  const side =
    failure === 1 ? (original === "back" ? "front" : "back") : original;
  return failure > 1 ? (
    <span className="tr-image-error">
      {product.name}
      <small>Imagem indisponível. Explore a peça.</small>
    </span>
  ) : (
    <img
      src={product[side]}
      width="923"
      height="700"
      alt={`Camiseta ${product.name}, ${side === "back" ? "costas" : "frente"}`}
      draggable={false}
      loading="eager"
      decoding="async"
      onError={() => setFailure((n) => n + 1)}
    />
  );
}

export function TouchRoulette({
  products,
  activeIndex,
  onSelect,
  onOpen,
  reduced,
  enabled,
}: Props) {
  const viewport = useRef<HTMLDivElement>(null);
  const slots = useRef<(HTMLDivElement | null)[]>([]);
  const base = useRef(activeIndex);
  const target = useRef(activeIndex);
  const progress = useRef({ value: 0 });
  const step = useRef(1);
  const tween = useRef<gsap.core.Tween | null>(null);
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    lastX: number;
    lastTime: number;
    velocity: number;
    horizontal: boolean;
    rejected: boolean;
    startOffset: number;
  } | null>(null);
  const suppressClick = useRef(false);
  const focusAfterSelect = useRef(false);
  const [dragging, setDragging] = useState(false);
  const count = products.length;

  const paint = () => {
    slots.current.forEach((slot, index) => {
      if (!slot) return;
      let distance =
        rouletteDistance(index, base.current, count) - progress.current.value;
      if (distance < -count / 2) distance += count;
      if (distance > count / 2) distance -= count;
      const pose = roulettePose(distance, step.current);
      gsap.set(slot, {
        ...pose,
        xPercent: -50,
        zIndex: 5 - Math.round(Math.abs(distance)),
      });
    });
  };

  const settle = (destination: number) => {
    tween.current?.kill();
    const finish = () => {
      base.current = target.current;
      progress.current.value = 0;
      paint();
      tween.current = null;
    };
    if (reduced) {
      progress.current.value = destination;
      finish();
      return;
    }
    tween.current = gsap.to(progress.current, {
      value: destination,
      duration: 0.5,
      ease: "power3.out",
      onUpdate: paint,
      onComplete: finish,
    });
  };

  const releaseCapture = () => {
    const pointerId = drag.current?.id;
    // Clear before release, which can synchronously dispatch lostpointercapture.
    drag.current = null;
    try {
      if (
        pointerId !== undefined &&
        viewport.current?.hasPointerCapture(pointerId)
      )
        viewport.current.releasePointerCapture(pointerId);
    } catch {
      /* The browser may already have cancelled the pointer. */
    }
    setDragging(false);
  };

  useLayoutEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const resize = () => {
      releaseCapture();
      tween.current?.kill();
      tween.current = null;
      base.current = target.current;
      progress.current.value = 0;
      const introHeight = element.closest(".desejos-hero")?.querySelector(".dh-scroll-intro")?.getBoundingClientRect().height ?? 0;
      const headerHeight = document.querySelector(".site-header")?.getBoundingClientRect().height ?? 88;
      const heightLimitedWidth = Math.max(140, (window.innerHeight - introHeight - headerHeight - 140) / 0.75);
      const pieceWidth = Math.min(
        window.innerWidth * 0.74,
        480,
        element.clientWidth * 0.88,
        heightLimitedWidth,
      );
      step.current = pieceWidth * 0.78;
      element.style.setProperty("--tr-piece-width", `${pieceWidth}px`);
      element.style.setProperty(
        "--tr-stage-height",
        `${pieceWidth * 0.75 + 66}px`,
      );
      paint();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    window.addEventListener("resize", resize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
      tween.current?.kill();
      releaseCapture();
    };
  }, [count]);

  useLayoutEffect(() => {
    target.current = activeIndex;
    const distance = rouletteDistance(activeIndex, base.current, count);
    if (distance !== 0 || progress.current.value !== 0) settle(distance);
    if (focusAfterSelect.current) {
      slots.current[activeIndex]
        ?.querySelector<HTMLElement>("a,button")
        ?.focus({ preventScroll: true });
      focusAfterSelect.current = false;
    }
  }, [activeIndex, reduced, count]);

  useEffect(() => {
    if (!enabled) {
      releaseCapture();
      tween.current?.kill();
      base.current = target.current;
      progress.current.value = 0;
      paint();
    }
  }, [enabled]);

  const select = (direction: number) => {
    if (!enabled || !count) return;
    onSelect(wrapRouletteIndex(activeIndex + direction, count));
  };

  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (
      !enabled ||
      !event.isPrimary ||
      (event.pointerType === "mouse" && event.button !== 0)
    )
      return;
    // Keep every shirt at its exact current pose when another gesture interrupts a snap.
    tween.current?.kill();
    tween.current = null;
    progress.current.value = rouletteRebasedProgress(
      progress.current.value,
      base.current,
      activeIndex,
      count,
    );
    base.current = activeIndex;
    target.current = activeIndex;
    paint();
    suppressClick.current = false;
    drag.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      lastX: event.clientX,
      lastTime: event.timeStamp,
      velocity: 0,
      horizontal: false,
      rejected: false,
      startOffset: progress.current.value,
    };
  };

  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = drag.current;
    if (!gesture || gesture.id !== event.pointerId || gesture.rejected) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (!gesture.horizontal) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 12) return;
      if (Math.abs(dx) <= Math.abs(dy) * 1.15) {
        gesture.rejected = true;
        settle(0);
        return;
      }
      gesture.horizontal = true;
      suppressClick.current = true;
      try {
        viewport.current?.setPointerCapture(event.pointerId);
      } catch {
        releaseCapture();
        settle(0);
        return;
      }
      setDragging(true);
    }
    const elapsed = event.timeStamp - gesture.lastTime;
    if (elapsed > 0)
      gesture.velocity = (event.clientX - gesture.lastX) / elapsed;
    gesture.lastX = event.clientX;
    gesture.lastTime = event.timeStamp;
    progress.current.value = Math.max(
      Math.min(-1, gesture.startOffset),
      Math.min(
        Math.max(1, gesture.startOffset),
        gesture.startOffset - dx / step.current,
      ),
    );
    paint();
  };

  const pointerEnd = (
    event: PointerEvent<HTMLDivElement>,
    cancelled: boolean,
  ) => {
    const gesture = drag.current;
    if (!gesture || gesture.id !== event.pointerId) return;
    const horizontal = gesture.horizontal;
    const velocity =
      event.timeStamp - gesture.lastTime > 100 ? 0 : gesture.velocity;
    const direction =
      !cancelled && horizontal
        ? rouletteGestureStep(event.clientX - gesture.x, velocity, step.current)
        : 0;
    releaseCapture();
    if (direction) select(direction);
    else if (horizontal || progress.current.value !== 0) settle(0);
  };

  return (
    <div
      className="tr-roulette"
      data-active-index={activeIndex}
      data-enabled={enabled}
      role="region"
      aria-roledescription="carrossel"
      aria-label="Camisetas do drop Desejos"
    >
      <div
        ref={viewport}
        className={`tr-viewport${dragging ? " tr-dragging" : ""}`}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={(event) => pointerEnd(event, false)}
        onPointerCancel={(event) => pointerEnd(event, true)}
        onDragStart={(event) => event.preventDefault()}
        onLostPointerCapture={(event) => {
          if (drag.current?.id === event.pointerId) pointerEnd(event, true);
        }}
        onClickCapture={(event) => {
          if (suppressClick.current) {
            event.preventDefault();
            event.stopPropagation();
            suppressClick.current = false;
          }
        }}
        onKeyDown={(event) => {
          if (!enabled || event.altKey || event.ctrlKey || event.metaKey)
            return;
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            focusAfterSelect.current = true;
            select(event.key === "ArrowRight" ? 1 : -1);
          }
        }}
      >
        {products.map((product, index) => {
          const distance = rouletteDistance(index, activeIndex, count);
          const visible = enabled && Math.abs(distance) <= 1;
          return (
            <div
              key={product.id}
              ref={(node) => {
                slots.current[index] = node;
              }}
              className="tr-position"
              data-product={product.id}
              aria-hidden={!visible}
              inert={!visible}
            >
              {index === activeIndex ? (
                <Link
                  className="tr-shirt"
                  draggable={false}
                  to={`/produto/${product.id}`}
                  tabIndex={visible ? 0 : -1}
                  aria-label={`Explorar ${product.name}`}
                  aria-current="true"
                  onClick={(event) => onOpen(event, index)}
                >
                  {product.releaseStatus === "coming-soon" && product.source ? <FrozenGarment product={product} active={index === activeIndex} /> : <span className="tr-shirt-frame"><ShirtImage product={product} /></span>}
                </Link>
              ) : (
                <button
                  type="button"
                  className="tr-shirt"
                  draggable={false}
                  tabIndex={visible ? 0 : -1}
                  aria-label={`Centralizar ${product.name}`}
                  disabled={!visible}
                  onClick={() => onSelect(index)}
                >
                  {product.releaseStatus === "coming-soon" && product.source ? <FrozenGarment product={product} active={index === activeIndex} /> : <span className="tr-shirt-frame"><ShirtImage product={product} /></span>}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="tr-controls">
        <button
          type="button"
          onClick={() => select(-1)}
          disabled={!enabled}
          aria-label="Camiseta anterior"
        >
          ←
        </button>
        <span aria-live="polite" aria-atomic="true">
          {activeIndex + 1} / {count}
        </span>
        <button
          type="button"
          onClick={() => select(1)}
          disabled={!enabled}
          aria-label="Próxima camiseta"
        >
          →
        </button>
      </div>
    </div>
  );
}
