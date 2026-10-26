import { useEffect, useRef, useState } from "react";
import { Tiles } from "@/components/ui/tiles";

/** Size the decorative grid to this section rather than mount offscreen cells. */
export function DropTiles() {
  const host = useRef<HTMLDivElement>(null);
  const [grid, setGrid] = useState({ rows: 0, cols: 0 });

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const desktop = window.matchMedia("(min-width: 768px)");
    const measure = () => {
      const size = desktop.matches ? 48 : 36;
      const rows = Math.ceil(element.clientWidth / size) + 2;
      const cols = Math.ceil(element.clientHeight / size) + 1;
      setGrid((previous) =>
        previous.rows === rows && previous.cols === cols
          ? previous
          : { rows, cols },
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    desktop.addEventListener("change", measure);
    measure();
    return () => {
      observer.disconnect();
      desktop.removeEventListener("change", measure);
    };
  }, []);

  return (
    <div ref={host} className="ps-overview-tiles" aria-hidden="true">
      <Tiles rows={grid.rows} cols={grid.cols} tileSize="md" />
    </div>
  );
}
