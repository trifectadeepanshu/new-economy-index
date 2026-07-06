"use client";

import { useEffect, useState } from "react";
import { SECTORS, type Sector } from "@/lib/companies";
import type { IndexHistoryPayload, SectorHistoryPoint } from "@/lib/index-api";
import { Sparkline } from "@/components/index-dashboard/DashboardChrome";
import { SECTOR_CHART_COLORS } from "@/components/index-chart/constants";

/** Small-multiples grid: one mini sub-index chart per sector. */
export function SectorCharts() {
  const [points, setPoints] = useState<SectorHistoryPoint[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/index/history?range=1Y&includeSectors=1", { signal: controller.signal })
      .then((r) => (r.ok ? (r.json() as Promise<IndexHistoryPayload>) : Promise.reject()))
      .then((json) => setPoints(json.sectorData ?? []))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const bySector = new Map<Sector, number[]>();
  for (const p of points) {
    const arr = bySector.get(p.sector) ?? [];
    arr.push(p.value);
    bySector.set(p.sector, arr);
  }

  return (
    <div className="nei-sector-charts-grid">
      {SECTORS.map((sector) => {
        const series = bySector.get(sector) ?? [];
        const latest = series.at(-1);
        const first = series[0];
        const chg = latest != null && first ? (latest / first - 1) * 100 : null;

        return (
          <div key={sector} className="nei-sector-chart-card">
            <div className="nei-sector-chart-head">
              <span className="nei-sector-chart-dot" style={{ background: SECTOR_CHART_COLORS[sector] }} />
              <strong>{sector}</strong>
              {latest != null && (
                <span className="nei-mono nei-sector-chart-val">
                  {Math.round(latest).toLocaleString("en-IN")}
                </span>
              )}
            </div>
            <div className="nei-sector-chart-spark">
              <Sparkline series={series} height={52} />
            </div>
            <span className={`nei-sector-chart-chg ${chg != null && chg >= 0 ? "is-pos" : "is-neg"}`}>
              {chg != null ? `${chg >= 0 ? "+" : ""}${chg.toFixed(1)}% · 1Y` : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
