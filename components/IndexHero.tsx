"use client";

import { useEffect, useState } from "react";
import { formatLastUpdated } from "@/lib/market-hours";
import { INDEX_BASE_DATE, INDEX_NAME } from "@/lib/companies";

interface Props {
  indexValue: number | null;
  indexChangePct: number | null;
  numCompanies: number;
  lastUpdated: Date | null;
  sinceInceptionPct: number | null;
  isLoading: boolean;
}

function fmt(n: number) {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}

function fmtPct(n: number) {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

const inceptionLabel = new Date(`${INDEX_BASE_DATE}T00:00:00+05:30`).toLocaleString(
  "en-IN",
  { month: "short", year: "numeric", timeZone: "Asia/Kolkata" }
);

export function IndexHero({ indexValue, indexChangePct, numCompanies, lastUpdated, sinceInceptionPct, isLoading }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const up = indexChangePct !== null ? indexChangePct >= 0 : true;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="py-10 sm:py-14">
      <p className="text-sm font-medium text-zinc-500 mb-2">{INDEX_NAME}</p>

      {isLoading && indexValue === null ? (
        <div className="h-16 w-64 animate-pulse rounded-lg bg-zinc-800" />
      ) : (
        <div className="flex flex-wrap items-end gap-4">
          <span className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
            {indexValue !== null ? fmt(indexValue) : "—"}
          </span>

          {indexChangePct !== null && (
            <span className={`mb-1.5 text-xl font-semibold ${up ? "text-emerald-400" : "text-red-400"}`}>
              {fmtPct(indexChangePct)}
              <span className="ml-1 text-xs font-normal text-zinc-500">today</span>
            </span>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-6 text-sm text-zinc-400">
        {sinceInceptionPct !== null && (
          <div>
            <span className={`font-semibold ${sinceInceptionPct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {fmtPct(sinceInceptionPct)}
            </span>
            <span className="ml-1 text-zinc-500">since inception ({inceptionLabel})</span>
          </div>
        )}
        <div>
          <span className="font-semibold text-zinc-300">{numCompanies}</span>
          <span className="ml-1 text-zinc-500">companies</span>
        </div>
        {lastUpdated && (
          <div className="text-zinc-600">
            Updated {formatLastUpdated(lastUpdated, now)}
          </div>
        )}
      </div>
    </div>
  );
}
