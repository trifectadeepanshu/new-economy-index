import { NextResponse } from "next/server";
import { COMPANIES } from "@/lib/companies";
import { fetchAllQuotes as fetchYahooQuotes } from "@/lib/yahoo-finance";
import {
  getEarliestPricesPerTicker,
  getLatestIndexSnapshot,
  getLatestStockPrices,
  ensureSchema,
} from "@/lib/db";
import { getISTDate } from "@/lib/market-hours";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

    const quoteMap = Object.fromEntries(quotes.map((q) => [q.ticker, q]));

    const allStocks = active.map((c) => {
      const q = quoteMap[c.ticker];
      const base = basePrices[c.ticker];
      const price = q?.price ?? null;
      const ratio = price !== null && base !== undefined && base !== 0 ? price / base : null;
      return {
        ticker: c.ticker,
        name: c.name,
        sector: c.sector,
        price,
        previousClose: q?.previousClose ?? null,
        changePct: q?.changePct ?? null,
        basePrice: base ?? null,
        ratio,
      };
    });

    const stocks = allStocks.filter((s) => s.ratio !== null);
    const ratios = stocks.map((s) => s.ratio!);

    if (ratios.length === 0) {
      throw new Error("Yahoo Finance returned no prices");
    }

    const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;

    const dailyChanges = allStocks.filter((s) => s.changePct !== null).map((s) => s.changePct!);
    const indexChangePct =
      dailyChanges.length > 0
        ? dailyChanges.reduce((a, b) => a + b, 0) / dailyChanges.length
        : null;

    return NextResponse.json({
      indexValue: Math.round(1000 * avgRatio * 100) / 100,
      indexChangePct: indexChangePct !== null ? Math.round(indexChangePct * 100) / 100 : null,
      numCompanies: allStocks.length,
      lastUpdated: new Date().toISOString(),
      isStale: false,
      stocks: allStocks,
    });
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

    const allStocks = active.map((c) => {
      const latest = latestPrices[c.ticker];
      const base = basePrices[c.ticker];
      const price = latest?.price ?? null;
      const ratio = price !== null && base !== undefined && base !== 0 ? price / base : null;
      return {
        ticker: c.ticker,
        name: c.name,
        sector: c.sector,
        price,
        previousClose: null,
        changePct: latest?.changePct ?? null,
        basePrice: base ?? null,
        ratio,
      };
    });

    // lastUpdated = end of trading on the snapshot date
    const lastUpdated = snapshot?.date
      ? new Date(`${snapshot.date}T15:30:00+05:30`).toISOString()
      : null;

    return NextResponse.json({
      indexValue: snapshot ? Math.round(snapshot.value * 100) / 100 : null,
      indexChangePct: snapshot?.changePct ?? null,
      numCompanies: allStocks.length,
      lastUpdated,
      isStale: true,
      stocks: allStocks,
    });
  } catch (err) {
    console.error("[/api/index/live] DB fallback also failed:", err);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
