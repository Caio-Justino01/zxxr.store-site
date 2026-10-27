import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import { useForm } from "react-hook-form";
import { products } from "../config/products";
import { api, errorMessage, post } from "./client";
import {
  brl,
  csvCell,
  orderMessage,
  stageLabels,
  stages,
  type Order,
  type OrderAction,
  type TeamMember,
} from "./contracts";
import { useCommerce } from "./CommerceProvider";
import { AccountShell, Busy, Notice, Protected } from "./ui";
import { useResource } from "./useResource";
import { dateLabel, OrderFacts, OrderLines, OrderTimeline } from "./orders";
import { AddressFields } from "./address";

function ItemsEditor({
  order,
  busy,
  submit,
}: {
  order: Order;
  busy: boolean;
  submit: (
    items: { productId: string; size: string; quantity: number }[],
    reason: string,
  ) => Promise<void>;
}) {
  const [lines, setLines] = useState(() =>
    order.items.map((i) => ({
      productId: i.productId,
      size: i.size,
      quantity: i.quantity,
    })),
  );
  const [reason, setReason] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit(lines, reason);
      }}
    >
      <p className="account-muted">
        Alterações após pagamento exigem o dono e não podem mudar o subtotal.
        Diferença de valor precisa ser resolvida com cancelamento/estorno e um
        novo pedido.
      </p>
      {lines.map((line, index) => (
        <div className="panel-item-edit" key={index}>
          <label>
            Estampa
            <select
              value={line.productId}
              onChange={(e) =>
                setLines(
                  lines.map((l, i) =>
                    i === index ? { ...l, productId: e.target.value } : l,
                  ),
                )
              }
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tamanho
            <select
              value={line.size}
              onChange={(e) =>
                setLines(
                  lines.map((l, i) =>
                    i === index ? { ...l, size: e.target.value } : l,
                  ),
                )
              }
            >
              {["P", "M", "G", "GG"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Quantidade
            <input
              type="number"
              min={1}
              max={10}
              required
              value={line.quantity}
              onChange={(e) =>
                setLines(
                  lines.map((l, i) =>
                    i === index
                      ? { ...l, quantity: Number(e.target.value) }
                      : l,
                  ),
                )
              }
            />
          </label>
          <button
            type="button"
            className="account-button"
            disabled={lines.length === 1}
            onClick={() => setLines(lines.filter((_, i) => i !== index))}
          >
            Remover
          </button>
        </div>
      ))}
      <button
        type="button"
        className="account-button"
        disabled={lines.length >= 20}
        onClick={() =>
          setLines([...lines, { productId: "boca", size: "M", quantity: 1 }])
        }
      >
        Adicionar peça
      </button>
      <label>
        Solicitação / motivo
        <input
          required
          minLength={3}
          maxLength={2000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      <button className="account-button" disabled={busy}>
        Registrar nova seleção
      </button>
    </form>
  );
}

function PanelNav() {
  const { session } = useCommerce();
  return (
    <nav className="panel-nav" aria-label="Administração">
      <Link to="/painel/pedidos">Pedidos</Link>
      {session.user?.role === "owner" && (
        <>
          <Link to="/painel/equipe">Equipe</Link>
          <Link to="/painel/configuracoes">Loja e catálogo</Link>
        </>
      )}
    </nav>
  );
}
export function AdminListPage() {
  return (
    <Protected staff>
      <AdminList />
    </Protected>
  );
}
function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
function AdminList() {
  const { session } = useCommerce();
  const [query, setQuery] = useState(""),
    [stage, setStage] = useState(""),
    [assignee, setAssignee] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const [filter, setFilter] = useState("");
  const { data, error, loading, reload } = useResource<Order[]>(
    `admin/orders${filter}`,
  );
  const team = useResource<TeamMember[]>("admin/team");
  const paid = data?.filter((o) => o.payment_state === "paid") ?? [];
  const total = paid.reduce((n, o) => n + (o.total_cents ?? 0), 0);
  function search(e: FormEvent) {
    e.preventDefault();
    setFilter(
      `?${new URLSearchParams({ q: query, stage, assignee, from, to })}`,
    );
  }
  function exportProduction() {
    const grouped = new Map<
      string,
      { sku: string; name: string; size: string; qty: number }
    >();
    for (const o of paid)
      for (const i of o.items) {
        const old = grouped.get(i.sku);
        grouped.set(i.sku, {
          sku: i.sku,
          name: i.name,
          size: i.size,
          qty: (old?.qty ?? 0) + i.quantity,
        });
      }
    const rows = [
      ["SKU", "Estampa", "Tamanho", "Quantidade paga"],
      ...[...grouped.values()].map((i) => [i.sku, i.name, i.size, i.qty]),
    ];
    download(
      "zxxr-producao-pagos.csv",
      "\uFEFF" + rows.map((r) => r.map(csvCell).join(";")).join("\r\n"),
      "text/csv;charset=utf-8",
    );
  }
  return (
    <AccountShell
      title="Pedidos do drop."
      intro="Atendimento organizado, do primeiro contato ao envio."
    >
      <PanelNav />
      <div className="panel-metrics">
        <div>
          <strong>{data?.length ?? "—"}</strong>
          <span>Pedidos na seleção</span>
        </div>
        <div>
          <strong>{paid.length}</strong>
          <span>Pagamentos confirmados</span>
        </div>
        {session.user?.role === "owner" && (
          <div>
            <strong>{brl(total)}</strong>
            <span>Recebimentos confirmados na seleção</span>
          </div>
        )}
      </div>
      <form className="panel-filters" onSubmit={search}>
        <label>
          Buscar pedido ou cliente
          <input
            value={query}
            maxLength={100}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Número, nome ou e-mail"
          />
        </label>
        <label>
          Etapa
          <select value={stage} onChange={(e) => setStage(e.target.value)}>
            <option value="">Todas</option>
            {stages.map((s) => (
              <option key={s} value={s}>
                {stageLabels[s]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Responsável
          <select
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
          >
            <option value="">Todos</option>
            {team.data
              ?.filter((t) => t.active)
              .map((t) => (
                <option value={t.user_id} key={t.user_id}>
                  {t.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          De
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          Até
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <button className="account-button primary">Filtrar</button>
      </form>
      {session.user?.role === "owner" && !!data?.length && (
        <div className="account-actions">
          <button className="account-button" onClick={exportProduction}>
            Exportar produção paga
          </button>
          <button
            className="account-button"
            onClick={() =>
              download(
                "zxxr-pedidos-selecao.json",
                JSON.stringify(
                  {
                    version: 1,
                    exportedAt: new Date().toISOString(),
                    orders: data,
                  },
                  null,
                  2,
                ),
                "application/json",
              )
            }
          >
            Exportar pedidos da seleção
          </button>
        </div>
      )}
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
        <div className="panel-orders">
          {data.map((o) => (
            <Link
              key={o.id}
              to={`/painel/pedidos/${o.id}`}
              className="panel-order"
            >
              <div>
                <strong>{o.reference}</strong>
                <small>
                  {dateLabel(o.created_at)}
                  {o.test_mode ? " · Teste" : ""}
                </small>
              </div>
              <div>
                <strong>{o.customer.name}</strong>
                <small>
                  {o.items.reduce((n, i) => n + i.quantity, 0)}{" "}
                  {o.items.reduce((n, i) => n + i.quantity, 0) === 1
                    ? "peça"
                    : "peças"}
                </small>
              </div>
              <span className={`order-status status-${o.stage}`}>
                {stageLabels[o.stage]}
              </span>
              <span>
                {o.assignee_id
                  ? team.data?.find((t) => t.user_id === o.assignee_id)?.name ||
                    "Equipe"
                  : "Sem responsável"}
              </span>
              <b>
                {o.quote_released && o.total_cents !== null
                  ? brl(o.total_cents)
                  : "Total a confirmar"}
              </b>
              <span aria-hidden="true">↗</span>
            </Link>
          ))}
        </div>
      ) : (
        <Notice>
          Nenhum pedido encontrado. Altere os filtros ou aguarde a primeira
          encomenda.
        </Notice>
      )}
    </AccountShell>
  );
}

export function AdminDetailPage() {
  return (
    <Protected staff>
      <AdminDetail />
    </Protected>
  );
}
type Field = {
  key: string;
  label: string;
  type?: string;
  required?: boolean;
  value?: string;
};
function ActionForm({
  title,
  fields = [],
  children,
  submit,
  busy,
  danger = false,
}: {
  title: string;
  fields?: Field[];
  children?: ReactNode;
  submit: (values: Record<string, string>) => Promise<void>;
  busy: boolean;
  danger?: boolean;
}) {
  return (
    <form
      className="panel-action-form"
      onSubmit={(e) => {
        e.preventDefault();
        const values = Object.fromEntries(
          new FormData(e.currentTarget).entries(),
        ) as Record<string, string>;
        if (
          danger &&
          !window.confirm(
            "Confirme que conferiu as informações desta ação. A mudança ficará no histórico.",
          )
        )
          return;
        void submit(values);
      }}
    >
      <h3>{title}</h3>
      {fields.map((f) => (
        <label key={f.key}>
          {f.label}
          {f.type === "textarea" ? (
            <textarea
              name={f.key}
              required={f.required}
              maxLength={2000}
              rows={3}
              defaultValue={f.value}
            />
          ) : (
            <input
              name={f.key}
              type={f.type || "text"}
              required={f.required}
              defaultValue={f.value}
              min={f.type === "number" ? 0 : undefined}
              step={f.type === "number" ? "0.01" : undefined}
              maxLength={1000}
            />
          )}
        </label>
      ))}
      {children}
      <button
        className={`account-button ${danger ? "danger" : ""}`}
        disabled={busy}
      >
        {busy ? "Salvando…" : title}
      </button>
    </form>
  );
}
function AdminDetail() {
  const { id } = useParams();
  const { session } = useCommerce();
  const resource = useResource<Order>(`admin/orders/${id}`),
    team = useResource<TeamMember[]>("admin/team");
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [draft, setDraft] = useState("");
  const order = resource.data;
  const addressForm = useForm<any>();
  useEffect(() => {
    if (order) {
      setDraft(orderMessage(order, window.location.origin, "update"));
      addressForm.reset({ ...order.address, reason: "" });
    }
  }, [order?.id, order?.version]);
  const owner = session.user?.role === "owner";
  async function act(action: OrderAction, data: Record<string, unknown> = {}) {
    if (!order) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const updated = await post<Order>(`admin/orders/${order.id}/actions`, {
        version: order.version,
        action,
        data,
      });
      resource.setData(updated);
      setNotice(
        "Alteração registrada. O acompanhamento do cliente já foi atualizado.",
      );
      return updated;
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function prepare() {
    const updated = await act("contact_prepared");
    if (updated)
      window.open(
        `https://wa.me/${updated.customer.phone}?text=${encodeURIComponent(draft)}`,
        "_blank",
        "noopener,noreferrer",
      );
  }
  return (
    <AccountShell
      title={order?.reference || "Pedido."}
      intro={
        order
          ? `${order.customer.name} · ${stageLabels[order.stage]}`
          : undefined
      }
    >
      <PanelNav />
      {resource.loading ? (
        <Busy />
      ) : resource.error ? (
        <>
          <Notice error>{resource.error}</Notice>
          <button
            className="account-button"
            onClick={() => void resource.reload()}
          >
            Consultar novamente
          </button>
        </>
      ) : (
        order && (
          <>
            {error && <Notice error>{error}</Notice>}
            {notice && <Notice>{notice}</Notice>}
            {order.test_mode && (
              <Notice>Pedido de teste. Não cobrar nem produzir.</Notice>
            )}
            <div className="account-two-columns">
              <section className="account-card">
                <OrderLines order={order} />
                <OrderFacts order={order} internal />
                <p>
                  {order.customer.email}
                  <br />
                  WhatsApp: +{order.customer.phone}
                </p>
                <h2>Histórico do cliente.</h2>
                <OrderTimeline order={order} />
                <details>
                  <summary>Alterar endereço a pedido do cliente</summary>
                  <form
                    onSubmit={addressForm.handleSubmit(async (values) => {
                      await act("address", {
                        address: {
                          ...values,
                          id: undefined,
                          reason: undefined,
                        },
                        reason: values.reason,
                      });
                    })}
                  >
                    <AddressFields
                      register={addressForm.register}
                      errors={addressForm.formState.errors}
                    />
                    <label>
                      Motivo / solicitação do cliente
                      <input
                        {...addressForm.register("reason", {
                          required: true,
                          minLength: 3,
                        })}
                        required
                        minLength={3}
                      />
                    </label>
                    <button
                      className="account-button"
                      disabled={
                        busy || (!owner && order.payment_state !== "pending")
                      }
                    >
                      Registrar alteração
                    </button>
                  </form>
                </details>
                {(owner || order.payment_state === "pending") &&
                  ![
                    "production",
                    "packing",
                    "shipped",
                    "delivered",
                    "cancelled",
                  ].includes(order.stage) && (
                    <details>
                      <summary>
                        Alterar peças ou tamanhos a pedido do cliente
                      </summary>
                      <ItemsEditor
                        key={order.version}
                        order={order}
                        busy={busy}
                        submit={async (items, reason) => {
                          await act("items", { items, reason });
                        }}
                      />
                    </details>
                  )}
                <h2>Notas internas.</h2>
                <ActionForm
                  title="Salvar nota interna"
                  fields={[
                    {
                      key: "body",
                      label: "Somente a equipe verá esta nota",
                      type: "textarea",
                      required: true,
                    },
                  ]}
                  busy={busy}
                  submit={async (v) => {
                    await act("note", v);
                  }}
                />
                {order.notes?.map((n) => (
                  <article className="panel-note" key={n.id}>
                    <p>{n.body}</p>
                    <small>
                      {team.data?.find((t) => t.user_id === n.author_id)
                        ?.name || "Equipe"}{" "}
                      · {dateLabel(n.created_at)}
                    </small>
                  </article>
                ))}
              </section>
              <aside className="panel-operations">
                <section className="account-card">
                  <h2>Próxima etapa.</h2>
                  <p className="account-muted">
                    As ações ficam disponíveis conforme o andamento e sua
                    permissão.
                  </p>
                  <fieldset className="payment-options">
                    <legend>Conferência da equipe</legend>
                    {[
                      ["address_confirmed", "Dados e endereço conferidos"],
                      [
                        "production_reviewed",
                        "Peças e tamanhos conferidos para produção",
                      ],
                      ["package_checked", "Embalagem conferida para postagem"],
                    ].map(([key, label]) => (
                      <label key={key}>
                        <input
                          type="checkbox"
                          checked={
                            !!order.checklist[
                              key as keyof typeof order.checklist
                            ]
                          }
                          disabled={busy || order.stage === "cancelled"}
                          onChange={(e) =>
                            void act("checklist", {
                              key,
                              checked: e.target.checked,
                            })
                          }
                        />
                        {label}
                      </label>
                    ))}
                  </fieldset>
                  <div className="account-actions">
                    {order.stage === "received" && (
                      <button
                        className="account-button primary"
                        disabled={busy}
                        onClick={() => void act("start")}
                      >
                        Iniciar atendimento
                      </button>
                    )}
                    {order.payment_state === "paid" &&
                      (
                        [
                          ["confirmed", "production", "Iniciar produção"],
                          ["production", "packing", "Preparar envio"],
                          ["shipped", "deliver", "Confirmar entrega"],
                        ] as const
                      )
                        .filter(([stage]) => stage === order.stage)
                        .map(([, action, label]) => (
                          <button
                            className="account-button primary"
                            key={action}
                            disabled={busy}
                            onClick={() => void act(action)}
                          >
                            {label}
                          </button>
                        ))}
                    {!order.assignee_id && (
                      <button
                        className="account-button"
                        disabled={busy}
                        onClick={() =>
                          void act("assign", { assignee: session.user?.id })
                        }
                      >
                        Assumir atendimento
                      </button>
                    )}
                    {order.assignee_id === session.user?.id && (
                      <button
                        className="account-button"
                        disabled={busy}
                        onClick={() => void act("assign", { assignee: null })}
                      >
                        Liberar responsável
                      </button>
                    )}
                  </div>
                  {owner && (
                    <label>
                      Responsável
                      <select
                        value={order.assignee_id || ""}
                        disabled={busy}
                        onChange={(e) =>
                          void act("assign", {
                            assignee: e.target.value || null,
                          })
                        }
                      >
                        <option value="">Sem responsável</option>
                        {team.data
                          ?.filter((t) => t.active)
                          .map((t) => (
                            <option key={t.user_id} value={t.user_id}>
                              {t.name}
                            </option>
                          ))}
                      </select>
                    </label>
                  )}
                  {order.payment_state === "pending" &&
                    ["received", "in_service", "awaiting_payment"].includes(
                      order.stage,
                    ) && (
                      <ActionForm
                        title="Salvar frete e prazo para conferência"
                        fields={[
                          {
                            key: "shipping",
                            label: "Frete em reais",
                            type: "number",
                            required: true,
                            value:
                              order.shipping_cents !== null
                                ? String(order.shipping_cents / 100)
                                : "",
                          },
                          {
                            key: "deadline",
                            label: "Prazo combinado de produção e entrega",
                            required: true,
                            value: order.production_deadline || "",
                          },
                        ]}
                        busy={busy}
                        submit={async (v) => {
                          await act("quote", {
                            shippingCents: Math.round(Number(v.shipping) * 100),
                            deadline: v.deadline,
                          });
                        }}
                      />
                    )}
                  {owner &&
                    order.payment_state === "pending" &&
                    order.shipping_cents !== null &&
                    ["in_service", "awaiting_payment"].includes(
                      order.stage,
                    ) && (
                      <ActionForm
                        title="Liberar condições para o cliente"
                        fields={[
                          {
                            key: "paymentUrl",
                            label: "Link oficial de pagamento (opcional)",
                            type: "url",
                            value: order.payment_url || "",
                          },
                        ]}
                        busy={busy}
                        danger
                        submit={async (v) => {
                          await act("release_quote", v);
                        }}
                      >
                        <p>
                          Total com frete:{" "}
                          <strong>{brl(order.total_cents!)}</strong>
                        </p>
                      </ActionForm>
                    )}
                  {owner && order.stage === "awaiting_payment" && (
                    <ActionForm
                      title="Confirmar recebimento"
                      fields={[
                        {
                          key: "reason",
                          label: "Referência da conferência no provedor",
                          required: true,
                        },
                      ]}
                      busy={busy}
                      danger
                      submit={async (v) => {
                        await act("pay", v);
                      }}
                    >
                      <p>
                        Confirme somente após verificar o dinheiro recebido.
                      </p>
                    </ActionForm>
                  )}
                  {order.stage === "packing" && (
                    <ActionForm
                      title="Registrar envio"
                      fields={[
                        {
                          key: "trackingCode",
                          label: "Código de rastreamento",
                          required: true,
                        },
                        {
                          key: "trackingUrl",
                          label: "Link oficial de rastreamento (opcional)",
                          type: "url",
                        },
                        {
                          key: "reason",
                          label: "Referência da postagem",
                          required: true,
                        },
                      ]}
                      busy={busy}
                      submit={async (v) => {
                        await act("ship", v);
                      }}
                    />
                  )}
                  {owner &&
                    order.stage !== "cancelled" &&
                    order.stage !== "delivered" && (
                      <details>
                        <summary>Cancelamento</summary>
                        <ActionForm
                          title="Cancelar pedido"
                          fields={[
                            {
                              key: "reason",
                              label: "Motivo do cancelamento",
                              required: true,
                            },
                          ]}
                          busy={busy}
                          danger
                          submit={async (v) => {
                            await act("cancel", v);
                          }}
                        />
                      </details>
                    )}
                  {owner && order.payment_state === "refund_pending" && (
                    <ActionForm
                      title="Confirmar estorno realizado"
                      fields={[
                        {
                          key: "reason",
                          label: "Referência do estorno no provedor",
                          required: true,
                        },
                      ]}
                      busy={busy}
                      danger
                      submit={async (v) => {
                        await act("refund", v);
                      }}
                    />
                  )}
                  <button
                    className="account-button"
                    onClick={() => void resource.reload()}
                  >
                    Recarregar pedido
                  </button>
                </section>
                <section className="account-card">
                  <h2>Avise o cliente.</h2>
                  <label>
                    Mensagem pronta para revisar
                    <textarea
                      rows={9}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                    />
                  </label>
                  <button
                    className="account-button primary"
                    onClick={() => void prepare()}
                    disabled={busy}
                  >
                    Preparar mensagem no WhatsApp
                  </button>
                  <p className="account-muted">
                    Você revisa e envia na conversa. Abrir o WhatsApp não
                    confirma envio ou leitura.
                  </p>
                  <button
                    className="account-button"
                    disabled={busy}
                    onClick={() => void act("contact_done")}
                  >
                    Marcar atendimento realizado
                  </button>
                  {order.contacts?.map((c) => (
                    <p key={c.id} className="account-muted">
                      {c.kind === "prepared"
                        ? "Mensagem preparada"
                        : "Atendimento declarado pela equipe"}{" "}
                      · {dateLabel(c.created_at)}
                    </p>
                  ))}
                </section>
              </aside>
            </div>
          </>
        )
      )}
    </AccountShell>
  );
}

export function TeamPage() {
  return (
    <Protected owner>
      <Team />
    </Protected>
  );
}
function Team() {
  const resource = useResource<TeamMember[]>("admin/team?full=true");
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  async function change(email: string, active: boolean) {
    setBusy(true);
    setError("");
    try {
      const result = await post<{ invited: boolean }>("admin/team", {
        email,
        active,
      });
      setNotice(
        !active
          ? "Acesso desativado. Novas operações serão bloqueadas."
          : result.invited
            ? "Convite enviado. O acesso ao painel exige confirmação e autenticador."
            : "Acesso habilitado para esta conta. Oriente a pessoa a entrar e configurar o autenticador.",
      );
      await resource.reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <AccountShell
      title="Equipe ZXXR."
      intro="Pessoas autorizadas, com acesso individual e histórico de ações."
    >
      <PanelNav />
      {notice && <Notice>{notice}</Notice>}
      {error && <Notice error>{error}</Notice>}
      <section className="account-card">
        <ActionForm
          title="Convidar funcionário"
          fields={[
            {
              key: "email",
              label: "E-mail da pessoa",
              type: "email",
              required: true,
            },
          ]}
          busy={busy}
          submit={async (v) => {
            await change(v.email, true);
          }}
        />
        {resource.loading ? (
          <Busy />
        ) : resource.error ? (
          <Notice error>{resource.error}</Notice>
        ) : (
          resource.data?.map((t) => (
            <article key={t.user_id} className="team-member">
              <div>
                <strong>{t.name}</strong>
                <p>{t.email}</p>
                <small>
                  {t.role === "owner"
                    ? "Dono"
                    : t.active
                      ? "Funcionário ativo"
                      : "Acesso desativado"}
                </small>
              </div>
              {t.role !== "owner" && (
                <button
                  className="account-button"
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        `${t.active ? "Desativar" : "Reativar"} o acesso de ${t.email}?`,
                      )
                    )
                      void change(t.email, !t.active);
                  }}
                >
                  {t.active ? "Desativar" : "Reativar"}
                </button>
              )}
            </article>
          ))
        )}
      </section>
    </AccountShell>
  );
}

export function SettingsPage() {
  return (
    <Protected owner>
      <Settings />
    </Protected>
  );
}
function Settings() {
  const { catalog, catalogError, refreshCatalog } = useCommerce();
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  async function settings(open: boolean, boleto: boolean) {
    setBusy(true);
    setError("");
    try {
      await api("admin/settings", {
        method: "PUT",
        body: JSON.stringify({ open, boleto }),
      });
      await refreshCatalog();
      setNotice("Configuração salva. Os pedidos existentes foram preservados.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function variant(productId: string, v: Record<string, string>) {
    setBusy(true);
    setError("");
    try {
      await api("admin/settings/variant", {
        method: "PUT",
        body: JSON.stringify({
          productId,
          priceCents: Math.round(Number(v.price) * 100),
          active: v.active === "true",
        }),
      });
      await refreshCatalog();
      setNotice(
        "Catálogo atualizado. Os pedidos anteriores mantêm os valores originais.",
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <AccountShell
      title="Loja e catálogo."
      intro="Controle as novas encomendas sem alterar o histórico de quem já comprou."
    >
      <PanelNav />
      {notice && <Notice>{notice}</Notice>}
      {error && <Notice error>{error}</Notice>}
      {!catalog ? (
        <>
          <Notice error>{catalogError || "Consultando configurações…"}</Notice>
          <button
            className="account-button"
            onClick={() => void refreshCatalog()}
          >
            Consultar novamente
          </button>
        </>
      ) : (
        <>
          <section className="account-card">
            <h2>Encomendas {catalog.open ? "abertas" : "encerradas"}.</h2>
            <p>
              {catalog.testMode
                ? "Este ambiente está em modo de teste."
                : "Este ambiente está em produção."}
            </p>
            <div className="account-actions">
              <button
                className="account-button primary"
                disabled={busy}
                onClick={() => {
                  if (
                    window.confirm(
                      catalog.open
                        ? "Encerrar novas encomendas e preservar os pedidos existentes?"
                        : "Abrir novas encomendas neste ambiente?",
                    )
                  )
                    void settings(
                      !catalog.open,
                      catalog.paymentMethods.includes("boleto"),
                    );
                }}
              >
                {catalog.open
                  ? "Encerrar novas encomendas"
                  : "Abrir novas encomendas"}
              </button>
              <label className="account-check">
                <input
                  type="checkbox"
                  checked={catalog.paymentMethods.includes("boleto")}
                  disabled={busy}
                  onChange={(e) =>
                    void settings(catalog.open, e.target.checked)
                  }
                />
                Disponibilizar preferência por boleto
              </label>
            </div>
          </section>
          <div className="catalog-settings">
            {products.map((p) => {
              const current = catalog.variants.find(
                (v) => v.product_id === p.id,
              );
              return (
                <section
                  className="account-card"
                  key={`${p.id}:${current?.price_cents}:${current?.active}`}
                >
                  <img src={p.front} width="70" height="86" alt="" />
                  <ActionForm
                    title={`Salvar ${p.name}`}
                    fields={[
                      {
                        key: "price",
                        label: "Preço por peça em reais",
                        type: "number",
                        required: true,
                        value: String((current?.price_cents ?? 10000) / 100),
                      },
                    ]}
                    busy={busy}
                    submit={async (v) => {
                      await variant(p.id, v);
                    }}
                  >
                    <label>
                      Disponibilidade
                      <select
                        name="active"
                        defaultValue={String(current?.active ?? true)}
                      >
                        <option value="true">
                          Disponível nos quatro tamanhos
                        </option>
                        <option value="false">
                          Indisponível para novas encomendas
                        </option>
                      </select>
                    </label>
                  </ActionForm>
                </section>
              );
            })}
          </div>
        </>
      )}
    </AccountShell>
  );
}
