import { COMPANIES } from "@/lib/companies";
import type { Currency, StockData } from "@/lib/index-api";
import { CompanyLogo } from "@/components/company-grid/CompanyLogo";
import {
  formatMarketCap,
  formatPrice,
  formatSignedPercent,
} from "@/components/company-grid/format";

const LISTED_YEAR_BY_TICKER = new Map(
  COMPANIES.map((company) => [company.ticker, company.listedDate.slice(0, 4)])
);

function CompanyCard({ row, currency }: { row: StockData; currency: Currency }) {
  const listedYear = LISTED_YEAR_BY_TICKER.get(row.ticker);
  const isUp = (row.changePct ?? 0) >= 0;

  return (
    <article className="nei-company-card">
      <div className="nei-company-card-header">
        <CompanyLogo ticker={row.ticker} name={row.name} />
        <div className="nei-company-card-title">
          <h3 className="nei-heading">{row.displayName}</h3>
          <p className="nei-mono">
            {row.sector}
            {listedYear && <span> · {listedYear}</span>}
          </p>
        </div>
      </div>

      <div className="nei-company-card-price">
        <span className="nei-mono">{formatPrice(row.price, currency)}</span>
        <strong className={`nei-mono ${isUp ? "is-positive" : "is-negative"}`}>
          {formatSignedPercent(row.changePct)}
        </strong>
      </div>

      <div className="nei-company-card-meta">
        <span>Market cap</span>
        <strong className="nei-mono">{formatMarketCap(row.marketCap, currency)}</strong>
      </div>
    </article>
  );
}

export function CompanyCards({ stocks, currency = "inr" }: { stocks: StockData[]; currency?: Currency }) {
  return (
    <div className="nei-company-card-grid">
      {stocks.map((row) => (
        <CompanyCard key={row.ticker} row={row} currency={currency} />
      ))}
    </div>
  );
}
