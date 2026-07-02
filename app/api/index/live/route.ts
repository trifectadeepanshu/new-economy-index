import { NextRequest, NextResponse } from "next/server";
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
import type { Currency, LiveIndexPayload, StockData } from "@/lib/index-api";
import { priceRatio, round } from "@/lib/index-math";
import { liveIndexValue, type QuarterlySharesMap } from "@/lib/index-engine";
import { getFxRates, fetchLiveUsdInr } from "@/lib/fx";
import { getISTDate } from "@/lib/market-hours";

/** Latest known point-in-time share count per ticker (for market-cap display). */
function latestShares(shares: QuarterlySharesMap): Map<string, number> {
  const out = new Map<string, number>();
  for (const [ticker, pts] of shares) if (pts.length) out.set(ticker, pts[pts.length - 1].shares);
  return out;
}

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

// usdInr === null → return native INR values; a number → convert to USD.
function buildStocks(
  companies: Company[],
  prices: Record<string, PricePoint | undefined>,
  basePrices: Record<string, number>,
  shares: Map<string, number>,
  usdInr: number | null
): StockData[] {
  const conv = (v: number | null) =>
    v == null ? null : usdInr && usdInr > 0 ? v / usdInr : v;
  return companies.map(({ ticker, name, sector }) => {
    const current = prices[ticker];
    const basePriceInr = basePrices[ticker] ?? null;
    const priceInr = current?.price ?? null;
    const sh = shares.get(ticker);
    const marketCapInr = priceInr != null && sh != null ? priceInr * sh : null;

    return {
      ticker,
      name,
      sector,
      price: conv(priceInr),
      changePct: current?.changePct ?? null,
      marketCap: conv(marketCapInr),
      basePrice: conv(basePriceInr),
      ratio: priceRatio(priceInr, basePriceInr), // unitless — FX cancels
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
  numCompanies,
  currency,
  usdInr,
  lastUpdated,
  isStale,
}: {
  stocks: StockData[];
  indexValue: number | null;
  indexChangePct: number | null;
  portfolioValue: number | null;
  numCompanies: number;
  currency: Currency;
  usdInr: number | null;
  lastUpdated: string | null;
  isStale: boolean;
}): LiveIndexPayload {
  return {
    indexValue,
    indexChangePct,
    portfolioValue,
    numCompanies,
    lastUpdated,
    isStale,
    totalMarketCap: sumMarketCap(stocks),
    currency,
    usdInr,
    stocks,
  };
}

function parseCurrency(req: NextRequest): Currency {
  return req.nextUrl.searchParams.get("currency") === "usd" ? "usd" : "inr";
}

export async function GET(req: NextRequest) {
  await ensureSchemaOnce();

  const currency = parseCurrency(req);
  const usd = currency === "usd";
  const today = getISTDate();
  const active = COMPANIES.filter((c) => c.listedDate <= today);

  // Try live Upstox data first
  try {
    const [quotes, basePrices, shares, liveState, snapshot, latestClose, fx] = await Promise.all([
      fetchUpstoxQuotes(active.map((c) => c.ticker)),
      getEarliestPricesPerTicker(),
      getSharesMap(),
      getLiveIndexState(),
      getLatestIndexSnapshot(),
      getLatestStockPrices(),
      getFxRates(),
    ]);
    const usdInr = await fetchLiveUsdInr(fx.points.at(-1)?.rate ?? fx.baseRate);

    // Overlay live Upstox quotes on the latest stored closes so every company
    // (including those without an Upstox instrument key) shows price data.
    const livePrices = quotePricesByTicker(quotes);
    const merged: Record<string, PricePoint> = {};
    for (const c of active) {
      const live = livePrices[c.ticker];
      const close = latestClose[c.ticker];
      merged[c.ticker] = {
        price: live?.price ?? close?.price ?? null,
        changePct: live?.changePct ?? close?.changePct ?? null,
      };
    }
    // Show only the index constituents (current top-50), not the full universe.
    const indexTickers = new Set(liveState?.members.map((m) => m.ticker) ?? active.map((c) => c.ticker));
    const constituents = active.filter((c) => indexTickers.has(c.ticker));
    const stocks = buildStocks(constituents, merged, basePrices, latestShares(shares), usd ? usdInr : null);

    // Extend the divisor chain with live prices, carrying forward last close.
    const livePriceMap = new Map<string, number>();
    for (const q of quotes) if (q.ticker && q.price != null) livePriceMap.set(q.ticker, q.price);
    const carryForward = new Map<string, number>(
      Object.entries(latestClose).map(([t, p]: [string, LatestStockPrice]) => [t, p.price])
    );

    const indexInr =
      liveState != null
        ? liveIndexValue(livePriceMap, carryForward, liveState.members, liveState.divisor)
        : null;

    if (indexInr === null) {
      throw new Error("Live divisor state unavailable");
    }

    // The index level is a single unitless number (same in any currency).
    const indexValue = round(indexInr, 4);
    const portfolioInr = liveState?.portfolio
      ? liveIndexValue(livePriceMap, carryForward, liveState.portfolio.members, liveState.portfolio.divisor)
      : null;
    const portfolioValue = portfolioInr !== null ? round(portfolioInr, 4) : null;

    const indexChangePct =
      snapshot && snapshot.value > 0 ? round((indexValue / snapshot.value - 1) * 100) : null;

    return NextResponse.json(
      toPayload({
        stocks,
        indexValue,
        indexChangePct,
        portfolioValue,
        numCompanies: liveState?.members.length ?? stocks.length,
        currency,
        usdInr: round(usdInr, 4),
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
    const [snapshot, latestPrices, basePrices, shares, liveState, fx] = await Promise.all([
      getLatestIndexSnapshot(),
      getLatestStockPrices(),
      getEarliestPricesPerTicker(),
      getSharesMap(),
      getLiveIndexState(),
      getFxRates(),
    ]);
    const usdInr = await fetchLiveUsdInr(fx.points.at(-1)?.rate ?? fx.baseRate);

    // Show only the index constituents (current top-50), not the full universe.
    const indexTickers = new Set(liveState?.members.map((m) => m.ticker) ?? active.map((c) => c.ticker));
    const constituents = active.filter((c) => indexTickers.has(c.ticker));
    const stocks = buildStocks(constituents, latestPrices, basePrices, latestShares(shares), usd ? usdInr : null);

    const closes = new Map<string, number>(
      Object.entries(latestPrices).map(([t, p]: [string, LatestStockPrice]) => [t, p.price])
    );
    const portfolioInr = liveState?.portfolio
      ? liveIndexValue(closes, closes, liveState.portfolio.members, liveState.portfolio.divisor)
      : null;
    const portfolioValue = portfolioInr !== null ? round(portfolioInr, 4) : null;

    const lastUpdated = snapshot?.date
      ? new Date(`${snapshot.date}T15:30:00+05:30`).toISOString()
      : null;

    return NextResponse.json(
      toPayload({
        stocks,
        indexValue: snapshot ? round(snapshot.value, 4) : null,
        indexChangePct: snapshot?.changePct ?? null,
        portfolioValue,
        numCompanies: liveState?.members.length ?? stocks.length,
        currency,
        usdInr: round(usdInr, 4),
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
