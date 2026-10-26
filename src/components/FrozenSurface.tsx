import type { ReactNode } from "react";

export function FrostMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 2v20M3.34 7l17.32 10M3.34 17l17.32-10M8.5 4.5 12 8l3.5-3.5M8.5 19.5 12 16l3.5 3.5M3.8 11.3 8.6 10l-1.3-4.8M20.2 12.7 15.4 14l1.3 4.8M7.3 18.8 8.6 14l-4.8-1.3M16.7 5.2 15.4 10l4.8 1.3" />
    </svg>
  );
}

export function FrozenSurface({
  children,
  kind = "photo",
  className = "",
  label = true,
}: {
  children?: ReactNode;
  kind?: "photo" | "info" | "inline";
  className?: string;
  label?: boolean;
}) {
  return (
    <div className={`frozen-surface frozen-${kind} ${className}`} data-frozen>
      {children}
      <span className="frozen-sheen" aria-hidden="true" />
      {label && (
        <span className="frozen-label">
          <FrostMark />
          <span>Detalhes em breve.</span>
        </span>
      )}
    </div>
  );
}

export function FrozenProductInfo() {
  return (
    <div className="ps-copy preview-copy">
      <h3 className="ps-sr-only">Informações da peça. Detalhes em breve.</h3>
      <FrozenSurface kind="info">
        <div className="frozen-layout" aria-hidden="true">
          <span className="frozen-ghost frozen-ghost-title" />
          <span className="frozen-ghost frozen-ghost-line" />
          <span className="frozen-ghost frozen-ghost-line frozen-ghost-short" />
          <div className="frozen-ghost-facts">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} />
            ))}
          </div>
          <div className="frozen-ghost-sizes">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} />
            ))}
          </div>
          <span className="frozen-ghost frozen-ghost-action" />
        </div>
      </FrozenSurface>
    </div>
  );
}
