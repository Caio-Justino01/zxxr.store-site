import {
  createContext,
  useContext,
  useEffect,
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
  useParams,
} from "react-router";
import { products, productById, sizes, type Size } from "./config/products";
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
import { MusicSection } from "./components/MusicSection";
import { ProductStories } from "./components/ProductStories";
import { GradientBackdrop } from "./components/GradientBackdrop";
import {
  ProductQuickView,
  type QuickViewSelection,
} from "./components/ProductQuickView";
import { cartSubtotal, formatPrice } from "./lib/pricing";
const BagContext = createContext<{
  items: CartItem[];
  dispatch: React.Dispatch<CartAction>;
}>(null!);

function RouteEffects() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      requestAnimationFrame(() =>
        document
          .getElementById(hash.slice(1))
          ?.scrollIntoView({ behavior: "instant", block: "start" }),
      );
    } else window.scrollTo({ top: 0, behavior: "instant" });
    document.title = pathname.startsWith("/produto/")
      ? `${productById(pathname.split("/")[2])?.name ?? "Peça"} · ZXXR Store`
      : pathname === "/sacola"
        ? "Sua sacola · ZXXR Store"
        : "ZXXR Store · Primeiro drop";
    const heading = document.querySelector<HTMLElement>("main h1");
    heading?.focus({ preventScroll: true });
  }, [pathname, hash]);
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
        <small>Prévia do primeiro drop · 2026</small>
      </div>
      <a href="#top" aria-label="Voltar ao topo">
        ↑
      </a>
    </footer>
  );
}

function Collection() {
  const { dispatch } = useContext(BagContext);
  const [selection, setSelection] = useState<QuickViewSelection | null>(null);
  return (
    <main id="top">
      <div className="collection-world">
        <div className="collection-sky">
          <GradientBackdrop />
        </div>
        <CloudCollection />
        <ProductStories
          onExplore={(product, side) =>
            setSelection({ product, side, focusOrder: false })
          }
          onOrder={(product, side) =>
            setSelection({ product, side, focusOrder: true })
          }
        />
      </div>
      <section
        className="drop-guide"
        id="como-funciona"
        aria-labelledby="guide-title"
      >
        <div className="guide-heading">
          <img src="/brand/mascot-black.svg" alt="" width="46" height="42" />
          <h2 id="guide-title">Seu próximo drop.</h2>
        </div>
        <div>
          <h3>Encontre sua estampa</h3>
          <p>Escolha sua peça e veja frente e costas de perto.</p>
        </div>
        <div>
          <h3>Escolha seu tamanho</h3>
          <p>Corte oversized. Do P ao GG.</p>
        </div>
        <div>
          <h3>Feita sob encomenda</h3>
          <p>Cinco peças. Edição limitada, criada por Razz.</p>
        </div>
      </section>
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
      <ProductQuickView
        selection={selection}
        onClose={() => setSelection(null)}
        onAdd={(product, size) =>
          dispatch({ type: "add", productId: product.id, size })
        }
      />
    </main>
  );
}

function ProductPage() {
  const { slug } = useParams(),
    product = productById(slug),
    { dispatch } = useContext(BagContext),
    navigate = useNavigate();
  const [size, setSize] = useState<Size | null>(null),
    [error, setError] = useState(false),
    [added, setAdded] = useState(false);
  const sizeGroup = useRef<HTMLFieldSetElement>(null);
  useEffect(() => {
    setSize(null);
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
          <div className="color-line">
            <span className={product.dark ? "swatch dark" : "swatch"} />
            {product.color}
            <span>Modelagem oversized</span>
          </div>
          <div className="price-line">
            <span>{formatPrice(product.price)}</span>
            <small>Limitada · sob encomenda</small>
          </div>
          <fieldset
            className="size-select"
            ref={sizeGroup}
            aria-describedby={error ? "size-error" : "size-note"}
          >
            <legend>Selecione o tamanho</legend>
            <div>
              {sizes.map((s) => (
                <button
                  key={s}
                  aria-pressed={size === s}
                  onClick={() => {
                    setSize(s);
                    setError(false);
                    setAdded(false);
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            {error ? (
              <p id="size-error" className="size-error" role="alert">
                Escolha um tamanho para adicionar à sacola.
              </p>
            ) : (
              <p id="size-note">
                Grade provisória. Medidas disponíveis no lançamento.
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
          <details open>
            <summary>
              Sobre a peça <span>+</span>
            </summary>
            <p>
              Estampa autoral de Razz. Corte amplo, ombros deslocados e presença
              de frente e de costas.
            </p>
          </details>
          <details>
            <summary>
              Sobre esta prévia <span>+</span>
            </summary>
            <p>
              As imagens preservam os mockups originais da coleção. Medidas e
              caimento finais serão confirmados com a peça física. Suas escolhas
              ficam salvas neste navegador; as vendas ainda não estão abertas.
            </p>
            <a
              href={"/media/source/" + product.source}
              target="_blank"
              rel="noreferrer"
              className="text-link"
            >
              Ver mockup original ↗
            </a>
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
                      <div className="quantity-control">
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
          <aside className="bag-summary">
            <span className="red-dot" />
            <h2>
              Primeiro drop.
              <br />
              Em breve.
            </h2>
            <p>
              Você está explorando uma prévia da ZXXR Store. Suas escolhas ficam
              salvas neste navegador.
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
            <p className="bag-limits">
              Pagamento, entrega e disponibilidade serão liberados no
              lançamento.
            </p>
            <Link to="/" className="add-button">
              Explorar mais peças <Arrow />
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
