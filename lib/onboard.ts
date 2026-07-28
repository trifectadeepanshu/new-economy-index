/**
 * Onboard a constituent from Yahoo: backfill its price history, seed the IPO
 * price (so the listing-day pop counts), pull point-in-time shares, and backfill
 * financials / profile / analyst. Everything a new IPO needs, from one source.
 *
 * The caller recomputes the index afterwards. Detail (financials/profile/
 * analyst) is best-effort — a gap there never blocks the price/share onboarding
 * that the index depends on.
 */
import {
  upsertStockSnapshotsBatch,
  upsertQuarterlyFinancials,
  upsertCompanyProfile,
  upsertAnalystRating,
  upsertYahooShareCounts,
  type StockSnapshotInput,
} from "@/lib/db";
import { STOCK_SOURCE_YAHOO } from "@/lib/quote-snapshots";
import {
  changePct,
  fetchCompanyMeta,
  fetchDailyPrices,
  fetchPointInTimeShares,
  fetchQuarterlyFinancials,
  previousDay,
  type CompanyMeta,
} from "@/lib/yahoo-provider";

const STOCK_SOURCE_YAHOO_IPO_SEED = "yahoo-ipo-seed";

export type OnboardInput = {
  ticker: string;
  yfTicker: string;
  listedDate: string;
  ipoPrice: number | null;
};

export type OnboardSummary = {
  ticker: string;
  priceRows: number;
  firstDate: string;
  lastDate: string;
  ipoSeeded: boolean;
  shareRows: number;
  financials: number;
  profile: boolean;
  analyst: boolean;
};

export async function onboardConstituent(c: OnboardInput): Promise<OnboardSummary> {
  const prices = await fetchDailyPrices(c.yfTicker);
  if (!prices.length) {
    throw new Error(`No Yahoo price history for ${c.yfTicker} — check the ticker.`);
  }

  // Seed the IPO price only when the first price we have IS the listing day —
  // i.e. the company listed inside our data window (a genuine recent IPO). For a
  // name already trading before the window, the first close is a mid-life price,
  // not the IPO, so seeding would inject a bogus day-one move.
  const seedCutoff = new Date(`${c.listedDate}T00:00:00Z`);
  seedCutoff.setUTCDate(seedCutoff.getUTCDate() + 7);
  const firstIsListing = prices[0].date <= seedCutoff.toISOString().slice(0, 10);

  const stockRows: StockSnapshotInput[] = [];
  let prev: number | null = null;
  let ipoSeeded = false;
  if (c.ipoPrice != null && firstIsListing) {
    stockRows.push({
      date: previousDay(prices[0].date),
      ticker: c.ticker,
      closePrice: c.ipoPrice,
      changePct: null,
      source: STOCK_SOURCE_YAHOO_IPO_SEED,
      providerSymbol: c.yfTicker,
    });
    prev = c.ipoPrice;
    ipoSeeded = true;
  }
  for (const p of prices) {
    stockRows.push({
      date: p.date,
      ticker: c.ticker,
      closePrice: p.close,
      changePct: changePct(p.close, prev),
      source: STOCK_SOURCE_YAHOO,
      providerSymbol: c.yfTicker,
    });
    prev = p.close;
  }
  await upsertStockSnapshotsBatch(stockRows);

  // Company meta (profile + analyst + a current-shares fallback) — best-effort.
  let meta: CompanyMeta | null = null;
  try {
    meta = await fetchCompanyMeta(c.yfTicker);
  } catch {
    /* profile/analyst simply stay empty */
  }

  // Point-in-time shares; fall back to the current count if none are available.
  let shares = await fetchPointInTimeShares(c.yfTicker);
  if (!shares.length && meta?.currentShares) {
    shares = [{ asOf: c.listedDate, shares: meta.currentShares }];
  }
  await upsertYahooShareCounts(c.ticker, shares);

  let financials = 0;
  try {
    const fins = await fetchQuarterlyFinancials(c.yfTicker);
    await upsertQuarterlyFinancials(
      c.ticker,
      fins.map((f) => ({ period: f.period, revenue: f.revenue, ebitda: f.ebitda, pat: f.pat, assets: f.assets }))
    );
    financials = fins.length;
  } catch {
    /* financials stay empty */
  }

  let profile = false;
  let analyst = false;
  if (meta) {
    try {
      await upsertCompanyProfile(c.ticker, meta.description);
      profile = meta.description != null;
    } catch {
      /* ignore */
    }
    if (meta.analyst) {
      try {
        await upsertAnalystRating(c.ticker, meta.analyst);
        analyst = true;
      } catch {
        /* ignore */
      }
    }
  }

  return {
    ticker: c.ticker,
    priceRows: stockRows.length,
    firstDate: prices[0].date,
    lastDate: prices[prices.length - 1].date,
    ipoSeeded,
    shareRows: shares.length,
    financials,
    profile,
    analyst,
  };
}
