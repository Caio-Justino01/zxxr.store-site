import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { AccountShell, Busy, Notice, Protected } from "../commerce/ui";
import { api, errorMessage, post } from "../commerce/client";
import { brl } from "../commerce/contracts";
import { productById } from "../config/products";
import type {
  AnalyticsOverview,
  AnalyticsMetricKey,
  RecoveryLead,
  RecoveryOverview,
} from "./contracts";
import "./analytics.css";
import { InsightsChart } from "./InsightsChart";

const names: Record<string, string> = {
  hero: "Apresentação",
  products: "Peças disponíveis",
  "coming-soon": "Próximos desejos",
  guide: "Guia de compra",
  music: "Música de Razz",
  footer: "Rodapé",
  navigation: "Navegação",
  support: "Ajuda",
  mobile: "Celular",
  tablet: "Tablet",
  desktop: "Computador",
};
function dateInput(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
function range(days: number) {
  const today = dateInput(new Date());
  const start = new Date(`${today}T12:00:00-03:00`);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return { from: dateInput(start), to: today };
}
function time(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
function number(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}
function pageName(page: string) {
  if (page === "/") return "Página inicial";
  if (page === "/espera" || page === "/espera.html") return "Página de espera";
  if (page === "/sacola") return "Sacola";
  if (page === "/encomenda") return "Checkout";
  return page.startsWith("/produto/")
    ? (productById(page.split("/")[2])?.name ?? "Peça")
    : page;
}
export function AnalyticsPage() {
  return (
    <Protected owner>
      <AnalyticsDashboard />
    </Protected>
  );
}
function AnalyticsDashboard() {
  const [period, setPeriod] = useState("7");
  const [metric, setMetric] = useState<AnalyticsMetricKey>("visitors");
  const [compare, setCompare] = useState(true);
  const [dates, setDates] = useState(() => range(7));
  const [report, setData] = useState<AnalyticsOverview | null>(null);
  const [recovery, setRecovery] = useState<RecoveryOverview | null>(null);
  const [error, setError] = useState("");
  const [recoveryError, setRecoveryError] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const generation = useRef(0);
  const pending = useRef<{ key: string; controller: AbortController } | null>(
    null,
  );
  const valid =
    dates.from <= dates.to &&
    dates.from.length === 10 &&
    dates.to.length === 10 &&
    dates.to <= dateInput(new Date()) &&
    Number.isFinite(Date.parse(dates.from)) &&
    Number.isFinite(Date.parse(dates.to)) &&
    (Date.parse(dates.to) - Date.parse(dates.from)) / 86_400_000 <= 89;
  // A delayed result for another range must never appear under the new dates.
  const data =
    report?.period.from === dates.from && report.period.to === dates.to
      ? report
      : null;
  const load = useCallback(async () => {
    if (!valid) return;
    const requestKey = `${dates.from}:${dates.to}`;
    if (pending.current?.key === requestKey) return;
    pending.current?.controller.abort();
    const controller = new AbortController();
    pending.current = { key: requestKey, controller };
    setBusy(true);
    const token = ++generation.current;
    const query = new URLSearchParams({
      from: dates.from,
      to: dates.to,
    }).toString();
    const results = await Promise.allSettled([
      api<AnalyticsOverview>(`admin/analytics?${query}`, {
        signal: controller.signal,
      }),
      api<RecoveryOverview>("admin/recovery", { signal: controller.signal }),
    ]);
    if (token === generation.current && !controller.signal.aborted) {
      if (results[0].status === "fulfilled") {
        setData(results[0].value);
        setError("");
      } else setError(errorMessage(results[0].reason));
      if (results[1].status === "fulfilled") {
        setRecovery(results[1].value);
        setRecoveryError("");
      } else setRecoveryError(errorMessage(results[1].reason));
      setBusy(false);
    }
    if (pending.current?.controller === controller) pending.current = null;
  }, [dates.from, dates.to, valid]);
  useEffect(() => {
    if (!valid) {
      setBusy(false);
      return;
    }
    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 15_000);
    return () => {
      clearInterval(timer);
      generation.current++;
      pending.current?.controller.abort();
      pending.current = null;
    };
  }, [load, valid]);
  async function contact(lead: RecoveryLead, contacted: boolean) {
    setActionId(lead.id);
    setMessage("");
    // Open synchronously so browsers don't silently block a window after the API check.
    const opened = !contacted ? window.open("about:blank", "_blank") : null;
    if (opened) opened.opener = null;
    try {
      if (contacted) {
        await post(`admin/recovery/${lead.id}/contacted`, {
          version: lead.version,
        });
        setMessage(
          "Contato marcado manualmente. Isso não confirma envio nem entrega no WhatsApp.",
        );
      } else {
        const next = await post<{ url: string; preparedAt: string }>(
          `admin/recovery/${lead.id}/prepare-contact`,
          { version: lead.version },
        );
        const url = new URL(next.url);
        if (url.protocol !== "https:" || url.hostname !== "wa.me")
          throw new Error("O contato recebido não é válido.");
        if (opened) opened.location.replace(url.href);
        else {
          setMessage(
            "O navegador bloqueou a nova aba. Permita abrir janelas e tente novamente.",
          );
        }
      }
      await load();
    } catch (e) {
      opened?.close();
      setMessage(errorMessage(e));
      await load();
    } finally {
      setActionId(null);
    }
  }
  const totals = data?.totals;
  return (
    <AccountShell
      title="O movimento da ZXXR."
      intro="Acessos medidos, escolhas de peças e oportunidades de atendimento."
    >
      <nav className="panel-nav" aria-label="Administração">
        <Link to="/painel/pedidos">Pedidos</Link>
        <Link to="/painel/analytics" aria-current="page">
          Analytics
        </Link>
        <Link to="/painel/equipe">Equipe</Link>
        <Link to="/painel/configuracoes">Loja e catálogo</Link>
      </nav>
      <section className="analytics-toolbar" aria-label="Período do relatório">
        <label>
          Período
          <select
            value={period}
            onChange={(e) => {
              setPeriod(e.target.value);
              if (e.target.value !== "custom")
                setDates(range(Number(e.target.value)));
            }}
          >
            <option value="1">Hoje</option>
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="custom">Personalizado</option>
          </select>
        </label>
        {period === "custom" && (
          <>
            <label>
              De
              <input
                type="date"
                max={dates.to}
                value={dates.from}
                onChange={(e) =>
                  setDates((v) => ({ ...v, from: e.target.value }))
                }
              />
            </label>
            <label>
              Até
              <input
                type="date"
                min={dates.from}
                max={dateInput(new Date())}
                value={dates.to}
                onChange={(e) =>
                  setDates((v) => ({ ...v, to: e.target.value }))
                }
              />
            </label>
          </>
        )}
        <button
          className="account-button"
          type="button"
          disabled={busy || !valid}
          onClick={() => void load()}
        >
          {busy ? "Atualizando…" : "Atualizar"}
        </button>
        <p>
          Horário de Brasília. Atualização a cada 15 segundos enquanto esta aba
          estiver visível.
        </p>
      </section>
      {!valid && <Notice error>Escolha até 90 dias, sem datas futuras.</Notice>}
      {error && (
        <Notice error>
          {error} Os números anteriores, quando presentes, não foram
          atualizados.
        </Notice>
      )}
      {!data && busy && <Busy />}
      {totals && data && (
        <>
          <div className="analytics-metrics">
            <article className="analytics-now">
              <p>Agora</p>
              <strong>{number(totals.activeNow)}</strong>
              <span>Sessões ativas nos últimos 5 minutos</span>
            </article>
            <article>
              <p>Visitantes estimados</p>
              <strong>{number(totals.visitors)}</strong>
              <span>{number(totals.sessions)} sessões medidas</span>
            </article>
            <article>
              <p>Páginas visualizadas</p>
              <strong>{number(totals.pageViews)}</strong>
              <span>No período selecionado</span>
            </article>
            <article>
              <p>Abandono estimado</p>
              <strong>{number(totals.abandonedCartsEstimated ?? 0)}</strong>
              <span>Sacolas medidas, após 24 horas sem atividade</span>
            </article>
          </div>
          <p className="analytics-coverage">
            {data.coverage ||
              "As estatísticas dependem de autorização e podem ser reduzidas por bloqueadores ou troca de dispositivo."}{" "}
            Atualizado em {time(data.generatedAt)}.
          </p>
          <InsightsChart
            data={data}
            metric={metric}
            onMetricChange={setMetric}
            compare={compare}
            onCompareChange={setCompare}
          />
          <section className="analytics-section">
            <h2>Da descoberta ao pedido</h2>
            <p>
              Interações medidas e resultados operacionais são exibidos
              separadamente. Abrir o WhatsApp não significa pagamento.
            </p>
            <div className="analytics-funnel">
              <article>
                <span>Cliques em peças</span>
                <strong>{number(totals.productClicks)}</strong>
              </article>
              <article>
                <span>Adições à sacola</span>
                <strong>{number(totals.addToCart)}</strong>
              </article>
              <article>
                <span>Checkout iniciado</span>
                <strong>{number(totals.checkoutStarts)}</strong>
              </article>
            </div>
            <div className="analytics-operational">
              <p>
                <strong>{number(totals.registeredOrders)}</strong> pedidos
                registrados
              </p>
              <p>
                <strong>{number(totals.paidOrders)}</strong> pagamentos
                confirmados
              </p>
              <p>
                <strong>{brl(totals.paidRevenueCents)}</strong> em pagamentos
                confirmados
              </p>
            </div>
          </section>
          <div className="analytics-columns">
            <section className="analytics-section">
              <h2>Peças</h2>
              <DataTable
                headings={["Camiseta", "Visualizações", "Cliques", "Adições"]}
                rows={data.products.map((p) => [
                  productById(p.productId)?.name ?? p.productId,
                  number(p.views),
                  number(p.clicks),
                  number(p.adds),
                ])}
              />
            </section>
            <section className="analytics-section">
              <h2>Seções</h2>
              <DataTable
                headings={["Seção", "Visualizações", "Cliques"]}
                rows={data.sections.map((s) => [
                  names[s.section] ?? s.section,
                  number(s.views),
                  number(s.clicks),
                ])}
              />
            </section>
          </div>
          <div className="analytics-columns">
            <section className="analytics-section">
              <h2>Páginas</h2>
              <DataTable
                headings={["Página", "Visualizações", "Sessões"]}
                rows={data.pages.map((p) => [
                  pageName(p.page),
                  number(p.views),
                  number(p.sessions),
                ])}
              />
            </section>
            <section className="analytics-section">
              <h2>Origem e dispositivo</h2>
              <DataTable
                headings={["Origem", "Campanha", "Sessões"]}
                rows={data.sources.map((s) => [
                  s.source || "Direto / não informado",
                  s.campaign || "—",
                  number(s.sessions),
                ])}
              />
              <DataTable
                headings={["Dispositivo", "Sessões"]}
                rows={data.devices.map((d) => [
                  names[d.device] ?? d.device,
                  number(d.sessions),
                ])}
              />
            </section>
          </div>
        </>
      )}
      <section className="analytics-section analytics-recovery">
        <h2>Uma ajuda para concluir</h2>
        <p>
          Sacolas com autorização de lembrete, contato válido e ao menos 24
          horas sem atividade. Esta lista mostra a situação atual,
          independentemente do período do gráfico. Contatos não são enviados
          automaticamente.
        </p>
        {recoveryError && <Notice error>{recoveryError}</Notice>}
        {message && <Notice>{message}</Notice>}
        {recovery && (
          <p>
            {number(recovery.totals.eligible)} elegíveis ·{" "}
            {number(recovery.totals.contacted)} marcadas como contatadas
          </p>
        )}
        {recovery?.items.length ? (
          <div className="recovery-list">
            {recovery.items.map((lead) => (
              <article className="recovery-lead" key={lead.id}>
                <div>
                  <h3>{lead.name}</h3>
                  <p>{lead.phone}</p>
                  <ul>
                    {lead.items.map((item) => (
                      <li key={`${item.productId}:${item.size}`}>
                        {productById(item.productId)?.name ?? "Peça"} ·{" "}
                        {item.size} · {item.quantity} un.
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p>
                    {lead.stage === "checkout"
                      ? "Checkout interrompido"
                      : "Sacola sem pedido"}
                  </p>
                  <p>Última atividade: {time(lead.lastActivityAt)}</p>
                  {lead.contactedAt && (
                    <p>Contato declarado: {time(lead.contactedAt)}</p>
                  )}
                  <div className="recovery-actions">
                    <button
                      className="account-button"
                      type="button"
                      disabled={actionId !== null}
                      onClick={() => void contact(lead, false)}
                    >
                      Abrir WhatsApp
                    </button>
                    <button
                      className="account-button"
                      type="button"
                      disabled={actionId !== null || !!lead.contactedAt}
                      onClick={() => void contact(lead, true)}
                    >
                      Marcar como contatado
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          !recoveryError && <p>Nenhuma sacola elegível para contato agora.</p>
        )}
      </section>
    </AccountShell>
  );
}
function DataTable({
  headings,
  rows,
}: {
  headings: string[];
  rows: string[][];
}) {
  return rows.length ? (
    <div className="analytics-table-wrap">
      <table>
        <thead>
          <tr>
            {headings.map((heading) => (
              <th key={heading} scope="col">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((value, j) =>
                j === 0 ? (
                  <th key={j} scope="row">
                    {value}
                  </th>
                ) : (
                  <td key={j}>{value}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <p>Ainda não há dados medidos neste período.</p>
  );
}
