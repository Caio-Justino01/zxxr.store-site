import { useLayoutEffect, useRef, useState } from "react";

import { launchConfig } from "./config.ts";

import { mosaicLayout } from "./mosaic-layout.ts";



export function Mosaic() {

  const root = useRef<HTMLDivElement>(null);

  const [layout, setLayout] = useState(() =>

    mosaicLayout(

      launchConfig.photos,

      window.innerWidth,

      window.innerHeight,

    ),

  );

  const [failed, setFailed] = useState<Set<string>>(() => new Set());

  useLayoutEffect(() => {

    const element = root.current!;

    const resize = () => {

      const { width, height } = element.getBoundingClientRect();

      setLayout(mosaicLayout(launchConfig.photos, width, height));

    };

    const observer = new ResizeObserver(resize);

    observer.observe(element);

    resize();

    return () => observer.disconnect();

  }, []);

  return (

    <div className="intro-collage" aria-hidden="true">


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

              {failed.has(photo.id) ? (

                <div className="photo-fallback">Fotografia indisponível</div>

              ) : (

                <img

                  src={photo.src}

                  srcSet={photo.srcSet}

                  width={photo.width}

                  height={photo.height}

                  sizes="(max-width: 699px) 50vw, 45vw"

                  alt={photo.alt}

                  onError={() =>

                    setFailed((previous) => new Set(previous).add(photo.id))

                  }

                />

              )}

            </div>

          );

        })}

      </div>

    </div>

  );

}

