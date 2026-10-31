import {
  useId,
  useMemo,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import type { AnalyticsMetricKey, AnalyticsOverview } from "./contracts";
import { productById } from "../config/products";
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
  safeCount,
  valuesFor,
} from "./insights-model";
import "./insights.css";

/** The complete response stays in memory; choosing a view never makes a request. */
export function InsightsChart({
  data,
  metric: chosenMetric,
  onMetricChange,
  compare: chosenCompare,
  onCompareChange,
}: {
  data: AnalyticsOverview;
  metric?: AnalyticsMetricKey;
  onMetricChange?: (metric: AnalyticsMetricKey) => void;
  compare?: boolean;
  onCompareChange?: (compare: boolean) => void;
}) {
  const [localMetric, setLocalMetric] =
    useState<AnalyticsMetricKey>("visitors");
  const [localCompare, setLocalCompare] = useState(true);
  const metric = chosenMetric ?? localMetric;
  const compare = chosenCompare ?? localCompare;
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const id = useId();
  const selected = insightMetrics.find((entry) => entry.key === metric)!;
  const timeline = data.timeline;
  const canCompare = !!(
    data.comparison?.available &&
    data.comparison.totals &&
    data.comparison.timeline
  );
  const previous = compare && canCompare ? data.comparison!.timeline : null;
  const currentLimit = timeline
    ? formatTimelineLimit(timeline.through, data.period.to)
    : null;
  const previousLimit = previous
    ? formatTimelineLimit(previous.through, data.comparison!.period.to)
    : null;
  const geometry = useMemo(
    () =>
      insightGeometry(valuesFor(timeline, metric), valuesFor(previous, metric)),
    [timeline, previous, metric],
  );
  const total = safeCount(data.totals[metric]);
  const variation = metricVariation(
    total,
    canCompare ? safeCount(data.comparison!.totals![metric]) : null,
  );
  const count = Math.max(
    timeline?.points.length ?? 0,
    previous?.points.length ?? 0,
  );
  const index = Math.max(0, Math.min(count - 1, selectedPoint ?? count - 1));
  const point = timeline?.points[index];
  const previousPoint = previous?.points[index];
  const highlights = useMemo(
    () => buildInsightHighlights(data, (key) => productById(key)?.name ?? key),
    [data],
  );
  const choose = (key: AnalyticsMetricKey) => {
    setLocalMetric(key);
    onMetricChange?.(key);
    setSelectedPoint(null);
  };
  const chooseComparison = (enabled: boolean) => {
    setLocalCompare(enabled);
    onCompareChange?.(enabled);
  };
  const inspect = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setSelectedPoint(
      insightPointIndex(event.clientX, rect.left, rect.width, count),
    );
  };
  const keyInspect = (event: KeyboardEvent<HTMLDivElement>) => {
    const delta =
      event.key === "ArrowLeft" || event.key === "ArrowDown"
        ? -1
        : event.key === "ArrowRight" || event.key === "ArrowUp"
          ? 1
          : 0;
    if (!delta && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    setSelectedPoint(
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? Math.max(0, count - 1)
          : Math.max(0, Math.min(count - 1, index + delta)),
    );
  };
  const hasActivity = geometry.current.some((entry) => entry.value > 0);

  return (
    <section className="insights" aria-labelledby={`${id}-title`}>
      <header className="insights-heading">
        <div>
          <h2 id={`${id}-title`}>Seus insights.</h2>
          <p>Escolha um indicador para acompanhar o movimento da loja.</p>
        </div>
        <span className="insights-period">
          {formatInsightPeriod(data.period)} · Brasília
        </span>
      </header>
      {!timeline ? (
        <p className="insights-unavailable" role="status">
          O histórico visual ainda não está disponível para este período. Os
          demais relatórios continuam abaixo.
        </p>
      ) : (
        <>
          <div
            className="insights-metric-buttons"
            role="group"
            aria-label="Indicador do gráfico"
          >
            {insightMetrics.map((entry) => (
              <button
                key={entry.key}
                type="button"
                aria-pressed={metric === entry.key}
                onClick={() => choose(entry.key)}
              >
                <span>{entry.label}</span>
                <strong>
                  {formatInsightValue(
                    entry.key,
                    safeCount(data.totals[entry.key]),
                  )}
                </strong>
              </button>
            ))}
          </div>
          <label className="insights-metric-select">
            Indicador
            <select
              value={metric}
              onChange={(event) =>
                choose(event.target.value as AnalyticsMetricKey)
              }
            >
              {insightMetrics.map((entry) => (
                <option key={entry.key} value={entry.key}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
          <div className="insights-chart-panel">
            <div className="insights-chart-heading">
              <div className="insights-selected-metric">
                <h3>{selected.label}</h3>
                <strong>{formatInsightValue(metric, total)}</strong>
                <p>{selected.note}</p>
              </div>
              <div className="insights-comparison">
                <label>
                  <input
                    type="checkbox"
                    checked={compare}
                    onChange={(event) => chooseComparison(event.target.checked)}
                  />
                  Comparar com período anterior
                </label>
                {compare && (
                  <>
                    <strong data-direction={variation.direction}>
                      {variation.label}
                    </strong>
                    {canCompare && (
                      <span>
                        Anterior:{" "}
                        {formatInsightValue(
                          metric,
                          safeCount(data.comparison!.totals![metric]),
                        )}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="insights-legend" aria-label="Legenda do gráfico">
              <span>
                <i />
                <span>
                  {formatInsightPeriod(data.period)}
                  {currentLimit && <small>{currentLimit}</small>}
                </span>
              </span>
              {previous && (
                <span>
                  <i className="is-previous" />
                  <span>
                    {formatInsightPeriod(data.comparison!.period)}
                    {previousLimit && <small>{previousLimit}</small>}
                  </span>
                </span>
              )}
            </div>
            {compare && !canCompare && (
              <p className="insights-comparison-note">
                A comparação completa não está disponível no histórico deste
                período.
              </p>
            )}
            <div className="insights-plot-row">
              <div className="insights-axis-y" aria-hidden="true">
                {geometry.ticks.map((value, tick) => (
                  <span
                    key={tick}
                    style={{
                      top: `${((CHART.top + (tick * (CHART.bottom - CHART.top)) / 4) / CHART.height) * 100}%`,
                    }}
                  >
                    {formatInsightValue(metric, value, true)}
                  </span>
                ))}
              </div>
              <div
                className="insights-plot"
                role="slider"
                tabIndex={count ? 0 : -1}
                aria-label={`${selected.label}: explorar pontos do gráfico`}
                aria-valuemin={0}
                aria-valuemax={Math.max(0, count - 1)}
                aria-valuenow={index}
                aria-valuetext={
                  point
                    ? `${formatInsightDate(point.at, timeline.granularity, true)}: ${formatInsightValue(metric, point[metric])}`
                    : "Sem pontos neste período"
                }
                aria-describedby={`${id}-instructions ${id}-point`}
                onPointerDown={inspect}
                onPointerMove={inspect}
                onKeyDown={keyInspect}
              >
                <svg
                  viewBox={`0 0 ${CHART.width} ${CHART.height}`}
                  preserveAspectRatio="none"
                  aria-hidden="true"
                  focusable="false"
                >
                  {geometry.ticks.map((_, tick) => (
                    <line
                      key={tick}
                      className="insights-grid-line"
                      x1={CHART.left}
                      x2={CHART.right}
                      y1={CHART.top + (tick * (CHART.bottom - CHART.top)) / 4}
                      y2={CHART.top + (tick * (CHART.bottom - CHART.top)) / 4}
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                  {geometry.previousPath && (
                    <path
                      className="insights-line is-previous"
                      d={geometry.previousPath}
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                  {geometry.currentPath && (
                    <path
                      className="insights-line"
                      d={geometry.currentPath}
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                  {count > 0 && (
                    <line
                      className="insights-cursor"
                      x1={
                        (geometry.current[index] ?? geometry.previous[index])?.x
                      }
                      x2={
                        (geometry.current[index] ?? geometry.previous[index])?.x
                      }
                      y1={CHART.top}
                      y2={CHART.bottom}
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                  {geometry.previous[index] && (
                    <circle
                      className="insights-dot is-previous"
                      cx={geometry.previous[index].x}
                      cy={geometry.previous[index].y}
                      r="5"
                    />
                  )}
                  {geometry.current[index] && (
                    <circle
                      className="insights-dot"
                      cx={geometry.current[index].x}
                      cy={geometry.current[index].y}
                      r="5"
                    />
                  )}
                </svg>
                {!hasActivity && (
                  <span className="insights-zero-note">
                    Nenhum registro de{" "}
                    {selected.label.toLocaleLowerCase("pt-BR")} neste período.
                  </span>
                )}
              </div>
            </div>
            <div className="insights-axis-x" aria-hidden="true">
              {[
                0,
                Math.floor(((timeline.points.length || 1) - 1) / 2),
                timeline.points.length - 1,
              ]
                .filter(
                  (value, pos, all) => value >= 0 && all.indexOf(value) === pos,
                )
                .map((pointIndex) => (
                  <span key={pointIndex}>
                    {formatInsightDate(
                      timeline.points[pointIndex].at,
                      timeline.granularity,
                    )}
                  </span>
                ))}
            </div>
            <p className="insights-instructions" id={`${id}-instructions`}>
              Toque no gráfico ou use as setas do teclado para explorar{" "}
              {timeline.granularity === "hour" ? "as horas" : "os dias"}.
            </p>
            <div
              className="insights-point-detail"
              id={`${id}-point`}
              aria-live="polite"
              aria-atomic="true"
            >
              <div>
                <span>
                  {point
                    ? formatInsightDate(point.at, timeline.granularity, true)
                    : "Período selecionado"}
                </span>
                <strong>
                  {point ? formatInsightValue(metric, point[metric]) : "—"}
                </strong>
              </div>
              {previousPoint && (
                <div className="is-previous">
                  <span>
                    {formatInsightDate(
                      previousPoint.at,
                      previous!.granularity,
                      true,
                    )}
                  </span>
                  <strong>
                    {formatInsightValue(metric, previousPoint[metric])}
                  </strong>
                </div>
              )}
            </div>
            <details className="insights-data">
              <summary>Ver dados</summary>
              <div>
                <table>
                  <caption>
                    {selected.label} por{" "}
                    {timeline.granularity === "hour" ? "hora" : "dia"}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Data / hora</th>
                      <th scope="col">Selecionado</th>
                      {previous && (
                        <>
                          <th scope="col">Data anterior</th>
                          <th scope="col">Anterior</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {timeline.points.map((row, i) => (
                      <tr key={row.at}>
                        <th scope="row">
                          {formatInsightDate(
                            row.at,
                            timeline.granularity,
                            true,
                          )}
                        </th>
                        <td>{formatInsightValue(metric, row[metric])}</td>
                        {previous && (
                          <>
                            <td>
                              {previous.points[i]
                                ? formatInsightDate(
                                    previous.points[i].at,
                                    previous.granularity,
                                    true,
                                  )
                                : "—"}
                            </td>
                            <td>
                              {previous.points[i]
                                ? formatInsightValue(
                                    metric,
                                    previous.points[i][metric],
                                  )
                                : "—"}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </div>
        </>
      )}
      <section
        className="insights-highlights"
        aria-labelledby={`${id}-highlights`}
      >
        <h3 id={`${id}-highlights`}>Destaques do período</h3>
        <div>
          {highlights.map((highlight) => (
            <article key={highlight.title}>
              <h4>{highlight.title}</h4>
              <strong>{highlight.value}</strong>
              <p>{highlight.detail}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
