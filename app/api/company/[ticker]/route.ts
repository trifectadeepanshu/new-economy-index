import { NextRequest, NextResponse } from "next/server";
import { getCompanyDetail } from "@/lib/company-detail";
import type { CompanyDetail } from "@/lib/index-api";
import { createAsyncTtlCache } from "@/lib/async-ttl-cache";

export const dynamic = "force-dynamic";

const COMPANY_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400, stale-if-error=86400",
};

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
  const decodedTicker = decodeURIComponent(ticker);
  const currency = req.nextUrl.searchParams.get("currency") === "usd" ? "usd" : "inr";

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
    return NextResponse.json({ error: "Failed to load company detail" }, { status: 500 });
  }
}
