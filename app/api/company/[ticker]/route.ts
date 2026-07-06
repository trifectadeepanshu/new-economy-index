import { NextRequest, NextResponse } from "next/server";
import { getCompanyDetail } from "@/lib/company-detail";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const currency = req.nextUrl.searchParams.get("currency") === "usd" ? "usd" : "inr";

  try {
    const detail = await getCompanyDetail(decodeURIComponent(ticker), currency);
    return NextResponse.json(detail, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[/api/company]", err);
    return NextResponse.json({ error: "Failed to load company detail" }, { status: 500 });
  }
}
