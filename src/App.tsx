import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
  lazy,
  Suspense,
} from "react";
import {
  Link,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useNavigationType,
  useParams,
} from "react-router";
import {
  products,
  productById,
  isAvailable,
  type Size,
} from "./config/products";
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
import { UpcomingProduct } from "./components/UpcomingDrop";
import { FrozenGarment } from "./components/FrozenGarment";
import { ProductPhoto } from "./components/ProductPhoto";
import { ProductSpecifications } from "./components/ProductSpecifications";
import { ProductSizeSelector } from "./components/ProductSizeSelector";
import "./product-page.css";
import { MusicSection } from "./components/MusicSection";
import { DropGuide } from "./components/DropGuide";
import { DropEditorial } from "./components/DropEditorial";
import { GradientBackdrop } from "./components/GradientBackdrop";
import { cartSubtotal, formatPrice } from "./lib/pricing";
import { useCommerce } from "./commerce/CommerceProvider";
import { StoreHeader } from "./components/StoreHeader";
import { StoreFooter } from "./components/StoreFooter";
import { StoreTestNotice } from "./components/StoreInformation";
import { storefront } from "./config/storefront";
import { helpContent } from "./config/help-content";
import { SupportProvider } from "./support/context";
import { SupportWidget } from "./support/SupportWidget";
import { RecoveryCart } from "./analytics/RecoveryCart";
import {
  isSeoInitialRender,
  finishSeoHydration,
} from "./seo/render-environment";
import { updateDocumentSeo } from "./seo/metadata";
const HelpPage = lazy(() =>
  import("./components/HelpPage").then((m) => ({ default: m.HelpPage })),
);
const AnalyticsPage = lazy(() =>
  import("./analytics/AnalyticsPage").then((m) => ({
    default: m.AnalyticsPage,
  })),
);
const CheckoutPage = lazy(() =>
  import("./commerce/checkout").then((m) => ({ default: m.CheckoutPage })),
);
const AuthPage = lazy(() =>
  import("./commerce/auth").then((m) => ({ default: m.AuthPage })),
);
const OrderListPage = lazy(() =>
  import("./commerce/orders").then((m) => ({ default: m.OrderListPage })),
);
const OrderDetailPage = lazy(() =>
  import("./commerce/orders").then((m) => ({ default: m.OrderDetailPage })),
);
const ProfilePage = lazy(() =>
  import("./commerce/profile").then((m) => ({ default: m.ProfilePage })),
);
const AdminListPage = lazy(() =>
  import("./commerce/admin").then((m) => ({ default: m.AdminListPage })),
);
const AdminDetailPage = lazy(() =>
  import("./commerce/admin").then((m) => ({ default: m.AdminDetailPage })),
);
const TeamPage = lazy(() =>
  import("./commerce/admin").then((m) => ({ default: m.TeamPage })),
);
const SettingsPage = lazy(() =>
  import("./commerce/admin").then((m) => ({ default: m.SettingsPage })),
);
const PrivacyPage = lazy(() =>
  import("./commerce/privacy").then((m) => ({ default: m.PrivacyPage })),
);
import { preorder } from "./config/preorder";
const BagContext = createContext<{
  items: CartItem[];
  dispatch: React.Dispatch<CartAction>;
}>(null!);

