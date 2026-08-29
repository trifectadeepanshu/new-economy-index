import { NextRequest, NextResponse } from "next/server";
import { evaluateCronHealth } from "@/lib/cron-health";
import { getRecentCronRuns } from "@/lib/db";
import { isBearerAuthorized } from "@/lib/http-auth";

export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest) {
  if (!isBearerAuthorized(req.headers, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: HEADERS });
  }

  try {
    const health = evaluateCronHealth(await getRecentCronRuns(50));
    const payload = {
      ...health,
      snapshot: health.snapshot
        ? {
            date: health.snapshot.date,
            status: health.snapshot.status,
            stockRows: health.snapshot.stockRows,
            missingTickers: health.snapshot.missingTickers,
            finishedAt: health.snapshot.finishedAt,
          }
        : null,
      refresh: health.refresh
        ? {
            date: health.refresh.date,
            status: health.refresh.status,
            finishedAt: health.refresh.finishedAt,
          }
        : null,
    };
    return NextResponse.json(payload, {
      status: health.ok ? 200 : 503,
      headers: HEADERS,
    });
  } catch (err) {
    console.error("[/api/cron/status]", err);
    return NextResponse.json(
      { error: "Failed to check cron health", retryable: true },
      { status: 500, headers: HEADERS }
    );
  }
}
