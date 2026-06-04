import { COMPANIES } from "@/lib/companies";
import { fetchAllQuotes } from "@/lib/yahoo-finance";

const MARKET_CAP_TTL_MS = 60 * 60 * 1000; // 1 hour
let marketCapCache: { data: Record<string, number>; fetchedAt: number } | null = null;

export type MarketCapMap = Record<string, number>;

export async function getMarketCaps(yfTickers?: string[]): Promise<MarketCapMap> {
  const now = Date.now();
  if (marketCapCache && now - marketCapCache.fetchedAt < MARKET_CAP_TTL_MS) {
    return marketCapCache.data;
  }
  const tickers = yfTickers ?? COMPANIES.map((c) => c.yfTicker);
  try {
    const quotes = await fetchAllQuotes(tickers);
    const data: MarketCapMap = {};
    for (const q of quotes) {
      if (q.marketCap != null && q.marketCap > 0) data[q.ticker] = q.marketCap;
    }
    marketCapCache = { data, fetchedAt: now };
    return data;
  } catch {
    return marketCapCache?.data ?? {};
  }
}
