import { NextRequest, NextResponse } from "next/server";
import { getIndexHistory } from "@/lib/db";
import { format, parseISO, subDays, subMonths, subYears } from "date-fns";
import { getISTDate } from "@/lib/market-hours";

export const dynamic = "force-dynamic";

type Range = "1W" | "1M" | "1Y" | "ALL";

function getFromDate(range: Range): string {
  const today = parseISO(getISTDate());
  switch (range) {
    case "1W":  return format(subDays(today, 7), "yyyy-MM-dd");
    case "1M":  return format(subMonths(today, 1), "yyyy-MM-dd");
    case "1Y":  return format(subYears(today, 1), "yyyy-MM-dd");
    case "ALL": return "2021-03-01";
  }
}

export async function GET(req: NextRequest) {
  const range = (req.nextUrl.searchParams.get("range") ?? "1Y") as Range;
  const validRanges: Range[] = ["1W", "1M", "1Y", "ALL"];
  if (!validRanges.includes(range)) {
    return NextResponse.json({ error: "Invalid range" }, { status: 400 });
  }

  const fromDate = getFromDate(range);
  const toDate = getISTDate();

  try {
    const data = await getIndexHistory(fromDate, toDate);
    return NextResponse.json({ range, data }, {
      headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate" },
    });
  } catch (err) {
    console.error("[/api/index/history]", err);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
