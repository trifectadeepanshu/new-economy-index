import { NextRequest, NextResponse } from "next/server";
import { COMPANIES } from "@/lib/companies";
import { fetchAllQuotes } from "@/lib/yahoo-finance";
import { upsertStockSnapshotsBatch, upsertIndexSnapshot, getEarliestPricesPerTicker } from "@/lib/db";
import { getISTDate } from "@/lib/market-hours";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Vercel Cron sends Authorization header with CRON_SECRET
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runSnapshot();
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runSnapshot();
}

async function runSnapshot() {
  const today = getISTDate();
  const active = COMPANIES.filter((c) => c.listedDate <= today);
  const yfTickers = active.map((c) => c.yfTicker);

  const quotes = await fetchAllQuotes(yfTickers);
  const quoteMap = Object.fromEntries(quotes.map((q) => [q.ticker, q]));

  // Persist individual stock closes
  const stockRows = active
    .map((c) => {
      const q = quoteMap[c.ticker];
      if (!q?.price) return null;
      return { date: today, ticker: c.ticker, closePrice: q.price, changePct: q.changePct };
    })
    .filter(Boolean) as { date: string; ticker: string; closePrice: number; changePct: number | null }[];

  await upsertStockSnapshotsBatch(stockRows);

  // Recalculate index
  const basePrices = await getEarliestPricesPerTicker();
  const currentPrices = Object.fromEntries(stockRows.map((r) => [r.ticker, r.closePrice]));

  const eligible = active.filter(
    (c) => basePrices[c.ticker] && currentPrices[c.ticker]
  );

  if (eligible.length === 0) {
    return NextResponse.json({ message: "No eligible companies", date: today });
  }

  const avgRatio =
    eligible.reduce((s, c) => s + currentPrices[c.ticker] / basePrices[c.ticker], 0) /
    eligible.length;
  const indexValue = 1000 * avgRatio;

  const changes = stockRows.filter((r) => r.changePct !== null).map((r) => r.changePct!);
  const changePct = changes.length > 0 ? changes.reduce((a, b) => a + b, 0) / changes.length : null;

  await upsertIndexSnapshot(today, indexValue, changePct, eligible.length);

  return NextResponse.json({
    message: "Snapshot saved",
    date: today,
    indexValue: Math.round(indexValue * 100) / 100,
    numCompanies: eligible.length,
  });
}
