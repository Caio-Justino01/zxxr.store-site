import type {
  AnalyticsMetricKey,
  AnalyticsOverview,
  AnalyticsTimeline,
} from "./contracts.ts";

export const insightMetrics: {
  key: AnalyticsMetricKey;
  label: string;
  unit: "count" | "money";
  note: string;
}[] = [
  {
    key: "visitors",
    label: "Visitantes estimados",
    unit: "count",
    note: "Total de visitantes medidos no período, sem somar os intervalos. Dispositivos diferentes podem contar separadamente.",
  },
  {
    key: "sessions",
    label: "Sessões",
    unit: "count",
    note: "Total de sessões distintas no período, sem somar os intervalos.",
  },
  {
    key: "pageViews",
    label: "Páginas visualizadas",
    unit: "count",
    note: "Visualizações medidas, incluindo visitas repetidas à mesma página.",
  },
  {
    key: "productClicks",
    label: "Cliques em peças",
    unit: "count",
    note: "Interações medidas com as peças; um visitante pode clicar mais de uma vez.",
  },
  {
    key: "addToCart",
    label: "Adições à sacola",
    unit: "count",
    note: "Eventos de adição medidos. Não representam unidades vendidas.",
  },
  {
    key: "checkoutStarts",
    label: "Checkouts iniciados",
    unit: "count",
    note: "Sessões que chegaram à finalização, contadas uma vez no período. O total não é a soma dos intervalos.",
  },
  {
    key: "whatsappClicks",
    label: "Cliques no WhatsApp",
    unit: "count",
    note: "Aberturas medidas do atendimento. Um clique não confirma envio ou pagamento.",
  },
  {
    key: "registeredOrders",
    label: "Pedidos registrados",
    unit: "count",
    note: "Pedidos salvos no sistema da loja durante o período.",
  },
  {
    key: "paidOrders",
    label: "Pagamentos confirmados",
    unit: "count",
    note: "Pedidos com pagamento confirmado no sistema, contados uma vez no período.",
  },
  {
    key: "paidRevenueCents",
    label: "Valor confirmado",
    unit: "money",
    note: "Total dos pagamentos confirmados no sistema. Esse valor não é lucro.",
  },
];

export const safeCount = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
export function formatInsightValue(
  key: AnalyticsMetricKey,
  value: number,
  compact = false,
) {
  const money = key === "paidRevenueCents";
  return new Intl.NumberFormat("pt-BR", {
    ...(money ? { style: "currency", currency: "BRL" } : {}),
    notation:
      compact && safeCount(value) >= (money ? 100_000 : 1_000)
        ? "compact"
        : "standard",
    maximumFractionDigits:
      money && (!compact || safeCount(value) < 10_000) ? 2 : compact ? 1 : 0,
    minimumFractionDigits: money && !compact ? 2 : 0,
  }).format(safeCount(value) / (money ? 100 : 1));
}

export function formatInsightDate(
  at: string,
  granularity: "hour" | "day",
  detailed = false,
) {
  const date = new Date(at);
  if (!Number.isFinite(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    ...(granularity === "hour"
      ? {
          hour: "2-digit",
          minute: "2-digit",
          ...(detailed ? { day: "2-digit", month: "2-digit" } : {}),
        }
      : {
          day: "2-digit",
          month: "2-digit",
          ...(detailed ? { year: "numeric" } : {}),
        }),
  }).format(date);
}

export function formatInsightPeriod(period: { from: string; to: string }) {
  const date = (day: string) =>
    formatInsightDate(`${day}T12:00:00-03:00`, "day");
  return period.from === period.to
    ? date(period.from)
    : `${date(period.from)} a ${date(period.to)}`;
}

/** The exclusive end of a full day is the next local date, not a partial hour. */
export function formatTimelineLimit(through: string, periodEnd: string) {
  const date = new Date(through);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) =>
    parts.find((entry) => entry.type === type)?.value ?? "";
  const localDate = `${part("year")}-${part("month")}-${part("day")}`;
  if (localDate > periodEnd) return null;
  return `Até ${formatInsightDate(through, "hour", localDate !== periodEnd)} · Brasília`;
}

export function metricVariation(current: number, previous: number | null) {
  if (previous === null)
    return { label: "Comparação indisponível", direction: "none" as const };
  if (previous <= 0)
    return { label: "Sem base anterior", direction: "none" as const };
  const change = ((safeCount(current) - previous) / previous) * 100;
  return {
    label: `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1, signDisplay: "exceptZero" }).format(change)}%`,
    direction:
      change > 0
        ? ("up" as const)
        : change < 0
          ? ("down" as const)
          : ("same" as const),
  };
}

export const CHART = {
  width: 900,
  height: 260,
  left: 12,
  right: 888,
  top: 16,
  bottom: 244,
};

