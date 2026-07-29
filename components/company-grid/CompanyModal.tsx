"use client";
/* eslint-disable react-hooks/set-state-in-effect -- effect resets + fetches on stock change */

import { useEffect, useId, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CompanyDetail, StockData } from "@/lib/index-api";
import { useCurrency } from "@/components/index-dashboard/CurrencyContext";
import { formatMarketCap, formatPrice, formatSignedPercent } from "@/components/company-grid/format";
import { PortfolioMark } from "@/components/company-grid/PortfolioMark";

type BarPoint = {
  label: string;
  value: number | null;
};

type TooltipItem = {
  value?: number;
  payload?: CompanyDetail["priceSeries"][number];
};

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true"
  );
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function shortPeriodLabel(label: string) {
  return label.split(" ")[0] || label;
}

function formatChartDate(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function PriceTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: TooltipItem[];
  currency: CompanyDetail["currency"];
}) {
  const point = payload?.find((item) => typeof item.value === "number");
  if (!active || !point || typeof point.value !== "number" || !point.payload) return null;

  return (
    <div className="nei-chart-tooltip nei-cm-price-tooltip">
      <div className="nei-chart-tooltip-label">{formatChartDate(point.payload.date)}</div>
      <div className="nei-chart-tooltip-row">
        <span className="nei-chart-tooltip-name">
          <span
            className="nei-chart-tooltip-dot"
            style={{ background: "var(--nei-pos)" }}
          />
          <span>Share price</span>
        </span>
        <span className="nei-chart-tooltip-value nei-mono">
          {formatPrice(point.value, currency)}
        </span>
      </div>
    </div>
  );
}

