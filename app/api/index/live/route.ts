import { NextResponse } from "next/server";
import { COMPANIES, INDEX_BASE_VALUE, type Company } from "@/lib/companies";
import { fetchAllQuotes as fetchUpstoxQuotes, type QuoteResult } from "@/lib/upstox";
import {
  getEarliestPricesPerTicker,
  getLatestIndexSnapshot,
  getLatestStockPrices,
  ensureSchema,
} from "@/lib/db";
import type { LiveIndexPayload, StockData } from "@/lib/index-api";
import { priceRatio, round, weightedAverage } from "@/lib/index-math";
import { getMarketCaps } from "@/lib/market-caps";
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

function weightedFromStocks<K extends "ratio" | "changePct">(stocks: StockData[], key: K) {
  const values: number[] = [];
  const weights: number[] = [];
  for (const stock of stocks) {
    const v = stock[key];
    const w = stock.marketCap;
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    if (w == null || !Number.isFinite(w) || w <= 0) continue;
    values.push(v);
    weights.push(w);
  }
  return weightedAverage(values, weights);
}

function getIndexValue(stocks: StockData[]) {
  const weighted = weightedFromStocks(stocks, "ratio");
  return weighted === null ? null : round(INDEX_BASE_VALUE * weighted);
}

function getIndexChangePct(stocks: StockData[]) {
  const weighted = weightedFromStocks(stocks, "changePct");
  return weighted === null ? null : round(weighted);
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
  await ensureSchemaOnce();

  const today = getISTDate();
  const active = COMPANIES.filter((c) => c.listedDate <= today);

  // Try live Upstox data first
  try {
    const [quotes, basePrices, marketCaps] = await Promise.all([
      fetchUpstoxQuotes(active.map((c) => c.ticker)),
      getEarliestPricesPerTicker(),
      getMarketCaps(active.map((c) => c.yfTicker)),
    ]);

    const pricesWithCaps = quotePricesByTicker(
      quotes.map((q) => ({ ...q, marketCap: marketCaps[q.ticker] ?? null }))
    );

    const stocks = buildStocks(active, pricesWithCaps, basePrices);
    const indexValue = getIndexValue(stocks);

    if (indexValue === null) {
      throw new Error("Upstox returned no prices");
    }

    const totalMarketCap =
      active.map((c) => marketCaps[c.ticker] ?? 0).reduce((sum, v) => sum + v, 0) || null;

    return NextResponse.json(
      toPayload({ stocks, indexValue, lastUpdated: new Date().toISOString(), isStale: false, totalMarketCap }),
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
