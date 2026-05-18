import { NextRequest, NextResponse } from "next/server";
import { COMPANIES } from "@/lib/companies";
import { fetchAllQuotes } from "@/lib/yahoo-finance";
import { ensureSchema, upsertMarketCaps } from "@/lib/db";
import { getISTDate } from "@/lib/market-hours";

export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && req.headers.get("authorization") === `Bearer ${secret}`);
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureSchema();

  const today = getISTDate();
  const active = COMPANIES.filter((c) => c.listedDate <= today);

  let quotes;
  try {
    quotes = await fetchAllQuotes(active.map((c) => c.yfTicker));
  } catch (err) {
    console.error("[/api/cron/market-cap] Yahoo Finance fetch failed:", err);
    return NextResponse.json({ error: "Failed to fetch quotes", detail: String(err) }, { status: 502 });
  }

  const entries = quotes
    .filter((q) => q.marketCap != null && q.marketCap > 0)
    .map((q) => ({ ticker: q.ticker, marketCap: q.marketCap as number }));

  await upsertMarketCaps(entries);

  return NextResponse.json({ message: "Market caps updated", count: entries.length });
}
