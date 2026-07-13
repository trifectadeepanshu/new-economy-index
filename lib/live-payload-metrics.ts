import { format, parseISO, subYears } from "date-fns";
import { SECTORS, type Sector } from "./companies";
import type { IndexRangeStats, LatestStockSnapshot } from "./db";
import type {
  MarketStats,
  SectorCompositionPoint,
  StockData,
} from "./index-api";
import { round } from "./index-math";

export type PricePoint = {
  price: number | null;
  changePct: number | null;
  asOfDate?: string | null;
  isStale?: boolean;
};

export function getTrailingYearFromDate(toDate: string) {
  return format(subYears(parseISO(toDate), 1), "yyyy-MM-dd");
}

export function buildMarketStats(
  stocks: StockData[],
  rangeStats: IndexRangeStats,
  currentIndexValue: number | null
): MarketStats {
  const advancers = stocks.filter((stock) => (stock.changePct ?? 0) > 0).length;
  const decliners = stocks.filter((stock) => (stock.changePct ?? 0) < 0).length;
  const highValues = [rangeStats.high, currentIndexValue].filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value)
  );
  const lowValues = [rangeStats.low, currentIndexValue].filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value)
  );

  return {
    high52w: highValues.length ? round(Math.max(...highValues), 4) : null,
    low52w: lowValues.length ? round(Math.min(...lowValues), 4) : null,
    advancers,
    decliners,
  };
}

export function buildSectorComposition(stocks: StockData[]): SectorCompositionPoint[] {
  const totalMarketCap = stocks.reduce((sum, stock) => sum + (stock.marketCap ?? 0), 0);
  const bySector = new Map<
    Sector,
    {
      marketCap: number;
      numCompanies: number;
      weightedChange: number;
      changeWeight: number;
      advancers: number;
      decliners: number;
    }
  >();

  for (const stock of stocks) {
    const item = bySector.get(stock.sector) ?? {
      marketCap: 0,
      numCompanies: 0,
      weightedChange: 0,
      changeWeight: 0,
      advancers: 0,
      decliners: 0,
    };
    const marketCap = stock.marketCap ?? 0;
    const changePct = stock.changePct;

    item.marketCap += marketCap;
    item.numCompanies += 1;
    if (typeof changePct === "number" && Number.isFinite(changePct)) {
      if (changePct > 0) item.advancers += 1;
      if (changePct < 0) item.decliners += 1;
      if (marketCap > 0) {
        item.weightedChange += changePct * marketCap;
        item.changeWeight += marketCap;
      }
    }

    bySector.set(stock.sector, item);
  }

  return SECTORS.map((sector) => {
    const item = bySector.get(sector);
    return {
      sector,
      numCompanies: item?.numCompanies ?? 0,
      marketCap: item && item.marketCap > 0 ? round(item.marketCap, 2) : null,
      weightPct:
        item && totalMarketCap > 0 ? round((item.marketCap / totalMarketCap) * 100, 2) : null,
      changePct:
        item && item.changeWeight > 0 ? round(item.weightedChange / item.changeWeight, 2) : null,
      advancers: item?.advancers ?? 0,
      decliners: item?.decliners ?? 0,
    };
  })
    .filter((sector) => sector.numCompanies > 0)
    .sort((a, b) => (b.weightPct ?? 0) - (a.weightPct ?? 0));
}

export function stockSnapshotsToPricePoints(
  latestClose: Record<string, LatestStockSnapshot>,
  snapshotDate: string | null
): Record<string, PricePoint> {
  const out: Record<string, PricePoint> = {};
  for (const [ticker, close] of Object.entries(latestClose)) {
    out[ticker] = {
      price: close.price,
      changePct: close.changePct,
      asOfDate: close.date,
      isStale: snapshotDate !== null && close.date !== snapshotDate,
    };
  }
  return out;
}

export function staleTickersFor(
  tickers: string[],
  latestClose: Record<string, LatestStockSnapshot>,
  snapshotDate: string | null
) {
  if (!snapshotDate) return [];
  return tickers.filter((ticker) => latestClose[ticker]?.date !== snapshotDate);
}
