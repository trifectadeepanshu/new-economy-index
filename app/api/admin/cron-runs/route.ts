import { NextRequest, NextResponse } from "next/server";
import { getRecentCronRuns } from "@/lib/db";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { findDuplicateSearchParam, findUnknownSearchParam } from "@/lib/api-validation";

export const dynamic = "force-dynamic";

const ADMIN_CACHE_HEADERS = {
  "Cache-Control": "no-store",
};

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: ADMIN_CACHE_HEADERS }
    );
  }

  const invalidKey = findUnknownSearchParam(req.nextUrl.searchParams, ["limit"])
    ?? findDuplicateSearchParam(req.nextUrl.searchParams, ["limit"]);
  if (invalidKey) {
    return NextResponse.json(
      { error: `Invalid query parameter: ${invalidKey}` },
      { status: 400, headers: ADMIN_CACHE_HEADERS }
    );
  }

  const requestedLimit = Number(req.nextUrl.searchParams.get("limit") ?? 25);
  const limit = Number.isFinite(requestedLimit) ? requestedLimit : 25;

  try {
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
