import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMarketStats,
  buildSectorComposition,
  getTrailingYearFromDate,
  staleTickersFor,
  stockSnapshotsToPricePoints,
} from "../lib/live-payload-metrics";
import type { StockData } from "../lib/index-api";

function stock(input: Partial<StockData> & Pick<StockData, "ticker" | "sector">): StockData {
  return {
    ticker: input.ticker,
    name: input.name ?? input.ticker,
    displayName: input.displayName ?? input.ticker,
    sector: input.sector,
    isPortfolio: input.isPortfolio ?? false,
    listedDate: input.listedDate ?? "2021-01-01",
    price: input.price ?? 100,
    changePct: input.changePct ?? null,
    marketCap: input.marketCap ?? null,
    basePrice: input.basePrice ?? 100,
    ratio: input.ratio ?? 1,
    asOfDate: input.asOfDate ?? "2026-07-13",
    isStale: input.isStale ?? false,
  };
}

test("stale constituent detection compares each close to the snapshot date", () => {
  const latestClose = {
    ALPHA: { date: "2026-07-13", price: 100, changePct: 1 },
    BETA: { date: "2026-07-12", price: 200, changePct: -1 },
  };

  assert.deepEqual(
    staleTickersFor(["ALPHA", "BETA", "GAMMA"], latestClose, "2026-07-13"),
    ["BETA", "GAMMA"]
  );

  assert.deepEqual(stockSnapshotsToPricePoints(latestClose, "2026-07-13"), {
    ALPHA: { price: 100, changePct: 1, asOfDate: "2026-07-13", isStale: false },
    BETA: { price: 200, changePct: -1, asOfDate: "2026-07-12", isStale: true },
  });
});

test("market stats use server history bounds and validated stock breadth", () => {
  const stats = buildMarketStats(
    [
      stock({ ticker: "ALPHA", sector: "Platforms", changePct: 1 }),
      stock({ ticker: "BETA", sector: "Fintech", changePct: -1 }),
      stock({ ticker: "GAMMA", sector: "B2B", changePct: 0 }),
    ],
    { fromDate: "2025-07-13", toDate: "2026-07-13", high: 2200, low: 1800 },
    2300
  );

  assert.deepEqual(stats, {
    high52w: 2300,
    low52w: 1800,
    advancers: 1,
    decliners: 1,
  });
});

test("sector composition is market-cap weighted, not listing-count weighted", () => {
  const composition = buildSectorComposition([
    stock({ ticker: "ALPHA", sector: "Platforms", marketCap: 100, changePct: 1 }),
    stock({ ticker: "BETA", sector: "Platforms", marketCap: 200, changePct: -1 }),
    stock({ ticker: "GAMMA", sector: "Fintech", marketCap: 100, changePct: 2 }),
  ]);

  assert.deepEqual(composition, [
    {
      sector: "Platforms",
      numCompanies: 2,
      marketCap: 300,
      weightPct: 75,
      changePct: -0.33,
      advancers: 1,
      decliners: 1,
    },
    {
      sector: "Fintech",
      numCompanies: 1,
      marketCap: 100,
      weightPct: 25,
      changePct: 2,
      advancers: 1,
      decliners: 0,
    },
  ]);
});

test("trailing-year helper uses calendar dates", () => {
  assert.equal(getTrailingYearFromDate("2026-07-13"), "2025-07-13");
});
