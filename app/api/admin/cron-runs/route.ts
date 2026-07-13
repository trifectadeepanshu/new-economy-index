import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, getRecentCronRuns } from "@/lib/db";
import { isBearerAuthorized } from "@/lib/http-auth";

export const dynamic = "force-dynamic";

const ADMIN_CACHE_HEADERS = {
  "Cache-Control": "no-store",
};

export async function GET(req: NextRequest) {
  if (!isBearerAuthorized(req.headers, process.env.CRON_SECRET)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: ADMIN_CACHE_HEADERS }
    );
  }

  const requestedLimit = Number(req.nextUrl.searchParams.get("limit") ?? 25);
  const limit = Number.isFinite(requestedLimit) ? requestedLimit : 25;

  try {
    await ensureSchema();
    const runs = await getRecentCronRuns(limit);
    return NextResponse.json({ runs }, { headers: ADMIN_CACHE_HEADERS });
  } catch (err) {
    console.error("[/api/admin/cron-runs]", err);
    return NextResponse.json(
      { error: "Failed to fetch cron runs" },
      { status: 500, headers: ADMIN_CACHE_HEADERS }
    );
  }
}
