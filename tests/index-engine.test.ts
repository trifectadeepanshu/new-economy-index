import assert from "node:assert/strict";
import test from "node:test";
import {
  computeIndexSeries,
  type DailyPrices,
  type EngineMember,
  type QuarterlySharesMap,
} from "../lib/index-engine";

test("IPO rebalance keeps the index level continuous when a new member joins", () => {
  const prices: DailyPrices = new Map([
    ["2021-03-31", new Map([["ALPHA", 100]])],
    ["2021-04-01", new Map([["ALPHA", 110], ["BETA", 1000]])],
    ["2021-04-02", new Map([["ALPHA", 110], ["BETA", 1100]])],
  ]);
  const shares: QuarterlySharesMap = new Map([
    ["ALPHA", [{ asOf: "2021-03-31", shares: 1 }]],
    ["BETA", [{ asOf: "2021-04-01", shares: 1 }]],
  ]);
  const members: EngineMember[] = [
    { ticker: "ALPHA", listedDate: "2020-01-01" },
    { ticker: "BETA", listedDate: "2021-04-01" },
  ];

  const result = computeIndexSeries(prices, shares, members, {
    baseValue: 1000,
    baseDate: "2021-03-31",
    topN: Number.POSITIVE_INFINITY,
  });

  assert.equal(result.points[0].value, 1000);
  assert.equal(result.points[1].value, 1100);
  assert.equal(result.points[1].numCompanies, 2);
  assert.deepEqual(
    result.members.map((member) => member.ticker).sort(),
    ["ALPHA", "BETA"]
  );
});

test("a corrupted (negative) price at a rebalance can't poison the chain-linked divisor", () => {
  // BETA is a valid member through the base quarter, then gets a bad
  // (negative) price exactly at the next quarter-end rebalance — which
  // already excludes it from the NEW quarter's membership (existing
  // ranking guard), but without also guarding capOf()'s divisor-chain sum,
  // that same bad price still leaked into `oldCap` (the reconciliation of
  // the OLD basket at the NEW quarter's prices) and permanently distorted
  // every value computed from that point on.
  const prices: DailyPrices = new Map([
    ["2021-03-31", new Map([["ALPHA", 100], ["BETA", 100]])],
    ["2021-06-30", new Map([["ALPHA", 110], ["BETA", -50]])],
    ["2021-07-01", new Map([["ALPHA", 121], ["BETA", -50]])],
  ]);
  const shares: QuarterlySharesMap = new Map([
    ["ALPHA", [{ asOf: "2021-03-31", shares: 1 }]],
    ["BETA", [{ asOf: "2021-03-31", shares: 1 }]],
  ]);
  const members: EngineMember[] = [
    { ticker: "ALPHA", listedDate: "2020-01-01" },
    { ticker: "BETA", listedDate: "2020-01-01" },
  ];

  const result = computeIndexSeries(prices, shares, members, {
    baseValue: 1000,
    baseDate: "2021-03-31",
    topN: Number.POSITIVE_INFINITY,
  });

  assert.equal(result.points[0].value, 1000);
  assert.equal(result.points[0].numCompanies, 2);

  // BETA drops out of membership (correct — its price is invalid), and the
  // divisor stays unchanged because ALPHA is the only clean, comparable
  // company in both the old and new basket. Without the capOf() guard this
  // would instead compute 300 and 330 — a permanent, silent distortion.
  assert.equal(result.points[1].value, 550);
  assert.equal(result.points[1].numCompanies, 1);
  assert.equal(result.points[2].value, 605);
});

test("a stale price carries forward for a short gap but drops out past the cutoff", () => {
  // ALPHA is priced every day. BETA is priced through day 1, then its feed
  // goes dark for good — it should keep contributing its last close for a
  // short gap (matching known 1-day Yahoo data-lag behavior) but stop
  // contributing once that gap exceeds the staleness cutoff.
  const prices: DailyPrices = new Map([
    ["2021-03-31", new Map([["ALPHA", 100], ["BETA", 100]])],
  ]);
  for (let day = 1; day <= 12; day++) {
    const date = `2021-04-${String(day).padStart(2, "0")}`;
    const dayPrices = new Map([["ALPHA", 110]]);
    if (day === 1) dayPrices.set("BETA", 100); // BETA's last real price
    prices.set(date, dayPrices);
  }
  const shares: QuarterlySharesMap = new Map([
    ["ALPHA", [{ asOf: "2021-03-31", shares: 1 }]],
    ["BETA", [{ asOf: "2021-03-31", shares: 1 }]],
  ]);
  const members: EngineMember[] = [
    { ticker: "ALPHA", listedDate: "2020-01-01" },
    { ticker: "BETA", listedDate: "2020-01-01" },
  ];

  const result = computeIndexSeries(prices, shares, members, {
    baseValue: 1000,
    baseDate: "2021-03-31",
    topN: Number.POSITIVE_INFINITY,
  });
  const byDate = new Map(result.points.map((p) => [p.date, p]));

  // Both companies stay flagged in (membership is set at the rebalance, not
  // re-evaluated day to day) even after BETA's feed goes stale.
  assert.equal(byDate.get("2021-04-01")?.numCompanies, 2);
  assert.equal(byDate.get("2021-04-12")?.numCompanies, 2);

  // Within the 10-trading-day cutoff, BETA's carried-forward price still
  // counts: total = 110 (ALPHA) + 100 (BETA, day 1) = 210 -> 210 / 0.2.
  assert.equal(byDate.get("2021-04-01")?.value, 1050);
  assert.equal(byDate.get("2021-04-11")?.value, 1050); // 10 trading days since day 1

  // One trading day past the cutoff, BETA's stale price is excluded:
  // total = 110 (ALPHA only) -> 110 / 0.2.
  assert.equal(byDate.get("2021-04-12")?.value, 550);
});
