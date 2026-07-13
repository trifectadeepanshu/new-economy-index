import { NextRequest, NextResponse } from "next/server";
import { COMPANIES } from "@/lib/companies";
import { fetchAllQuotes, type QuoteResult } from "@/lib/yahoo-finance";
import {
  ensureSchema,
  finishCronRun,
  recomputeAndPersistIndex,
  startCronRun,
  type StockSnapshotInput,
  upsertStockSnapshotsBatch,
} from "@/lib/db";
import {
  missingQuoteTickers,
  quotesByTicker,
  toYahooStockSnapshotInput,
} from "@/lib/quote-snapshots";
import { round } from "@/lib/index-math";
import { getISTDate } from "@/lib/market-hours";

export const dynamic = "force-dynamic";

const CRON_JOB = "snapshot";

function isAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && req.headers.get("authorization") === `Bearer ${secret}`);
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function errorDetail(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

async function finishSnapshotRun(
  runId: number,
  input: Parameters<typeof finishCronRun>[1]
) {
  try {
    await finishCronRun(runId, input);
  } catch (err) {
    console.warn("[/api/cron/snapshot] cron run logging failed:", err);
  }
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
  const runId = await startCronRun(CRON_JOB, today);
  const active = COMPANIES.filter((c) => c.listedDate <= today);
  let stockRowsWritten = 0;

  let quotes: QuoteResult[];
  try {
    quotes = await fetchAllQuotes(active.map((c) => c.yfTicker));
  } catch (err) {
    const detail = errorDetail(err);
    console.error("[/api/cron/snapshot] Yahoo Finance fetch failed:", err);
    await finishSnapshotRun(runId, {
      status: "failed",
      date: today,
      stockRows: stockRowsWritten,
      error: `Failed to fetch quotes: ${detail}`,
    });
    return NextResponse.json(
      { error: "Failed to fetch quotes", detail },
      { status: 502 }
    );
  }

  const quoteMap = quotesByTicker(quotes);
  const missingQuotes = missingQuoteTickers(active, quoteMap);
  if (missingQuotes.length) {
    console.error(
      "[/api/cron/snapshot] Missing constituent quotes; snapshot not saved:",
      missingQuotes
    );
    await finishSnapshotRun(runId, {
      status: "failed",
      date: today,
      stockRows: stockRowsWritten,
      missingTickers: missingQuotes,
      error: "Missing constituent quotes",
    });
    return NextResponse.json(
      {
        error: "Missing constituent quotes",
        date: today,
        missingTickers: missingQuotes,
      },
      { status: 502 }
    );
  }

  try {
    const stockRows = active
      .map((company) => toYahooStockSnapshotInput(today, company, quoteMap))
      .filter((row): row is StockSnapshotInput => row !== null);

    await upsertStockSnapshotsBatch(stockRows);
    stockRowsWritten = stockRows.length;

    // Record today's USD/INR so the daily history conversion stays current.
    try {
      const { getFxRates, fetchLiveUsdInr, upsertFxRate } = await import("@/lib/fx");
      const fx = await getFxRates();
      const rate = await fetchLiveUsdInr(fx.points.at(-1)?.rate ?? fx.baseRate);
      await upsertFxRate(today, rate);
    } catch (err) {
      console.warn("[/api/cron/snapshot] USD/INR update skipped:", err);
    }

    // Record today's benchmark closes (Nifty 50 / Midcap) for the chart overlays.
    try {
      const { BENCHMARKS, upsertBenchmarkClose } = await import("@/lib/benchmarks");
      for (const b of BENCHMARKS) {
        const res = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(b.yf)}?range=1d&interval=1d`,
          { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" }
        );
        const json = (await res.json()) as {
          chart?: { result?: Array<{ meta?: { regularMarketPrice?: number } }> };
        };
        const close = json.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (typeof close === "number" && close > 0) await upsertBenchmarkClose(b.symbol, today, close);
      }
    } catch (err) {
      console.warn("[/api/cron/snapshot] benchmark update skipped:", err);
    }

    // Recompute the full market-cap-weighted divisor index from all stored
    // closes (corrects history) and persist the live divisor for intraday use.
    const result = await recomputeAndPersistIndex();
    if (result.latestValue === null) {
      await finishSnapshotRun(runId, {
        status: "skipped",
        date: today,
        stockRows: stockRowsWritten,
        error: "No eligible companies",
      });
      return NextResponse.json({ message: "No eligible companies", date: today });
    }

    const indexValue = round(result.latestValue);
    await finishSnapshotRun(runId, {
      status: "success",
      date: result.latestDate ?? today,
      stockRows: stockRowsWritten,
      indexValue,
    });

    return NextResponse.json({
      message: "Snapshot saved",
      date: result.latestDate,
      indexValue,
      numCompanies: result.numCompanies,
    });
  } catch (err) {
    const detail = errorDetail(err);
    console.error("[/api/cron/snapshot] snapshot failed:", err);
    await finishSnapshotRun(runId, {
      status: "failed",
      date: today,
      stockRows: stockRowsWritten,
      error: detail,
    });
    return NextResponse.json(
      { error: "Snapshot failed", detail },
      { status: 500 }
    );
  }
}
