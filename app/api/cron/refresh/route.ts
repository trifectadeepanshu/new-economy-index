import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, finishCronRun, startCronRun } from "@/lib/db";
import { isBearerAuthorized } from "@/lib/http-auth";
import { round } from "@/lib/index-math";
import { getISTDate } from "@/lib/market-hours";
import { refreshConstituentData, summarizeRefreshFailures } from "@/lib/data-refresh";
import { getUniverse } from "@/lib/universe";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const CRON_JOB = "refresh";
const HEADERS = { "Cache-Control": "no-store" };

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: HEADERS });
}

function errorDetail(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

async function finishRefreshRun(
  runId: number,
  input: Parameters<typeof finishCronRun>[1]
) {
  try {
    await finishCronRun(runId, input);
  } catch (err) {
    console.warn("[/api/cron/refresh] cron run logging failed:", err);
  }
}

export async function GET(req: NextRequest) {
  if (!isBearerAuthorized(req.headers, process.env.CRON_SECRET)) return unauthorized();
  return runRefresh();
}

export async function POST(req: NextRequest) {
  if (!isBearerAuthorized(req.headers, process.env.CRON_SECRET)) return unauthorized();
  return runRefresh();
}

async function runRefresh() {
  await ensureSchema();

  const today = getISTDate();
  const runId = await startCronRun(CRON_JOB, today);

  try {
    const active = (await getUniverse()).filter((c) => c.listedDate <= today);
    if (!active.length) {
      await finishRefreshRun(runId, {
        status: "skipped",
        date: today,
        stockRows: 0,
        error: "No active listed constituents",
      });
      return NextResponse.json(
        { message: "No active listed constituents", date: today },
        { headers: HEADERS }
      );
    }

    const summary = await refreshConstituentData(active);
    const warning = summarizeRefreshFailures(summary.failures);
    const failedTickers = [...new Set(summary.failures.map((f) => f.ticker))];
    const allFetchesFailed = summary.failures.length > 0 && summary.dataRowsWritten === 0;
    const status = allFetchesFailed ? "failed" : "success";
    const indexValue = summary.indexValue == null ? null : round(summary.indexValue);

    await finishRefreshRun(runId, {
      status,
      date: summary.latestDate ?? today,
      stockRows: summary.dataRowsWritten,
      missingTickers: failedTickers,
      indexValue,
      error: warning,
    });

    return NextResponse.json(
      {
        message: status === "success" ? "Refresh completed" : "Refresh failed",
        date: summary.latestDate ?? today,
        indexValue,
        numCompanies: summary.numCompanies,
        companiesProcessed: summary.companiesProcessed,
        shareRowsFetched: summary.shareRowsFetched,
        shareRowsWritten: summary.shareRowsWritten,
        financialRows: summary.financialRows,
        profiles: summary.profiles,
        analysts: summary.analysts,
        failures: summary.failures,
      },
      { status: status === "failed" ? 502 : 200, headers: HEADERS }
    );
  } catch (err) {
    const detail = errorDetail(err);
    console.error("[/api/cron/refresh] refresh failed:", err);
    await finishRefreshRun(runId, {
      status: "failed",
      date: today,
      stockRows: 0,
      error: detail,
    });
    return NextResponse.json(
      { error: "Refresh failed", detail },
      { status: 500, headers: HEADERS }
    );
  }
}