function RouteEffects() {
  const { pathname, hash, key } = useLocation();
  const { catalog } = useCommerce();
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
    let anchorObserver: MutationObserver | undefined;
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
        const scrollToAnchor = () => {
          const target = document.getElementById(id);
          if (!target) return false;
          target.scrollIntoView({ behavior: "instant", block: "start" });
          anchorObserver?.disconnect();
          return true;
        };
        if (!scrollToAnchor()) {
          // Lazy routes can finish loading after the first layout frames.
          anchorObserver = new MutationObserver(() => {
            scrollToAnchor();
          });
          anchorObserver.observe(document.getElementById("main-content")!, {
            childList: true,
            subtree: true,
          });
        }
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
      anchorObserver?.disconnect();
      cancelAnimationFrame(restoreFrame);
      if (pendingPosition) positions.current.set(key, pendingPosition);
    };
  }, [key, pathname, hash, navigationType]);

  useEffect(() => {
    const product = pathname.startsWith("/produto/")
      ? productById(pathname.split("/")[2])
      : undefined;
    const variants =
      catalog?.variants.filter(
        (variant) => variant.product_id === product?.id,
      ) ?? [];
    const verified =
      isAvailable(product) &&
      catalog?.testMode === false &&
      variants.length === 4 &&
      variants.every(
        (variant) => variant.price_cents === variants[0].price_cents,
      );
    updateDocumentSeo(
      pathname,
      verified
        ? {
            priceCents: variants[0].price_cents,
            available:
              !!catalog?.open && variants.some((variant) => variant.active),
          }
        : undefined,
    );
  }, [pathname, catalog]);
  return null;
}
function Collection() {
  const { dispatch } = useContext(BagContext);
  return (
    <main id="top">
      <div className="collection-world">
        <div className="collection-sky">
          <GradientBackdrop />
        </div>
        <CloudCollection products={products} priceLabel={formatPrice} />
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
        <a className="text-link" href="#o-drop">
          Ver camisetas <span>↑</span>
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
  if (!isAvailable(product)) return <UpcomingProduct product={product} />;
  const add = () => {
    if (!preorder.open) return;
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
      <Link to={storefront.camisetas} className="back-link">
        <Arrow back />
        Ver camisetas
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
            <ProductSizeSelector
              value={size}
              onChange={(s) => {
                setSize(s);
                setError(false);
                setAdded(false);
              }}
            />
            {error ? (
              <p id="size-error" className="size-error" role="alert">
                Escolha um tamanho para adicionar à sacola.
              </p>
            ) : (
              <p id="size-note">Selecione o tamanho para adicionar à sacola.</p>
            )}
          </fieldset>
          <button
            className={`add-button ${added ? "added" : ""}`}
            onClick={add}
            disabled={!preorder.open}
          >
            <span>
              {!preorder.open
                ? "Encomendas encerradas"
                : added
                  ? "Adicionada à sacola"
                  : "Adicionar à sacola"}
            </span>
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
            <p>{helpContent.care}</p>
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
                  <ProductPhoto product={p} effects={false} />
                </div>
                <span>
                  <strong>{p.name}</strong>
                  {isAvailable(p) && <Arrow />}
                </span>
                <small>
                  {isAvailable(p)
                    ? `${p.color} / ${formatPrice(p.price)}`
                    : "Em breve"}
                </small>
              </Link>
            ))}
        </div>
        <button
          className="text-link"
          onClick={() => navigate(storefront.camisetas)}
        >
          Ver camisetas <Arrow />
        </button>
      </section>
    </main>
  );
}

