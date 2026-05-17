import { COMPANIES } from "@/lib/companies";
import type { StockData } from "@/lib/index-api";
import { CompanyLogo } from "@/components/company-grid/CompanyLogo";
import {
  displayCompanyName,
  formatPrice,
  formatSignedPercent,
} from "@/components/company-grid/format";

const LISTED_YEAR_BY_TICKER = new Map(
  COMPANIES.map((company) => [company.ticker, company.listedDate.slice(0, 4)])
);

function CompanyCard({ row }: { row: StockData }) {
  const listedYear = LISTED_YEAR_BY_TICKER.get(row.ticker);
  const isUp = (row.changePct ?? 0) >= 0;

  return (
    <article className="nei-company-card">
      <div className="nei-company-card-header">
        <CompanyLogo ticker={row.ticker} name={row.name} />
        <div className="nei-company-card-title">
          <h3 className="nei-heading">{displayCompanyName(row.name)}</h3>
          <p className="nei-mono">
            {row.ticker}
            {listedYear && <span> · {listedYear}</span>}
          </p>
        </div>
      </div>

      <div className="nei-company-card-price">
        <span className="nei-mono">{formatPrice(row.price)}</span>
        <strong className={`nei-mono ${isUp ? "is-positive" : "is-negative"}`}>
          {formatSignedPercent(row.changePct)}
        </strong>
      </div>
    </article>
  );
}

export function CompanyCards({ stocks }: { stocks: StockData[] }) {
  return (
    <div className="nei-company-card-grid">
      {stocks.map((row) => (
        <CompanyCard key={row.ticker} row={row} />
      ))}
    </div>
  );
}
