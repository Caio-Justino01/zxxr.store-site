import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useNavigationType,
  useParams,
} from "react-router";
import { products, productById, type Size } from "./config/products";
import {
  cartReducer,
  readCart,
  itemKey,
  CART_KEY,
  type CartItem,
  type CartAction,
} from "./lib/cart";
import { Arrow, BagIcon } from "./components/Icons";
import { CloudCollection } from "./components/CloudCollection";
import { GarmentViewer } from "./components/GarmentViewer";
import { ProductPhoto } from "./components/ProductPhoto";
import { ProductSpecifications } from "./components/ProductSpecifications";
import { ProductSizeSelector } from "./components/ProductSizeSelector";
import "./product-page.css";
import { MusicSection } from "./components/MusicSection";
import { DropGuide } from "./components/DropGuide";
import { DropEditorial } from "./components/DropEditorial";
import { GradientBackdrop } from "./components/GradientBackdrop";
import { cartSubtotal, formatPrice } from "./lib/pricing";
const BagContext = createContext<{
  items: CartItem[];
  dispatch: React.Dispatch<CartAction>;
}>(null!);

function RouteEffects() {
  const { pathname, hash, key } = useLocation();
  const navigationType = useNavigationType();
  const positions = useRef(new Map<string, { left: number; top: number }>());

  useLayoutEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  useLayoutEffect(() => {
    const saved = positions.current.get(key) ?? { left: 0, top: 0 };
    let scrollFrame = 0;
    let restoreFrame = 0;
    let layoutFrame = 0;
    let pendingPosition: { left: number; top: number } | null = null;
    const saveScroll = () => {
      // Capture now: cleanup must not read the next route's scroll position.
      pendingPosition = { left: window.scrollX, top: window.scrollY };
      if (scrollFrame) return;
      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = 0;
        if (pendingPosition) positions.current.set(key, pendingPosition);
        pendingPosition = null;
      });
    };
    const restoreScroll = () => {
      if (hash) {
        let id = hash.slice(1);
        try {
          id = decodeURIComponent(id);
        } catch {
          // A malformed encoded hash can still match a literal element id.
        }
        document
          .getElementById(id)
          ?.scrollIntoView({ behavior: "instant", block: "start" });
      } else {
        window.scrollTo({
          ...(navigationType === "POP" ? saved : { left: 0, top: 0 }),
          behavior: "instant",
        });
      }
      positions.current.set(key, { left: window.scrollX, top: window.scrollY });
      if (navigationType !== "POP" && !hash) {
        document
          .querySelector<HTMLElement>("main h1")
          ?.focus({ preventScroll: true });
      }
    };

    window.addEventListener("scroll", saveScroll, { passive: true });
    if (navigationType !== "POP" && !hash) restoreScroll();
    else {
      // Let the destination's layout and hero measurements settle first.
      layoutFrame = requestAnimationFrame(() => {
        restoreFrame = requestAnimationFrame(restoreScroll);
      });
    }
    return () => {
      window.removeEventListener("scroll", saveScroll);
      cancelAnimationFrame(scrollFrame);
      cancelAnimationFrame(layoutFrame);
      cancelAnimationFrame(restoreFrame);
      if (pendingPosition) positions.current.set(key, pendingPosition);
    };
  }, [key, pathname, hash, navigationType]);

  useEffect(() => {
    document.title = pathname.startsWith("/produto/")
      ? `${productById(pathname.split("/")[2])?.name ?? "Peça"} · ZXXR Store`
      : pathname === "/sacola"
        ? "Sua sacola · ZXXR Store"
        : "Desejos · New Drop ZXXR · Razz";
  }, [pathname]);
  return null;
}
function Header() {
  const { items } = useContext(BagContext);
  const location = useLocation();
  const scrollSection = (id: string) => {
    if (location.pathname === "/")
      requestAnimationFrame(() =>
        document
          .getElementById(id)
          ?.scrollIntoView({ behavior: "instant", block: "start" }),
      );
  };
  const count = items.reduce((n, i) => n + i.quantity, 0);
  return (
    <header
      className={`site-header ${location.pathname === "/" ? "collection-header" : ""}`}
    >
      <Link to="/" className="brand" aria-label="ZXXR Store, início">
        <img
          src="/brand/store-black.svg"
          alt="ZXXR Store"
          width="112"
          height="55"
        />
      </Link>
      <nav aria-label="Menu principal">
        <NavLink to="/" end>
          As peças
        </NavLink>
        <Link to="/#o-drop" onClick={() => scrollSection("o-drop")}>
          O drop
        </Link>
        <Link to="/#som" onClick={() => scrollSection("som")}>
          Som
        </Link>
      </nav>
      <NavLink to="/sacola" className="bag-link">
        <BagIcon />
        <span>Sacola</span>
        <span className="bag-count">{String(count).padStart(2, "0")}</span>
      </NavLink>
    </header>
  );
}
function Footer() {
  return (
    <footer className="site-footer">
      <Link to="/" aria-label="Voltar ao início">
        <img
          className="footer-mascot"
          src="/brand/mascot-black.svg"
          alt="Bonequinho ZXXR"
          width="72"
          height="62"
        />
      </Link>
      <p>
        Da música para a rua.
        <br />
        Uma criação de Razz.
      </p>
      <div>
        <span>zxxr.store</span>
        <small>Primeiro drop · Edição Razz</small>
      </div>
      <a href="#top" aria-label="Voltar ao topo">
        ↑
      </a>
    </footer>
  );
}

