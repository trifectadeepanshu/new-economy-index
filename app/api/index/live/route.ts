import { NextResponse } from "next/server";
import { COMPANIES } from "@/lib/companies";
import { fetchAllQuotes } from "@/lib/yahoo-finance";
import { getEarliestPricesPerTicker } from "@/lib/db";
import { getISTDate } from "@/lib/market-hours";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const today = getISTDate();

    // Only include companies that have already listed
    const active = COMPANIES.filter((c) => c.listedDate <= today);
    const yfTickers = active.map((c) => c.yfTicker);

    const [quotes, basePrices] = await Promise.all([
      fetchAllQuotes(yfTickers),
      getEarliestPricesPerTicker(),
    ]);

    const quoteMap = Object.fromEntries(
      quotes.map((q) => [q.ticker, q])
    );

    // Build per-stock data
    const stocks = active
      .map((c) => {
        const q = quoteMap[c.ticker];
        const base = basePrices[c.ticker];
        const price = q?.price ?? null;
        const ratio = price && base ? price / base : null;
        return {
          ticker: c.ticker,
          name: c.name,
          sector: c.sector,
          price,
          previousClose: q?.previousClose ?? null,
          changePct: q?.changePct ?? null,
          marketCap: q?.marketCap ?? null,
          basePrice: base ?? null,
          ratio,
        };
      })
      .filter((s) => s.ratio !== null);

    // Equal-weighted index value
    const ratios = stocks.map((s) => s.ratio!);
    const avgRatio = ratios.length > 0
      ? ratios.reduce((a, b) => a + b, 0) / ratios.length
      : 1;
    const indexValue = 1000 * avgRatio;

    // Index 1-day change = average of all stock 1-day changes
    const dailyChanges = stocks.filter((s) => s.changePct !== null).map((s) => s.changePct!);
    const indexChangePct = dailyChanges.length > 0
      ? dailyChanges.reduce((a, b) => a + b, 0) / dailyChanges.length
      : null;

    return NextResponse.json({
      indexValue: Math.round(indexValue * 100) / 100,
      indexChangePct: indexChangePct !== null ? Math.round(indexChangePct * 100) / 100 : null,
      numCompanies: stocks.length,
      lastUpdated: new Date().toISOString(),
      stocks,
    });
  } catch (err) {
    console.error("[/api/index/live]", err);
    return NextResponse.json({ error: "Failed to fetch live data" }, { status: 500 });
  }
}
