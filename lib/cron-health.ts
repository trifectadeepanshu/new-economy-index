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

export function getExpectedSnapshotDate(now: Date = new Date()) {
  const dateKey = getISTDate(now);
  const day = new Date(`${dateKey}T12:00:00Z`).getUTCDay();
  if (day === 6) return shiftDateKey(dateKey, -1);
  if (day === 0) return shiftDateKey(dateKey, -2);
  return dateKey;
}

export function getExpectedRefreshDate(now: Date = new Date()) {
  const dateKey = getISTDate(now);
  const [year, month, day] = dateKey.split("-");
  const isQuarterStartMonth = ["01", "04", "07", "10"].includes(month);

  // Keep checking through the fourth day so a quarter-start weekend or a
  // delayed GitHub runner cannot make the refresh invisible to the monitor.
  if (!isQuarterStartMonth || Number(day) > 4) return null;
  return `${year}-${month}-01`;
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
