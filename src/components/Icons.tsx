export function Arrow({ back = false }: { back?: boolean }) {
  return (
    <svg
      width="23"
      height="23"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ transform: back ? "rotate(180deg)" : undefined }}
    >
      <path d="M4 12h15M13 5l7 7-7 7" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
export function BagIcon() {
  return (
    <svg
      width="19"
      height="22"
      viewBox="0 0 22 24"
      fill="none"
      aria-hidden="true"
    >
      <path d="M3 7h16l1 15H2L3 7Z" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M7 8V5a4 4 0 0 1 8 0v3"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}
export function RotateIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 10a9 9 0 1 1 2 8M3 4v6h6"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}
