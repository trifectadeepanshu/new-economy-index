import { NextRequest, NextResponse } from "next/server";
import type { Currency } from "@/lib/index-api";
import { getLiveIndexPayload } from "@/lib/live-index";

export const dynamic = "force-dynamic";

const LIVE_CACHE_HEADERS = {
  "Cache-Control": "no-store",
};

function parseCurrency(req: NextRequest): Currency {
  return req.nextUrl.searchParams.get("currency") === "usd" ? "usd" : "inr";
}

export async function GET(req: NextRequest) {
  try {
    const payload = await getLiveIndexPayload(parseCurrency(req));
    return NextResponse.json(payload, { headers: LIVE_CACHE_HEADERS });
  } catch (err) {
    console.error("[/api/index/live] Failed:", err);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
