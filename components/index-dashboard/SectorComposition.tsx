import { useMemo } from "react";
import { COMPANIES, SECTORS } from "@/lib/companies";
import type { StockData } from "@/lib/index-api";
import { formatPercent } from "@/components/index-dashboard/format";

type SectorInput = Pick<StockData, "sector" | "changePct">;

function buildSectorComposition(stocks: StockData[], totalListings: number) {
  const source: SectorInput[] = stocks.length
    ? stocks
    : COMPANIES.map((company) => ({ sector: company.sector, changePct: null }));
  const total = source.length || totalListings || 1;
  const bySector = new Map<string, { count: number; changeTotal: number; changeCount: number }>();

  for (const row of source) {
    const item = bySector.get(row.sector) ?? { count: 0, changeTotal: 0, changeCount: 0 };
    item.count += 1;

    if (row.changePct !== null) {
      item.changeTotal += row.changePct;
      item.changeCount += 1;
    }

    bySector.set(row.sector, item);
  }

  return SECTORS.map((name) => {
    const item = bySector.get(name) ?? { count: 0, changeTotal: 0, changeCount: 0 };
    return {
      name,
      count: item.count,
      pct: (item.count / total) * 100,
      avgChange: item.changeCount ? item.changeTotal / item.changeCount : null,
    };
  })
    .filter((sector) => sector.count > 0)
    .sort((a, b) => b.pct - a.pct);
}

export function SectorComposition({
  stocks,
  totalListings,
}: {
  stocks: StockData[];
  totalListings: number;
}) {
  const sectors = useMemo(
    () => buildSectorComposition(stocks, totalListings),
    [stocks, totalListings]
  );

  return (
    <div className="nei-sector-composition">
      {sectors.map((sector, index) => (
        <div className="nei-sector-row" key={sector.name}>
          <div className="nei-sector-row-top">
            <div className="nei-sector-row-title">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{sector.name}</strong>
              <em>{sector.count} {sector.count === 1 ? "listing" : "listings"}</em>
            </div>
            <div className="nei-sector-row-values">
              <span
                className={`nei-mono ${
                  (sector.avgChange ?? 0) >= 0 ? "is-positive" : "is-negative"
                }`}
              >
                {sector.avgChange !== null ? formatPercent(sector.avgChange) : "—"}
              </span>
              <strong className="nei-mono">{sector.pct.toFixed(1)}%</strong>
            </div>
          </div>
          <div className="nei-sector-track" aria-hidden="true">
            <span style={{ width: `${sector.pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
