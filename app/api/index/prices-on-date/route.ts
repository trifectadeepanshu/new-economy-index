import { NextRequest, NextResponse } from "next/server";
import { getStockSnapshotsOnOrBefore } from "@/lib/db";
import { INDEX_BASE_DATE } from "@/lib/companies";
import { getISTDate } from "@/lib/market-hours";

export const dynamic = "force-dynamic";

// Historical prices don't change, so this is safe to cache — unlike
// /api/index/live, which is intentionally no-store.
const PRICES_CACHE_HEADERS = {
  "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
};

function isValidDate(value: string | null): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  if (!isValidDate(date)) {
    return NextResponse.json({ error: "date must be yyyy-mm-dd" }, { status: 400 });
  }

  // Clamp to a sane window: nothing before the index has data, nothing
  // beyond today (a future date would just silently resolve to today's
  // latest price, which isn't what "custom CAGR from date X" should mean).
  const today = getISTDate();
  const clamped = date < INDEX_BASE_DATE ? INDEX_BASE_DATE : date > today ? today : date;

  const prices = await getStockSnapshotsOnOrBefore(clamped);
  return NextResponse.json({ date: clamped, prices }, { headers: PRICES_CACHE_HEADERS });
}
