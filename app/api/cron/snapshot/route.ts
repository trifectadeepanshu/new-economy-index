import { NextRequest, NextResponse } from "next/server";
import { COMPANIES } from "@/lib/companies";
import { fetchAllQuotes } from "@/lib/upstox";
import {
  ensureSchema,
  getEarliestPricesPerTicker,
  upsertIndexSnapshot,
  upsertStockSnapshotsBatch,
} from "@/lib/db";
import { getISTDate } from "@/lib/market-hours";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
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
  await ensureSchema();

  const today = getISTDate();
  const active = COMPANIES.filter((c) => c.listedDate <= today);

  let quotes;
  try {
    quotes = await fetchAllQuotes(
      active.map((c) => ({ ticker: c.ticker, instrumentKey: c.instrumentKey }))
    );
  } catch (err) {
    console.error("[/api/cron/snapshot] Upstox fetch failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch quotes from Upstox", detail: String(err) },
      { status: 502 }
    );
  }

  const quoteMap = Object.fromEntries(quotes.map((q) => [q.ticker, q]));

  const stockRows = active
    .map((c) => {
      const q = quoteMap[c.ticker];
      if (q?.price == null) return null;
      return { date: today, ticker: c.ticker, closePrice: q.price, changePct: q.changePct };
    })
    .filter(Boolean) as { date: string; ticker: string; closePrice: number; changePct: number | null }[];

  await upsertStockSnapshotsBatch(stockRows);

  const basePrices = await getEarliestPricesPerTicker();
  const currentPrices = Object.fromEntries(stockRows.map((r) => [r.ticker, r.closePrice]));

  const eligible = active.filter(
    (c) => basePrices[c.ticker] !== undefined && currentPrices[c.ticker] !== undefined
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
