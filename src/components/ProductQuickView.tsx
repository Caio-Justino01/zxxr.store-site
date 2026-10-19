import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router";
import { sizes, type Product, type Size } from "../config/products";
import { formatPrice } from "../lib/pricing";
import { GarmentViewer } from "./GarmentViewer";
import "../product-quick-view.css";

export type QuickViewSelection = {
  product: Product;
  side: "front" | "back";
  focusOrder: boolean;
};

type ProductQuickViewProps = {
  selection: QuickViewSelection | null;
  onClose: () => void;
  onAdd: (product: Product, size: Size) => void;
};

export function ProductQuickView({
  selection,
  onClose,
  onAdd,
}: ProductQuickViewProps) {
  if (!selection) return null;
  return (
    <QuickViewDialog
      key={selection.product.id}
      selection={selection}
      onClose={onClose}
      onAdd={onAdd}
    />
  );
}

function QuickViewDialog({
  selection,
  onClose,
  onAdd,
}: ProductQuickViewProps & { selection: QuickViewSelection }) {
  const { product, side, focusOrder } = selection;
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const firstSize = useRef<HTMLButtonElement>(null);
  const closeCallback = useRef(onClose);
  closeCallback.current = onClose;
  const silentClose = useRef(false);
  const backdropStart = useRef(false);
  const addedSize = useRef<Size | null>(null);
  const [size, setSize] = useState<Size | null>(null);
  const [error, setError] = useState(false);
  const [added, setAdded] = useState(false);
  const titleId = useId();
  const errorId = useId();

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const previousPadding = document.body.style.paddingRight;
    const scrollbar = Math.max(
      0,
      window.innerWidth - document.documentElement.clientWidth,
    );
    silentClose.current = false;
    if (!node.open) node.showModal();
    if (scrollbar > 0) {
      const padding = parseFloat(getComputedStyle(document.body).paddingRight);
      document.body.style.paddingRight = `${(Number.isFinite(padding) ? padding : 0) + scrollbar}px`;
    }
    document.body.style.overflow = "hidden";
    (focusOrder ? firstSize.current : closeButton.current)?.focus({
      preventScroll: true,
    });
    return () => {
      // Cleanup may run between StrictMode mounts. Its close event must never
      // clear the parent's current selection when the dialog opens again.
      silentClose.current = true;
      if (node.open) node.close();
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPadding;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected)
        previousFocus.focus({ preventScroll: true });
    };
  }, [focusOrder]);

  function chooseSize(next: Size) {
    if (next !== size) {
      addedSize.current = null;
      setAdded(false);
    }
    setSize(next);
    setError(false);
  }

  function add() {
    if (!size) {
      setError(true);
      firstSize.current?.focus({ preventScroll: true });
      return;
    }
    if (addedSize.current === size) return;
    addedSize.current = size;
    onAdd(product, size);
    setAdded(true);
  }

  function outside(node: HTMLDialogElement, x: number, y: number) {
    const bounds = node.getBoundingClientRect();
    return (
      x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom
    );
  }

  return (
    <dialog
      ref={dialog}
      className="pqv-dialog"
      data-intent={focusOrder ? "order" : "explore"}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        closeCallback.current();
      }}
      onClose={(event) => {
        if (
          !silentClose.current &&
          !event.currentTarget.open &&
          event.currentTarget.isConnected
        )
          closeCallback.current();
      }}
      onPointerDown={(event) => {
        backdropStart.current =
          event.target === event.currentTarget &&
          outside(event.currentTarget, event.clientX, event.clientY);
      }}
      onPointerCancel={() => {
        backdropStart.current = false;
      }}
      onClick={(event) => {
        const beganOutside = backdropStart.current;
        backdropStart.current = false;
        if (
          beganOutside &&
          event.target === event.currentTarget &&
          outside(event.currentTarget, event.clientX, event.clientY)
        )
          closeCallback.current();
      }}
    >
      <div className="pqv-header">
        <span>Edição Razz · Peça {product.number}</span>
        <button
          ref={closeButton}
          type="button"
          className="pqv-close"
          aria-label="Fechar detalhes da peça"
          onClick={() => closeCallback.current()}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
      <div className="pqv-grid">
        <div className="pqv-visual">
          <GarmentViewer product={product} initialView={side} />
        </div>
        <div className="pqv-details">
          <p className="pqv-color">Oversized · {product.color}</p>
          <h2 id={titleId}>{product.name}</h2>
          <p className="pqv-price">{formatPrice(product.price)}</p>
          <p className="pqv-description">{product.description}</p>
          <p className="pqv-limited">Peças limitadas, feitas sob encomenda.</p>
          <fieldset
            className="pqv-sizes"
            aria-describedby={error ? errorId : undefined}
          >
            <legend>Escolha seu tamanho</legend>
            <div>
              {sizes.map((option, index) => (
                <button
                  key={option}
                  ref={index === 0 ? firstSize : undefined}
                  type="button"
                  aria-pressed={size === option}
                  onClick={() => chooseSize(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </fieldset>
          {error && (
            <p className="pqv-error" id={errorId} role="alert">
              Escolha um tamanho para adicionar à sacola.
            </p>
          )}
          <button
            className="pqv-add"
            type="button"
            disabled={added}
            onClick={add}
          >
            {added ? "Adicionado à sacola" : "Adicionar à sacola"}
            <span aria-hidden="true">{added ? "✓" : "+"}</span>
          </button>
          <p className="pqv-feedback" role="status" aria-live="polite">
            {added ? `${product.name}, tamanho ${size}, na sua sacola.` : ""}
          </p>
          <div className="pqv-links">
            {added && (
              <Link to="/sacola" onClick={() => closeCallback.current()}>
                Ver sacola <span aria-hidden="true">↗</span>
              </Link>
            )}
            <Link
              to={`/produto/${product.id}`}
              onClick={() => closeCallback.current()}
            >
              Página da peça <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      </div>
    </dialog>
  );
}
