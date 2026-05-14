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
    <section className="relative py-10 sm:py-14">
      <div className="pointer-events-none absolute right-4 top-8 hidden h-28 w-px bg-gradient-to-b from-transparent via-[#E24929]/70 to-transparent md:block" />
      <p className="tr-section-label mb-3">{INDEX_NAME}</p>

      {isLoading && indexValue === null ? (
        <div className="h-20 w-72 animate-pulse rounded-lg bg-white/10" />
      ) : (
        <div className="flex flex-wrap items-end gap-4">
          <span
            className={`tr-heading text-[clamp(48px,6vw,80px)] font-bold leading-none tracking-normal ${
              up ? "bg-[linear-gradient(120deg,#fff_40%,rgba(226,73,41,0.75))] bg-clip-text text-transparent" : "text-white"
            }`}
          >
            {indexValue !== null ? fmt(indexValue) : "—"}
          </span>

          {indexChangePct !== null && (
            <span
              className={`mb-1.5 border px-3 py-1.5 font-sans text-sm font-semibold tabular-nums ${
                up
                  ? "border-[#E24929]/35 bg-[#E24929]/10 text-[#E24929]"
                  : "border-red-400/35 bg-red-500/10 text-red-400"
              }`}
            >
              {fmtPct(indexChangePct)}
              <span className="ml-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
                today
              </span>
            </span>
          )}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-stretch gap-5 text-sm text-white/45">
        {sinceInceptionPct !== null && (
          <div className="border-l-2 border-[#E24929]/70 pl-4">
            <span className={`font-sans text-sm font-semibold tabular-nums ${sinceInceptionPct >= 0 ? "text-[#E24929]" : "text-red-400"}`}>
              {fmtPct(sinceInceptionPct)}
            </span>
            <span className="ml-2 font-sans text-xs text-white/45">
              since inception ({inceptionLabel})
            </span>
          </div>
        )}
        <div className="hidden w-px bg-gradient-to-b from-transparent via-[#E24929]/70 to-transparent sm:block" />
        <div className="flex items-center">
          <span className="font-sans text-sm font-semibold text-white">{numCompanies}</span>
          <span className="ml-2 font-sans text-xs text-white/45">companies</span>
        </div>
        {lastUpdated && (
          <div className="flex items-center font-sans text-xs text-white/35">
            Updated {formatLastUpdated(lastUpdated, now)}
          </div>
        )}
      </div>
    </section>
  );
}
