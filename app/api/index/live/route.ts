import { NextResponse } from "next/server";
import { COMPANIES, type Company } from "@/lib/companies";
import { fetchAllQuotes as fetchUpstoxQuotes, type QuoteResult } from "@/lib/upstox";
import {
  ensureSchema,
  getEarliestPricesPerTicker,
  getLatestIndexSnapshot,
  getLatestStockPrices,
  getLiveIndexState,
  getSharesMap,
  type LatestStockPrice,
} from "@/lib/db";
import type { LiveIndexPayload, StockData } from "@/lib/index-api";
import { priceRatio, round } from "@/lib/index-math";
import { liveIndexValue } from "@/lib/index-engine";
import { getISTDate } from "@/lib/market-hours";

export const dynamic = "force-dynamic";

const LIVE_CACHE_HEADERS = {
  "Cache-Control": "no-store",
};

let schemaReady: Promise<void> | null = null;
function ensureSchemaOnce() {
  schemaReady ??= ensureSchema();
  return schemaReady;
}

type PricePoint = {
  price: number | null;
  changePct: number | null;
};

function buildStocks(
  companies: Company[],
  prices: Record<string, PricePoint | undefined>,
  basePrices: Record<string, number>,
  shares: Map<string, number>
): StockData[] {
  return companies.map(({ ticker, name, sector }) => {
    const current = prices[ticker];
    const basePrice = basePrices[ticker] ?? null;
    const price = current?.price ?? null;
    const sh = shares.get(ticker);
    const marketCap = price != null && sh != null ? price * sh : null;

    return {
      ticker,
      name,
      sector,
      price,
      changePct: current?.changePct ?? null,
      marketCap,
      basePrice,
      ratio: priceRatio(price, basePrice),
    };
  });
}

function quotePricesByTicker(quotes: QuoteResult[]): Record<string, PricePoint> {
  return Object.fromEntries(
    quotes
      .filter((quote) => quote.ticker)
      .map((quote) => [quote.ticker, { price: quote.price, changePct: quote.changePct }])
  );
}

function sumMarketCap(stocks: StockData[]): number | null {
  const total = stocks.reduce((sum, s) => sum + (s.marketCap ?? 0), 0);
  return total > 0 ? total : null;
}

function toPayload({
  stocks,
  indexValue,
  indexChangePct,
  portfolioValue,
  lastUpdated,
  isStale,
}: {
  stocks: StockData[];
  indexValue: number | null;
  indexChangePct: number | null;
  portfolioValue: number | null;
  lastUpdated: string | null;
  isStale: boolean;
}): LiveIndexPayload {
  return {
    indexValue,
    indexChangePct,
    portfolioValue,
    numCompanies: stocks.length,
    lastUpdated,
    isStale,
    totalMarketCap: sumMarketCap(stocks),
    stocks,
  };
}

export async function GET() {
  await ensureSchemaOnce();

  const today = getISTDate();
  const active = COMPANIES.filter((c) => c.listedDate <= today);

  // Try live Upstox data first
  try {
    const [quotes, basePrices, shares, liveState, snapshot, latestClose] = await Promise.all([
      fetchUpstoxQuotes(active.map((c) => c.ticker)),
      getEarliestPricesPerTicker(),
      getSharesMap(),
      getLiveIndexState(),
      getLatestIndexSnapshot(),
      getLatestStockPrices(),
    ]);

    const livePrices = quotePricesByTicker(quotes);
    const stocks = buildStocks(active, livePrices, basePrices, shares);

    // Extend the divisor chain with live prices, carrying forward last close.
    const livePriceMap = new Map<string, number>();
    for (const q of quotes) if (q.ticker && q.price != null) livePriceMap.set(q.ticker, q.price);
    const carryForward = new Map<string, number>(
      Object.entries(latestClose).map(([t, p]: [string, LatestStockPrice]) => [t, p.price])
    );

    const indexValue =
      liveState != null
        ? liveIndexValue(livePriceMap, carryForward, shares, liveState.composition, liveState.divisor)
        : null;

    if (indexValue === null) {
      throw new Error("Live divisor state unavailable");
    }

    const portfolioValue = liveState?.portfolio
      ? liveIndexValue(
          livePriceMap,
          carryForward,
          shares,
          liveState.portfolio.composition,
          liveState.portfolio.divisor
        )
      : null;

    const indexChangePct =
      snapshot && snapshot.value > 0 ? round((indexValue / snapshot.value - 1) * 100) : null;

    return NextResponse.json(
      toPayload({
        stocks,
        indexValue,
        indexChangePct,
        portfolioValue,
        lastUpdated: new Date().toISOString(),
        isStale: false,
      }),
      { headers: LIVE_CACHE_HEADERS }
    );
  } catch (err) {
    console.warn("[/api/index/live] Live quotes unavailable, serving last snapshot:", err);
  }

  // Fallback: serve last known data from DB
  try {
    const [snapshot, latestPrices, basePrices, shares, liveState] = await Promise.all([
      getLatestIndexSnapshot(),
      getLatestStockPrices(),
      getEarliestPricesPerTicker(),
      getSharesMap(),
      getLiveIndexState(),
    ]);

    const stocks = buildStocks(active, latestPrices, basePrices, shares);

    const closes = new Map<string, number>(
      Object.entries(latestPrices).map(([t, p]: [string, LatestStockPrice]) => [t, p.price])
    );
    const portfolioValue = liveState?.portfolio
      ? liveIndexValue(closes, closes, shares, liveState.portfolio.composition, liveState.portfolio.divisor)
      : null;

    const lastUpdated = snapshot?.date
      ? new Date(`${snapshot.date}T15:30:00+05:30`).toISOString()
      : null;

    return NextResponse.json(
      toPayload({
        stocks,
        indexValue: snapshot ? round(snapshot.value) : null,
        indexChangePct: snapshot?.changePct ?? null,
        portfolioValue,
        lastUpdated,
        isStale: true,
      }),
      { headers: LIVE_CACHE_HEADERS }
    );
  } catch (err) {
    console.error("[/api/index/live] DB fallback also failed:", err);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
