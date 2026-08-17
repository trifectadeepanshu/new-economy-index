import { NextRequest, NextResponse } from "next/server";
import { getStockSnapshotsOnOrBefore } from "@/lib/db";
import { INDEX_BASE_DATE } from "@/lib/companies";
import { getISTDate } from "@/lib/market-hours";
import { createAsyncTtlCache } from "@/lib/async-ttl-cache";
import {
  findDuplicateSearchParam,
  findUnknownSearchParam,
  isIsoDate,
} from "@/lib/api-validation";

export const dynamic = "force-dynamic";

// Historical prices don't change, so they can use a much longer cache window
// than the frequently refreshed live endpoint.
const PRICES_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400, stale-if-error=86400",
};
const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

type PricesPayload = {
  date: string;
  prices: Awaited<ReturnType<typeof getStockSnapshotsOnOrBefore>>;
};

const pricesCache = createAsyncTtlCache<PricesPayload>({
  freshForMs: 60 * 60 * 1000,
  staleForMs: 24 * 60 * 60 * 1000,
  maxEntries: 400,
});

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const invalidKey = findUnknownSearchParam(params, ["date"])
    ?? findDuplicateSearchParam(params, ["date"]);
  if (invalidKey) {
    return NextResponse.json(
      { error: `Invalid query parameter: ${invalidKey}` },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }
  const date = params.get("date");
  if (!isIsoDate(date)) {
    return NextResponse.json(
      { error: "date must be yyyy-mm-dd" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  // Clamp to a sane window: nothing before the index has data, nothing
  // beyond today (a future fixed-period IRR start would otherwise silently
  // resolve to today's latest price).
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
    return NextResponse.json(
      { error: "Failed to fetch prices" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
