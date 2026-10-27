import {
  AnimatePresence,
  motion,
  useIsPresent,
  useReducedMotion,
} from "framer-motion";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useNavigate } from "react-router";
import { useCommerce } from "../commerce/CommerceProvider";
import { brl } from "../commerce/contracts";
import { products, type Product } from "../config/products";
import { artist } from "../config/artist";
import {
  accountDestination,
  offeredPayments,
  storeContactLink,
  storefront,
} from "../config/storefront";
import {
  findSupportTopics,
  mainTopics,
  supportMascot,
  supportProductState,
  supportTopics,
  type GuideEntry,
  type NewGuideEntry,
  type SupportAction,
  type TopicId,
} from "./guide";
function GuideIcon({ index }: { index: number }) {
  const paths = [
    "M4 4 8 2a6 6 0 0 0 8 0l4 2 3 5-4 2v10H5V11L1 9l3-5Z",
    "M3 6h18v12H3V6Zm4 0v5m5-5v3m5-3v5",
    "M3 5h18v14H3V5Zm0 5h18M7 15h4",
    "M5 7h14l1 14H4L5 7Zm3 0V5a4 4 0 0 1 8 0v2",
    "M4 8a8 8 0 1 1-1 7M4 3v5h5",
    "M14 4v12a3 3 0 1 1-3-3h3M14 4l6-1v5l-6 1",
  ];
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d={paths[index]}
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export type PanelProps = {
  entries: GuideEntry[];
  append: (entry: NewGuideEntry) => void;
  reset: () => void;
  product?: Product;
  cartCount: number;
  onClose: (restore?: boolean) => void;
  trigger: RefObject<HTMLButtonElement | null>;
  restoreFocus: RefObject<boolean>;
  currentRoute: RefObject<string>;
};
export default function SupportSurface({
  open,
  ...props
}: PanelProps & { open: boolean }) {
  return (
    <AnimatePresence>
      {open && <SupportPanel key="support" {...props} />}
    </AnimatePresence>
  );
}
function SupportPanel({
  entries,
  append,
  reset,
  product,
  cartCount,
  onClose,
  trigger,
  restoreFocus,
  currentRoute,
}: PanelProps) {
  const { catalog, catalogError, refreshCatalog, session } = useCommerce();
  const navigate = useNavigate();
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const latestReply = useRef<HTMLElement>(null);
  const previousReply = useRef(entries.at(-1)?.id);
  const [query, setQuery] = useState("");
  const [mobile, setMobile] = useState(
    () => window.matchMedia("(max-width: 767px)").matches,
  );
  const reduced = useReducedMotion();
  const openedRoute = useRef(currentRoute.current);
  const isPresent = useIsPresent();
  const focusBeforeOpen = useRef<Element | null>(null);
  useLayoutEffect(() => {
    const node = dialog.current;
    // Presence may resume an exiting panel before its native dialog unmounts.
    if (!isPresent || !node || node.open) return;
    openedRoute.current = currentRoute.current;
    focusBeforeOpen.current = document.activeElement;
    if (mobile) node.showModal();
    else node.show();
    closeButton.current?.focus({ preventScroll: true });
  }, [isPresent, mobile]);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const change = () => setMobile(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    const overflow = document.body.style.overflow;
    const padding = document.body.style.paddingRight;
    if (mobile) {
      if (!node.open) node.showModal();
      const scrollbar =
        window.innerWidth - document.documentElement.clientWidth;
      if (scrollbar > 0)
        document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight || "0") + scrollbar}px`;
      document.body.style.overflow = "hidden";
    } else if (!node.open) node.show();
    closeButton.current?.focus({ preventScroll: true });
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      } else if (mobile && event.key === "Tab") {
        const controls = Array.from(
          node.querySelectorAll<HTMLElement>(
            'button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]',
          ),
        ).filter((element) => element.getClientRects().length > 0);
        const first = controls[0];
        const last = controls.at(-1);
        const active = document.activeElement;
        if (event.shiftKey && (active === first || !node.contains(active))) {
          event.preventDefault();
          last?.focus();
        } else if (
          !event.shiftKey &&
          (active === last || !node.contains(active))
        ) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    const outside = (event: PointerEvent) => {
      if (
        !mobile &&
        !node.contains(event.target as Node) &&
        !(event.target as Element).closest?.("[data-support-trigger]")
      )
        onClose(false);
    };
    const focusedOutside = (event: FocusEvent) => {
      if (
        !mobile &&
        !node.contains(event.target as Node) &&
        !(event.target as Element).closest?.("[data-support-trigger]")
      )
        onClose(false);
    };
    document.addEventListener("keydown", escape);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", focusedOutside);
    return () => {
      document.removeEventListener("keydown", escape);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", focusedOutside);
      if (node.open) node.close();
      if (mobile) {
        document.body.style.overflow = overflow;
        document.body.style.paddingRight = padding;
      }
      if (
        restoreFocus.current &&
        currentRoute.current === openedRoute.current
      ) {
        const target =
          focusBeforeOpen.current instanceof HTMLElement &&
          focusBeforeOpen.current.isConnected
            ? focusBeforeOpen.current
            : trigger.current;
        target?.focus({ preventScroll: true });
      }
    };
  }, [mobile]);
  useEffect(() => {
    const viewport = window.visualViewport;
    const update = () => {
      dialog.current?.style.setProperty(
        "--support-viewport",
        `${viewport?.height ?? window.innerHeight}px`,
      );
      dialog.current?.style.setProperty(
        "--support-keyboard",
        `${Math.max(0, window.innerHeight - (viewport?.height ?? window.innerHeight) - (viewport?.offsetTop ?? 0))}px`,
      );
    };
    update();
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    return () => {
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
    };
  }, []);
  useEffect(() => {
    if (!entries.length) {
      previousReply.current = undefined;
      scroller.current?.scrollTo({ top: 0, behavior: "instant" });
      return;
    }
    const changed = entries.at(-1)?.id !== previousReply.current;
    if (changed) {
      latestReply.current?.focus({ preventScroll: true });
      previousReply.current = entries.at(-1)?.id;
    }
    const viewport = scroller.current;
    const reply = latestReply.current;
    if (viewport && reply)
      viewport.scrollTo({
        top:
          viewport.scrollTop +
          reply.getBoundingClientRect().top -
          viewport.getBoundingClientRect().top -
          12,
        behavior: changed && !reduced ? "smooth" : "instant",
      });
  }, [entries, reduced]);
  function go(to: string) {
    restoreFocus.current = false;
    // Close the native dialog before navigation so it cannot steal the next heading's focus.
    dialog.current?.close();
    onClose(false);
    navigate(to);
  }
  function openTopic(id: TopicId) {
    append({ kind: "topic", topic: id, label: supportTopics[id].title });
  }
  const last = entries.at(-1);
  const subject =
    last?.kind === "topic" ? supportTopics[last.topic].title : "uma compra";
  const whatsapp = storeContactLink(
    catalog?.contact,
    `Olá! Quero ajuda sobre ${subject.toLocaleLowerCase("pt-BR")} na ZXXR.${product ? ` Estou vendo a camiseta ${product.name}.` : ""}`,
  );
  function actions(items: readonly SupportAction[]) {
    return (
      <div className="support-actions">
        {items.map((action, index) => {
          const key = `${action.kind}-${index}`;
          if (action.kind === "topic")
            return (
              <button
                type="button"
                key={key}
                onClick={() => openTopic(action.topic)}
              >
                {action.label}
              </button>
            );
          if (action.kind === "products")
            return (
              <button
                type="button"
                key={key}
                onClick={() =>
                  append({
                    kind: "products",
                    filter: action.filter,
                    label: action.label,
                  })
                }
              >
                {action.label}
              </button>
            );
          if (
            action.kind === "route" ||
            action.kind === "orders" ||
            action.kind === "product"
          ) {
            if (action.kind === "product" && !product) return null;
            const to =
              action.kind === "route"
                ? action.to
                : action.kind === "orders"
                  ? accountDestination(!!session.user)
                  : `/produto/${product!.id}`;
            return (
              <a
                key={key}
                href={to}
                onClick={(event) => {
                  if (
                    !event.ctrlKey &&
                    !event.metaKey &&
                    !event.shiftKey &&
                    event.button === 0
                  ) {
                    event.preventDefault();
                    go(to);
                  }
                }}
              >
                {action.label}
                <span aria-hidden="true">↗</span>
              </a>
            );
          }
          const href =
            action.kind === "instagram"
              ? storefront.instagram.href
              : action.kind === "spotify"
                ? artist.url
                : whatsapp;
          return href ? (
            <a key={key} href={href} target="_blank" rel="noopener noreferrer">
              {action.label}
              <span aria-hidden="true">↗</span>
            </a>
          ) : (
            <span className="support-unavailable" key={key}>
              Atendimento indisponível no momento.
            </span>
          );
        })}
      </div>
    );
  }
  return (
    <motion.dialog
      ref={dialog}
      id="zxxr-support-panel"
      className="support-panel"
      aria-labelledby="support-title"
      aria-modal={mobile}
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={{ duration: reduced ? 0 : 0.16, ease: "easeOut" }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (mobile && event.target === event.currentTarget) {
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            onClose();
        }
      }}
    >
      <div className="support-panel-frame">
        <header className="support-panel-header">
          <img src={supportMascot} width="40" height="34" alt="" />
          <div>
            <h2 id="support-title">Ajuda ZXXR</h2>
            <p>Seu guia da loja</p>
          </div>
          <button
            ref={closeButton}
            type="button"
            className="support-close"
            aria-label="Fechar ajuda"
            onClick={() => onClose()}
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>
        <div className="support-toolbar">
          <button
            type="button"
            onClick={() => {
              reset();
              setQuery("");
            }}
          >
            ← Ver assuntos
          </button>
          <a
            href="/ajuda"
            onClick={(event) => {
              event.preventDefault();
              go("/ajuda");
            }}
          >
            Central de ajuda ↗
          </a>
        </div>
        <div className="support-conversation" ref={scroller}>
          <div className="support-welcome">
            <span className="support-intro-mark" aria-hidden="true">
              ↳
            </span>
            <p>
              Oi! Te ajudo a escolher sua camiseta e resolver dúvidas sobre a
              compra.
            </p>
          </div>
          {entries.length === 0 && (
            <>
              {product && (
                <button
                  className="support-current-product"
                  type="button"
                  onClick={() => openTopic("product")}
                >
                  <img src={product.front} alt="" width="44" height="52" />
                  <span>
                    Ajuda com <strong>{product.name}</strong>
                  </span>
                  <span aria-hidden="true">↗</span>
                </button>
              )}
              <div
                className="support-topic-grid"
                aria-label="Assuntos de ajuda"
              >
                {mainTopics.map((id, index) => (
                  <button type="button" key={id} onClick={() => openTopic(id)}>
                    <GuideIcon index={index} />
                    <span>{supportTopics[id].title}</span>
                    <span className="support-topic-arrow" aria-hidden="true">
                      ↗
                    </span>
                  </button>
                ))}
              </div>
              {cartCount > 0 && (
                <button
                  type="button"
                  className="support-cart-hint"
                  onClick={() => go("/sacola")}
                >
                  Você tem {cartCount} {cartCount === 1 ? "peça" : "peças"} na
                  sacola. Revisar ↗
                </button>
              )}
            </>
          )}
          <div
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            aria-label="Conversa com o guia"
          >
            {entries.map((entry, index) => (
              <div className="support-exchange" key={entry.id}>
                <p className="support-user-choice">{entry.label}</p>
                <section
                  className="support-reply"
                  ref={index === entries.length - 1 ? latestReply : undefined}
                  tabIndex={-1}
                  aria-label={
                    entry.kind === "topic"
                      ? supportTopics[entry.topic].title
                      : entry.kind === "products"
                        ? "Camisetas do drop"
                        : "Resultado da busca"
                  }
                >
                  {entry.kind === "topic" && (
                    <>
                      {entry.topic === "product" && product && (
                        <strong>{product.name}</strong>
                      )}
                      {supportTopics[entry.topic].answer.map((p) => (
                        <p key={p}>{p}</p>
                      ))}
                      {entry.topic === "payment" && (
                        <p className="support-payment-list">
                          {catalog
                            ? `Formas oferecidas no atendimento: ${
                                offeredPayments(catalog.paymentMethods)
                                  .map((method) => method.label)
                                  .join(" · ") || "confirme com a loja"
                              }.`
                            : catalogError
                              ? "Não foi possível consultar as formas de pagamento agora."
                              : "Consultando formas de pagamento…"}
                        </p>
                      )}
                      {actions(supportTopics[entry.topic].actions)}
                    </>
                  )}
                  {entry.kind === "search" && (
                    <>
                      <p>
                        {entry.topics.length
                          ? "Encontrei estes assuntos. Qual deles ajuda você?"
                          : "Não encontrei uma resposta pronta para essa dúvida. Veja a Central de ajuda ou continue com a loja pelo WhatsApp."}
                      </p>
                      {actions(
                        entry.topics.length
                          ? entry.topics.map((id) => ({
                              kind: "topic" as const,
                              topic: id,
                              label: supportTopics[id].title,
                            }))
                          : [
                              {
                                kind: "route",
                                label: "Ver Central de ajuda",
                                to: "/ajuda",
                              },
                            ],
                      )}
                    </>
                  )}
                  {entry.kind === "products" && (
                    <>
                      <p>
                        {entry.filter === "light"
                          ? "As claras do drop."
                          : entry.filter === "dark"
                            ? "As pretas estonadas do drop."
                            : "As cinco camisetas do drop Desejos."}{" "}
                        Abra a peça para conferir frente, costas e tamanhos.
                      </p>
                      <div className="support-products">
                        {products
                          .filter(
                            (p) =>
                              entry.filter === "all" ||
                              (entry.filter === "dark" ? p.dark : !p.dark),
                          )
                          .map((p) => {
                            const state = supportProductState(p.id, catalog);
                            return (
                              <a
                                key={p.id}
                                href={`/produto/${p.id}`}
                                onClick={(event) => {
                                  event.preventDefault();
                                  go(`/produto/${p.id}`);
                                }}
                              >
                                <img
                                  src={p.front}
                                  alt=""
                                  width="58"
                                  height="70"
                                  loading="lazy"
                                />
                                <div>
                                  <strong>{p.name}</strong>
                                  <small>{p.color}</small>
                                  <span>
                                    {state.priceCents !== null
                                      ? `${state.varied ? "A partir de " : ""}${brl(state.priceCents)}`
                                      : catalog
                                        ? "Indisponível"
                                        : catalogError
                                          ? "Preço indisponível"
                                          : "Consultando preço…"}
                                  </span>
                                  {catalog && !state.available && (
                                    <small>Encomendas indisponíveis</small>
                                  )}
                                </div>
                                <span aria-hidden="true">↗</span>
                              </a>
                            );
                          })}
                      </div>
                      {actions([
                        {
                          kind: "topic",
                          topic: "sizes",
                          label: "Ajuda com o tamanho",
                        },
                        {
                          kind: "topic",
                          topic: "buy",
                          label: "Como registrar o pedido",
                        },
                      ])}
                    </>
                  )}
                </section>
              </div>
            ))}
          </div>
        </div>
        <footer className="support-panel-footer">
          {catalogError && (
            <div className="support-catalog-error" role="status">
              <span>Os dados da loja não carregaram.</span>
              <button type="button" onClick={() => void refreshCatalog()}>
                Tentar novamente
              </button>
            </div>
          )}
          <form
            className="support-search"
            onSubmit={(event) => {
              event.preventDefault();
              if (!query.trim()) return;
              append({
                kind: "search",
                topics: findSupportTopics(query.slice(0, 200)),
                label: "Buscar uma dúvida",
              });
              setQuery("");
            }}
          >
            <label className="ps-sr-only" htmlFor="support-search">
              Buscar uma dúvida
            </label>
            <input
              id="support-search"
              type="search"
              value={query}
              maxLength={200}
              autoComplete="off"
              placeholder="Buscar uma dúvida"
              onChange={(event) => setQuery(event.target.value)}
            />
            <button
              type="submit"
              aria-label="Buscar assunto"
              disabled={!query.trim()}
            >
              <span aria-hidden="true">↑</span>
            </button>
          </form>
          {whatsapp ? (
            <a
              className="support-human"
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>Falar com a loja</span>
              <span aria-hidden="true">↗</span>
            </a>
          ) : (
            <p className="support-contact-unavailable">
              {catalog || catalogError
                ? "WhatsApp indisponível agora. Acesse o Instagram em “Instagram e Razz”."
                : "Consultando atendimento…"}
            </p>
          )}
        </footer>
      </div>
    </motion.dialog>
  );
}