function Bag() {
  const { items, dispatch } = useContext(BagContext),
    count = items.reduce((n, i) => n + i.quantity, 0);
  const hasUpcoming = items.some(
    (item) => !isAvailable(productById(item.productId)),
  );
  return (
    <main id="top" className="bag-page">
      <Link to={storefront.camisetas} className="back-link">
        <Arrow back />
        Continuar comprando
      </Link>
      <div className="bag-heading">
        <h1 tabIndex={-1}>
          Sua sacola<span>({count})</span>
        </h1>
        <p>Confira suas camisetas, tamanhos e quantidades.</p>
      </div>
      <StoreTestNotice />
      {items.length ? (
        <div className="bag-layout">
          <div className="bag-items">
            {items.map((item) => {
              const p = productById(item.productId)!;
              return (
                <article className="bag-item" key={itemKey(item)}>
                  <Link to={"/produto/" + p.id}>
                    <ProductPhoto product={p} eager effects={false} />
                  </Link>
                  <div>
                    <Link to={"/produto/" + p.id}>
                      <h2>{p.name}</h2>
                    </Link>
                    <p>
                      {isAvailable(p)
                        ? `${p.color} / Tamanho ${item.size}`
                        : "Em breve · próximo lançamento"}
                    </p>
                    <strong>
                      {isAvailable(p) ? (
                        <>
                          {formatPrice(p.price)} <small>cada</small>
                        </>
                      ) : (
                        "Retire esta peça para continuar com as disponíveis."
                      )}
                    </strong>
                    <div className="quantity-row">
                      <div className="quantity-control liquid-glass">
                        <button
                          aria-label={`Diminuir quantidade de ${p.name}, ${item.size}`}
                          disabled={item.quantity === 1 || !isAvailable(p)}
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
                          disabled={item.quantity === 10 || !isAvailable(p)}
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
            <h2>Resumo do pedido</h2>
            <p>
              Confira as estampas, os tamanhos e as quantidades das suas peças.
            </p>
            <dl>
              <div>
                <dt>Peças na sacola</dt>
                <dd>{count}</dd>
              </div>
              <div>
                <dt>Subtotal das peças disponíveis</dt>
                <dd>{formatPrice(cartSubtotal(items))}</dd>
              </div>
              <div>
                <dt>Frete</dt>
                <dd>A confirmar</dd>
              </div>
              <div>
                <dt>Total do pedido</dt>
                <dd>Após atendimento</dd>
              </div>
            </dl>
            {hasUpcoming ? (
              <p className="bag-upcoming-note" role="status">
                Algumas peças ficam para o próximo lançamento. Remova as peças
                “Em breve” para continuar. Elas não entram no subtotal.
              </p>
            ) : (
              <Link to="/encomenda" className="add-button">
                Continuar para o pedido <Arrow />
              </Link>
            )}
            <p className="bag-checkout-note">
              {storefront.deliveryNote} A finalização do atendimento é pelo
              WhatsApp.
            </p>
            <Link to="/#o-drop" className="bag-continue">
              Continuar comprando
            </Link>
          </aside>
        </div>
      ) : (
        <div className="empty-bag">
          <img src="/brand/logo-black.svg" alt="" width="230" height="100" />
          <h2>Sua sacola está vazia</h2>
          <p>
            Conheça Emoção e Spiritual Gangsta, disponíveis nesta edição Razz.
          </p>
          <Link to={storefront.camisetas} className="add-button">
            Ver camisetas <Arrow />
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
function RouteHydrationReady() {
  useEffect(() => {
    finishSeoHydration();
  }, []);
  return null;
}

export default function App() {
  useCommerce(); // Re-render editorial prices after a verified catalog refresh.
  const [activityVersion, setActivityVersion] = useState(0);
  const [bagLoaded, setBagLoaded] = useState(() => !isSeoInitialRender());
  const [items, reduce] = useReducer(
    (
      state: CartItem[],
      action: CartAction | { type: "restore"; items: CartItem[] },
    ) =>
      action.type === "restore" ? action.items : cartReducer(state, action),
    undefined,
    () => {
      if (isSeoInitialRender()) return [];
      try {
        return readCart(localStorage.getItem(CART_KEY));
      } catch {
        return [];
      }
    },
  );
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const dispatch = useCallback((action: CartAction) => {
    const before = itemsRef.current;
    const next = cartReducer(before, action);
    if (JSON.stringify(next) === JSON.stringify(before)) return;
    itemsRef.current = next;
    reduce(action);
    if (action.type !== "ordered") {
      setActivityVersion((value) => value + 1);
      const previous =
        before.find((line) => itemKey(line) === itemKey(action))?.quantity ?? 0;
      const current =
        next.find((line) => itemKey(line) === itemKey(action))?.quantity ?? 0;
      window.dispatchEvent(
        new CustomEvent("zxxr:cart-action", {
          detail: { ...action, delta: current - previous, items: next },
        }),
      );
    }
  }, []);
  useEffect(() => {
    if (bagLoaded) return;
    try {
      reduce({
        type: "restore",
        items: readCart(localStorage.getItem(CART_KEY)),
      });
    } catch {
      /* optional storage */
    }
    setBagLoaded(true);
  }, [bagLoaded]);
  useEffect(() => {
    if (!bagLoaded) return;
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch {
      /* Bag remains usable in memory when browser storage is unavailable. */
    }
  }, [items, bagLoaded]);
  return (
    <BagContext.Provider value={{ items, dispatch }}>
      <SupportProvider>
        <>
          <a className="skip-link" href="#main-content">
            Pular para o conteúdo
          </a>
          <StoreHeader
            count={items.reduce((n, item) => n + item.quantity, 0)}
          />
          <div id="main-content">
            <Suspense
              fallback={
                <main className="account-page">
                  <p role="status">Carregando sua página…</p>
                </main>
              }
            >
              <Routes>
                <Route path="/" element={<Collection />} />
                <Route path="/produto/:slug" element={<ProductPage />} />
                <Route path="/sacola" element={<Bag />} />
                <Route
                  path="/encomenda"
                  element={
                    <CheckoutPage
                      items={items}
                      onRegistered={(lines) =>
                        dispatch({ type: "ordered", lines })
                      }
                    />
                  }
                />
                <Route path="/entrar" element={<AuthPage />} />
                <Route path="/cadastro" element={<AuthPage />} />
                <Route path="/recuperar-acesso" element={<AuthPage />} />
                <Route path="/conta/pedidos" element={<OrderListPage />} />
                <Route
                  path="/conta/pedidos/:id"
                  element={<OrderDetailPage />}
                />
                <Route path="/conta/dados" element={<ProfilePage />} />
                <Route path="/painel/pedidos" element={<AdminListPage />} />
                <Route path="/painel/analytics" element={<AnalyticsPage />} />
                <Route
                  path="/painel/pedidos/:id"
                  element={<AdminDetailPage />}
                />
                <Route path="/painel/equipe" element={<TeamPage />} />
                <Route
                  path="/painel/configuracoes"
                  element={<SettingsPage />}
                />
                <Route path="/privacidade" element={<PrivacyPage />} />
                <Route path="/ajuda" element={<HelpPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <RouteHydrationReady />
            </Suspense>
            <RecoveryCart items={items} activityVersion={activityVersion} />
          </div>
          <StoreFooter />
          <SupportWidget
            cartCount={items.reduce((n, item) => n + item.quantity, 0)}
          />
          <RouteEffects />
        </>
      </SupportProvider>
    </BagContext.Provider>
  );
}
