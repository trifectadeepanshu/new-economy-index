import assert from "node:assert/strict";
import test from "node:test";
import type { Company } from "../lib/companies";
import {
  STOCK_SOURCE_CAPIQ,
  STOCK_SOURCE_YAHOO,
  missingQuoteTickers,
  quotesByTicker,
  toYahooStockSnapshotInput,
} from "../lib/quote-snapshots";
import type { QuoteResult } from "../lib/yahoo-finance";

const companies: Company[] = [
  {
    name: "Alpha Limited",
    displayName: "Alpha",
    ticker: "ALPHA",
    yfTicker: "ALPHA.NS",
    sector: "Platforms",
    listedDate: "2021-01-01",
    ipoPrice: 100,
    isPortfolio: false,
  },
  {
    name: "Beta Limited",
    displayName: "Beta",
    ticker: "BETA",
    yfTicker: "BETA.NS",
    sector: "Fintech",
    listedDate: "2021-01-01",
    ipoPrice: 200,
    isPortfolio: false,
  },
];

function quote(ticker: string, price: number | null): QuoteResult {
  return {
    ticker,
    yfTicker: `${ticker}.NS`,
    price,
    previousClose: price === null ? null : price - 1,
    changePct: price === null ? null : 1,
    marketCap: null,
    currency: "INR",
  };
}

test("quote completeness rejects missing constituent prices", () => {
  const quoteMap = quotesByTicker([quote("ALPHA", 101), quote("BETA", null)]);

  assert.deepEqual(missingQuoteTickers(companies, quoteMap), ["BETA"]);
});

test("quote completeness rejects non-positive prices, not just missing ones", () => {
  const quoteMap = quotesByTicker([quote("ALPHA", 0), quote("BETA", -5)]);

  assert.deepEqual(missingQuoteTickers(companies, quoteMap).sort(), ["ALPHA", "BETA"]);
});

test("Yahoo stock snapshots reject non-positive prices", () => {
  const quoteMap = quotesByTicker([quote("ALPHA", 0), quote("BETA", -5)]);

  assert.equal(toYahooStockSnapshotInput("2026-07-13", companies[0], quoteMap), null);
  assert.equal(toYahooStockSnapshotInput("2026-07-13", companies[1], quoteMap), null);
});

test("Yahoo stock snapshots carry source metadata", () => {
  const quoteMap = quotesByTicker([quote("ALPHA", 101)]);
  const row = toYahooStockSnapshotInput("2026-07-13", companies[0], quoteMap);

  assert.deepEqual(row, {
    date: "2026-07-13",
    ticker: "ALPHA",
    closePrice: 101,
    changePct: 1,
    source: STOCK_SOURCE_YAHOO,
    providerSymbol: "ALPHA.NS",
  });
});

test("source constants preserve the DB audit labels", () => {
  assert.equal(STOCK_SOURCE_YAHOO, "yahoo");
  assert.equal(STOCK_SOURCE_CAPIQ, "excel-capiq");
});
