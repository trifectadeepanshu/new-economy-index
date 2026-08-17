import assert from "node:assert/strict";
import test from "node:test";
import type { LiveIndexPayload } from "../lib/index-api";
import { createLivePayloadCache } from "../lib/live-index-cache";

function payload(value: number): LiveIndexPayload {
  return {
    indexValue: value,
    indexChangePct: 1,
    portfolioValue: value,
    numCompanies: 50,
    lastUpdated: "2026-08-17T09:30:00.000Z",
    isStale: false,
    totalMarketCap: 1,
    currency: "inr",
    usdInr: 87,
    trifectaWeightPct: 10,
    staleConstituents: [],
    marketStats: { high52w: value, low52w: value, advancers: 1, decliners: 0 },
    sectorComposition: [],
    tickerTape: [],
    stocks: [],
  };
}

test("live payload cache reuses fresh data", async () => {
  let now = 0;
  let calls = 0;
  const cache = createLivePayloadCache({
    now: () => now,
    freshForMs: 100,
    staleForMs: 1_000,
    loader: async () => payload(++calls),
  });

  const first = await cache.get("inr");
  now = 99;
  const second = await cache.get("inr");

  assert.equal(first.status, "miss");
  assert.equal(second.status, "hit");
  assert.equal(second.payload.indexValue, 1);
  assert.equal(calls, 1);
});

test("live payload cache coalesces concurrent misses", async () => {
  let release: ((value: LiveIndexPayload) => void) | undefined;
  let calls = 0;
  const cache = createLivePayloadCache({
    loader: () => {
      calls += 1;
      return new Promise((resolve) => {
        release = resolve;
      });
    },
  });

  const first = cache.get("inr");
  const second = cache.get("inr");
  release?.(payload(2));

  const [firstResult, secondResult] = await Promise.all([first, second]);
  assert.equal(firstResult.status, "miss");
  assert.equal(secondResult.status, "coalesced");
  assert.equal(calls, 1);
});

test("live payload cache refreshes expired data", async () => {
  let now = 0;
  let calls = 0;
  const cache = createLivePayloadCache({
    now: () => now,
    freshForMs: 100,
    loader: async () => payload(++calls),
  });

  await cache.get("inr");
  now = 100;
  const refreshed = await cache.get("inr");

  assert.equal(refreshed.status, "miss");
  assert.equal(refreshed.payload.indexValue, 2);
  assert.equal(calls, 2);
});

test("live payload cache serves stale data when refresh fails", async () => {
  let now = 0;
  let fail = false;
  const cache = createLivePayloadCache({
    now: () => now,
    freshForMs: 100,
    staleForMs: 1_000,
    loader: async () => {
      if (fail) throw new Error("upstream unavailable");
      return payload(3);
    },
  });

  await cache.get("inr");
  now = 101;
  fail = true;
  const stale = await cache.get("inr");

  assert.equal(stale.status, "stale");
  assert.equal(stale.payload.indexValue, 3);
  assert.equal(stale.payload.isStale, true);
});

test("live payload cache does not serve data past the stale window", async () => {
  let now = 0;
  let fail = false;
  const cache = createLivePayloadCache({
    now: () => now,
    freshForMs: 100,
    staleForMs: 1_000,
    loader: async () => {
      if (fail) throw new Error("upstream unavailable");
      return payload(4);
    },
  });

  await cache.get("inr");
  now = 1_000;
  fail = true;

  await assert.rejects(() => cache.get("inr"), /upstream unavailable/);
});
