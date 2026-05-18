import type { Sector } from "@/lib/companies";

export const HISTORY_RANGES = ["1W", "1M", "1Y", "ALL"] as const;

export type HistoryRange = (typeof HISTORY_RANGES)[number];

export type LiveStockPayload = {
  ticker: string;
  name: string;
  sector: Sector;
  price: number | null;
  changePct: number | null;
  marketCap: number | null;
  basePrice: number | null;
  ratio: number | null;
};

export type StockData = LiveStockPayload;

export type LiveIndexPayload = {
  indexValue: number | null;
  indexChangePct: number | null;
  numCompanies: number;
  lastUpdated: string | null;
  isStale: boolean;
  totalMarketCap: number | null;
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

export type IndexHistoryPayload = {
  range: HistoryRange;
  data: IndexHistoryPoint[];
  sectorData?: SectorHistoryPoint[];
  portfolioData?: IndexHistoryPoint[];
};

export function isHistoryRange(value: string): value is HistoryRange {
  return HISTORY_RANGES.includes(value as HistoryRange);
}
