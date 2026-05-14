"use client";

import Image from "next/image";
import { useState } from "react";
import { SECTORS, SECTOR_COLORS, type Sector } from "@/lib/companies";

// Only render local logos that have enough source pixels to stay sharp.
// Lower-res assets fall back to initials until cleaner brand files are added.
const LOGO_ASSETS: Record<string, { width: number; height: number }> = {
  AADHARHFC: { width: 500, height: 192 },
  AMAGI: { width: 64, height: 64 },
  AWFIS: { width: 64, height: 64 },
  BIKAJI: { width: 64, height: 64 },
  BLACKBUCK: { width: 64, height: 64 },
  BLUESTONE: { width: 64, height: 64 },
  CARTRADE: { width: 64, height: 64 },
  DELHIVERY: { width: 64, height: 64 },
  ETERNAL: { width: 64, height: 64 },
  FIVESTAR: { width: 500, height: 160 },
  GODIGIT: { width: 64, height: 64 },
  HOMEFIRST: { width: 48, height: 48 },
  HONASA: { width: 64, height: 64 },
  IDEAFORGE: { width: 48, height: 48 },
  INDIAMART: { width: 64, height: 64 },
  INDIGOPNTS: { width: 64, height: 64 },
  INDIQUBE: { width: 64, height: 64 },
  IXIGO: { width: 64, height: 64 },
  KISSHT: { width: 48, height: 48 },
  LENSKART: { width: 64, height: 64 },
  MAPMYINDIA: { width: 64, height: 64 },
  NAUKRI: { width: 64, height: 64 },
  NAZARA: { width: 64, height: 64 },
  NORTHARC: { width: 48, height: 48 },
  NYKAA: { width: 64, height: 64 },
  POLICYBZR: { width: 48, height: 48 },
  PWL: { width: 64, height: 64 },
  RATEGAIN: { width: 64, height: 64 },
  SEDEMAC: { width: 650, height: 220 },
  SWIGGY: { width: 64, height: 64 },
  TBOTEK: { width: 48, height: 48 },
  TRACXN: { width: 64, height: 64 },
  URBANCO: { width: 64, height: 64 },
  ZAGGLE: { width: 64, height: 64 },
};

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
  const logo = LOGO_ASSETS[ticker];
  const wideLogo = logo ? logo.width / logo.height > 1.8 : false;
  const initials = name
    .replace(/\([^)]*\)/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  if (logo && !failed) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#0d1e42]">
        <Image
          src={`/logos/${ticker}.png`}
          alt=""
          width={logo.width}
          height={logo.height}
          sizes="40px"
          className="object-contain"
          style={{
            maxWidth: wideLogo ? 34 : 28,
            maxHeight: 28,
            width: "auto",
            height: "auto",
          }}
          onError={() => setFailed(true)}
          unoptimized
        />
      </div>
    );
  }

  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border font-sans text-xs font-bold"
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
    <div className="tr-card flex min-h-16 items-center gap-3 p-3 shadow-[0_32px_80px_rgba(0,0,0,0.55)] transition duration-200 hover:-translate-y-0.5 hover:border-white/25">
      <CompanyLogo ticker={stock.ticker} name={stock.name} color={color} />
      <div className="min-w-0 flex-1">
        <p className="tr-heading truncate text-[13px] font-bold leading-snug text-white">{stock.name}</p>
        <p className="font-sans text-[11px] uppercase tracking-[0.04em] text-white/45">{stock.ticker}</p>
      </div>
      <div className="text-right shrink-0">
        {stock.price !== null ? (
          <>
            <p className="font-sans text-sm font-semibold text-white">
              ₹{stock.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </p>
            {stock.changePct !== null && (
              <p className={`font-sans text-xs font-semibold tabular-nums ${up ? "text-[#E24929]" : "text-red-400"}`}>
                {up ? "+" : ""}{stock.changePct.toFixed(2)}%
              </p>
            )}
          </>
        ) : (
          <p className="font-sans text-xs text-white/35">—</p>
        )}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="tr-card flex items-center gap-3 p-3">
      <div className="h-10 w-10 animate-pulse rounded-xl bg-white/10" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-3/4 animate-pulse rounded bg-white/10" />
        <div className="h-2 w-1/2 animate-pulse rounded bg-white/10" />
      </div>
      <div className="space-y-2 text-right">
        <div className="h-3 w-16 animate-pulse rounded bg-white/10" />
        <div className="h-2 w-10 animate-pulse rounded bg-white/10" />
      </div>
    </div>
  );
}

export function CompanyGrid({ stocks, isLoading }: Props) {
  if (isLoading && stocks.length === 0) {
    return (
      <div className="tr-card p-5">
        <h2 className="tr-section-label mb-4">All Companies</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="tr-card p-5">
      <h2 className="tr-section-label mb-5">
        All Companies
        <span className="ml-2 font-sans text-[10px] font-medium tracking-normal text-white/35">({stocks.length})</span>
      </h2>

      {SECTORS.map((sector) => {
        const sectorStocks = stocks
          .filter((s) => s.sector === sector)
          .sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0));
        if (sectorStocks.length === 0) return null;
        return (
          <div key={sector} className="mb-6">
            <h3 className="tr-section-label mb-2">
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
