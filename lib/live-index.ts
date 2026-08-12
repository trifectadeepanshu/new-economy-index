/**
 * Builds the live index payload (Yahoo quotes → divisor-chained index value,
 * per-stock data, ticker tape, sector composition) — the same data shape
 * served by /api/index/live. Extracted from that route so a Server Component
 * (app/page.tsx) can call it directly to seed the first paint, without a
 * self-referential HTTP round-trip.
 */
import { type Company } from "@/lib/companies";
import { getUniverse } from "@/lib/universe";
import { fetchAllQuotes, type QuoteResult } from "@/lib/yahoo-finance";
import {
  ensureSchema,
  getEarliestPricesPerTicker,
  getIndexRangeStats,
  getLatestIndexSnapshot,
  getLatestStockSnapshots,
  getLiveIndexState,
  getReferenceIndexClose,
  getSharesMap,
  getStockSnapshotsOnOrBefore,
  type ReferenceStockSnapshot,
  type LatestStockSnapshot,
} from "@/lib/db";
import type {
  Currency,
  LiveIndexPayload,
  LiveTickerPayload,
  MarketStats,
  SectorCompositionPoint,
  StockData,
} from "@/lib/index-api";
import { priceRatio, round } from "@/lib/index-math";
import { liveIndexValue, type QuarterlySharesMap } from "@/lib/index-engine";
import { getFxRates, fetchLiveUsdInr } from "@/lib/fx";
import { getISTDate } from "@/lib/market-hours";
import {
  buildMarketStats,
  buildSectorComposition,
  getTrailingYearFromDate,
  staleTickersFor,
  stockOneYearChangePct,
  stockSnapshotsToPricePoints,
  type PricePoint,
} from "@/lib/live-payload-metrics";

/** Latest known point-in-time share count per ticker (for market-cap display). */
function latestShares(shares: QuarterlySharesMap): Map<string, number> {
  const out = new Map<string, number>();
  for (const [ticker, pts] of shares) if (pts.length) out.set(ticker, pts[pts.length - 1].shares);
  return out;
}

let schemaReady: Promise<void> | null = null;
function ensureSchemaOnce() {
  schemaReady ??= ensureSchema();
  return schemaReady;
}

// usdInr === null → return native INR values; a number → convert to USD.
function buildStocks(
  companies: Company[],
  prices: Record<string, PricePoint | undefined>,
  trailingYearPrices: Record<string, ReferenceStockSnapshot | undefined>,
  basePrices: Record<string, number>,
  shares: Map<string, number>,
  usdInr: number | null
): StockData[] {
  const conv = (v: number | null) =>
    v == null ? null : usdInr && usdInr > 0 ? v / usdInr : v;
  return companies.map(({ ticker, name, displayName, sector, isPortfolio, listedDate }) => {
    const current = prices[ticker];
    const basePriceInr = basePrices[ticker] ?? null;
    const priceInr = current?.price ?? null;
    const trailingYearPriceInr = trailingYearPrices[ticker]?.price ?? null;
    const sh = shares.get(ticker);
    const marketCapInr = priceInr != null && sh != null ? priceInr * sh : null;

    return {
      ticker,
      name,
      displayName,
      sector,
      isPortfolio,
      listedDate,
      price: conv(priceInr),
      changePct: current?.changePct ?? null,
      oneYearChangePct: stockOneYearChangePct(priceInr, trailingYearPriceInr),
      marketCap: conv(marketCapInr),
      basePrice: conv(basePriceInr),
      ratio: priceRatio(priceInr, basePriceInr), // unitless — FX cancels
      asOfDate: current?.asOfDate ?? null,
      isStale: Boolean(current?.isStale),
    };
  });
}

