import type { Company } from "./companies";
import type { StockSnapshotInput } from "./db";
import type { QuoteResult } from "./yahoo-finance";

export const STOCK_SOURCE_YAHOO = "yahoo";
export const STOCK_SOURCE_CAPIQ = "excel-capiq";

export function quotesByTicker(quotes: QuoteResult[]): Record<string, QuoteResult> {
  return Object.fromEntries(
    quotes
      .filter((quote) => quote.ticker)
      .map((quote) => [quote.ticker, quote])
  );
}

export function missingQuoteTickers(
  companies: Company[],
  quotes: Record<string, QuoteResult | undefined>
) {
  return companies
    .filter((company) => quotes[company.ticker]?.price == null)
    .map((company) => company.ticker);
}

export function toYahooStockSnapshotInput(
  date: string,
  company: Company,
  quotes: Record<string, QuoteResult | undefined>
): StockSnapshotInput | null {
  const quote = quotes[company.ticker];
  if (quote?.price == null) return null;

  return {
    date,
    ticker: company.ticker,
    closePrice: quote.price,
    changePct: quote.changePct,
    source: STOCK_SOURCE_YAHOO,
    providerSymbol: company.yfTicker,
  };
}
