"use client";

import { SECTORS, SECTOR_COLORS, type Sector } from "@/lib/companies";

interface StockData {
  sector: string;
  changePct: number | null;
}

interface Props {
  stocks: StockData[];
}

export function SectorBreakdown({ stocks }: Props) {
  const sectorStats = SECTORS.map((sector) => {
    const sectorStocks = stocks.filter(
      (s) => s.sector === sector && s.changePct !== null
    );
    const avg =
      sectorStocks.length > 0
        ? sectorStocks.reduce((s, c) => s + (c.changePct ?? 0), 0) / sectorStocks.length
        : null;
    return { sector, avg, count: sectorStocks.length };
  }).filter((s) => s.count > 0);

  if (sectorStats.length === 0) return null;

  const maxAbs = Math.max(...sectorStats.map((s) => Math.abs(s.avg ?? 0)), 1);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="mb-4 text-sm font-semibold text-zinc-300">Sector Performance Today</h2>
      <div className="space-y-3">
        {sectorStats
          .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0))
          .map(({ sector, avg, count }) => {
            const pct = avg ?? 0;
            const barWidth = Math.abs(pct) / maxAbs;
            const up = pct >= 0;
            const color = SECTOR_COLORS[sector as Sector];
            return (
              <div
                key={sector}
                className="grid grid-cols-[minmax(5rem,8rem)_minmax(0,1fr)_2rem] items-center gap-3"
              >
                <span className="truncate text-left text-xs text-zinc-400 sm:text-right">{sector}</span>
                <div className="relative h-7 min-w-0 overflow-hidden rounded bg-zinc-800">
                  <div className="absolute left-1/2 top-0 h-full w-px bg-zinc-700" />
                  <div
                    className="absolute top-0 h-full rounded transition-all duration-500"
                    style={{
                      width: `${barWidth * 50}%`,
                      backgroundColor: up ? "#34d399" : "#f87171",
                      opacity: 0.85,
                      left: up ? "50%" : undefined,
                      right: up ? undefined : "50%",
                    }}
                  />
                  <div
                    className="absolute inset-0 flex items-center justify-center text-xs font-semibold tabular-nums"
                    style={{ color }}
                  >
                    {pct >= 0 ? "+" : ""}{pct.toFixed(2)}%
                  </div>
                </div>
                <span className="text-right text-xs text-zinc-600">{count}</span>
              </div>
            );
          })}
      </div>
    </div>
  );
}
