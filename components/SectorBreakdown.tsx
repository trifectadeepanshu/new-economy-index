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
              <div key={sector} className="flex items-center gap-3">
                <span className="w-32 shrink-0 text-right text-xs text-zinc-400">{sector}</span>
                <div className="relative flex-1 h-6 rounded bg-zinc-800 overflow-hidden">
                  <div
                    className="absolute top-0 h-full rounded transition-all duration-500"
                    style={{
                      width: `${barWidth * 100}%`,
                      backgroundColor: up ? "#34d399" : "#f87171",
                      opacity: 0.85,
                      left: up ? "50%" : undefined,
                      right: up ? undefined : `${50}%`,
                    }}
                  />
                  <div
                    className="absolute inset-0 flex items-center justify-center text-xs font-medium"
                    style={{ color }}
                  >
                    {pct >= 0 ? "+" : ""}{pct.toFixed(2)}%
                  </div>
                </div>
                <span className="w-8 shrink-0 text-xs text-zinc-600">{count}</span>
              </div>
            );
          })}
      </div>
    </div>
  );
}
