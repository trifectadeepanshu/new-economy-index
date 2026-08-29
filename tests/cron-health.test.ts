import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateCronHealth,
  getExpectedRefreshDate,
  getExpectedSnapshotDate,
} from "../lib/cron-health";
import type { CronRunRecord, CronRunStatus } from "../lib/db";

function run(
  overrides: Partial<CronRunRecord> & { job?: string; date?: string | null } = {}
): CronRunRecord {
  return {
    id: overrides.id ?? "1",
    job: overrides.job ?? "snapshot",
    date: overrides.date ?? "2026-08-28",
    startedAt: overrides.startedAt ?? "2026-08-28T11:35:50.000Z",
    finishedAt: overrides.finishedAt ?? "2026-08-28T11:35:52.000Z",
    status: (overrides.status ?? "success") as CronRunStatus,
    stockRows: overrides.stockRows ?? 55,
    missingTickers: overrides.missingTickers ?? [],
    indexValue: overrides.indexValue ?? 2520.96,
    error: overrides.error ?? null,
  };
}

test("weekday monitor checks the same IST date", () => {
  assert.equal(
    getExpectedSnapshotDate(new Date("2026-08-28T12:30:00.000Z")),
    "2026-08-28"
  );
});

test("a delayed Friday monitor checks Friday after IST midnight", () => {
  assert.equal(
    getExpectedSnapshotDate(new Date("2026-08-28T21:26:00.000Z")),
    "2026-08-28"
  );
});

test("Saturday evening monitor still checks the preceding Friday", () => {
  assert.equal(
    getExpectedSnapshotDate(new Date("2026-08-29T16:00:00.000Z")),
    "2026-08-28"
  );
});

test("Sunday monitor checks the preceding Friday", () => {
  assert.equal(
    getExpectedSnapshotDate(new Date("2026-08-30T08:00:00.000Z")),
    "2026-08-28"
  );
});

test("a complete successful snapshot is healthy", () => {
  const health = evaluateCronHealth(
    [run()],
    new Date("2026-08-28T12:30:00.000Z")
  );
  assert.equal(health.ok, true);
  assert.equal(health.retryable, false);
  assert.deepEqual(health.issues, []);
});

test("a missing or running snapshot is retryable", () => {
  const now = new Date("2026-08-28T12:30:00.000Z");
  assert.equal(evaluateCronHealth([], now).retryable, true);
  assert.equal(
    evaluateCronHealth([run({ status: "running" })], now).retryable,
    true
  );
});

test("failed, empty, and incomplete snapshots fail immediately", () => {
  const now = new Date("2026-08-28T12:30:00.000Z");
  const cases = [
    run({ status: "failed" }),
    run({ stockRows: 0 }),
    run({ missingTickers: ["MISSING.NS"] }),
  ];

  for (const snapshot of cases) {
    const health = evaluateCronHealth([snapshot], now);
    assert.equal(health.ok, false);
    assert.equal(health.retryable, false);
  }
});

test("quarterly refresh remains monitored through the fourth IST day", () => {
  assert.equal(
    getExpectedRefreshDate(new Date("2026-10-04T08:00:00.000Z")),
    "2026-10-01"
  );
  assert.equal(
    getExpectedRefreshDate(new Date("2026-10-05T08:00:00.000Z")),
    null
  );
});

test("quarterly refresh is matched by its actual start date", () => {
  const now = new Date("2026-10-02T12:30:00.000Z");
  const snapshot = run({ date: "2026-10-02" });
  const refresh = run({
    id: "2",
    job: "refresh",
    date: "2026-09-30",
    startedAt: "2026-10-01T03:05:00.000Z",
  });
  const health = evaluateCronHealth([snapshot, refresh], now);

  assert.equal(health.ok, true);
  assert.equal(health.refresh?.id, "2");
});
