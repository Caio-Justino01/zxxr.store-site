"use client";

import { LazyMotion, useReducedMotion } from "framer-motion";
import * as m from "framer-motion/m";
import { cn } from "@/lib/utils";

interface TilesProps {
  className?: string;
  rows?: number;
  cols?: number;
  tileClassName?: string;
  tileSize?: "sm" | "md" | "lg";
}

const tileSizes = {
  sm: "w-8 h-8",
  md: "w-9 h-9 md:w-12 md:h-12",
  lg: "w-12 h-12 md:w-16 md:h-16",
};

const loadFeatures = () =>
  import("./tiles-features").then((module) => module.default);

export function Tiles({
  className,
  rows = 100,
  cols = 10,
  tileClassName,
  tileSize = "md",
}: TilesProps) {
  const reducedMotion = useReducedMotion();
  const rowsArray = Array.from({ length: Math.max(0, Math.floor(rows)) });
  const colsArray = Array.from({ length: Math.max(0, Math.floor(cols)) });

  return (
    <LazyMotion features={loadFeatures} strict>
      <div
        aria-hidden="true"
        className={cn(
          "tiles relative z-0 flex h-full w-full justify-center",
          className,
        )}
      >
        {rowsArray.map((_, i) => (
          <div
            key={`row-${i}`}
            className={cn(
              tileSizes[tileSize],
              "tiles-column relative shrink-0",
              tileClassName,
            )}
          >
            {colsArray.map((_, j) => (
              <m.div
                initial={false}
                animate={{ backgroundColor: "rgba(255, 255, 255, 0)" }}
                whileHover={
                  reducedMotion
                    ? undefined
                    : {
                        backgroundColor: "var(--tile, rgba(16, 16, 16, 0.03))",
                        transition: { duration: 0.12 },
                      }
                }
                transition={{ duration: reducedMotion ? 0 : 1.2 }}
                key={`col-${j}`}
                className={cn(
                  tileSizes[tileSize],
                  "tiles-cell relative border-r border-t border-neutral-200 dark:border-neutral-900",
                  tileClassName,
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </LazyMotion>
  );
}
