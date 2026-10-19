import "../drop-title.css";

/** Official ZXXR tag plus editable lettering drawn for this drop. */
export function DropTitle({
  id = "collection-title",
  className = "",
}: {
  id?: string;
  className?: string;
}) {
  return (
    <h1
      id={id}
      className={`dt-title ${className}`.trim()}
      aria-label="New Drop ZXXR"
      tabIndex={-1}
    >
      <img
        className="dt-lettering"
        src="/brand/drop-title/new-drop-grafite-preto-sem-linha.svg"
        alt=""
        aria-hidden="true"
        width="1380"
        height="310"
        decoding="async"
        fetchPriority="high"
      />
      <img
        className="dt-logo"
        src="/brand/drop-title/grafite-tag-preto-sem-linha.svg"
        alt=""
        aria-hidden="true"
        width="856.587"
        height="342.24"
        decoding="async"
        fetchPriority="high"
      />
      <svg
        className="dt-underline"
        viewBox="0 0 1380 32"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          fill="currentColor"
          d="M20 23 C380 8 930 12 1360 2 C945 24 404 27 43 31 Z"
        />
      </svg>
    </h1>
  );
}
