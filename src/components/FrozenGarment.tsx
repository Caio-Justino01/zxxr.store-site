import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import gsap from "gsap";
import type { Product } from "../config/products";
import { frozenMaterial, frozenGarmentView, frozenGarmentOptics } from "../config/frozen-material";
import "../frozen-garment.css";

/** One shared ice matrix around the untouched original garment cutout. */
export function FrozenGarment({
  product,
  active = false,
  effects = true,
  interactive = true,
}: {
  product: Product;
  active?: boolean;
  effects?: boolean;
  interactive?: boolean;
}) {
  const object = useRef<HTMLSpanElement>(null);
  const frame = useRef(0);
  const bounds = useRef<DOMRect | null>(null);
  const cursor = useRef({ x: 0, y: 0 });
  const followers = useRef<Record<string, gsap.QuickToFunc>>({});
  const [failed, setFailed] = useState(false);
  const [motion, setMotion] = useState(false);
  const garment = product[frozenGarmentView(product)];
  const material = frozenMaterial;
  const optics = frozenGarmentOptics(product);
  const unavailable = failed || !optics;
  const diffusionId = `ice-diffusion-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  // Relative to the image box: a 3% block-width blur on both screen axes.
  const diffusionX = 0.03 / material.contentWidth;
  const diffusionY = 0.03 / (material.contentHeight * material.height / material.width);
  const cancelFrame = () => {
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = 0;
    bounds.current = null;
  };
  const reset = () => {
    cancelFrame();
    const node = object.current;
    if (!node) return;
    Object.values(followers.current).forEach((to) => to.tween.kill());
    followers.current = {};
    const pose = { rotationX: 0, rotationY: 0, x: 0, y: 0, scale: 1 };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches)
      gsap.set(node, { ...pose, "--ice-light": 0 });
    else {
      gsap.to(node, {
        ...pose,
        duration: 1.1,
        ease: "sine.inOut",
        overwrite: "auto",
      });
      gsap.to(node, {
        "--ice-light": 0,
        duration: 1.25,
        ease: "sine.inOut",
        overwrite: "auto",
      });
    }
  };
  useEffect(() => setFailed(false), [garment]);
  useEffect(() => {
    const node = object.current;
    if (!node) return;
    gsap.set(node, {
      transformPerspective: 850,
      "--ice-x": 50,
      "--ice-y": 30,
      "--ice-light": 0,
    });
    return () => {
      cancelFrame();
      gsap.killTweensOf(node);
      followers.current = {};
    };
  }, []);
  useEffect(() => {
    const node = object.current;
    if (!node || !effects || unavailable) {
      setMotion(false);
      return;
    }
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    let large = node.getBoundingClientRect().width >= 120;
    const sync = () =>
      setMotion(visible && large && !document.hidden && !reduced.matches);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    const resize = new ResizeObserver(() => {
      bounds.current = null;
      large = node.getBoundingClientRect().width >= 120;
      sync();
    });
    observer.observe(node);
    resize.observe(node);
    reduced.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      observer.disconnect();
      resize.disconnect();
      reduced.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [effects, unavailable]);
  useEffect(() => {
    if (!motion || !interactive) reset();
  }, [motion, interactive]);
  useEffect(() => {
    const node = object.current;
    if (!node || !motion || !active || !matchMedia("(hover: none)").matches)
      return;
    const pulse = gsap
      .timeline()
      .to(node, { "--ice-light": 0.2, duration: 0.35, ease: "sine.out" })
      .to(node, { "--ice-light": 0, duration: 1.25, ease: "sine.inOut" });
    return () => {
      pulse.kill();
    };
  }, [motion, active]);
  return (
    <span
      className="ice-block"
      ref={object}
      data-active={active}
      data-effects={effects && motion}
      data-material="shared-v8-frost-v11"
      data-image-state={unavailable ? "unavailable" : "present"}
      style={{
        "--ice-garment-width": `${material.contentWidth * 100}%`,
        "--ice-garment-height": `${material.contentHeight * 100}%`,
        "--ice-mask-clear": optics ? `url("${optics.clear}")` : "none",
        "--ice-mask-print": optics ? `url("${optics.print}")` : "none",
        "--ice-mask-contact": optics ? `url("${optics.contact}")` : "none",
        "--ice-contact-texture": `url("${material.front.src}")`,
      } as CSSProperties}
      role="img"
      aria-label={`${product.name}, camiseta congelada em gelo espesso. Em breve.`}
      onPointerMove={(event) => {
        if (!motion || !interactive || event.pointerType !== "mouse") return;
        cursor.current = { x: event.clientX, y: event.clientY };
        if (frame.current) return;
        frame.current = requestAnimationFrame(() => {
          frame.current = 0;
          const node = object.current;
          if (!node) return;
          bounds.current ??= node.getBoundingClientRect();
          const rect = bounds.current;
          const x = gsap.utils.clamp(
            -1,
            1,
            ((cursor.current.x - rect.left) / rect.width) * 2 - 1,
          );
          const y = gsap.utils.clamp(
            -1,
            1,
            ((cursor.current.y - rect.top) / rect.height) * 2 - 1,
          );
          const target = {
            rotationY: x * 1.2,
            rotationX: -y * 1.2,
            x: x * 2,
            y: y * 2,
            scaleX: 1.006,
            scaleY: 1.006,
            "--ice-x": (x + 1) * 50,
            "--ice-y": (y + 1) * 50,
            "--ice-light": 0.38,
          };
          if (!Object.keys(followers.current).length) {
            gsap.killTweensOf(node);
            followers.current = Object.fromEntries(
              Object.keys(target).map((key) => [
                key,
                gsap.quickTo(node, key, { duration: 0.6, ease: "power2.out" }),
              ]),
            );
          }
          for (const [key, value] of Object.entries(target))
            followers.current[key]?.(value);
        });
      }}
      onPointerLeave={reset}
    >
      {!unavailable && optics ? (
        <>
          <img
            className="ice-layer ice-shell"
            src={material.shell.src}
            srcSet={material.shell.srcSet}
            sizes="(max-width: 767px) 74vw, (max-width: 1099px) 38vw, 520px"
            width={material.width}
            height={material.height}
            alt=""
            draggable={false}
            decoding="async"
            onError={() => setFailed(true)}
          />
          <span className="ice-garment-window" aria-hidden="true">
            <svg className="ice-optical-defs" width="0" height="0" aria-hidden="true" focusable="false">
              <defs>
                <filter id={diffusionId} x="-50%" y="-50%" width="200%" height="200%"
                  primitiveUnits="objectBoundingBox" colorInterpolationFilters="sRGB">
                  <feGaussianBlur stdDeviation={`${diffusionX} ${diffusionY}`} />
                  {/* The following print mask restores the exact silhouette alpha. */}
                  <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0 1" />
                </filter>
              </defs>
            </svg>
            <span className="ice-fabric-layers">
              <img
                className="ice-original-garment ice-clear-fabric"
                src={garment}
                alt=""
                draggable={false}
                decoding="async"
                onError={() => setFailed(true)}
              />
              <img
                className="ice-original-garment ice-print-diffusion"
                src={garment}
                style={{ filter: `url("#${diffusionId}")` }}
                alt=""
                draggable={false}
                decoding="async"
                onError={() => setFailed(true)}
              />
            </span>
            <span className="ice-contact-depth" />
            <span className="ice-contact-frost" />
            {[optics.clear, optics.print, optics.contact].map((src) => (
              <img key={src} className="ice-mask-preload" hidden src={src}
                alt="" width={optics.width} height={optics.height}
                onError={() => setFailed(true)} />
            ))}
          </span>
          <img
            className="ice-layer ice-front"
            src={material.front.src}
            srcSet={material.front.srcSet}
            sizes="(max-width: 767px) 74vw, (max-width: 1099px) 38vw, 520px"
            width={material.width}
            height={material.height}
            alt=""
            draggable={false}
            decoding="async"
            onError={() => setFailed(true)}
          />
          <img
            className="ice-layer ice-engraving-layer"
            src={material.engraving.src}
            srcSet={material.engraving.srcSet}
            sizes="(max-width: 767px) 74vw, (max-width: 1099px) 38vw, 520px"
            width={material.width}
            height={material.height}
            alt=""
            draggable={false}
            decoding="async"
            onError={() => setFailed(true)}
          />
          <span className="ice-atmosphere" aria-hidden="true">
            <span
              className="ice-reflection"
              style={{
                maskImage: `url("${material.shell.src}")`,
                WebkitMaskImage: `url("${material.shell.src}")`,
              }}
            >
              <span className="ice-edge-reflection" />
            </span>
            <span className="ice-cold-mist" />
          </span>
        </>
      ) : (
        <span className="ice-image-unavailable" aria-hidden="true">
          <span>{product.name}</span>
          <small>Em breve</small>
        </span>
      )}
    </span>
  );
}
export const comingSoonCopy = "Em breve";
