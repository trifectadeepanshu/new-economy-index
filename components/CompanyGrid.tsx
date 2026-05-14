"use client";

import { useState } from "react";
import { SECTORS, SECTOR_COLORS, type Sector } from "@/lib/companies";

// Clearbit logo domains keyed by NSE ticker
const LOGO_DOMAINS: Record<string, string> = {
  ETERNAL:    "zomato.com",
  SWIGGY:     "swiggy.com",
  POLICYBZR:  "policybazaar.com",
  MEESHO:     "meesho.com",
  NYKAA:      "nykaa.com",
  URBANCO:    "urbancompany.com",
  FIRSTCRY:   "firstcry.com",
  TBOTEK:     "tbo.com",
  PWL:        "pw.live",
  INDIGOPNTS: "indigopaints.com",
  GOCOLORS:   "gocolors.com",
  SULA:       "sulawines.com",
  WAKEFIT:    "wakefit.co",
  BLACKBUCK:  "blackbuck.com",
  OLAELEC:    "olaelectric.com",
  BIKAJI:     "bikaji.com",
  TRACXN:     "tracxn.com",
  HONASA:     "mamaearth.in",
  BLUESTONE:  "bluestone.com",
  IXIGO:      "ixigo.com",
  YATRA:      "yatra.com",
  ATHERENERG: "atherenergy.com",
  GROWW:      "groww.in",
  PAYTM:      "paytm.com",
  PINELABS:   "pinelabs.com",
  ZAGGLE:     "zaggle.in",
  MOBIKWIK:   "mobikwik.com",
  KISSHT:     "kissht.com",
  DELHIVERY:  "delhivery.com",
  INDIAMART:  "indiamart.com",
  AWFIS:      "awfis.com",
  MEDIASSIST: "mediassist.in",
  IDEAFORGE:  "ideaforge.in",
  INDIQUBE:   "indiqube.com",
  UNIECOM:    "unicommerce.com",
  SHADOWFAX:  "shadowfax.in",
  GODIGIT:    "godigit.com",
  AADHARHFC:  "aadharhfc.com",
  FIVESTAR:   "fivestarfinance.in",
  HOMEFIRST:  "homfirst.com",
  INDIASHLTR: "indiashelter.in",
  NORTHARC:   "northernarc.com",
  AYE:        "ayefin.com",
  MAPMYINDIA: "mapmyindia.com",
  FRACTAL:    "fractal.ai",
  CAPILLARY:  "capillarytech.com",
  AMAGI:      "amagi.com",
  RATEGAIN:   "rategain.com",
  LENSKART:   "lenskart.com",
  NAUKRI:     "naukri.com",
  NAZARA:     "nazara.com",
  CARTRADE:   "cartrade.com",
  SEDEMAC:    "sedemac.com",
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
  const domain = LOGO_DOMAINS[ticker];
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  if (domain && !failed) {
    return (
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md overflow-hidden bg-white"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://logo.clearbit.com/${domain}?size=64`}
          alt={name}
          width={36}
          height={36}
          className="h-full w-full object-contain p-0.5"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-xs font-bold"
      style={{ backgroundColor: color + "33", color }}
    >
      {initials}
    </div>
  );
}

function CompanyCard({ stock }: { stock: StockData }) {
  const up = (stock.changePct ?? 0) >= 0;
  const color = SECTOR_COLORS[stock.sector as Sector] ?? "#6b7280";

  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3 hover:border-zinc-700 transition-colors">
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
              <p className={`text-xs font-medium ${up ? "text-emerald-400" : "text-red-400"}`}>
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
      <div className="h-9 w-9 animate-pulse rounded-md bg-zinc-800" />
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
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
