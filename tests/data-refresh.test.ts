import assert from "node:assert/strict";
import test from "node:test";
import {
  refreshConstituentData,
  summarizeRefreshFailures,
  type RefreshDependencies,
  type RefreshFailure,
} from "../lib/data-refresh";
import type { CompanyMeta, FinancialRow, SharePoint } from "../lib/yahoo-provider";

const constituents = [
  { ticker: "ALPHA", yfTicker: "ALPHA.NS" },
  { ticker: "BETA", yfTicker: "BETA.NS" },
];

const analyst: NonNullable<CompanyMeta["analyst"]> = {
  strongBuy: 1,
  buy: 2,
  hold: 3,
  sell: 0,
  strongSell: 0,
  ratingKey: "buy",
  numAnalysts: 6,
};

function sharePoint(yfTicker: string): SharePoint {
  return {
    asOf: "2026-03-31",
    shares: yfTicker === "ALPHA.NS" ? 100 : 200,
  };
}

function financialRow(): FinancialRow {
  return {
    period: "2026-03-31",
    revenue: 100,
    ebitda: 20,
    pat: 10,
    assets: 500,
  };
}

function makeDeps(overrides: Partial<RefreshDependencies> = {}): RefreshDependencies {
  return {
    fetchPointInTimeShares: async (yfTicker) => [sharePoint(yfTicker)],
    fetchQuarterlyFinancials: async () => [financialRow()],
    fetchCompanyMeta: async () => ({
      description: "A listed company.",
      analyst,
      currentShares: null,
    }),
    upsertYahooShareCounts: async (_ticker, points) => points.length,
    upsertQuarterlyFinancials: async () => {},
    upsertCompanyProfile: async () => {},
    upsertAnalystRating: async () => {},
    recomputeAndPersistIndex: async () => ({
      latestDate: "2026-07-27",
      latestValue: 2308.7123,
      numCompanies: 50,
    }),
    wait: async () => {},
    ...overrides,
  };
}

test("refresh writes Yahoo shares, financials, profile, analyst, then recomputes", async () => {
  const waits: number[] = [];
  const shareWrites: string[] = [];

  const summary = await refreshConstituentData(
    constituents,
    { delayMs: 25, concurrency: 1 },
    makeDeps({
      upsertYahooShareCounts: async (ticker, points) => {
        shareWrites.push(`${ticker}:${points.length}`);
        return points.length;
      },
      wait: async (ms) => {
        waits.push(ms);
      },
    })
  );

  assert.deepEqual(shareWrites, ["ALPHA:1", "BETA:1"]);
  assert.deepEqual(waits, [25]);
  assert.equal(summary.companiesProcessed, 2);
  assert.equal(summary.shareRowsFetched, 2);
  assert.equal(summary.shareRowsWritten, 2);
  assert.equal(summary.financialRows, 2);
  assert.equal(summary.profiles, 2);
  assert.equal(summary.analysts, 2);
  assert.equal(summary.dataRowsWritten, 8);
  assert.equal(summary.latestDate, "2026-07-27");
  assert.equal(summary.indexValue, 2308.7123);
  assert.equal(summary.numCompanies, 50);
  assert.deepEqual(summary.failures, []);
});

test("refresh records step failures but continues through later steps", async () => {
  const calls: string[] = [];

  const summary = await refreshConstituentData(
    constituents,
    { delayMs: 0, concurrency: 1 },
    makeDeps({
      fetchPointInTimeShares: async (yfTicker) => {
        calls.push(`shares:${yfTicker}`);
        if (yfTicker === "ALPHA.NS") throw new Error("shares unavailable");
        return [sharePoint(yfTicker)];
      },
      fetchQuarterlyFinancials: async (yfTicker) => {
        calls.push(`financials:${yfTicker}`);
        return [financialRow()];
      },
      fetchCompanyMeta: async (yfTicker) => {
        calls.push(`meta:${yfTicker}`);
        return { description: null, analyst: null, currentShares: null };
      },
      recomputeAndPersistIndex: async () => {
        calls.push("recompute");
        return { latestDate: "2026-07-27", latestValue: 2308.7, numCompanies: 50 };
      },
    })
  );

  assert.deepEqual(calls, [
    "shares:ALPHA.NS",
    "financials:ALPHA.NS",
    "meta:ALPHA.NS",
    "shares:BETA.NS",
    "financials:BETA.NS",
    "meta:BETA.NS",
    "recompute",
  ]);
  assert.deepEqual(summary.failures, [
    { ticker: "ALPHA", step: "shares", error: "shares unavailable" },
  ]);
  assert.equal(summary.shareRowsWritten, 1);
  assert.equal(summary.financialRows, 2);
});

test("refresh failure summaries are bounded", () => {
  const failures: RefreshFailure[] = [
    { ticker: "A", step: "shares", error: "one" },
    { ticker: "B", step: "meta", error: "two" },
  ];

  assert.equal(
    summarizeRefreshFailures(failures, 1),
    "A:shares:one; +1 more"
  );
  assert.equal(summarizeRefreshFailures([], 1), null);
});
