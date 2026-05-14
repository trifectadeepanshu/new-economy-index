import { COMPANIES, INDEX_BASE_DATE, INDEX_BASE_VALUE } from "./companies";

export interface StockWeight {
  ticker: string;
  yfTicker: string;
  name: string;
  basePrice: number;
  currentPrice: number;
  changePct: number | null;
  ratio: number; // currentPrice / basePrice
}

export interface IndexSnapshot {
  value: number;
  changePct: number | null; // vs previous trading day
  stocks: StockWeight[];
  numCompanies: number;
  calculatedAt: string; // ISO timestamp
}

// Calculate index value given a map of ticker -> current price
// and a map of ticker -> base price
export function calculateIndex(
  currentPrices: Record<string, number>,
  basePrices: Record<string, number>,
  asOfDate: string = new Date().toISOString().slice(0, 10)
): IndexSnapshot {
  const eligible = COMPANIES.filter(
    (c) =>
      c.listedDate <= asOfDate &&
      basePrices[c.ticker] !== undefined &&
      currentPrices[c.ticker] !== undefined
  );

  if (eligible.length === 0) {
    return { value: INDEX_BASE_VALUE, changePct: null, stocks: [], numCompanies: 0, calculatedAt: new Date().toISOString() };
  }

  const stocks: StockWeight[] = eligible.map((c) => {
    const base = basePrices[c.ticker];
    const cur = currentPrices[c.ticker];
    const prev = basePrices[`${c.ticker}__prev`]; // previous day price stored alongside
    return {
      ticker: c.ticker,
      yfTicker: c.yfTicker,
      name: c.name,
      basePrice: base,
      currentPrice: cur,
      changePct: prev && prev !== 0 ? ((cur - prev) / prev) * 100 : null,
      ratio: cur / base,
    };
  });

  const avgRatio = stocks.reduce((s, w) => s + w.ratio, 0) / stocks.length;
  const value = INDEX_BASE_VALUE * avgRatio;

  // changePct vs yesterday: average of individual 1-day changes
  const changesAvailable = stocks.filter((s) => s.changePct !== null);
  const changePct =
    changesAvailable.length > 0
      ? changesAvailable.reduce((s, w) => s + (w.changePct ?? 0), 0) / changesAvailable.length
      : null;

  return { value, changePct, stocks, numCompanies: eligible.length, calculatedAt: new Date().toISOString() };
}

// Calculate index value purely from a price map (for historical backfill)
export function calculateIndexFromPrices(
  prices: Record<string, number>, // ticker -> close price on this date
  basePrices: Record<string, number>, // ticker -> base close price
  asOfDate: string
): number | null {
  const eligible = COMPANIES.filter(
    (c) =>
      c.listedDate <= asOfDate &&
      basePrices[c.ticker] !== undefined &&
      prices[c.ticker] !== undefined
  );
  if (eligible.length < 3) return null; // not enough data

  const avgRatio =
    eligible.reduce((s, c) => s + prices[c.ticker] / basePrices[c.ticker], 0) /
    eligible.length;

  return INDEX_BASE_VALUE * avgRatio;
}

// Return the base date to use for a given company
// Companies listed after INDEX_BASE_DATE use their listing date as base
export function getEffectiveBaseDate(listedDate: string): string {
  return listedDate > INDEX_BASE_DATE ? listedDate : INDEX_BASE_DATE;
}
