import { NextRequest, NextResponse } from "next/server";
import { getIndexHistoryBundle } from "@/lib/db";
import { getBenchmarkSeries } from "@/lib/benchmarks";
import {
  HISTORY_RANGES,
  type IndexHistoryPayload,
} from "@/lib/index-api";
import { resolveHistoryWindow } from "@/lib/index-history-window";
import { getISTDate } from "@/lib/market-hours";

export const dynamic = "force-dynamic";

const HISTORY_CACHE_HEADERS = {
  "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
};

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const requestedRange = params.get("range") ?? "1Y";
  const fromParam = params.get("from");
  const toParam = params.get("to");
  const today = getISTDate();
  const resolved = resolveHistoryWindow({ requestedRange, fromParam, toParam, todayDate: today });

  if (!resolved.ok) {
    const error = resolved.error === "Invalid range."
      ? `Invalid range. Use one of: ${HISTORY_RANGES.join(", ")}`
      : resolved.error;
    return NextResponse.json(
      { error },
      { status: 400 }
    );
  }
  const { range, fromDate, toDate } = resolved.window;
  const includeSectors = req.nextUrl.searchParams.get("includeSectors") === "1";
  const includePortfolio = req.nextUrl.searchParams.get("portfolio") === "1";
  const includeBenchmarks = req.nextUrl.searchParams.get("benchmarks") === "1";

  try {
    const [{ data, sectorData, portfolioData }, benchmarks] = await Promise.all([
      getIndexHistoryBundle(fromDate, toDate, {
        sectors: includeSectors,
        portfolio: includePortfolio,
      }),
      includeBenchmarks ? getBenchmarkSeries(fromDate, toDate) : Promise.resolve([]),
    ]);

    const payload: IndexHistoryPayload = {
      range,
      data,
      ...(includeSectors ? { sectorData } : {}),
      ...(includePortfolio ? { portfolioData } : {}),
      ...(includeBenchmarks ? { benchmarks } : {}),
    };

    return NextResponse.json(payload, { headers: HISTORY_CACHE_HEADERS });
  } catch (err) {
    console.error("[/api/index/history]", err);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
