import { NextRequest, NextResponse } from "next/server";
import { getStockSnapshotsOnOrBefore } from "@/lib/db";
import { INDEX_BASE_DATE } from "@/lib/companies";
import { getISTDate } from "@/lib/market-hours";
import { createAsyncTtlCache } from "@/lib/async-ttl-cache";

export const dynamic = "force-dynamic";

// Historical prices don't change, so they can use a much longer cache window
// than the frequently refreshed live endpoint.
const PRICES_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400, stale-if-error=86400",
};

type PricesPayload = {
  date: string;
  prices: Awaited<ReturnType<typeof getStockSnapshotsOnOrBefore>>;
};

const pricesCache = createAsyncTtlCache<PricesPayload>({
  freshForMs: 60 * 60 * 1000,
  staleForMs: 24 * 60 * 60 * 1000,
  maxEntries: 400,
});

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

  try {
    const { value: payload, status } = await pricesCache.get(clamped, async () => ({
      date: clamped,
      prices: await getStockSnapshotsOnOrBefore(clamped),
    }));
    return NextResponse.json(payload, {
      headers: { ...PRICES_CACHE_HEADERS, "X-NEI-Origin-Cache": status },
    });
  } catch (err) {
    console.error("[/api/index/prices-on-date]", err);
    return NextResponse.json({ error: "Failed to fetch prices" }, { status: 500 });
  }
}
