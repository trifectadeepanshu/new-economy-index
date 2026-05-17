import { NextResponse } from "next/server";
import { COMPANIES, INDEX_BASE_VALUE, type Company } from "@/lib/companies";
import { fetchAllQuotes as fetchYahooQuotes, type QuoteResult } from "@/lib/yahoo-finance";
import {
  getEarliestPricesPerTicker,
  getLatestIndexSnapshot,
  getLatestStockPrices,
  ensureSchema,
} from "@/lib/db";
import type { LiveIndexPayload, StockData } from "@/lib/index-api";
import { average, finiteNumbers, priceRatio, round } from "@/lib/index-math";
import { getISTDate } from "@/lib/market-hours";

export const dynamic = "force-dynamic";

const LIVE_CACHE_HEADERS = {
  "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
};

type PricePoint = {
  price: number | null;
  changePct: number | null;
  marketCap?: number | null;
};

function buildStocks(
  companies: Company[],
  prices: Record<string, PricePoint | undefined>,
  basePrices: Record<string, number>
): StockData[] {
  return companies.map(({ ticker, name, sector }) => {
    const current = prices[ticker];
    const basePrice = basePrices[ticker] ?? null;
    const price = current?.price ?? null;

    return {
      ticker,
      name,
      sector,
      price,
      changePct: current?.changePct ?? null,
      marketCap: current?.marketCap ?? null,
      basePrice,
      ratio: priceRatio(price, basePrice),
    };
  });
}

function getIndexValue(stocks: StockData[]) {
  const avgRatio = average(finiteNumbers(stocks.map((stock) => stock.ratio)));
  return avgRatio === null ? null : round(INDEX_BASE_VALUE * avgRatio);
}

function getIndexChangePct(stocks: StockData[]) {
  const avgChange = average(finiteNumbers(stocks.map((stock) => stock.changePct)));
  return avgChange === null ? null : round(avgChange);
}

function getTotalMarketCap(quotes: QuoteResult[]) {
  const marketCaps = finiteNumbers(quotes.map((quote) => quote.marketCap))
    .filter((value) => value > 0);

  return marketCaps.length > 0 ? marketCaps.reduce((sum, value) => sum + value, 0) : null;
}

function quotePricesByTicker(quotes: QuoteResult[]): Record<string, PricePoint> {
  return Object.fromEntries(
    quotes
      .filter((quote) => quote.ticker)
      .map((quote) => [
        quote.ticker,
        {
          price: quote.price,
          changePct: quote.changePct,
          marketCap: quote.marketCap,
        } satisfies PricePoint,
      ])
  );
}

function toPayload({
  stocks,
  indexValue,
  lastUpdated,
  isStale,
  totalMarketCap = null,
}: {
  stocks: StockData[];
  indexValue: number | null;
  lastUpdated: string | null;
  isStale: boolean;
  totalMarketCap?: number | null;
}): LiveIndexPayload {
  return {
    indexValue,
    indexChangePct: getIndexChangePct(stocks),
    numCompanies: stocks.length,
    lastUpdated,
    isStale,
    totalMarketCap,
    stocks,
  };
}

export async function GET() {
  await ensureSchema();

  const today = getISTDate();
  const active = COMPANIES.filter((c) => c.listedDate <= today);

  // Try live Yahoo Finance data first
  try {
    const [quotes, basePrices] = await Promise.all([
      fetchYahooQuotes(active.map((c) => c.yfTicker)),
      getEarliestPricesPerTicker(),
    ]);

    const stocks = buildStocks(active, quotePricesByTicker(quotes), basePrices);
    const indexValue = getIndexValue(stocks);

    if (indexValue === null) {
      throw new Error("Yahoo Finance returned no prices");
    }

    return NextResponse.json(
      toPayload({
        stocks,
        indexValue,
        lastUpdated: new Date().toISOString(),
        isStale: false,
        totalMarketCap: getTotalMarketCap(quotes),
      }),
      { headers: LIVE_CACHE_HEADERS }
    );
  } catch (err) {
    console.warn("[/api/index/live] Live quotes unavailable, serving last snapshot:", err);
  }

  // Fallback: serve last known data from DB
  try {
    const [snapshot, latestPrices, basePrices] = await Promise.all([
      getLatestIndexSnapshot(),
      getLatestStockPrices(),
      getEarliestPricesPerTicker(),
    ]);

    const stocks = buildStocks(active, latestPrices, basePrices);

    // lastUpdated = end of trading on the snapshot date
    const lastUpdated = snapshot?.date
      ? new Date(`${snapshot.date}T15:30:00+05:30`).toISOString()
      : null;

    return NextResponse.json(
      {
        ...toPayload({
          stocks,
          indexValue: snapshot ? round(snapshot.value) : null,
          lastUpdated,
          isStale: true,
        }),
        indexChangePct: snapshot?.changePct ?? getIndexChangePct(stocks),
      },
      { headers: LIVE_CACHE_HEADERS }
    );
  } catch (err) {
    console.error("[/api/index/live] DB fallback also failed:", err);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
