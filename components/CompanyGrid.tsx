"use client";

import Image from "next/image";
import { useState } from "react";
import { SECTORS, SECTOR_COLORS, type Sector } from "@/lib/companies";

// Only use local files that are valid image assets and large enough to render cleanly.
const USABLE_LOGOS = new Set([
  "AMAGI", "AWFIS", "AYE", "BIKAJI", "BLACKBUCK", "BLUESTONE",
  "CARTRADE", "DELHIVERY", "ETERNAL", "FIRSTCRY", "FRACTAL",
  "GODIGIT", "GROWW", "HONASA", "INDIAMART", "INDIASHLTR",
  "INDIGOPNTS", "INDIQUBE", "IXIGO", "KISSHT", "LENSKART",
  "MAPMYINDIA", "MEDIASSIST", "MEESHO", "NAUKRI", "NAZARA",
  "NYKAA", "OLAELEC", "PAYTM", "POLICYBZR", "PWL", "RATEGAIN",
  "SHADOWFAX", "SWIGGY", "TBOTEK", "TRACXN", "URBANCO", "ZAGGLE",
]);

interface StockData {
  ticker: string;
  name: string;
  sector: string;
  price: number | null;
  changePct: number | null;
}

interface Props {
  stocks: StockData[];
  isLoading: boolean;
}

function CompanyLogo({ ticker, name, color }: { ticker: string; name: string; color: string }) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .replace(/\([^)]*\)/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  if (USABLE_LOGOS.has(ticker) && !failed) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-1.5 ring-1 ring-white/10">
        <Image
          src={`/logos/${ticker}.png`}
          alt=""
          width={32}
          height={32}
          sizes="40px"
          className="h-full w-full object-contain"
          onError={() => setFailed(true)}
          unoptimized
        />
      </div>
    );
  }

  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-xs font-bold"
      style={{ backgroundColor: `${color}24`, color, borderColor: `${color}55` }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

function CompanyCard({ stock }: { stock: StockData }) {
  const up = (stock.changePct ?? 0) >= 0;
  const color = SECTOR_COLORS[stock.sector as Sector] ?? "#6b7280";

  return (
    <div className="flex min-h-16 items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3 transition-colors hover:border-zinc-700">
      <CompanyLogo ticker={stock.ticker} name={stock.name} color={color} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{stock.name}</p>
        <p className="text-xs text-zinc-500">{stock.ticker}</p>
      </div>
      <div className="text-right shrink-0">
        {stock.price !== null ? (
          <>
            <p className="text-sm font-semibold text-white">
              ₹{stock.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </p>
            {stock.changePct !== null && (
              <p className={`text-xs font-medium tabular-nums ${up ? "text-emerald-400" : "text-red-400"}`}>
                {up ? "+" : ""}{stock.changePct.toFixed(2)}%
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-zinc-600">—</p>
        )}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
      <div className="h-10 w-10 animate-pulse rounded-lg bg-zinc-800" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-3/4 animate-pulse rounded bg-zinc-800" />
        <div className="h-2 w-1/2 animate-pulse rounded bg-zinc-800" />
      </div>
      <div className="space-y-2 text-right">
        <div className="h-3 w-16 animate-pulse rounded bg-zinc-800" />
        <div className="h-2 w-10 animate-pulse rounded bg-zinc-800" />
      </div>
    </div>
  );
}

export function CompanyGrid({ stocks, isLoading }: Props) {
  if (isLoading && stocks.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="mb-4 text-sm font-semibold text-zinc-300">All Companies</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="mb-4 text-sm font-semibold text-zinc-300">
        All Companies
        <span className="ml-2 text-zinc-600 font-normal">({stocks.length})</span>
      </h2>

      {SECTORS.map((sector) => {
        const sectorStocks = stocks
          .filter((s) => s.sector === sector)
          .sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0));
        if (sectorStocks.length === 0) return null;
        return (
          <div key={sector} className="mb-6">
            <h3
              className="mb-2 text-xs font-semibold uppercase tracking-wider"
              style={{ color: SECTOR_COLORS[sector] }}
            >
              {sector}
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {sectorStocks.map((s) => (
                <CompanyCard key={s.ticker} stock={s} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
