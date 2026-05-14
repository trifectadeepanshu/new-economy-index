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
    <div className="tr-card p-5">
      <div className="mb-5 border-l-2 border-[#E24929] pl-3">
        <h2 className="tr-section-label">Sector Performance</h2>
      </div>
      <div className="space-y-4">
        {sectorStats
          .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0))
          .map(({ sector, avg }) => {
            const pct = avg ?? 0;
            const barWidth = Math.abs(pct) / maxAbs;
            const up = pct >= 0;
            const color = SECTOR_COLORS[sector as Sector];
            return (
              <div key={sector} className="grid grid-cols-[minmax(6rem,8rem)_minmax(0,1fr)_3.5rem] items-center gap-3">
                <span className="flex min-w-0 items-center gap-2 font-sans text-xs font-medium text-white">
                  <span className="h-1.5 w-1.5 shrink-0" style={{ backgroundColor: color }} />
                  <span className="truncate">{sector}</span>
                </span>
                <div className="relative h-2 min-w-0 overflow-hidden bg-white/[0.08]">
                  <div
                    className="absolute left-0 top-0 h-full transition-all duration-500"
                    style={{
                      width: `${barWidth * 100}%`,
                      background: up
                        ? "linear-gradient(90deg, rgba(226,73,41,0.95), rgba(226,73,41,0.08))"
                        : "linear-gradient(90deg, rgba(239,68,68,0.95), rgba(239,68,68,0.08))",
                    }}
                  />
                </div>
                <span
                  className="text-right font-sans text-xs font-semibold tabular-nums"
                  style={{ color: up ? "#E24929" : "#ef4444" }}
                >
                  {pct >= 0 ? "+" : ""}{pct.toFixed(2)}%
                </span>
              </div>
            );
          })}
      </div>
    </div>
  );
}
