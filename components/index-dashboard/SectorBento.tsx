"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SECTORS, type Sector } from "@/lib/companies";
import type {
  Currency,
  IndexHistoryPoint,
  SectorCompositionPoint,
  SectorHistoryPoint,
  StockData,
} from "@/lib/index-api";
import { SECTOR_CHART_COLORS } from "@/components/index-chart/constants";
import { CompanyLogo } from "@/components/company-grid/CompanyLogo";
import { formatMarketCap } from "@/lib/formatters";
import { formatPrice, formatSignedPercent } from "@/components/company-grid/format";
import {
  buildHistoryRequest,
  getIndexHistory,
} from "@/components/index-chart/historyClient";
import { getPresetFromDate } from "@/lib/index-history-window";
import { getISTDate } from "@/lib/market-hours";

type SectorSeries = Map<Sector, { date: string; value: number }[]>;
type SectorPoint = { date: string; value: number };
type ComparisonPoint = {
  date: string;
  sector: number;
  index: number;
  sectorRaw: number;
  indexRaw: number;
};

const COMPARISON_BASE_VALUE = 1000;
const MAX_HISTORY_URL = buildHistoryRequest("MAX", null).url;

function monthLabel(date: string): string {
  const d = new Date(date);
  return `${d.toLocaleDateString("en-US", { month: "short" })} '${String(d.getUTCFullYear()).slice(2)}`;
}

function buildComparisonSeries(
  sectorSeries: SectorPoint[] | undefined,
  indexSeries: IndexHistoryPoint[]
): ComparisonPoint[] {
  if (!sectorSeries || sectorSeries.length < 2 || indexSeries.length < 2) return [];

  const indexByDate = new Map(indexSeries.map((point) => [point.date, point.value]));
  const paired = sectorSeries
    .map((point) => {
      const indexValue = indexByDate.get(point.date);
      return typeof indexValue === "number"
        ? { date: point.date, sectorRaw: point.value, indexRaw: indexValue }
        : null;
    })
    .filter((point): point is { date: string; sectorRaw: number; indexRaw: number } => Boolean(point));

  const base = paired.find((point) => point.sectorRaw > 0 && point.indexRaw > 0);
  if (!base) return [];

  return paired.map((point) => ({
    ...point,
    sector: (point.sectorRaw / base.sectorRaw) * COMPARISON_BASE_VALUE,
    index: (point.indexRaw / base.indexRaw) * COMPARISON_BASE_VALUE,
  }));
}

function comparisonChange(data: ComparisonPoint[], key: "sector" | "index"): number | null {
  if (data.length < 2) return null;
  const first = data[0][key];
  const last = data[data.length - 1][key];
  return first ? (last / first - 1) * 100 : null;
}

