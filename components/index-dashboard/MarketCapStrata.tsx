"use client";

import { useMemo, useState, type CSSProperties } from "react";
import type { Currency, StockData } from "@/lib/index-api";
import { CompanyLogo } from "@/components/company-grid/CompanyLogo";
import { CompanyModal } from "@/components/company-grid/CompanyModal";
import { formatMarketCap, formatSignedPercent } from "@/components/company-grid/format";

type BucketDef = {
  key: string;
  label: string;
  range: string;
  minUsdB: number | null;
  maxUsdB: number | null;
};

type RankedStock = StockData & {
  marketCapUsd: number;
  marketCapDisplay: number;
};

type BucketRow = BucketDef & {
  stocks: RankedStock[];
  marketCap: number;
  weightPct: number;
  avgOneYearChangePct: number | null;
};

const BUCKETS: BucketDef[] = [
  { key: "mega", label: "Mega-cap", range: "$20B and above", minUsdB: 20, maxUsdB: null },
  { key: "large", label: "Large-cap", range: "$10B - $20B", minUsdB: 10, maxUsdB: 20 },
  { key: "scaled", label: "Scaled", range: "$5B - $10B", minUsdB: 5, maxUsdB: 10 },
  { key: "mid", label: "Mid-cap", range: "$2B - $5B", minUsdB: 2, maxUsdB: 5 },
  { key: "emerging", label: "Emerging", range: "$1B - $2B", minUsdB: 1, maxUsdB: 2 },
  { key: "small", label: "Small-cap", range: "Under $1B", minUsdB: null, maxUsdB: 1 },
];

function stockMarketCapUsd(stock: StockData, currency: Currency, usdInr: number | null): number | null {
  if (stock.marketCap == null) return null;
  if (currency === "usd") return stock.marketCap;
  if (!usdInr || usdInr <= 0) return null;
  return stock.marketCap / usdInr;
}

function isInBucket(valueUsdB: number, bucket: BucketDef) {
  if (bucket.minUsdB != null && valueUsdB < bucket.minUsdB) return false;
  if (bucket.maxUsdB != null && valueUsdB >= bucket.maxUsdB) return false;
  return true;
}

// Uniform logo size — the bucket weight bars carry the size curve, so a clean
// grid of equal logos reads better than market-cap-scaled ones.
const LOGO_SIZE = 40;

