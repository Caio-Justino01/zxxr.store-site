import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { productById } from "../config/products";
import {
  brl,
  orderMessage,
  stageLabels,
  stages,
  type Order,
} from "./contracts";
import { useCommerce } from "./CommerceProvider";
import { AccountShell, Busy, Notice, Protected } from "./ui";
import { useResource } from "./useResource";
export const dateLabel = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
export function OrderLines({ order }: { order: Order }) {
  return (
    <div className="account-order-lines">
      {order.items.map((i) => (
        <div className="account-order-line" key={i.sku}>
          <img
            src={productById(i.productId)?.front}
            width="72"
            height="90"
            alt=""
          />
          <div>
            <strong>{i.name}</strong>
            <p>
              {i.color} · {i.size}
            </p>
            <small>
              {i.quantity} × {brl(i.unitCents)}
            </small>
          </div>
          <b>{brl(i.totalCents)}</b>
        </div>
      ))}
    </div>
  );
}
export function OrderFacts({
  order,
  internal = false,
}: {
  order: Order;
  internal?: boolean;
}) {
  return (
    <>
      <dl className="account-totals">
        <div>
          <dt>Subtotal das peças</dt>
          <dd>{brl(order.subtotal_cents)}</dd>
        </div>
        <div>
          <dt>Frete</dt>
          <dd>
            {(order.quote_released || internal) && order.shipping_cents !== null
              ? brl(order.shipping_cents)
              : "A confirmar"}
          </dd>
        </div>
        <div>
          <dt>Total</dt>
          <dd>
            {(order.quote_released || internal) && order.total_cents !== null
              ? brl(order.total_cents)
              : "Após atendimento"}
          </dd>
        </div>
      </dl>
      <p>
        <strong>Pagamento:</strong>{" "}
        {
          {
            pending: "Pendente",
            paid: "Confirmado pela loja",
            refund_pending: "Estorno pendente",
            refunded: "Estorno confirmado",
          }[order.payment_state]
        }
      </p>
      {(order.quote_released || internal) && order.production_deadline && (
        <p>
          <strong>Prazo combinado:</strong> {order.production_deadline}
        </p>
      )}
      {order.quote_released &&
        order.payment_url &&
        order.payment_state === "pending" && (
          <a
            className="account-button primary"
            href={order.payment_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir link de pagamento
          </a>
        )}
      {order.tracking_code && (
        <p>
          <strong>Rastreamento:</strong> {order.tracking_code}
          {order.tracking_url && (
            <>
              {" "}
              ·{" "}
              <a
                href={order.tracking_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Acompanhar envio
              </a>
            </>
          )}
        </p>
      )}
      <address>
        {order.address.recipient}
        <br />
        {order.address.street}, {order.address.number}{" "}
        {order.address.complement}
        <br />
        {order.address.neighborhood} · {order.address.city}/
        {order.address.state}
        <br />
        CEP {order.address.cep}
        {order.address.reference && (
          <>
            <br />
            Referência: {order.address.reference}
          </>
        )}
      </address>
      {order.note && (
        <p>
          <strong>Sua observação:</strong> {order.note}
        </p>
      )}
    </>
  );
}
export function OrderTimeline({ order }: { order: Order }) {
  return (
    <ol className="order-timeline">
      {order.events?.map((e) => (
        <li key={e.id}>
          <span aria-hidden="true" />
          <div>
            <strong>{e.label}</strong>
            <time dateTime={e.created_at}>{dateLabel(e.created_at)}</time>
          </div>
        </li>
      ))}
    </ol>
  );
}
export function OrderListPage() {
  return (
    <Protected>
      <OrderList />
    </Protected>
  );
}
function OrderList() {
  const { data, error, loading, reload } = useResource<Order[]>("orders");
  return (
    <AccountShell
      title="Meus pedidos."
      intro="Do primeiro desejo até chegar à sua porta."
    >
      {loading ? (
        <Busy />
      ) : error ? (
        <>
          <Notice error>{error}</Notice>
          <button className="account-button" onClick={() => void reload()}>
            Tentar novamente
          </button>
        </>
      ) : data?.length ? (
        <div className="customer-orders">
          {data.map((o) => (
            <Link
              className="customer-order"
              key={o.id}
              to={`/conta/pedidos/${o.id}`}
            >
              <img
                src={productById(o.items[0]?.productId)?.front}
                alt=""
                width="90"
                height="110"
              />
              <div>
                <strong>{o.reference}</strong>
                <span>{dateLabel(o.created_at)}</span>
                <p>
                  {o.items
                    .map((i) => `${i.quantity} × ${i.name} (${i.size})`)
                    .join(", ")}
                </p>
                <span className={`order-status status-${o.stage}`}>
                  {stageLabels[o.stage]}
                </span>
              </div>
              <b>
                {o.quote_released && o.total_cents !== null
                  ? brl(o.total_cents)
                  : `${brl(o.subtotal_cents)} + frete`}
              </b>
              <span aria-hidden="true">↗</span>
            </Link>
          ))}
        </div>
      ) : (
        <section className="account-empty">
          <img src="/brand/mascot-black.svg" alt="" width="84" height="80" />
          <h2>Seu primeiro desejo começa aqui.</h2>
          <p>Quando registrar uma encomenda, ela aparece neste espaço.</p>
          <Link className="account-button primary" to="/#o-drop">
            Encontrar minha peça
          </Link>
        </section>
      )}
    </AccountShell>
  );
}
export function OrderDetailPage() {
  return (
    <Protected>
      <OrderDetail />
    </Protected>
  );
}
function OrderDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { catalog } = useCommerce();
  const {
    data: order,
    error,
    loading,
    reload,
  } = useResource<Order>(`orders/${id}`);
  const [copied, setCopied] = useState("");
  const message = order ? orderMessage(order, window.location.origin) : "";
  return (
    <AccountShell
      title={order?.reference || "Seu pedido."}
      intro={order ? stageLabels[order.stage] : undefined}
    >
      {loading ? (
        <Busy />
      ) : error ? (
        <>
          <Notice error>{error}</Notice>
          <button className="account-button" onClick={() => void reload()}>
            Consultar novamente
          </button>
        </>
      ) : (
        order && (
          <>
            {params.get("registrado") === "1" && (
              <Notice>
                Pedido registrado. Vamos confirmar a entrega e o pagamento. Se o
                WhatsApp não abriu, continue pelo botão abaixo.
              </Notice>
            )}
            {order.test_mode && (
              <Notice>Pedido de teste. Não cobrar nem produzir.</Notice>
            )}
            <div className="account-two-columns">
              <section className="account-card">
                <OrderLines order={order} />
                <OrderFacts order={order} />
                <div className="account-actions">
                  {catalog?.contact && (
                    <a
                      className="account-button primary"
                      target="_blank"
                      rel="noopener noreferrer"
                      href={`https://wa.me/${catalog.contact}?text=${encodeURIComponent(message)}`}
                    >
                      Continuar atendimento no WhatsApp
                    </a>
                  )}
                  <button
                    className="account-button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(message);
                        setCopied(
                          "Mensagem copiada. Cole na conversa com a loja.",
                        );
                      } catch {
                        setCopied("Abra “Conferir mensagem” e copie o texto.");
                      }
                    }}
                  >
                    Copiar mensagem
                  </button>
                </div>
                {copied && <Notice>{copied}</Notice>}
                <details>
                  <summary>Conferir mensagem</summary>
                  <pre className="order-message">{message}</pre>
                </details>
                {catalog?.contact && (
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    className="account-text-link"
                    href={`https://wa.me/${catalog.contact}?text=${encodeURIComponent(orderMessage(order, window.location.origin, "change"))}`}
                  >
                    Solicitar alteração ou cancelamento
                  </a>
                )}
              </section>
              <aside className="account-card">
                <h2>Cada etapa, por aqui.</h2>
                <OrderTimeline order={order} />
                <p className="account-muted">
                  A equipe atualiza este histórico. Pagamento e entrega são
                  confirmados no atendimento.
                </p>
                <button
                  className="account-button"
                  onClick={() => void reload()}
                >
                  Atualizar acompanhamento
                </button>
              </aside>
            </div>
          </>
        )
      )}
    </AccountShell>
  );
}
