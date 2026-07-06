"use client";
/* eslint-disable react-hooks/set-state-in-effect -- effect resets + fetches on stock change */

import { useEffect, useState } from "react";
import type { CompanyDetail, StockData } from "@/lib/index-api";
import { PORTFOLIO_TICKERS } from "@/lib/companies";
import { useCurrency } from "@/components/index-dashboard/CurrencyContext";
import { formatMarketCap, formatPrice, formatSignedPercent } from "@/components/company-grid/format";
import { Sparkline } from "@/components/index-dashboard/DashboardChrome";

/** Tiny bar sparkline for a financial metric's yearly trajectory. */
function MiniBars({ values }: { values: (number | null)[] }) {
  const nums = values.filter((v): v is number => v != null);
  if (!nums.length) return null;
  const max = Math.max(...nums, 0);
  const min = Math.min(...nums, 0);
  const range = max - min || 1;
  return (
    <div className="nei-cm-bars">
      {values.map((v, i) => (
        <span
          key={i}
          className={`nei-cm-bar${i === values.length - 1 ? " is-latest" : ""}`}
          style={{ height: `${v == null ? 4 : 8 + ((v - min) / range) * 30}px` }}
        />
      ))}
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
  const [detail, setDetail] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!stock) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [stock, onClose]);

  useEffect(() => {
    if (!stock) return;
    const controller = new AbortController();
    setLoading(true);
    setDetail(null);
    fetch(`/api/company/${encodeURIComponent(stock.ticker)}?currency=${currency}`, { signal: controller.signal })
      .then((r) => (r.ok ? (r.json() as Promise<CompanyDetail>) : Promise.reject()))
      .then((d) => setDetail(d))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [stock, currency]);

  if (!stock) return null;
  const isPortfolio = PORTFOLIO_TICKERS.has(stock.ticker);
  const fins = detail?.financials ?? [];
  const latest = fins.at(-1);
  const up = (stock.changePct ?? 0) >= 0;

  return (
    <div className="nei-cm-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="nei-cm-panel" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="nei-cm-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <div className="nei-cm-head">
          <div>
            <h2 className="nei-heading">
              {stock.displayName}
              {isPortfolio && <span className="nei-portfolio-badge">P</span>}
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

        {detail?.description && <p className="nei-cm-desc">{detail.description}</p>}

        <div className="nei-cm-cards">
          <div className="nei-cm-card">
            <span className="nei-cm-card-label">Revenue{latest?.fy ? ` · ${latest.fy}` : ""}</span>
            <strong className="nei-mono">{formatMarketCap(latest?.revenue ?? null, detail?.currency ?? currency)}</strong>
            {latest?.revenueGrowth != null && (
              <span className={`nei-cm-card-sub ${latest.revenueGrowth >= 0 ? "is-pos" : "is-neg"}`}>
                {formatSignedPercent(latest.revenueGrowth, 1)} YoY
              </span>
            )}
            <MiniBars values={fins.map((f) => f.revenue)} />
          </div>

          <div className="nei-cm-card">
            <span className="nei-cm-card-label">EBITDA margin</span>
            <strong className="nei-mono">{latest?.ebitdaMargin != null ? `${latest.ebitdaMargin.toFixed(1)}%` : "—"}</strong>
            <span className="nei-cm-card-sub">latest FY</span>
            <MiniBars values={fins.map((f) => f.ebitdaMargin)} />
          </div>

          <div className="nei-cm-card">
            <span className="nei-cm-card-label">PAT (as reported)</span>
            <strong className="nei-mono">{formatMarketCap(latest?.pat ?? null, detail?.currency ?? currency)}</strong>
            {latest?.patMargin != null && <span className="nei-cm-card-sub">{latest.patMargin.toFixed(1)}% margin</span>}
            <MiniBars values={fins.map((f) => f.pat)} />
          </div>

          <div className="nei-cm-card">
            <span className="nei-cm-card-label">Asset intensity</span>
            <strong className="nei-mono">{latest?.assetIntensity != null ? `${latest.assetIntensity.toFixed(2)}x` : "—"}</strong>
            <span className="nei-cm-card-sub">assets / revenue</span>
            <MiniBars values={fins.map((f) => f.assetIntensity)} />
          </div>
        </div>

        <div className="nei-cm-section">
          <span className="nei-cm-card-label">Share price</span>
          <div className="nei-cm-chart">
            {detail && detail.priceSeries.length > 1 ? (
              <Sparkline series={detail.priceSeries.map((p) => p.close)} height={90} />
            ) : (
              <p className="nei-cm-nodata">{loading ? "Loading…" : "No price history."}</p>
            )}
          </div>
        </div>

        <div className="nei-cm-section">
          <span className="nei-cm-card-label">Analyst consensus</span>
          {detail ? <AnalystBar detail={detail} /> : <p className="nei-cm-nodata">Loading…</p>}
        </div>
      </div>
    </div>
  );
}
