"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  IndexHistoryPayload,
  SectorCompositionPoint,
  SectorHistoryPoint,
  StockData,
} from "@/lib/index-api";
import { SECTOR_CHART_COLORS } from "@/components/index-chart/constants";
import { Sparkline } from "@/components/index-dashboard/DashboardChrome";
import { CompanyLogo } from "@/components/company-grid/CompanyLogo";
import { formatMarketCap } from "@/lib/formatters";
import { formatPrice, formatSignedPercent } from "@/components/company-grid/format";

type SectorSeries = Map<Sector, { date: string; value: number }[]>;

function monthLabel(date: string): string {
  const d = new Date(date);
  return `${d.toLocaleDateString("en-US", { month: "short" })} '${String(d.getUTCFullYear()).slice(2)}`;
}

function oneYearChange(series: { value: number }[] | undefined): number | null {
  if (!series || series.length < 2) return null;
  const first = series[0].value;
  const last = series[series.length - 1].value;
  return first ? (last / first - 1) * 100 : null;
}

/** One sector's expanded panel: sub-index chart + the companies inside it. */
function SectorPanel({
  comp,
  series,
  stocks,
  currency,
  onClose,
}: {
  comp: SectorCompositionPoint;
  series: { date: string; value: number }[];
  stocks: StockData[];
  currency: Currency;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const chg = oneYearChange(series);
  const color = SECTOR_CHART_COLORS[comp.sector];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => closeRef.current?.focus(), 0);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const monthTicks = useMemo(() => {
    const ticks: string[] = [];
    const seen = new Set<string>();
    for (const p of series) {
      const m = p.date.slice(0, 7);
      if (!seen.has(m)) {
        seen.add(m);
        ticks.push(p.date);
      }
    }
    return ticks;
  }, [series]);

  const companies = useMemo(
    () =>
      stocks
        .filter((s) => s.sector === comp.sector)
        .sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0)),
    [stocks, comp.sector]
  );

  return (
    <div className="nei-sb-overlay" onClick={onClose}>
      <div
        className="nei-sb-panel"
        role="dialog"
        aria-modal="true"
        aria-label={`${comp.sector} sector`}
        onClick={(e) => e.stopPropagation()}
      >
        <button ref={closeRef} type="button" className="nei-sb-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <div className="nei-sb-panel-head">
          <span className="nei-sb-dot" style={{ background: color }} />
          <h3 className="nei-heading">{comp.sector}</h3>
          <div className="nei-sb-panel-meta nei-mono">
            <span>{(comp.weightPct ?? 0).toFixed(1)}% of index</span>
            <span>·</span>
            <span>{comp.numCompanies} companies</span>
            {chg != null && (
              <span className={chg >= 0 ? "is-pos" : "is-neg"}>
                {chg >= 0 ? "+" : ""}
                {chg.toFixed(1)}% · 1Y
              </span>
            )}
          </div>
        </div>

        <div className="nei-sb-panel-chart">
          {series.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
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
                  domain={["auto", "auto"]}
                  tick={{ fontSize: 11, fill: "rgba(11,15,25,0.45)", fontFamily: "var(--font-inter), ui-monospace, monospace" }}
                  axisLine={false}
                  tickLine={false}
                  width={50}
                  tickFormatter={(v: number) => Math.round(v).toLocaleString("en-IN")}
                />
                <Tooltip
                  contentStyle={{ background: "#0D1E3A", border: "1px solid rgba(232,235,240,0.12)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "rgba(232,235,240,0.55)", fontSize: 11 }}
                  itemStyle={{ color: "#FFFFFF" }}
                  formatter={(v) => [Math.round(Number(v)).toLocaleString("en-IN"), comp.sector]}
                />
                <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="nei-cm-nodata">No sector history available.</p>
          )}
        </div>

        <div className="nei-sb-companies">
          <span className="nei-sb-companies-label">Companies in {comp.sector}</span>
          <ul>
            {companies.map((c) => {
              const up = (c.changePct ?? 0) >= 0;
              return (
                <li key={c.ticker}>
                  <div className="nei-sb-co-name">
                    <CompanyLogo ticker={c.ticker} name={c.name} size={26} />
                    <span>{c.displayName}</span>
                  </div>
                  <span className="nei-mono nei-sb-co-mcap">{formatMarketCap(c.marketCap, currency)}</span>
                  <span className="nei-mono nei-sb-co-price">{formatPrice(c.price, currency)}</span>
                  <span className={`nei-mono nei-sb-co-chg ${up ? "is-pos" : "is-neg"}`}>
                    {formatSignedPercent(c.changePct, 1)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
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
  const [open, setOpen] = useState<Sector | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/index/history?range=1Y&includeSectors=1", { signal: controller.signal })
      .then((r) => (r.ok ? (r.json() as Promise<IndexHistoryPayload>) : Promise.reject()))
      .then((json) => {
        const map: SectorSeries = new Map();
        for (const p of (json.sectorData ?? []) as SectorHistoryPoint[]) {
          const arr = map.get(p.sector) ?? [];
          arr.push({ date: p.date, value: p.value });
          map.set(p.sector, arr);
        }
        setSeriesBySector(map);
      })
      .catch(() => {});
    return () => controller.abort();
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
      <div className="nei-sb-grid">
        {ordered.map((comp) => {
          const series = seriesBySector.get(comp.sector);
          const chg = oneYearChange(series);
          const color = SECTOR_CHART_COLORS[comp.sector];
          const weight = comp.weightPct ?? 0;
          return (
            <button
              key={comp.sector}
              type="button"
              className="nei-sb-tile"
              onClick={() => setOpen(comp.sector)}
              aria-label={`Expand ${comp.sector}`}
            >
              <div className="nei-sb-tile-head">
                <span className="nei-sb-dot" style={{ background: color }} />
                <strong>{comp.sector}</strong>
                <span className="nei-sb-expand" aria-hidden="true">⤢</span>
              </div>

              <div className="nei-sb-tile-weight nei-mono">
                {weight.toFixed(1)}<span>% of index</span>
              </div>
              <div className="nei-sb-tile-bar" aria-hidden="true">
                <span style={{ width: `${weight}%`, background: color }} />
              </div>

              <div className="nei-sb-tile-foot">
                <span className="nei-mono nei-sb-tile-count">{comp.numCompanies} cos</span>
                {chg != null && (
                  <span className={`nei-mono nei-sb-tile-chg ${chg >= 0 ? "is-pos" : "is-neg"}`}>
                    {chg >= 0 ? "+" : ""}
                    {chg.toFixed(1)}% · 1Y
                  </span>
                )}
              </div>

              <div className="nei-sb-tile-spark">
                {series && series.length > 1 && (
                  <Sparkline series={series.map((p) => p.value)} height={40} />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {openComp && (
        <SectorPanel
          comp={openComp}
          series={seriesBySector.get(openComp.sector) ?? []}
          stocks={stocks}
          currency={currency}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}
