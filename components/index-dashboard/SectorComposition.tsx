import type { Currency, SectorCompositionPoint } from "@/lib/index-api";
import { formatMarketCap } from "@/components/index-dashboard/format";
import { formatPercent } from "@/components/index-dashboard/format";

export function SectorComposition({
  sectors,
  currency,
}: {
  sectors: SectorCompositionPoint[];
  currency: Currency;
}) {
  return (
    <div className="nei-sector-composition">
      {sectors.map((sector, index) => {
        const changeTone = (sector.changePct ?? 0) >= 0 ? "is-positive" : "is-negative";
        const weightPct = sector.weightPct ?? 0;

        return (
          <div className="nei-sector-row" key={sector.sector}>
            <div className="nei-sector-row-top">
              <div className="nei-sector-row-title">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{sector.sector}</strong>
                <em>
                  {formatMarketCap(sector.marketCap, currency)} across {sector.numCompanies}{" "}
                  {sector.numCompanies === 1 ? "company" : "companies"}
                </em>
              </div>
              <div className="nei-sector-row-values">
                <span className={`nei-mono ${changeTone}`}>
                  {sector.changePct !== null ? formatPercent(sector.changePct) : "—"}
                </span>
                <strong className="nei-mono">{weightPct.toFixed(1)}%</strong>
              </div>
            </div>
            <div className="nei-sector-track" aria-hidden="true">
              <span style={{ width: `${weightPct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
