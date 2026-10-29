import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { launchConfig } from "./config.ts";
import { mosaicLayout } from "./mosaic-layout.ts";
import { prepareMosaicImages } from "./mosaic-readiness.ts";
import previews from "./mosaic-previews.json" with { type: "json" };

export function Mosaic({ onReady }: { onReady: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState(() =>
    mosaicLayout(launchConfig.photos, window.innerWidth, window.innerHeight),
  );
  const [fullReady, setFullReady] = useState<Set<string>>(() => new Set());
  const [settled, setSettled] = useState(false);

  useLayoutEffect(() => {
    const element = root.current!;
    const resize = () => {
      const { width, height } = element.getBoundingClientRect();
      setLayout(mosaicLayout(launchConfig.photos, width, height));
    };
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize);
    observer?.observe(element);
    window.addEventListener("resize", resize, { passive: true });
    resize();
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const images = [
      ...root.current!.querySelectorAll<HTMLImageElement>(".mosaic-preview"),
    ];
    void prepareMosaicImages(images, { signal: controller.signal }).then(() => {
      if (controller.signal.aborted) return;
      setSettled(true);
      onReady();
    });
    return () => controller.abort();
  }, [onReady]);

  async function showFullImage(image: HTMLImageElement, id: string) {
    try {
      await image.decode?.();
    } catch {
      /* A valid loaded image can still paint when decode is unsupported or rejects. */
    }
    if (!image.isConnected || !image.naturalWidth) return;
    setFullReady((previous) => new Set(previous).add(id));
  }

  return (
    <div
      className="intro-collage"
      aria-hidden="true"
      data-images-ready={settled}
    >
      <div
        className="mosaic-stage"
        ref={root}
        data-photo-count={launchConfig.photos.length}
      >
        {launchConfig.photos.map((photo) => {
          const rect = layout.rects.find((r) => r.id === photo.id)!;
          return (
            <div
              className="collage-tile"
              key={photo.id}
              data-photo={photo.id}
              style={{
                left: rect.x,
                top: rect.y,
                width: rect.width,
                height: rect.height,
              }}
            >
              <img
                className="mosaic-preview"
                src={previews[photo.id as keyof typeof previews]}
                width={photo.width}
                height={photo.height}
                alt=""
                decoding="sync"
              />
              <img
                className="mosaic-full"
                data-ready={fullReady.has(photo.id)}
                src={photo.src}
                srcSet={photo.srcSet}
                width={photo.width}
                height={photo.height}
                sizes={`${Math.ceil(rect.width)}px`}
                alt={photo.alt}
                decoding="async"
                loading="eager"
                onLoad={(event) => {
                  void showFullImage(event.currentTarget, photo.id);
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