// Cap logos per row so a 1-company bucket and a 16-company bucket don't wrap
// to wildly different heights; a "+N" chip reveals the rest in place.
const MAX_VISIBLE_LOGOS = 8;

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function averageOneYearChange(stocks: RankedStock[]) {
  const values = stocks
    .map((stock) => stock.oneYearChangePct)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function MarketCapSkeleton() {
  return (
    <div className="nei-mcap-strata" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <div key={index} className="nei-mcap-row is-skeleton">
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}

export function MarketCapStrata({
  stocks,
  currency,
  usdInr,
  isLoading,
}: {
  stocks: StockData[];
  currency: Currency;
  usdInr: number | null;
  isLoading: boolean;
}) {
  const [selected, setSelected] = useState<StockData | null>(null);
  const [expandedBuckets, setExpandedBuckets] = useState<Set<string>>(new Set());

  function toggleBucketExpanded(key: string) {
    setExpandedBuckets((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const { buckets, totalMarketCap, validCount } = useMemo(() => {
    const ranked = stocks
      .map((stock): RankedStock | null => {
        const marketCapUsd = stockMarketCapUsd(stock, currency, usdInr);
        if (marketCapUsd == null || stock.marketCap == null) return null;
        return {
          ...stock,
          marketCapUsd,
          marketCapDisplay: stock.marketCap,
        };
      })
      .filter((stock): stock is RankedStock => Boolean(stock))
      .sort((a, b) => b.marketCapUsd - a.marketCapUsd);

    const total = ranked.reduce((sum, stock) => sum + stock.marketCapDisplay, 0);
    const rows = BUCKETS.map<BucketRow>((bucket) => {
      const bucketStocks = ranked.filter((stock) => isInBucket(stock.marketCapUsd / 1e9, bucket));
      const marketCap = bucketStocks.reduce((sum, stock) => sum + stock.marketCapDisplay, 0);
      return {
        ...bucket,
        stocks: bucketStocks,
        marketCap,
        weightPct: total > 0 ? (marketCap / total) * 100 : 0,
        avgOneYearChangePct: averageOneYearChange(bucketStocks),
      };
    });

    return {
      buckets: rows,
      totalMarketCap: total,
      validCount: ranked.length,
    };
  }, [currency, stocks, usdInr]);

  if (isLoading && !stocks.length) return <MarketCapSkeleton />;

  if (!validCount) {
    return (
      <div className="nei-mcap-empty" role="status">
        Market-cap data is unavailable right now.
      </div>
    );
  }

  return (
    <div className="nei-mcap-strata">
      <div className="nei-mcap-summary">
        <span className="nei-mono">Total index cap</span>
        <strong className="nei-mono">{formatMarketCap(totalMarketCap, currency)}</strong>
        <span className="nei-mono">{validCount} companies</span>
      </div>

      <div className="nei-mcap-rows">
        {buckets.map((bucket, index) => {
          const rowStyle = {
            "--mcap-row-index": index,
            "--mcap-row-width": `${Math.max(3, bucket.weightPct)}%`,
          } as CSSProperties;

          const isExpanded = expandedBuckets.has(bucket.key);
          const visibleStocks = isExpanded ? bucket.stocks : bucket.stocks.slice(0, MAX_VISIBLE_LOGOS);

          return (
            <section key={bucket.key} className="nei-mcap-row" style={rowStyle}>
              <div className="nei-mcap-row-intro">
                <div>
                  <h3>{bucket.label}</h3>
                  <p className="nei-mono">{bucket.range}</p>
                </div>
              </div>

              <div className="nei-mcap-count">
                <strong className="nei-mono">{bucket.stocks.length}</strong>
                <span className="nei-mono">companies</span>
              </div>

              <div className="nei-mcap-weight">
                <div>
                  <strong className="nei-mono">{formatMarketCap(bucket.marketCap, currency)}</strong>
                  <span className="nei-mono">{formatPercent(bucket.weightPct)} of index</span>
                </div>
                <span className="nei-mcap-track" aria-hidden="true">
                  <i />
                </span>
              </div>

              <div
                className={`nei-mcap-return ${
                  bucket.avgOneYearChangePct === null
                    ? "is-empty"
                    : bucket.avgOneYearChangePct < 0
                      ? "is-negative"
                      : "is-positive"
                }`}
              >
                <strong className="nei-mono">{formatSignedPercent(bucket.avgOneYearChangePct, 1)}</strong>
                <span className="nei-mono">Avg · 1Y</span>
              </div>

              <div className="nei-mcap-logos" aria-label={`${bucket.label} companies`}>
                {visibleStocks.map((stock) => {
                  const up = (stock.changePct ?? 0) >= 0;
                  const size = LOGO_SIZE;
                  const label = `${stock.displayName}, ${stock.sector}, ${formatMarketCap(
                    stock.marketCap,
                    currency
                  )}, ${formatSignedPercent(stock.changePct, 1)} latest change. Open company detail.`;

                  return (
                    <button
                      type="button"
                      key={stock.ticker}
                      className="nei-mcap-logo-button"
                      style={{
                        "--logo-button-size": `${Math.max(44, size + 8)}px`,
                      } as CSSProperties}
                      onClick={() => setSelected(stock)}
                      aria-label={label}
                    >
                      <CompanyLogo ticker={stock.ticker} name={stock.displayName} size={size} />
                      <span className="nei-mcap-tooltip" role="tooltip">
                        <strong>{stock.displayName}</strong>
                        <span>{stock.sector}</span>
                        <span className="nei-mono">{formatMarketCap(stock.marketCap, currency)}</span>
                        <span className={`nei-mono ${up ? "is-pos" : "is-neg"}`}>
                          {formatSignedPercent(stock.changePct, 1)}
                        </span>
                      </span>
                    </button>
                  );
                })}
                {bucket.stocks.length > MAX_VISIBLE_LOGOS && (
                  // One persistent button (not two swapped on `isExpanded`) so
                  // keyboard focus survives the toggle instead of dropping to
                  // <body> when the "+N" node would otherwise unmount.
                  <button
                    type="button"
                    className={`nei-mcap-logo-button nei-mcap-more-chip${isExpanded ? " is-collapse" : ""}`}
                    onClick={() => toggleBucketExpanded(bucket.key)}
                    aria-expanded={isExpanded}
                    aria-label={
                      isExpanded
                        ? `Show fewer ${bucket.label} companies`
                        : `Show ${bucket.stocks.length - MAX_VISIBLE_LOGOS} more ${bucket.label} companies`
                    }
                  >
                    {isExpanded ? "Less" : `+${bucket.stocks.length - MAX_VISIBLE_LOGOS}`}
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <p className="sr-only">
        Companies are grouped by USD market-cap bands. Bucket totals and company values follow the selected
        currency.
      </p>

      <CompanyModal stock={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