/** Each point is a server bucket. Never manufacture future or previous buckets. */
export function insightGeometry(current: number[], previous: number[] = []) {
  const maximum = Math.max(
    0,
    ...current.map(safeCount),
    ...previous.map(safeCount),
  );
  let ceiling = 4;
  if (maximum > 0) {
    const stepTarget = maximum / 4;
    const base = 10 ** Math.floor(Math.log10(stepTarget));
    const normalized = stepTarget / base;
    const step = Math.max(
      1,
      (normalized <= 1
        ? 1
        : normalized <= 2
          ? 2
          : normalized <= 2.5
            ? 2.5
            : normalized <= 5
              ? 5
              : 10) * base,
    );
    ceiling = step * 4;
  }
  const count = Math.max(current.length, previous.length);
  const x = (index: number) =>
    count <= 1
      ? CHART.width / 2
      : CHART.left + (index / (count - 1)) * (CHART.right - CHART.left);
  const y = (value: number) =>
    CHART.bottom - (safeCount(value) / ceiling) * (CHART.bottom - CHART.top);
  const points = (values: number[]) =>
    values.map((value, i) => ({
      x: x(i),
      y: y(value),
      value: safeCount(value),
    }));
  const path = (values: number[]) =>
    points(values)
      .map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
      .join(" ");
  return {
    ceiling,
    ticks: [ceiling, ceiling * 0.75, ceiling * 0.5, ceiling * 0.25, 0],
    current: points(current),
    previous: points(previous),
    currentPath: path(current),
    previousPath: path(previous),
  };
}

export function insightPointIndex(
  clientX: number,
  rectLeft: number,
  rectWidth: number,
  count: number,
) {
  if (count <= 1 || !Number.isFinite(rectWidth) || rectWidth <= 0) return 0;
  const svgX = ((clientX - rectLeft) / rectWidth) * CHART.width;
  const fraction = Math.max(
    0,
    Math.min(1, (svgX - CHART.left) / (CHART.right - CHART.left)),
  );
  return Math.round(fraction * (count - 1));
}

type Ranked = { label: string; value: number };
export function topInsight(values: Ranked[]) {
  const maximum = Math.max(0, ...values.map((entry) => safeCount(entry.value)));
  return {
    maximum,
    labels:
      maximum > 0
        ? values
            .filter((entry) => entry.value === maximum)
            .map((entry) => entry.label)
        : [],
  };
}
function winners(labels: string[]) {
  if (labels.length <= 3)
    return labels.join(labels.length === 2 ? " e " : ", ");
  return `${labels.slice(0, 3).join(", ")} e mais ${labels.length - 3}`;
}
function rankedCopy(values: Ranked[], unit: string) {
  const top = topInsight(values);
  const singular: Record<string, string> = {
    "sessões medidas": "sessão medida",
    cliques: "clique",
    "adições medidas": "adição medida",
  };
  const noun = top.maximum === 1 ? (singular[unit] ?? unit) : unit;
  return top.maximum > 0
    ? {
        value: winners(top.labels),
        detail: `${top.labels.length > 1 ? "Empate: " : ""}${new Intl.NumberFormat("pt-BR").format(top.maximum)} ${noun}${top.labels.length > 1 ? " em cada" : ""}.`,
      }
    : {
        value: "Sem atividade medida",
        detail: "Ainda não há registros neste período.",
      };
}
const deviceNames: Record<string, string> = {
  mobile: "Celular",
  tablet: "Tablet",
  desktop: "Computador",
};
export type InsightHighlight = { title: string; value: string; detail: string };
export function buildInsightHighlights(
  data: AnalyticsOverview,
  productName: (id: string) => string,
): InsightHighlight[] {
  const timeline = data.timeline;
  const peak = timeline
    ? rankedCopy(
        timeline.points.map((point) => ({
          label: formatInsightDate(point.at, timeline.granularity, true),
          value: point.sessions,
        })),
        "sessões medidas",
      )
    : {
        value: "Histórico indisponível",
        detail: "A evolução por hora ou dia ainda não está disponível.",
      };
  const sourceCounts = new Map<string, number>();
  for (const source of data.sources) {
    const label =
      !source.source || source.source === "direto"
        ? "Direto / não informado"
        : source.source;
    sourceCounts.set(
      label,
      (sourceCounts.get(label) ?? 0) + safeCount(source.sessions),
    );
  }
  const deviceTotal = data.devices.reduce(
    (total, entry) => total + safeCount(entry.sessions),
    0,
  );
  const devices = topInsight(
    data.devices.map((entry) => ({
      label: deviceNames[entry.device] ?? entry.device,
      value: entry.sessions,
    })),
  );
  const share =
    deviceTotal > 0
      ? data.devices
          .map(
            (entry) =>
              `${deviceNames[entry.device] ?? entry.device}: ${new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 }).format(safeCount(entry.sessions) / deviceTotal)}`,
          )
          .join(" · ")
      : "Ainda não há sessões medidas neste período.";
  return [
    {
      title:
        timeline?.granularity === "hour"
          ? "Pico de acessos por hora"
          : "Pico de acessos por dia",
      ...peak,
    },
    {
      title: "Peça mais clicada",
      ...rankedCopy(
        data.products.map((entry) => ({
          label: productName(entry.productId),
          value: entry.clicks,
        })),
        "cliques",
      ),
    },
    {
      title: "Mais adicionada à sacola",
      ...rankedCopy(
        data.products.map((entry) => ({
          label: productName(entry.productId),
          value: entry.adds,
        })),
        "adições medidas",
      ),
    },
    {
      title: "Origem mais frequente",
      ...rankedCopy(
        [...sourceCounts].map(([label, value]) => ({ label, value })),
        "sessões medidas",
      ),
    },
    {
      title: "Participação por dispositivo",
      value:
        devices.maximum > 0
          ? `${devices.labels.length > 1 ? "Empate: " : ""}${winners(devices.labels)}`
          : "Sem atividade medida",
      detail: share,
    },
  ];
}

export function valuesFor(
  timeline: AnalyticsTimeline | null | undefined,
  key: AnalyticsMetricKey,
) {
  return timeline?.points.map((point) => safeCount(point[key])) ?? [];
}
