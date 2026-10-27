import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link, useLocation } from "react-router";
import { productById } from "../config/products";
import { StoreContact } from "../components/StoreInformation";
import { useSupport } from "./context";
import {
  supportMascot,
  supportRoute,
  type GuideEntry,
  type NewGuideEntry,
} from "./guide";
const LazySupportPanel = lazy(() => import("./SupportPanel"));
class SupportBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
function SupportUnavailable({ onClose }: { onClose: () => void }) {
  return (
    <aside
      id="zxxr-support-panel"
      className="support-loading support-load-error"
      aria-label="Ajuda indisponível"
    >
      <button type="button" aria-label="Fechar ajuda" onClick={onClose}>
        ×
      </button>
      <p>
        A ajuda não carregou. Você pode consultar os assuntos na Central de
        ajuda ou falar com a loja.
      </p>
      <Link to="/ajuda" onClick={onClose}>
        Ver Central de ajuda ↗
      </Link>
      <StoreContact />
    </aside>
  );
}
export function SupportWidget({ cartCount }: { cartCount: number }) {
  const control = useSupport()!;
  const location = useLocation();
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (control.open) setLoaded(true);
  }, [control.open]);
  const [entries, setEntries] = useState<GuideEntry[]>([]);
  const count = useRef(0);
  const trigger = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(true);
  const currentRoute = useRef("");
  currentRoute.current = location.pathname + location.hash;
  const mode = supportRoute(location.pathname);
  const product = productById(
    location.pathname.startsWith("/produto/")
      ? location.pathname.split("/")[2]
      : "",
  );
  useLayoutEffect(() => {
    restoreFocus.current = false;
    control.setOpen(false);
    setEntries([]);
  }, [location.pathname, location.hash]);
  useEffect(() => {
    const clear = () => {
      restoreFocus.current = false;
      control.setOpen(false);
      setEntries([]);
    };
    window.addEventListener("zxxr:logout", clear);
    return () => window.removeEventListener("zxxr:logout", clear);
  }, []);
  function append(entry: NewGuideEntry) {
    // Called only with reviewed topic IDs, never a stored free-text question.
    setEntries((previous) => [
      ...previous.slice(-19),
      { ...entry, id: ++count.current } as GuideEntry,
    ]);
  }
  function close(restore = true) {
    restoreFocus.current = restore;
    control.setOpen(false);
  }
  if (mode === "hidden") return null;
  return (
    <>
      {mode === "floating" && (
        <button
          ref={trigger}
          type="button"
          className="support-launcher"
          data-support-trigger
          aria-label={control.open ? "Fechar ajuda ZXXR" : "Abrir ajuda ZXXR"}
          aria-expanded={control.open}
          aria-haspopup="dialog"
          aria-controls={control.open ? "zxxr-support-panel" : undefined}
          onClick={() => {
            restoreFocus.current = true;
            control.setOpen(!control.open);
          }}
        >
          <img src={supportMascot} width="36" height="31" alt="" />
          <span>Ajuda</span>
        </button>
      )}
      {(control.open || loaded) && (
        <SupportBoundary
          fallback={
            control.open ? <SupportUnavailable onClose={() => close()} /> : null
          }
        >
          {" "}
          <Suspense
            fallback={
              control.open ? (
                <div
                  id="zxxr-support-panel"
                  className="support-loading"
                  role="status"
                >
                  Carregando ajuda…
                </div>
              ) : null
            }
          >
            <LazySupportPanel
              open={control.open}
              entries={entries}
              append={append}
              reset={() => setEntries([])}
              product={product}
              cartCount={cartCount}
              onClose={close}
              trigger={trigger}
              restoreFocus={restoreFocus}
              currentRoute={currentRoute}
            />
          </Suspense>
        </SupportBoundary>
      )}
    </>
  );
}
