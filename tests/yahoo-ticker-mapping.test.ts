import assert from "node:assert/strict";
import test from "node:test";
import { tickerFromYahooSymbol } from "../lib/yahoo-finance";

test("Yahoo symbols map back to index tickers for NSE and BSE-only listings", () => {
  assert.equal(tickerFromYahooSymbol("URBANCO.NS"), "URBANCO");
  assert.equal(tickerFromYahooSymbol("NSE.BO"), "NSE");
  assert.equal(tickerFromYahooSymbol("E2E.NS"), "E2E");
  assert.equal(tickerFromYahooSymbol("NOSUFFIX"), "NOSUFFIX");
});