function formatChange(value: number | null): string {
  if (value == null) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatIndexLevel(value: number): string {
  return Math.round(value).toLocaleString("en-IN");
}

function chartTickStep(range: number): number {
  if (range <= 600) return 100;
  if (range <= 1200) return 200;
  if (range <= 2500) return 500;
  return 1000;
}

function comparisonTicks(data: ComparisonPoint[]): number[] {
  const values = data
    .flatMap((point) => [point.sector, point.index])
    .filter((value) => Number.isFinite(value));

  if (!values.length) return [800, 900, 1000, 1100, 1200];

  const min = Math.min(...values, COMPARISON_BASE_VALUE);
  const max = Math.max(...values, COMPARISON_BASE_VALUE);
  const spread = Math.max(max - min, 1);
  const paddedMin = min - spread * 0.06;
  const paddedMax = max + spread * 0.06;
  const step = chartTickStep(paddedMax - paddedMin);
  let start = Math.floor(paddedMin / step) * step;
  let end = Math.ceil(paddedMax / step) * step;

  if (end - start < step * 4) {
    start -= step;
    end += step;
  }

  start = Math.max(0, start);

  const ticks: number[] = [];
  for (let value = start; value <= end; value += step) {
    ticks.push(value);
  }
  return ticks;
}

function ComparisonSparkline({
  data,
  color,
  compact = false,
}: {
  data: ComparisonPoint[];
  color: string;
  compact?: boolean;
}) {
  if (data.length < 2) return null;

  const width = 400;
  const height = compact ? 64 : 132;
  const sectorValues = data.map((point) => point.sector);
  const indexValues = data.map((point) => point.index);
  const values = [...sectorValues, ...indexValues];
  const min = Math.min(...values) * 0.998;
  const max = Math.max(...values) * 1.002;
  const range = max - min || 1;

  const pointsFor = (series: number[]) =>
    series.map((value, index) => {
      const x = (index / (series.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return { x, y };
    });

  const points = pointsFor(sectorValues);
  const indexPoints = pointsFor(indexValues);
  const first = points[0];
  const last = points[points.length - 1];
  const sectorPath = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join(" ");
  const areaPath = `${sectorPath} L${last.x.toFixed(1)},${height} L${first.x.toFixed(1)},${height} Z`;
  const indexPath = indexPoints
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d={areaPath} fill={color} opacity={compact ? 0.12 : 0.16} />
      <path
        d={indexPath}
        fill="none"
        stroke="rgba(11,15,25,0.42)"
        strokeWidth={compact ? 1.4 : 1.6}
        strokeDasharray="5 5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={sectorPath}
        fill="none"
        stroke={color}
        strokeWidth={compact ? 1.9 : 2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function SectorLegend({ sector, color }: { sector: Sector; color: string }) {
  return (
    <div className="nei-sb-legend" aria-hidden="true">
      <span>
        <i style={{ background: color }} />
        {sector}
      </span>
      <span>
        <i className="is-index" />
        NEI Top 50
      </span>
    </div>
  );
}

function SectorTile({
  comp,
  series,
  indexSeries,
  rank,
  onOpen,
}: {
  comp: SectorCompositionPoint;
  series: SectorPoint[] | undefined;
  indexSeries: IndexHistoryPoint[];
  rank: number;
  onOpen: () => void;
}) {
  const color = SECTOR_CHART_COLORS[comp.sector];
  const weight = comp.weightPct ?? 0;
  const comparison = buildComparisonSeries(series, indexSeries);
  const chg = comparisonChange(comparison, "sector");
  const isMajor = rank === 0;
  const isMedium = rank > 0 && rank <= 2;
  const showChart = isMajor || isMedium;
  const tileClass = isMajor ? "is-major" : isMedium ? "is-medium" : "is-compact";
  const label = `${comp.sector}. ${weight.toFixed(1)} percent of the index. ${comp.numCompanies} companies. Open sector detail.`;

  return (
    <button
      type="button"
      className={`nei-sb-tile ${tileClass}`}
      style={{ "--sector-color": color } as CSSProperties}
      onClick={onOpen}
      aria-label={label}
      aria-haspopup="dialog"
    >
      <div className="nei-sb-tile-head">
        <span className="nei-sb-dot" style={{ background: color }} />
        <strong>{comp.sector}</strong>
        <span className="nei-sb-expand" aria-hidden="true" />
      </div>

      {isMajor ? (
        <p className="nei-sb-tile-insight">
          {comp.sector} has the largest contribution to the index.
        </p>
      ) : null}

      {showChart ? (
        <div className="nei-sb-tile-chart">
          <ComparisonSparkline data={comparison} color={color} compact={isMedium} />
        </div>
      ) : null}

      <div className="nei-sb-tile-bottom">
        <div className="nei-sb-tile-weight nei-mono">
          {weight.toFixed(1)}
          <span>% of index</span>
        </div>
        <div className="nei-sb-tile-foot">
          <span className="nei-mono nei-sb-tile-count">{comp.numCompanies} cos</span>
          <span className={`nei-mono nei-sb-tile-chg ${(chg ?? 0) >= 0 ? "is-pos" : "is-neg"}`}>
            {formatChange(chg)} · 1Y
          </span>
        </div>
        {showChart ? <SectorLegend sector={comp.sector} color={color} /> : null}
      </div>
    </button>
  );
}

/** One sector's expanded modal: comparison chart + companies inside it. */
function SectorPanel({
  comp,
  series,
  indexSeries,
  stocks,
  currency,
  onClose,
}: {
  comp: SectorCompositionPoint;
  series: SectorPoint[];
  indexSeries: IndexHistoryPoint[];
  stocks: StockData[];
  currency: Currency;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const comparison = useMemo(() => buildComparisonSeries(series, indexSeries), [indexSeries, series]);
  const sectorChange = comparisonChange(comparison, "sector");
  const indexChange = comparisonChange(comparison, "index");
  const color = SECTOR_CHART_COLORS[comp.sector];

  useEffect(() => {
    const active = document.activeElement;
    previouslyFocusedRef.current = active instanceof HTMLElement ? active : null;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    // Lock both html and body — on some layouts the document scrolls on
    // <html>, not <body>, so locking only one silently leaves the page
    // behind the modal scrollable.
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    window.setTimeout(() => closeRef.current?.focus(), 0);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      previouslyFocusedRef.current?.focus();
    };
  }, [onClose]);

  const monthTicks = useMemo(() => {
    const ticks: string[] = [];
    const seen = new Set<string>();
    for (const p of comparison) {
      const m = p.date.slice(0, 7);
      if (!seen.has(m)) {
        seen.add(m);
        ticks.push(p.date);
      }
    }
    return ticks;
  }, [comparison]);
  const yTicks = useMemo(() => comparisonTicks(comparison), [comparison]);
  const yDomain = useMemo<[number, number]>(() => {
    const firstTick = yTicks[0] ?? 0;
    const lastTick = yTicks[yTicks.length - 1] ?? COMPARISON_BASE_VALUE;
    return [firstTick, lastTick];
  }, [yTicks]);

  const companies = useMemo(
    () =>
      stocks
        .filter((s) => s.sector === comp.sector)
        .sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0)),
    [stocks, comp.sector]
  );

  const overlay = (
    <div className="nei-sb-overlay" onClick={onClose}>
      <div
        className="nei-sb-panel"
        role="dialog"
        aria-modal="true"
        aria-label={`${comp.sector} sector detail`}
        style={{ "--sector-color": color } as CSSProperties}
        onClick={(e) => e.stopPropagation()}
      >
        <button ref={closeRef} type="button" className="nei-sb-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <div className="nei-sb-panel-head">
          <div className="nei-sb-panel-title">
            <span className="nei-sb-dot" style={{ background: color }} />
            <h3 className="nei-heading">{comp.sector}</h3>
          </div>

          <div className="nei-sb-panel-meta">
            <span>
              <strong>{(comp.weightPct ?? 0).toFixed(1)}%</strong>
              of index
            </span>
            <span>
              <strong>{comp.numCompanies}</strong>
              companies
            </span>
            <span>
              <strong className={(sectorChange ?? 0) >= 0 ? "is-pos" : "is-neg"}>
                {formatChange(sectorChange)}
              </strong>
              sector 1Y
            </span>
            <span>
              <strong className={(indexChange ?? 0) >= 0 ? "is-pos" : "is-neg"}>
                {formatChange(indexChange)}
              </strong>
              NEI 1Y
            </span>
          </div>
        </div>

        <p className="sr-only">
          The chart compares {comp.sector} to NEI Top 50 over the last year, with both series rebased to 1,000
          at the first common point in the selected period.
        </p>

        <div className="nei-sb-panel-chart">
          <div className="nei-sb-chart-topline">
            <span className="nei-mono">1Y performance, base 1,000</span>
            <SectorLegend sector={comp.sector} color={color} />
          </div>
          {comparison.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={comparison} margin={{ top: 12, right: 18, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,15,25,0.06)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={monthLabel}
                  ticks={monthTicks}
                  tick={{ fontSize: 11, fill: "rgba(11,15,25,0.45)", fontFamily: "var(--font-inter), system-ui" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={44}
                />
                <YAxis
                  domain={yDomain}
                  ticks={yTicks}
                  tick={{ fontSize: 11, fill: "rgba(11,15,25,0.45)", fontFamily: "var(--font-inter), ui-monospace, monospace" }}
                  axisLine={false}
                  tickLine={false}
                  width={58}
                  tickFormatter={formatIndexLevel}
                />
                <Tooltip
                  contentStyle={{ background: "#0D1E3A", border: "1px solid rgba(232,235,240,0.12)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "rgba(232,235,240,0.55)", fontSize: 11 }}
                  itemStyle={{ color: "#FFFFFF" }}
                  formatter={(v, name) => [
                    Number(v).toLocaleString("en-IN", { maximumFractionDigits: 1 }),
                    name === "sector" ? comp.sector : "NEI Top 50",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="index"
                  stroke="rgba(11,15,25,0.48)"
                  strokeWidth={1.8}
                  strokeDasharray="6 5"
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="sector"
                  stroke={color}
                  strokeWidth={2.4}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="nei-cm-nodata">No sector history available.</p>
          )}
        </div>

        <div className="nei-sb-companies">
          <div className="nei-sb-companies-scroll">
            <div className="nei-sb-companies-head" aria-hidden="true">
              <span>Name</span>
              <span>Market Cap</span>
              <span>Share Price</span>
              <span>1Y IRR</span>
            </div>
            <ul>
              {companies.map((c) => {
                const up = (c.oneYearChangePct ?? 0) >= 0;
                return (
                  <li key={c.ticker}>
                    <div className="nei-sb-co-name">
                      <CompanyLogo ticker={c.ticker} name={c.name} size={26} />
                      <span>{c.displayName}</span>
                    </div>
                    <span className="nei-mono nei-sb-co-mcap">{formatMarketCap(c.marketCap, currency)}</span>
                    <span className="nei-mono nei-sb-co-price">{formatPrice(c.price, currency)}</span>
                    <span className={`nei-mono nei-sb-co-chg ${up ? "is-pos" : "is-neg"}`}>
                      {formatSignedPercent(c.oneYearChangePct, 1)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}

/** Bento grid of expandable sector tiles (Stripe-style expand-on-demand). */
export function SectorBento({
  sectors,
  stocks,
  currency,
}: {
  sectors: SectorCompositionPoint[];
  stocks: StockData[];
  currency: Currency;
}) {
  const [seriesBySector, setSeriesBySector] = useState<SectorSeries>(new Map());
  const [indexSeries, setIndexSeries] = useState<IndexHistoryPoint[]>([]);
  const [open, setOpen] = useState<Sector | null>(null);

  useEffect(() => {
    let ignore = false;
    const cutoff = getPresetFromDate("1Y", getISTDate());

    getIndexHistory(MAX_HISTORY_URL)
      .then((json) => {
        if (ignore) return;
        const map: SectorSeries = new Map();
        setIndexSeries((json.data ?? []).filter((point) => point.date >= cutoff));
        for (const p of (json.sectorData ?? []) as SectorHistoryPoint[]) {
          if (p.date < cutoff) continue;
          const arr = map.get(p.sector) ?? [];
          arr.push({ date: p.date, value: p.value });
          map.set(p.sector, arr);
        }
        setSeriesBySector(map);
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);

  // Show sectors ordered by weight (composition is already sorted); fall back to
  // the canonical order for any sector missing from the live composition.
  const ordered = useMemo(() => {
    const known = new Set(sectors.map((s) => s.sector));
    const extras = SECTORS.filter((s) => !known.has(s)).map<SectorCompositionPoint>((sector) => ({
      sector,
      numCompanies: 0,
      marketCap: null,
      weightPct: 0,
      changePct: null,
      advancers: 0,
      decliners: 0,
    }));
    return [...sectors, ...extras];
  }, [sectors]);

  const openComp = ordered.find((s) => s.sector === open) ?? null;

  return (
    <div className="nei-sb">
      {openComp ? (
        <SectorPanel
          comp={openComp}
          series={seriesBySector.get(openComp.sector) ?? []}
          indexSeries={indexSeries}
          stocks={stocks}
          currency={currency}
          onClose={() => setOpen(null)}
        />
      ) : (
        <div className="nei-sb-grid">
          {ordered.map((comp, index) => (
            <SectorTile
              key={comp.sector}
              comp={comp}
              series={seriesBySector.get(comp.sector)}
              indexSeries={indexSeries}
              rank={index}
              onOpen={() => setOpen(comp.sector)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
