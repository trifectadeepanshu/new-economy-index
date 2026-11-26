import type { CronRunRecord } from "@/lib/db";
import { getISTDate } from "@/lib/market-hours";

type HealthIssue = {
  code: string;
  message: string;
  retryable: boolean;
};

export type CronHealthResult = {
  ok: boolean;
  retryable: boolean;
  expectedSnapshotDate: string;
  expectedRefreshDate: string | null;
  issues: HealthIssue[];
  snapshot: CronRunRecord | null;
  refresh: CronRunRecord | null;
};

function shiftDateKey(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days, 12));
  return [
    shifted.getUTCFullYear(),
    String(shifted.getUTCMonth() + 1).padStart(2, "0"),
    String(shifted.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

// The snapshot cron runs at 11:00 UTC (16:30 IST). A monitor run before this
// hour can't see today's snapshot yet, so it checks the previous weekday.
const SNAPSHOT_DUE_HOUR_IST = 17;

function istHour(now: Date) {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      hourCycle: "h23",
    }).format(now)
  );
}

export function getExpectedSnapshotDate(now: Date = new Date()) {
  let dateKey = getISTDate(now);
  if (istHour(now) < SNAPSHOT_DUE_HOUR_IST) dateKey = shiftDateKey(dateKey, -1);
  const day = new Date(`${dateKey}T12:00:00Z`).getUTCDay();
  if (day === 6) return shiftDateKey(dateKey, -1);
  if (day === 0) return shiftDateKey(dateKey, -2);
  return dateKey;
}

export function getExpectedRefreshDate(now: Date = new Date()) {
  const dateKey = getISTDate(now);
  const [year, month, day] = dateKey.split("-");
  // Runs the 20th of the month after each quarter-end (Feb/May/Aug/Nov), not
  // the 1st of the quarter-start month — that was too early to catch most
  // Indian companies' results, which land within SEBI's 45-day window and
  // often later in the following month.
  const isRefreshMonth = ["02", "05", "08", "11"].includes(month);

  // Keep checking through the 23rd so a weekend or a delayed GitHub runner
  // cannot make the refresh invisible to the monitor.
  if (!isRefreshMonth || Number(day) < 20 || Number(day) > 23) return null;
  return `${year}-${month}-20`;
}

function runStartedOn(run: CronRunRecord, dateKey: string) {
  const startedAt = new Date(run.startedAt);
  return Number.isFinite(startedAt.getTime()) && getISTDate(startedAt) === dateKey;
}

function issue(code: string, message: string, retryable: boolean): HealthIssue {
  return { code, message, retryable };
}

export function evaluateCronHealth(
  runs: CronRunRecord[],
  now: Date = new Date()
): CronHealthResult {
  const expectedSnapshotDate = getExpectedSnapshotDate(now);
  const expectedRefreshDate = getExpectedRefreshDate(now);
  const snapshot = runs.find(
    (run) => run.job === "snapshot" && run.date === expectedSnapshotDate
  ) ?? null;
  const refresh = expectedRefreshDate
    ? runs.find((run) => run.job === "refresh" && runStartedOn(run, expectedRefreshDate)) ?? null
    : null;
  const issues: HealthIssue[] = [];

  if (!snapshot) {
    issues.push(
      issue(
        "snapshot_missing",
        `No snapshot cron_run row found for ${expectedSnapshotDate}`,
        true
      )
    );
  } else if (snapshot.status === "running") {
    issues.push(
      issue(
        "snapshot_running",
        `Snapshot cron for ${expectedSnapshotDate} is still running`,
        true
      )
    );
  } else if (snapshot.status !== "success") {
    issues.push(
      issue(
        "snapshot_failed",
        `Snapshot cron for ${expectedSnapshotDate} ended with status ${snapshot.status}`,
        false
      )
    );
  } else if (!(snapshot.stockRows && snapshot.stockRows > 0)) {
    issues.push(
      issue(
        "snapshot_empty",
        `Snapshot cron for ${expectedSnapshotDate} wrote ${snapshot.stockRows ?? 0} stock rows`,
        false
      )
    );
  } else if (snapshot.missingTickers.length > 0) {
    issues.push(
      issue(
        "snapshot_incomplete",
        `Snapshot cron for ${expectedSnapshotDate} missed ${snapshot.missingTickers.join(", ")}`,
        false
      )
    );
  }

  if (expectedRefreshDate) {
    if (!refresh) {
      issues.push(
        issue(
          "refresh_missing",
          `No quarterly refresh cron_run started on ${expectedRefreshDate}`,
          true
        )
      );
    } else if (refresh.status === "running") {
      issues.push(
        issue(
          "refresh_running",
          `Quarterly refresh for ${expectedRefreshDate} is still running`,
          true
        )
      );
    } else if (refresh.status !== "success") {
      issues.push(
        issue(
          "refresh_failed",
          `Quarterly refresh for ${expectedRefreshDate} ended with status ${refresh.status}`,
          false
        )
      );
    }
  }

  return {
    ok: issues.length === 0,
    retryable: issues.length > 0 && issues.every((item) => item.retryable),
    expectedSnapshotDate,
    expectedRefreshDate,
    issues,
    snapshot,
    refresh,
  };
}
