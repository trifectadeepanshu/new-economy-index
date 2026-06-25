import { NextRequest, NextResponse } from "next/server";
import { getIndexHistoryBundle } from "@/lib/db";
import { INDEX_BASE_DATE } from "@/lib/companies";
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
      return INDEX_BASE_DATE;
  }
}

export async function GET(req: NextRequest) {
  const requestedRange = req.nextUrl.searchParams.get("range") ?? "1Y";

  if (!isHistoryRange(requestedRange)) {
    return NextResponse.json(
      { error: `Invalid range. Use one of: ${HISTORY_RANGES.join(", ")}` },
      { status: 400 }
    );
  }

  const range = requestedRange;
  const fromDate = getFromDate(range);
  const toDate = getISTDate();
  const includeSectors = req.nextUrl.searchParams.get("includeSectors") === "1";
  const includePortfolio = req.nextUrl.searchParams.get("portfolio") === "1";

  try {
    const { data, sectorData, portfolioData } = await getIndexHistoryBundle(fromDate, toDate, {
      sectors: includeSectors,
      portfolio: includePortfolio,
    });

    const payload: IndexHistoryPayload = {
      range,
      data,
      ...(includeSectors ? { sectorData } : {}),
      ...(includePortfolio ? { portfolioData } : {}),
    };

    return NextResponse.json(payload, { headers: HISTORY_CACHE_HEADERS });
  } catch (err) {
    console.error("[/api/index/history]", err);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
