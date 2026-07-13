import type { Sector } from "@/lib/companies";

export const HISTORY_RANGES = ["1W", "1M", "1Y", "ALL"] as const;

export type HistoryRange = (typeof HISTORY_RANGES)[number];

export type LiveStockPayload = {
  ticker: string;
  name: string;
  displayName: string;
  sector: Sector;
  price: number | null;
  changePct: number | null;
  marketCap: number | null;
  basePrice: number | null;
  ratio: number | null;
  /** Latest close date behind this displayed row, when known. */
  asOfDate: string | null;
  /** True when this row is older than the index snapshot backing the payload. */
  isStale: boolean;
};

export type StockData = LiveStockPayload;

export type Currency = "inr" | "usd";

export type MarketStats = {
  high52w: number | null;
  low52w: number | null;
  advancers: number;
  decliners: number;
};

export type SectorCompositionPoint = {
  sector: Sector;
  numCompanies: number;
  marketCap: number | null;
  weightPct: number | null;
  changePct: number | null;
  advancers: number;
  decliners: number;
};

export type LiveIndexPayload = {
  indexValue: number | null;
  indexChangePct: number | null;
  portfolioValue: number | null;
  numCompanies: number;
  lastUpdated: string | null;
  isStale: boolean;
  totalMarketCap: number | null;
  /** Currency the monetary values are expressed in. */
  currency: Currency;
  /** Live USD/INR rate (shown regardless of display currency). */
  usdInr: number | null;
  /** Trifecta portfolio companies' combined market cap as % of the index total. */
  trifectaWeightPct: number | null;
  /** Constituent tickers whose displayed close is older than the index snapshot. */
  staleConstituents: string[];
  /** Server-computed headline market stats from validated live/snapshot data. */
  marketStats: MarketStats;
  /** Market-cap composition of the current index constituents. */
  sectorComposition: SectorCompositionPoint[];
  stocks: LiveStockPayload[];
};

export type IndexHistoryPoint = {
  date: string;
  value: number;
};

export type SectorHistoryPoint = {
  date: string;
  sector: Sector;
  value: number;
  numCompanies: number;
};

export type BenchmarkKey = "NIFTY50" | "NIFTYMIDCAP";

export type BenchmarkSeries = {
  symbol: BenchmarkKey;
  label: string;
  points: IndexHistoryPoint[];
};

export type IndexHistoryPayload = {
  range: HistoryRange;
  data: IndexHistoryPoint[];
  sectorData?: SectorHistoryPoint[];
  portfolioData?: IndexHistoryPoint[];
  benchmarks?: BenchmarkSeries[];
};

export function isHistoryRange(value: string): value is HistoryRange {
  return HISTORY_RANGES.includes(value as HistoryRange);
}

// --- Company detail (modal) ---------------------------------------------------

export type CompanyFinancialPeriod = {
  period: string; // ISO quarter-end date
  label: string; // e.g. "Q4 FY26"
  revenue: number | null; // in `currency`
  pat: number | null; // in `currency`, as reported
  ebitdaMargin: number | null; // %
  patMargin: number | null; // %
  revenueGrowth: number | null; // % YoY vs same quarter last year
  assetIntensity: number | null; // total assets / TTM revenue (x)
};

export type AnalystConsensus = {
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
  key: string | null; // e.g. "buy", "hold"
  numAnalysts: number | null;
};

export type CompanyDetail = {
  ticker: string;
  currency: Currency;
  description: string | null;
  financials: CompanyFinancialPeriod[];
  analyst: AnalystConsensus | null;
  priceSeries: { date: string; close: number }[]; // in `currency`
};