function PriceHistoryChart({
  series,
  currency,
}: {
  series: CompanyDetail["priceSeries"];
  currency: CompanyDetail["currency"];
}) {
  const gradientId = `company-price-${useId().replace(/:/g, "")}`;

  return (
    <div
      className="nei-cm-price-chart"
      role="img"
      aria-label="Historical share price chart"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 10, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--nei-pos)" stopOpacity={0.2} />
              <stop offset="100%" stopColor="var(--nei-pos)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" hide />
          <YAxis dataKey="close" hide domain={["dataMin", "dataMax"]} />
          <Tooltip
            content={<PriceTooltip currency={currency} />}
            cursor={{ stroke: "rgba(232,235,240,0.22)", strokeWidth: 1 }}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="close"
            name="Share price"
            stroke="var(--nei-pos)"
            strokeWidth={1.6}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 3, fill: "var(--nei-pos)", stroke: "#FFFFFF", strokeWidth: 1.4 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Tiny bar sparkline for a financial metric's quarterly trajectory. */
function MiniBars({ label, points }: { label: string; points: BarPoint[] }) {
  const nums = points.map((point) => point.value).filter((v): v is number => v != null);
  if (!nums.length) return null;
  const max = Math.max(...nums, 0);
  const min = Math.min(...nums, 0);
  const range = max - min || 1;
  return (
    <div className="nei-cm-bars" role="img" aria-label={`${label} quarterly trend`}>
      <div className="nei-cm-bar-row">
        {points.map((point, i) => (
          <span
            key={`${point.label}-${i}`}
            className={`nei-cm-bar${i === points.length - 1 ? " is-latest" : ""}`}
            style={{ height: `${point.value == null ? 4 : 8 + ((point.value - min) / range) * 30}px` }}
            title={`${point.label}: ${point.value ?? "No data"}`}
          />
        ))}
      </div>
      <div className="nei-cm-bar-labels" aria-hidden="true">
        {points.map((point, i) => (
          <span key={`${point.label}-label-${i}`}>{shortPeriodLabel(point.label)}</span>
        ))}
      </div>
    </div>
  );
}

function AnalystBar({ detail }: { detail: CompanyDetail }) {
  const a = detail.analyst;
  if (!a) return <p className="nei-cm-nodata">No analyst coverage yet.</p>;
  const buy = a.strongBuy + a.buy;
  const sell = a.sell + a.strongSell;
  const total = buy + a.hold + sell;
  if (!total) return <p className="nei-cm-nodata">No analyst coverage yet.</p>;
  const w = (n: number) => `${(n / total) * 100}%`;
  return (
    <div>
      <div className="nei-cm-analyst-bar">
        {buy > 0 && <span className="is-buy" style={{ width: w(buy) }} title={`Buy: ${buy}`} />}
        {a.hold > 0 && <span className="is-hold" style={{ width: w(a.hold) }} title={`Hold: ${a.hold}`} />}
        {sell > 0 && <span className="is-sell" style={{ width: w(sell) }} title={`Sell: ${sell}`} />}
      </div>
      <div className="nei-cm-analyst-legend nei-mono">
        <span className="is-buy">Buy {buy}</span>
        <span className="is-hold">Hold {a.hold}</span>
        <span className="is-sell">Sell {sell}</span>
        {a.numAnalysts != null && <span className="nei-cm-analyst-count">{a.numAnalysts} analysts</span>}
      </div>
    </div>
  );
}

export function CompanyModal({ stock, onClose }: { stock: StockData | null; onClose: () => void }) {
  const { currency } = useCurrency();
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const [detail, setDetail] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!stock) return;

    const active = document.activeElement;
    previouslyFocusedRef.current = active instanceof HTMLElement ? active : null;
    const previousOverflow = document.body.style.overflow;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key !== "Tab" || !panelRef.current) return;

      const focusable = getFocusableElements(panelRef.current);
      if (!focusable.length) {
        e.preventDefault();
        panelRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;

      if (e.shiftKey && (current === first || !panelRef.current.contains(current))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && current === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previouslyFocusedRef.current?.focus();
    };
  }, [stock, onClose]);

  useEffect(() => {
    if (!stock) return;
    const controller = new AbortController();
    setLoading(true);
    setDetail(null);
    setDetailError(null);
    fetch(`/api/company/${encodeURIComponent(stock.ticker)}?currency=${currency}`, { signal: controller.signal })
      .then(async (r) => {
        if (r.ok) return (await r.json()) as CompanyDetail;
        const json = (await r.json().catch(() => null)) as { error?: string } | null;
        throw new Error(json?.error ?? `HTTP ${r.status}`);
      })
      .then((d) => setDetail(d))
      .catch((error: unknown) => {
        if (!isAbortError(error)) {
          setDetailError("Could not load company details.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [stock, currency, retryKey]);

  if (!stock) return null;
  const isPortfolio = stock.isPortfolio;
  const fins = (detail?.financials ?? []).slice(-5);
  const latest = fins.at(-1);
  const bars = (selector: (point: (typeof fins)[number]) => number | null): BarPoint[] =>
    fins.map((point) => ({ label: point.label, value: selector(point) }));
  const up = (stock.changePct ?? 0) >= 0;

  return (
    <div className="nei-cm-overlay" onClick={onClose}>
      <div
        className="nei-cm-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={detail?.description ? descriptionId : undefined}
        tabIndex={-1}
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="nei-cm-close"
          onClick={onClose}
          aria-label="Close"
          ref={closeButtonRef}
        >
          ×
        </button>

        <div className="nei-cm-head">
          <div>
            <h2 id={titleId} className="nei-heading">
              {isPortfolio && <PortfolioMark />}
              {stock.displayName}
            </h2>
            <p className="nei-cm-sub">
              {stock.name} · {stock.sector}
            </p>
          </div>
          <div className="nei-cm-price">
            <strong className="nei-mono">{formatPrice(stock.price, detail?.currency ?? currency)}</strong>
            <span className={`nei-mono ${up ? "is-pos" : "is-neg"}`}>{formatSignedPercent(stock.changePct)}</span>
            <span className="nei-cm-mcap nei-mono">{formatMarketCap(stock.marketCap, detail?.currency ?? currency)}</span>
          </div>
        </div>

        {detail?.description && <p id={descriptionId} className="nei-cm-desc">{detail.description}</p>}

        {detailError && (
          <div className="nei-cm-error" role="alert">
            <span>{detailError}</span>
            <button type="button" onClick={() => setRetryKey((key) => key + 1)}>
              Retry
            </button>
          </div>
        )}

        <div className="nei-cm-cards">
          <div className="nei-cm-card">
            <span className="nei-cm-card-label">Revenue{latest?.label ? ` · ${latest.label}` : ""}</span>
            <strong className="nei-mono">{formatMarketCap(latest?.revenue ?? null, detail?.currency ?? currency)}</strong>
            {latest?.revenueGrowth != null && (
              <span className={`nei-cm-card-sub ${latest.revenueGrowth >= 0 ? "is-pos" : "is-neg"}`}>
                {formatSignedPercent(latest.revenueGrowth, 1)} same qtr YoY
              </span>
            )}
            <MiniBars label="Revenue" points={bars((f) => f.revenue)} />
          </div>

          <div className="nei-cm-card">
            <span className="nei-cm-card-label">EBITDA margin</span>
            <strong className="nei-mono">{latest?.ebitdaMargin != null ? `${latest.ebitdaMargin.toFixed(1)}%` : "—"}</strong>
            <span className="nei-cm-card-sub">{latest?.label ?? "latest quarter"}</span>
            <MiniBars label="EBITDA margin" points={bars((f) => f.ebitdaMargin)} />
          </div>

          <div className="nei-cm-card">
            <span className="nei-cm-card-label">PAT{latest?.label ? ` · ${latest.label}` : ""}</span>
            <strong className="nei-mono">{formatMarketCap(latest?.pat ?? null, detail?.currency ?? currency)}</strong>
            {latest?.patMargin != null && <span className="nei-cm-card-sub">{latest.patMargin.toFixed(1)}% margin</span>}
            <MiniBars label="PAT" points={bars((f) => f.pat)} />
          </div>

          <div className="nei-cm-card">
            <span className="nei-cm-card-label">Asset turnover</span>
            <strong className="nei-mono">{latest?.assetTurnover != null ? `${latest.assetTurnover.toFixed(2)}x` : "—"}</strong>
            <span className="nei-cm-card-sub">TTM revenue / assets</span>
            <MiniBars label="Asset turnover" points={bars((f) => f.assetTurnover)} />
          </div>
        </div>

        <div className="nei-cm-section">
          <span className="nei-cm-card-label">Share price</span>
          <div className="nei-cm-chart">
            {detailError ? (
              <p className="nei-cm-nodata">Price history unavailable.</p>
            ) : detail && detail.priceSeries.length > 1 ? (
              <PriceHistoryChart series={detail.priceSeries} currency={detail.currency} />
            ) : (
              <p className="nei-cm-nodata">{loading ? "Loading…" : "No price history."}</p>
            )}
          </div>
        </div>

        <div className="nei-cm-section">
          <span className="nei-cm-card-label">Analyst consensus</span>
          {detail ? (
            <AnalystBar detail={detail} />
          ) : detailError ? (
            <p className="nei-cm-nodata">Analyst data unavailable.</p>
          ) : (
            <p className="nei-cm-nodata">Loading…</p>
          )}
        </div>
      </div>
    </div>
  );
}
