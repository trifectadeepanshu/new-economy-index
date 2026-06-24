import { NextRequest, NextResponse } from "next/server";
import { COMPANIES, type Company } from "@/lib/companies";
import { fetchAllQuotes, type QuoteResult } from "@/lib/yahoo-finance";
import {
  ensureSchema,
  recomputeAndPersistIndex,
  type StockSnapshotInput,
  upsertStockSnapshotsBatch,
} from "@/lib/db";
import { round } from "@/lib/index-math";
import { getISTDate } from "@/lib/market-hours";

export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && req.headers.get("authorization") === `Bearer ${secret}`);
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function quotesByTicker(quotes: QuoteResult[]): Record<string, QuoteResult> {
  return Object.fromEntries(
    quotes
      .filter((quote) => quote.ticker)
      .map((quote) => [quote.ticker, quote])
  );
}

function toStockRow(
  date: string,
  company: Company,
  quotes: Record<string, QuoteResult | undefined>
): StockSnapshotInput | null {
  const quote = quotes[company.ticker];
  if (quote?.price == null) return null;

  return {
    date,
    ticker: company.ticker,
    closePrice: quote.price,
    changePct: quote.changePct,
  };
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return unauthorized();
  }
  return runSnapshot();
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return unauthorized();
  }
  return runSnapshot();
}

async function runSnapshot() {
  await ensureSchema();

  const today = getISTDate();
  const active = COMPANIES.filter((c) => c.listedDate <= today);

  let quotes: QuoteResult[];
  try {
    quotes = await fetchAllQuotes(active.map((c) => c.yfTicker));
  } catch (err) {
    console.error("[/api/cron/snapshot] Yahoo Finance fetch failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch quotes", detail: String(err) },
      { status: 502 }
    );
  }

  const quoteMap = quotesByTicker(quotes);
  const stockRows = active
    .map((company) => toStockRow(today, company, quoteMap))
    .filter((row): row is StockSnapshotInput => row !== null);

  await upsertStockSnapshotsBatch(stockRows);

  // Recompute the full market-cap-weighted divisor index from all stored
  // closes (corrects history) and persist the live divisor for intraday use.
  const result = await recomputeAndPersistIndex();
  if (result.latestValue === null) {
    return NextResponse.json({ message: "No eligible companies", date: today });
  }

  return NextResponse.json({
    message: "Snapshot saved",
    date: result.latestDate,
    indexValue: round(result.latestValue),
    numCompanies: result.numCompanies,
  });
}
