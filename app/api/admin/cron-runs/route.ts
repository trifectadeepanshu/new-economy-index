import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, getRecentCronRuns } from "@/lib/db";

export const dynamic = "force-dynamic";

const ADMIN_CACHE_HEADERS = {
  "Cache-Control": "no-store",
};

function isAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && req.headers.get("authorization") === `Bearer ${secret}`);
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
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
