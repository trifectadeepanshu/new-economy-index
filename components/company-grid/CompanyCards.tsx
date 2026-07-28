import type { Currency, StockData } from "@/lib/index-api";
import { CompanyLogo } from "@/components/company-grid/CompanyLogo";
import { PortfolioMark } from "@/components/company-grid/PortfolioMark";
import {
  formatMarketCap,
  formatPrice,
  formatSignedPercent,
} from "@/components/company-grid/format";

function CompanyCard({
  row,
  currency,
  onSelect,
}: {
  row: StockData;
  currency: Currency;
  onSelect?: (row: StockData) => void;
}) {
  const listedYear = row.listedDate?.slice(0, 4);
  const isUp = (row.changePct ?? 0) >= 0;
  const isPortfolio = row.isPortfolio;

  return (
    <article
      className={`nei-company-card nei-company-card-clickable${isPortfolio ? " is-portfolio" : ""}`}
      onClick={() => onSelect?.(row)}
    >
      <div className="nei-company-card-header">
        <CompanyLogo ticker={row.ticker} name={row.name} />
        <div className="nei-company-card-title">
          <h3 className="nei-heading">
            {isPortfolio && <PortfolioMark />}
            {row.displayName}
          </h3>
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

export function CompanyCards({
  stocks,
  currency = "inr",
  onSelect,
}: {
  stocks: StockData[];
  currency?: Currency;
  onSelect?: (row: StockData) => void;
}) {
  return (
    <div className="nei-company-card-grid">
      {stocks.map((row) => (
        <CompanyCard key={row.ticker} row={row} currency={currency} onSelect={onSelect} />
      ))}
    </div>
  );
}
