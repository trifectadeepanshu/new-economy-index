import { NextResponse } from "next/server";
import { COMPANIES } from "@/lib/companies";
import { fetchAllQuotes } from "@/lib/upstox";
import { getEarliestPricesPerTicker, ensureSchema } from "@/lib/db";
import { getISTDate } from "@/lib/market-hours";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    await ensureSchema();

    const today = getISTDate();
    const active = COMPANIES.filter((c) => c.listedDate <= today);

    const [quotes, basePrices] = await Promise.all([
      fetchAllQuotes(active.map((c) => ({ ticker: c.ticker, instrumentKey: c.instrumentKey }))),
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
    const avgRatio = ratios.length > 0 ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 1;
    const indexValue = 1000 * avgRatio;

    const dailyChanges = allStocks.filter((s) => s.changePct !== null).map((s) => s.changePct!);
    const indexChangePct =
      dailyChanges.length > 0
        ? dailyChanges.reduce((a, b) => a + b, 0) / dailyChanges.length
        : null;

    return NextResponse.json({
      indexValue: Math.round(indexValue * 100) / 100,
      indexChangePct: indexChangePct !== null ? Math.round(indexChangePct * 100) / 100 : null,
      numCompanies: allStocks.length,
      lastUpdated: new Date().toISOString(),
      stocks: allStocks,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "UPSTOX_TOKEN_EXPIRED") {
      return NextResponse.json({ error: "UPSTOX_TOKEN_EXPIRED" }, { status: 401 });
    }
    console.error("[/api/index/live]", err);
    return NextResponse.json({ error: "Failed to fetch live data" }, { status: 500 });
  }
}
