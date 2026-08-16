import { NextRequest, NextResponse } from "next/server";
import type { Currency } from "@/lib/index-api";
import {
  getSharedLiveIndexPayload,
  LIVE_CACHE_STALE_SECONDS,
  LIVE_CACHE_TTL_SECONDS,
} from "@/lib/live-index-cache";
import { findDuplicateSearchParam, findUnknownSearchParam } from "@/lib/api-validation";

export const dynamic = "force-dynamic";

const LIVE_CACHE_HEADERS = {
  "Cache-Control": `public, max-age=0, s-maxage=${LIVE_CACHE_TTL_SECONDS}, stale-while-revalidate=${LIVE_CACHE_TTL_SECONDS * 3}, stale-if-error=${LIVE_CACHE_STALE_SECONDS}`,
};

function parseCurrency(req: NextRequest): Currency | null {
  const value = req.nextUrl.searchParams.get("currency") ?? "inr";
  return value === "inr" || value === "usd" ? value : null;
}

export async function GET(req: NextRequest) {
  const startedAt = performance.now();
  const params = req.nextUrl.searchParams;
  const invalidKey = findUnknownSearchParam(params, ["currency"])
    ?? findDuplicateSearchParam(params, ["currency"]);
  const currency = parseCurrency(req);
  if (invalidKey || !currency) {
    return NextResponse.json(
      { error: invalidKey ? `Invalid query parameter: ${invalidKey}` : "currency must be inr or usd" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const { payload, status } = await getSharedLiveIndexPayload(currency);
    const durationMs = performance.now() - startedAt;

    if (status === "miss" || status === "stale" || durationMs >= 1_000) {
      console.info("[/api/index/live] origin", {
        status,
        durationMs: Math.round(durationMs),
        stale: payload.isStale,
      });
    }

    return NextResponse.json(payload, {
      headers: {
        ...LIVE_CACHE_HEADERS,
        "Server-Timing": `live-data;dur=${durationMs.toFixed(1)}`,
        "X-NEI-Origin-Cache": status,
      },
    });
  } catch (err) {
    console.error("[/api/index/live] Failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": "5",
          "Server-Timing": `live-data;dur=${(performance.now() - startedAt).toFixed(1)}`,
        },
      }
    );
  }
}
