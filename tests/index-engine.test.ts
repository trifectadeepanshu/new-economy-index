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
