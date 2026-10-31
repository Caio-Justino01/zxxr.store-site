import test from "node:test";
import assert from "node:assert/strict";
import {
  CHART,
  buildInsightHighlights,
  formatInsightDate,
  formatInsightPeriod,
  formatInsightValue,
  formatTimelineLimit,
  insightGeometry,
  insightMetrics,
  insightPointIndex,
  metricVariation,
  topInsight,
  valuesFor,
} from "../src/analytics/insights-model.ts";
import type {
  AnalyticsOverview,
  AnalyticsMetricTotals,
} from "../src/analytics/contracts.ts";

const metrics: AnalyticsMetricTotals = {
  visitors: 0,
  sessions: 0,
  pageViews: 0,
  productClicks: 0,
  addToCart: 0,
  checkoutStarts: 0,
  whatsappClicks: 0,
  registeredOrders: 0,
  paidOrders: 0,
  paidRevenueCents: 0,
};
const overview = (): AnalyticsOverview => ({
  period: {
    from: "2026-10-31",
    to: "2026-10-31",
    timeZone: "America/Sao_Paulo",
  },
  generatedAt: "2026-10-31T05:00:00Z",
  coverage: "Measured",
  totals: {
    ...metrics,
    activeNow: 0,
    abandonedCarts: 0,
    abandonedCartsEstimated: 0,
    recoveryEligibleCount: 0,
    recoveredCarts: 0,
  },
  pages: [],
  sections: [],
  products: [],
  sources: [],
  devices: [],
  daily: [],
  timeline: {
    granularity: "hour",
    through: "2026-10-31T05:00:00Z",
    points: [
      { ...metrics, at: "2026-10-31T03:00:00Z" },
      { ...metrics, at: "2026-10-31T04:00:00Z" },
    ],
  },
});

test("ten selectable indicators have distinct keys and only confirmed value uses money", () => {
  assert.equal(insightMetrics.length, 10);
  assert.equal(new Set(insightMetrics.map((metric) => metric.key)).size, 10);
  assert.deepEqual(
    insightMetrics
      .filter((metric) => metric.unit === "money")
      .map((metric) => metric.key),
    ["paidRevenueCents"],
  );
  assert.match(formatInsightValue("paidRevenueCents", 14990), /149,90/);
  assert.equal(formatInsightValue("pageViews", 1200), "1.200");
  assert.match(formatInsightValue("paidRevenueCents", 25, true), /0,25/);
  assert.equal(formatInsightValue("visitors", Number.NaN), "0");
});

test("variation never invents infinite growth or a percentage without a previous base", () => {
  assert.deepEqual(metricVariation(10, 0), {
    label: "Sem base anterior",
    direction: "none",
  });
  assert.deepEqual(metricVariation(0, 0), {
    label: "Sem base anterior",
    direction: "none",
  });
  assert.deepEqual(metricVariation(10, null), {
    label: "Comparação indisponível",
    direction: "none",
  });
  assert.deepEqual(metricVariation(15, 10), { label: "+50%", direction: "up" });
  assert.deepEqual(metricVariation(0, 10), {
    label: "-100%",
    direction: "down",
  });
  assert.deepEqual(metricVariation(10, 10), { label: "0%", direction: "same" });
});

test("labels use Brasilia at the UTC boundary and retain actual previous dates", () => {
  assert.equal(formatInsightDate("2026-11-01T02:30:00Z", "hour"), "23:30");
  assert.equal(formatInsightDate("2026-11-01T02:30:00Z", "day"), "31/10");
  assert.match(
    formatInsightDate("2026-10-30T03:00:00Z", "hour", true),
    /30\/10/,
  );
  assert.equal(
    formatInsightPeriod({ from: "2026-10-25", to: "2026-10-31" }),
    "25/10 a 31/10",
  );
  assert.equal(
    formatInsightPeriod({ from: "2026-10-31", to: "2026-10-31" }),
    "31/10",
  );
  assert.equal(formatInsightDate("invalid", "day"), "—");
});

test("partial windows show the Brasilia cutoff while full days do not look partial", () => {
  assert.equal(
    formatTimelineLimit("2026-10-31T04:23:00Z", "2026-10-31"),
    "Até 01:23 · Brasília",
  );
  assert.equal(
    formatTimelineLimit("2026-10-30T04:23:00Z", "2026-10-30"),
    "Até 01:23 · Brasília",
  );
  assert.equal(formatTimelineLimit("2026-11-01T03:00:00Z", "2026-10-31"), null);
  assert.equal(
    formatTimelineLimit("2026-11-01T02:30:00Z", "2026-10-31"),
    "Até 23:30 · Brasília",
  );
  assert.equal(formatTimelineLimit("invalid", "2026-10-31"), null);
  for (const key of ["visitors", "sessions", "checkoutStarts"]) {
    const note = insightMetrics.find((entry) => entry.key === key)!.note;
    assert.match(note, /período/);
    assert.match(note, /intervalos/);
  }
});

