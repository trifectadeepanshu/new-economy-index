import assert from "node:assert/strict";
import test from "node:test";
import { COMPANIES } from "../lib/companies";

test("Shiprocket is configured with the approved index inputs", () => {
  const shiprocket = COMPANIES.find((company) => company.ticker === "SHIPROCKET");

  assert.deepEqual(shiprocket, {
    name: "Shiprocket Limited",
    displayName: "Shiprocket",
    ticker: "SHIPROCKET",
    yfTicker: "SHIPROCKET.NS",
    sector: "B2B",
    listedDate: "2026-08-19",
    ipoPrice: 97,
    isPortfolio: false,
  });
  assert.equal(COMPANIES.length, 55);
});