function Collection() {
  const { dispatch } = useContext(BagContext);
  return (
    <main id="top">
      <div className="collection-world">
        <div className="collection-sky">
          <GradientBackdrop />
        </div>
        <CloudCollection />
      </div>
      <DropEditorial
        onAdd={(product, size) =>
          dispatch({ type: "add", productId: product.id, size })
        }
      />
      <DropGuide />
      <MusicSection />
      <section className="endnote">
        <p>EDIÇÃO RAZZ. SOB ENCOMENDA.</p>
        <img
          className="endnote-mascot"
          src="/brand/mascot-black.svg"
          alt="Bonequinho ZXXR com carinha"
          width="150"
          height="126"
        />
        <a className="text-link" href="#top">
          Voltar à coleção <span>↑</span>
        </a>
      </section>
    </main>
  );
}

function ProductPage() {
  const { slug } = useParams(),
    product = productById(slug),
    { dispatch } = useContext(BagContext),
    navigate = useNavigate();
  const [size, setSize] = useState<Size | null>("M"),
    [error, setError] = useState(false),
    [added, setAdded] = useState(false);
  const sizeGroup = useRef<HTMLFieldSetElement>(null);
  useEffect(() => {
    setSize("M");
    setAdded(false);
    setError(false);
  }, [slug]);
  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 3500);
    return () => clearTimeout(t);
  }, [added]);
  if (!product) return <NotFound />;
  const add = () => {
    if (!size) {
      setError(true);
      sizeGroup.current?.querySelector("button")?.focus();
      return;
    }
    dispatch({ type: "add", productId: product.id, size });
    setAdded(true);
  };
  return (
    <main id="top" className="product-main">
      <Link to="/" className="back-link">
        <Arrow back />
        Voltar à coleção
      </Link>
      <div className="product-grid">
        <section
          className="product-visual"
          aria-label="Visualização da camiseta"
        >
          <GarmentViewer key={product.id} product={product} />
        </section>
        <section className="product-info">
          <p className="drop-label">Edição Razz / Peça {product.number}</p>
          <h1 tabIndex={-1}>{product.name}</h1>
          <p className="product-description">{product.description}</p>
          <ProductSpecifications product={product} />
          <div className="price-line">
            <span>{formatPrice(product.price)}</span>
            <small>Limitada · sob encomenda</small>
          </div>
          <fieldset
            className="size-select"
            ref={sizeGroup}
            aria-describedby={error ? "size-error" : "size-note"}
          >
            <legend className="ps-sr-only">Tamanho da peça</legend>
            <ProductSizeSelector value={size} onChange={(s) => {
              setSize(s);
              setError(false);
              setAdded(false);
            }} />
            {error ? (
              <p id="size-error" className="size-error" role="alert">
                Escolha um tamanho para adicionar à sacola.
              </p>
            ) : (
              <p id="size-note">
                Consulte a tabela para comparar com uma camiseta sua.
              </p>
            )}
          </fieldset>
          <button
            className={`add-button ${added ? "added" : ""}`}
            onClick={add}
          >
            <span>{added ? "Adicionada à sacola" : "Adicionar à sacola"}</span>
            {added ? <span>✓</span> : <BagIcon />}
          </button>
          <div className="add-status" aria-live="polite">
            {added && (
              <Link to="/sacola">
                {product.name}, tamanho {size}. Ver sacola →
              </Link>
            )}
          </div>
          <details>
            <summary>
              Como cuidar <span>+</span>
            </summary>
            <p>
              Lave a peça do avesso e evite passar o ferro diretamente sobre a estampa.
              Siga as instruções da etiqueta para conservar a malha e as cores.
            </p>
          </details>
        </section>
      </div>
      <section className="other-pieces">
        <div>
          <p className="drop-label">Na mesma frequência</p>
          <h2>Continue no drop.</h2>
        </div>
        <div className="other-grid">
          {products
            .filter((p) => p.id !== product.id)
            .map((p) => (
              <Link to={"/produto/" + p.id} key={p.id}>
                <div>
                  <ProductPhoto product={p} />
                </div>
                <span>
                  <strong>{p.name}</strong>
                  <Arrow />
                </span>
                <small>
                  {p.color} / {formatPrice(p.price)}
                </small>
              </Link>
            ))}
        </div>
        <button className="text-link" onClick={() => navigate("/")}>
          Voltar à coleção <Arrow />
        </button>
      </section>
    </main>
  );
}

