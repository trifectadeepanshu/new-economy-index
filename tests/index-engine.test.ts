import assert from "node:assert/strict";
import test from "node:test";
import {
  computeIndexSeries,
  liveIndexValue,
  type DailyPrices,
  type EngineMember,
  type QuarterlySharesMap,
} from "../lib/index-engine";

test("live index valuation requires one valid price per constituent", () => {
  const members = [
    { ticker: "ALPHA", shares: 1 },
    { ticker: "BETA", shares: 1 },
  ];

  assert.equal(liveIndexValue(new Map([["ALPHA", 100]]), new Map(), members, 0.2), null);
  assert.equal(
    liveIndexValue(
      new Map([["ALPHA", 100], ["BETA", -1]]),
      new Map([["BETA", 100]]),
      members,
      0.2
    ),
    1000
  );
});

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

test("a corrupted price is ignored instead of changing membership or index market cap", () => {
  // BETA is a valid member through the base quarter, then gets a bad
  // (negative) observation exactly at the next quarter-end rebalance.
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

  // The bad observation is ignored and BETA's last valid close carries
  // forward. Silently removing BETA's market cap here would create an
  // artificial 50% index loss with no divisor adjustment.
  assert.equal(result.points[1].value, 1050);
  assert.equal(result.points[1].numCompanies, 2);
  assert.equal(result.points[2].value, 1105);
});

test("a stale price remains carried until a controlled constituent removal", () => {
  // ALPHA is priced every day. BETA is priced through day 1, then its feed
  // goes dark for good. Data freshness should be reported separately; dropping
  // BETA from the numerator without adjusting the divisor corrupts the index.
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

  // BETA's carried-forward price still counts: total = 110 (ALPHA) +
  // 100 (BETA, day 1) = 210 -> 210 / 0.2.
  assert.equal(byDate.get("2021-04-01")?.value, 1050);
  assert.equal(byDate.get("2021-04-11")?.value, 1050);
  assert.equal(byDate.get("2021-04-12")?.value, 1050);
});

test("a sector index inherits the parent top-N composition", () => {
  const prices: DailyPrices = new Map([
    ["2021-03-31", new Map([["ALPHA", 100], ["BETA", 90], ["GAMMA", 80]])],
    ["2021-04-01", new Map([["ALPHA", 100], ["BETA", 90], ["GAMMA", 80], ["DELTA", 200]])],
    ["2021-04-02", new Map([["ALPHA", 110], ["BETA", 180], ["GAMMA", 80], ["DELTA", 200]])],
  ]);
  const shares: QuarterlySharesMap = new Map(
    ["ALPHA", "BETA", "GAMMA", "DELTA"].map((ticker) => [
      ticker,
      [{ asOf: "2021-03-31", shares: 1 }],
    ])
  );
  const selectionMembers: EngineMember[] = [
    { ticker: "ALPHA", listedDate: "2020-01-01" },
    { ticker: "BETA", listedDate: "2020-01-01" },
    { ticker: "GAMMA", listedDate: "2020-01-01" },
    { ticker: "DELTA", listedDate: "2021-04-02" },
  ];

  const result = computeIndexSeries(prices, shares, selectionMembers.slice(0, 2), {
    baseValue: 1000,
    baseDate: "2021-03-31",
    topN: 2,
    selectionMembers,
  });
  const byDate = new Map(result.points.map((point) => [point.date, point]));

  // DELTA's entry displaces BETA from the parent top two. The sector divisor
  // absorbs the deletion, so the event is level-neutral and BETA's next-day
  // rally no longer affects the sector index.
  assert.equal(byDate.get("2021-04-01")?.value, 1000);
  assert.equal(byDate.get("2021-04-01")?.numCompanies, 1);
  assert.equal(byDate.get("2021-04-02")?.value, 1100);
});

test("a portfolio sub-index inherits the parent top-N composition", () => {
  const prices: DailyPrices = new Map([
    ["2021-03-31", new Map([["ALPHA", 100], ["BETA", 90], ["GAMMA", 80]])],
    ["2021-04-01", new Map([["ALPHA", 100], ["BETA", 90], ["GAMMA", 80], ["DELTA", 200]])],
    ["2021-04-02", new Map([["ALPHA", 110], ["BETA", 180], ["GAMMA", 80], ["DELTA", 200]])],
  ]);
  const shares: QuarterlySharesMap = new Map(
    ["ALPHA", "BETA", "GAMMA", "DELTA"].map((ticker) => [
      ticker,
      [{ asOf: "2021-03-31", shares: 1 }],
    ])
  );
  const selectionMembers: EngineMember[] = [
    { ticker: "ALPHA", listedDate: "2020-01-01" },
    { ticker: "BETA", listedDate: "2020-01-01" },
    { ticker: "GAMMA", listedDate: "2020-01-01" },
    { ticker: "DELTA", listedDate: "2021-04-02" },
  ];

  const result = computeIndexSeries(prices, shares, selectionMembers.slice(0, 2), {
    baseValue: 1000,
    baseDate: "2021-03-31",
    topN: 2,
    selectionMembers,
  });
  const byDate = new Map(result.points.map((point) => [point.date, point]));

  // DELTA enters the parent top two and displaces portfolio member BETA. The
  // portfolio divisor absorbs the removal and BETA's next-day rally is ignored.
  assert.equal(byDate.get("2021-04-01")?.value, 1000);
  assert.equal(byDate.get("2021-04-01")?.numCompanies, 1);
  assert.equal(byDate.get("2021-04-02")?.value, 1100);
});

test("prices before a post-base listing seed cannot leak into selection", () => {
  const prices: DailyPrices = new Map([
    ["2021-03-31", new Map([["ALPHA", 100], ["BETA", 500]])],
    ["2021-04-01", new Map([["ALPHA", 100], ["BETA", 200]])],
    ["2021-04-02", new Map([["ALPHA", 100], ["BETA", 220]])],
  ]);
  const shares: QuarterlySharesMap = new Map([
    ["ALPHA", [{ asOf: "2021-03-31", shares: 1 }]],
    ["BETA", [{ asOf: "2021-04-01", shares: 1 }]],
  ]);
  const members: EngineMember[] = [
    { ticker: "ALPHA", listedDate: "2020-01-01" },
    { ticker: "BETA", listedDate: "2021-04-02" },
  ];

  const result = computeIndexSeries(prices, shares, members, {
    baseValue: 1000,
    baseDate: "2021-03-31",
    topN: 1,
  });
  const byDate = new Map(result.points.map((point) => [point.date, point]));

  assert.equal(byDate.get("2021-03-31")?.value, 1000);
  assert.equal(byDate.get("2021-04-01")?.value, 1000);
  assert.equal(byDate.get("2021-04-02")?.value, 1100);
});
