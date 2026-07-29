import assert from "node:assert/strict";
import test from "node:test";
import { formatMarketCap } from "../lib/formatters";

test("positive market caps format as before", () => {
  assert.equal(formatMarketCap(5_000_000_000, "usd"), "$5.0B");
  assert.equal(formatMarketCap(2_500_000, "usd"), "$2.5M");
  // ₹ crore: 3,678 crore
  assert.equal(formatMarketCap(36_780_000_000, "inr"), "₹3,678 Cr");
});

test("negative PAT keeps the magnitude bucket and puts the sign before the symbol", () => {
  // The old formatter fell through to the raw number for large USD losses.
  assert.equal(formatMarketCap(-5_000_000_000, "usd"), "-$5.0B");
  assert.equal(formatMarketCap(-2_500_000, "usd"), "-$2.5M");
  assert.equal(formatMarketCap(-5_000_000_000, "inr"), "-₹500 Cr");
});

test("null renders as an em dash", () => {
  assert.equal(formatMarketCap(null, "inr"), "—");
  assert.equal(formatMarketCap(null, "usd"), "—");
});
