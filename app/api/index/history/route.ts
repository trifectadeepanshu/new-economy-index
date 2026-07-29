import { NextRequest, NextResponse } from "next/server";
import { getIndexHistoryBundle } from "@/lib/db";
import { getBenchmarkSeries } from "@/lib/benchmarks";
import { INDEX_ANCHOR_DATE } from "@/lib/companies";
import { format, parseISO, subDays, subMonths, subYears } from "date-fns";
import {
  HISTORY_RANGES,
  isHistoryRange,
  type HistoryRange,
  type IndexHistoryPayload,
} from "@/lib/index-api";
import { getISTDate } from "@/lib/market-hours";

export const dynamic = "force-dynamic";

const HISTORY_CACHE_HEADERS = {
  "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
};

function getFromDate(range: HistoryRange): string {
  const today = parseISO(getISTDate());
  switch (range) {
    case "1W":
      return format(subDays(today, 7), "yyyy-MM-dd");
    case "1M":
      return format(subMonths(today, 1), "yyyy-MM-dd");
    case "1Y":
      return format(subYears(today, 1), "yyyy-MM-dd");
    case "ALL":
      return INDEX_ANCHOR_DATE;
  }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const requestedRange = params.get("range") ?? "1Y";
  const fromParam = params.get("from");
  const toParam = params.get("to");
  const today = getISTDate();

  // A valid from+to pair defines a custom window and overrides the preset range.
  const isCustom = Boolean(
    fromParam && toParam && ISO_DATE.test(fromParam) && ISO_DATE.test(toParam)
  );

  if (!isCustom && !isHistoryRange(requestedRange)) {
    return NextResponse.json(
      { error: `Invalid range. Use one of: ${HISTORY_RANGES.join(", ")}` },
      { status: 400 }
    );
  }

  // `range` is echoed back for the payload; custom windows report as "ALL".
  const range: HistoryRange = isHistoryRange(requestedRange) ? requestedRange : "ALL";

  let fromDate: string;
  let toDate: string;
  if (isCustom) {
    // Clamp the requested window into the index's valid span and order it.
    let from = fromParam! < INDEX_ANCHOR_DATE ? INDEX_ANCHOR_DATE : fromParam!;
    let to = toParam! > today ? today : toParam!;
    if (from > to) [from, to] = [to, from];
    fromDate = from;
    toDate = to;
  } else {
    fromDate = getFromDate(range);
    toDate = today;
  }
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