function buildTickerTape(
  companies: Company[],
  prices: Record<string, PricePoint | undefined>,
  usdInr: number | null
): LiveTickerPayload[] {
  const conv = (v: number | null) =>
    v == null ? null : usdInr && usdInr > 0 ? v / usdInr : v;
  return companies.map(({ ticker, displayName }) => {
    const current = prices[ticker];
    return {
      ticker,
      displayName,
      price: conv(current?.price ?? null),
      changePct: current?.changePct ?? null,
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

/** Trifecta Capital portfolio names' share of the index market cap (currency-independent). */
function trifectaWeight(stocks: StockData[]): number | null {
  const total = stocks.reduce((sum, s) => sum + (s.marketCap ?? 0), 0);
  if (total <= 0) return null;
  const pf = stocks
    .filter((s) => s.isPortfolio)
    .reduce((sum, s) => sum + (s.marketCap ?? 0), 0);
  return Math.round((pf / total) * 10000) / 100;
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
  staleConstituents,
  marketStats,
  sectorComposition,
  tickerTape,
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
  staleConstituents: string[];
  marketStats: MarketStats;
  sectorComposition: SectorCompositionPoint[];
  tickerTape: LiveTickerPayload[];
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
    trifectaWeightPct: trifectaWeight(stocks),
    staleConstituents,
    marketStats,
    sectorComposition,
    tickerTape,
    stocks,
  };
}

export async function getLiveIndexPayload(currency: Currency): Promise<LiveIndexPayload> {
  await ensureSchemaOnce();

  const usd = currency === "usd";
  const today = getISTDate();
  const trailingYearFromDate = getTrailingYearFromDate(today);
  const active = (await getUniverse()).filter((c) => c.listedDate <= today);

  // Try live Yahoo quotes first. If any current index/portfolio member is
  // missing, fall back to the stored snapshot and mark stale rows explicitly.
  try {
    const [
      quotes,
      basePrices,
      shares,
      liveState,
      prevClose,
      latestClose,
      trailingYearPrices,
      fx,
      rangeStats,
    ] = await Promise.all([
      fetchAllQuotes(active.map((c) => c.yfTicker)),
      getEarliestPricesPerTicker(),
      getSharesMap(),
      getLiveIndexState(),
      getReferenceIndexClose(today),
      getLatestStockSnapshots(),
      getStockSnapshotsOnOrBefore(trailingYearFromDate),
      getFxRates(),
      getIndexRangeStats(trailingYearFromDate, today),
    ]);
    const usdInr = await fetchLiveUsdInr(fx.points.at(-1)?.rate ?? fx.baseRate);
    if (!liveState) throw new Error("Live divisor state unavailable");

    const livePrices = quotePricesByTicker(quotes);
    const requiredTickers = new Set([
      ...liveState.members.map((m) => m.ticker),
      ...(liveState.portfolio?.members.map((m) => m.ticker) ?? []),
    ]);
    const missingQuotes = [...requiredTickers].filter(
      (ticker) => livePrices[ticker]?.price == null
    );
    if (missingQuotes.length) {
      throw new Error(`Missing live quotes: ${missingQuotes.join(", ")}`);
    }

    const merged: Record<string, PricePoint> = {};
    for (const c of active) {
      const live = livePrices[c.ticker];
      const close = latestClose[c.ticker];
      merged[c.ticker] = {
        price: live?.price ?? close?.price ?? null,
        changePct: live?.changePct ?? close?.changePct ?? null,
        asOfDate: live?.price != null ? today : close?.date ?? null,
        isStale: live?.price == null,
      };
    }
    // Show only the index constituents (current top-50), not the full universe.
    const indexTickers = new Set(liveState.members.map((m) => m.ticker));
    const constituents = active.filter((c) => indexTickers.has(c.ticker));
    const stocks = buildStocks(
      constituents,
      merged,
      trailingYearPrices,
      basePrices,
      latestShares(shares),
      usd ? usdInr : null
    );
    const tickerTape = buildTickerTape(active, merged, usd ? usdInr : null);

    // Extend the divisor chain with live prices. Quote completeness is checked
    // above, so missing prices cannot silently carry forward inside the index.
    const livePriceMap = new Map<string, number>();
    for (const q of quotes) if (q.ticker && q.price != null) livePriceMap.set(q.ticker, q.price);

    const indexInr = liveIndexValue(livePriceMap, new Map(), liveState.members, liveState.divisor);

    if (indexInr === null) {
      throw new Error("Live index value unavailable");
    }

    // The index level is a single unitless number (same in any currency).
    const indexValue = round(indexInr, 4);
    const portfolioInr = liveState?.portfolio
      ? liveIndexValue(livePriceMap, new Map(), liveState.portfolio.members, liveState.portfolio.divisor)
      : null;
    const portfolioValue = portfolioInr !== null ? round(portfolioInr, 4) : null;

    // Day-change is vs the previous session's close, not the latest stored row
    // (which becomes today once the cron runs — that would read ~0 all evening).
    const indexChangePct =
      prevClose && prevClose > 0 ? round((indexValue / prevClose - 1) * 100) : null;
    const marketStats = buildMarketStats(stocks, rangeStats, indexValue);
    const sectorComposition = buildSectorComposition(stocks);

    return toPayload({
      stocks,
      indexValue,
      indexChangePct,
      portfolioValue,
      numCompanies: liveState?.members.length ?? stocks.length,
      currency,
      usdInr: round(usdInr, 4),
      lastUpdated: new Date().toISOString(),
      isStale: false,
      staleConstituents: [],
      marketStats,
      sectorComposition,
      tickerTape,
    });
  } catch (err) {
    console.warn("[live-index] Live quotes unavailable, serving last snapshot:", err);
  }

  // Fallback: serve last known data from DB
  const [snapshot, latestClose, trailingYearPrices, basePrices, shares, liveState, fx, rangeStats] =
    await Promise.all([
      getLatestIndexSnapshot(),
      getLatestStockSnapshots(),
      getStockSnapshotsOnOrBefore(trailingYearFromDate),
      getEarliestPricesPerTicker(),
      getSharesMap(),
      getLiveIndexState(),
      getFxRates(),
      getIndexRangeStats(trailingYearFromDate, today),
    ]);
  const usdInr = await fetchLiveUsdInr(fx.points.at(-1)?.rate ?? fx.baseRate);
  const snapshotDate = snapshot?.date ?? null;
  const latestPrices = stockSnapshotsToPricePoints(latestClose, snapshotDate);

  // Show only the index constituents (current top-50), not the full universe.
  const indexTickers = new Set(liveState?.members.map((m) => m.ticker) ?? active.map((c) => c.ticker));
  const constituents = active.filter((c) => indexTickers.has(c.ticker));
  const stocks = buildStocks(
    constituents,
    latestPrices,
    trailingYearPrices,
    basePrices,
    latestShares(shares),
    usd ? usdInr : null
  );
  const tickerTape = buildTickerTape(active, latestPrices, usd ? usdInr : null);

  const closes = new Map<string, number>(
    Object.entries(latestClose).map(([t, p]: [string, LatestStockSnapshot]) => [t, p.price])
  );
  const portfolioInr = liveState?.portfolio
    ? liveIndexValue(closes, closes, liveState.portfolio.members, liveState.portfolio.divisor)
    : null;
  const portfolioValue = portfolioInr !== null ? round(portfolioInr, 4) : null;
  const staleConstituents = staleTickersFor(
    constituents.map((c) => c.ticker),
    latestClose,
    snapshotDate
  );
  if (staleConstituents.length) {
    console.warn("[live-index] Serving snapshot with stale constituents:", staleConstituents);
  }

  const lastUpdated = snapshot?.date
    ? new Date(`${snapshot.date}T15:30:00+05:30`).toISOString()
    : null;
  const indexValue = snapshot ? round(snapshot.value, 4) : null;
  const marketStats = buildMarketStats(stocks, rangeStats, indexValue);
  const sectorComposition = buildSectorComposition(stocks);

  return toPayload({
    stocks,
    indexValue,
    indexChangePct: snapshot?.changePct ?? null,
    portfolioValue,
    numCompanies: liveState?.members.length ?? stocks.length,
    currency,
    usdInr: round(usdInr, 4),
    lastUpdated,
    isStale: true,
    staleConstituents,
    marketStats,
    sectorComposition,
    tickerTape,
  });
}
