import { NextRequest, NextResponse } from "next/server";
import { getCompanyDetail } from "@/lib/company-detail";
import type { CompanyDetail } from "@/lib/index-api";
import { createAsyncTtlCache } from "@/lib/async-ttl-cache";
import {
  findDuplicateSearchParam,
  findUnknownSearchParam,
  isTicker,
} from "@/lib/api-validation";

export const dynamic = "force-dynamic";

const COMPANY_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400, stale-if-error=86400",
};
const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

const companyCache = createAsyncTtlCache<CompanyDetail>({
  freshForMs: 60 * 60 * 1000,
  staleForMs: 24 * 60 * 60 * 1000,
  maxEntries: 200,
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  let decodedTicker: string;
  try {
    decodedTicker = decodeURIComponent(ticker).toUpperCase();
  } catch {
    return NextResponse.json(
      { error: "Invalid company request" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }
  const searchParams = req.nextUrl.searchParams;
  const invalidKey = findUnknownSearchParam(searchParams, ["currency"])
    ?? findDuplicateSearchParam(searchParams, ["currency"]);
  const currencyParam = searchParams.get("currency") ?? "inr";
  if (invalidKey || !isTicker(decodedTicker) || (currencyParam !== "inr" && currencyParam !== "usd")) {
    return NextResponse.json(
      { error: "Invalid company request" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }
  const currency = currencyParam;

  try {
    const { value: detail, status } = await companyCache.get(
      `${decodedTicker}:${currency}`,
      () => getCompanyDetail(decodedTicker, currency)
    );
    return NextResponse.json(detail, {
      headers: { ...COMPANY_CACHE_HEADERS, "X-NEI-Origin-Cache": status },
    });
  } catch (err) {
    console.error("[/api/company]", err);
    return NextResponse.json(
      { error: "Failed to load company detail" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