function Bag() {
  const { items, dispatch } = useContext(BagContext),
    count = items.reduce((n, i) => n + i.quantity, 0);
  return (
    <main id="top" className="bag-page">
      <Link to="/" className="back-link">
        <Arrow back />
        Continuar explorando
      </Link>
      <div className="bag-heading">
        <h1 tabIndex={-1}>
          Sua sacola<span>({String(count).padStart(2, "0")})</span>
        </h1>
        <p>O próximo som é seu.</p>
      </div>
      {items.length ? (
        <div className="bag-layout">
          <div className="bag-items">
            {items.map((item) => {
              const p = productById(item.productId)!;
              return (
                <article className="bag-item" key={itemKey(item)}>
                  <Link to={"/produto/" + p.id}>
                    <ProductPhoto product={p} eager />
                  </Link>
                  <div>
                    <Link to={"/produto/" + p.id}>
                      <h2>{p.name}</h2>
                    </Link>
                    <p>
                      {p.color} / Tamanho {item.size}
                    </p>
                    <strong>
                      {formatPrice(p.price)} <small>cada</small>
                    </strong>
                    <div className="quantity-row">
                      <div className="quantity-control liquid-glass">
                        <button
                          aria-label={`Diminuir quantidade de ${p.name}, ${item.size}`}
                          disabled={item.quantity === 1}
                          onClick={() =>
                            dispatch({
                              type: "quantity",
                              ...item,
                              quantity: item.quantity - 1,
                            })
                          }
                        >
                          −
                        </button>
                        <span aria-live="polite">{item.quantity}</span>
                        <button
                          aria-label={`Aumentar quantidade de ${p.name}, ${item.size}`}
                          disabled={item.quantity === 10}
                          onClick={() =>
                            dispatch({
                              type: "quantity",
                              ...item,
                              quantity: item.quantity + 1,
                            })
                          }
                        >
                          +
                        </button>
                      </div>
                      <button
                        className="remove-button"
                        onClick={() => dispatch({ type: "remove", ...item })}
                        aria-label={`Remover ${p.name}, tamanho ${item.size}`}
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          <aside className="bag-summary liquid-glass">
            <span className="red-dot" />
            <h2>
              Sua seleção.
            </h2>
            <p>
              Confira as estampas, os tamanhos e as quantidades das suas peças.
            </p>
            <dl>
              <div>
                <dt>Peças na sacola</dt>
                <dd>{count}</dd>
              </div>
              <div>
                <dt>Subtotal</dt>
                <dd>{formatPrice(cartSubtotal(items))}</dd>
              </div>
            </dl>
            <Link to="/" className="add-button">
              Continuar comprando <Arrow />
            </Link>
          </aside>
        </div>
      ) : (
        <div className="empty-bag">
          <img src="/brand/logo-black.svg" alt="" width="230" height="100" />
          <h2>Espaço para a sua próxima ideia.</h2>
          <p>Escolha uma das cinco peças da edição Razz.</p>
          <Link to="/" className="add-button">
            Conhecer as peças <Arrow />
          </Link>
        </div>
      )}
    </main>
  );
}
function NotFound() {
  return (
    <main className="not-found" id="top">
      <p className="drop-label">404 / Fora da coleção</p>
      <h1 tabIndex={-1}>Essa peça não está aqui.</h1>
      <Link to="/" className="text-link">
        Voltar ao drop <Arrow />
      </Link>
    </main>
  );
}

export default function App() {
  const [items, dispatch] = useReducer(cartReducer, undefined, () => {
    try {
      return readCart(localStorage.getItem(CART_KEY));
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch {
      /* Bag remains usable in memory when browser storage is unavailable. */
    }
  }, [items]);
  return (
    <BagContext.Provider value={{ items, dispatch }}>
      <>
        <a className="skip-link" href="#main-content">
          Pular para o conteúdo
        </a>
        <Header />
        <div id="main-content">
          <Routes>
            <Route path="/" element={<Collection />} />
            <Route path="/produto/:slug" element={<ProductPage />} />
            <Route path="/sacola" element={<Bag />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
        <Footer />
        <RouteEffects />
      </>
    </BagContext.Provider>
  );
}