test("chart geometry includes previous highs, zero and single points without future padding", () => {
  const empty = insightGeometry([]);
  assert.equal(empty.currentPath, "");
  assert.deepEqual(empty.current, []);
  assert.ok(empty.ticks.every(Number.isInteger));
  const only = insightGeometry([0]);
  assert.equal(only.current.length, 1);
  assert.equal(only.current[0].x, CHART.width / 2);
  assert.equal(only.current[0].y, CHART.bottom);
  const both = insightGeometry([2, 4], [100, 50]);
  assert.ok(both.ceiling >= 100);
  assert.equal(both.current.length, 2);
  assert.equal(both.previous.length, 2);
  assert.equal(both.current[0].x, both.previous[0].x);
  assert.equal(both.current[1].x, CHART.right);
  assert.ok(
    both.previous.every(
      (point) => point.y >= CHART.top && point.y <= CHART.bottom,
    ),
  );
  assert.ok(insightGeometry([1, 2, 3]).ticks.every(Number.isInteger));
});

test("touch coordinates select the same bucket across sizes and clamp outside the plot", () => {
  assert.equal(insightPointIndex(200, 100, 200, 7), 3);
  assert.equal(insightPointIndex(550, 100, 900, 7), 3);
  assert.equal(insightPointIndex(-100, 100, 200, 7), 0);
  assert.equal(insightPointIndex(900, 100, 200, 7), 6);
  assert.equal(insightPointIndex(150, 100, 0, 7), 0);
  assert.equal(insightPointIndex(150, 100, 200, 1), 0);
});

test("highlights preserve ties, aggregate source campaigns and describe devices without causal claims", () => {
  const data = overview();
  data.timeline!.points[0].sessions = 3;
  data.timeline!.points[1].sessions = 3;
  data.products = [
    { productId: "one", views: 10, clicks: 3, adds: 1 },
    { productId: "two", views: 20, clicks: 3, adds: 0 },
  ];
  data.sources = [
    { source: "instagram", medium: "social", campaign: "A", sessions: 2 },
    { source: "instagram", medium: "social", campaign: "B", sessions: 3 },
    { source: "direto", medium: "", campaign: "", sessions: 4 },
  ];
  data.devices = [
    { device: "mobile", sessions: 3 },
    { device: "desktop", sessions: 1 },
  ];
  const highlights = buildInsightHighlights(data, (id) =>
    id === "one" ? "Emoção" : "Spiritual Gangsta",
  );
  assert.match(highlights[0].detail, /Empate/);
  assert.equal(highlights[1].value, "Emoção e Spiritual Gangsta");
  assert.match(highlights[1].detail, /3 cliques em cada/);
  assert.equal(highlights[2].value, "Emoção");
  assert.match(highlights[2].detail, /1 adição medida/);
  assert.equal(highlights[3].value, "instagram");
  assert.match(highlights[3].detail, /5 sessões/);
  assert.equal(highlights[4].value, "Celular");
  assert.match(highlights[4].detail, /75%/);
  assert.doesNotMatch(
    JSON.stringify(highlights),
    /venda|conversão|causou|gerou/,
  );
});

test("empty highlights do not pick a winner and historical bucket values are not used as period totals", () => {
  const data = overview();
  assert.deepEqual(
    topInsight([
      { label: "Emoção", value: 0 },
      { label: "ZXXR", value: 0 },
    ]),
    { maximum: 0, labels: [] },
  );
  assert.ok(
    buildInsightHighlights(data, (id) => id).every(
      (highlight) => highlight.value === "Sem atividade medida",
    ),
  );
  data.totals.visitors = 1;
  data.timeline!.points[0].visitors = 1;
  data.timeline!.points[1].visitors = 1;
  assert.deepEqual(valuesFor(data.timeline, "visitors"), [1, 1]);
  assert.equal(data.totals.visitors, 1);
  assert.deepEqual(valuesFor(undefined, "visitors"), []);
  data.timeline = undefined;
  assert.equal(
    buildInsightHighlights(data, (id) => id)[0].value,
    "Histórico indisponível",
  );
});
