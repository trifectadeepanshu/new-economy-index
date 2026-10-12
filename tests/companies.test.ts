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
  assert.equal(COMPANIES.length, 58);
});

test("Moneyview is configured with the approved index inputs and flagged as a Trifecta company", () => {
  const moneyview = COMPANIES.find((company) => company.ticker === "MONEYVIEW");

  assert.deepEqual(moneyview, {
    name: "Moneyview Limited",
    displayName: "Moneyview",
    ticker: "MONEYVIEW",
    yfTicker: "MONEYVIEW.NS",
    sector: "Fintech",
    listedDate: "2026-10-01",
    ipoPrice: 34,
    isPortfolio: true,
  });
});

test("NSE was removed from the index and is not in the universe", () => {
  assert.equal(COMPANIES.some((company) => company.ticker === "NSE"), false);
});

test("ESDS Software Solution is configured with the approved index inputs", () => {
  const esds = COMPANIES.find((company) => company.ticker === "ESDS");

  assert.deepEqual(esds, {
    name: "ESDS Software Solution Limited",
    displayName: "ESDS Software",
    ticker: "ESDS",
    yfTicker: "ESDS.NS",
    sector: "Deep Tech",
    listedDate: "2026-09-04",
    ipoPrice: 429,
    isPortfolio: false,
  });
});

test("Rentomojo is configured with the approved index inputs", () => {
  const rentomojo = COMPANIES.find((company) => company.ticker === "RENTOMOJO");

  assert.deepEqual(rentomojo, {
    name: "Rentomojo Limited",
    displayName: "Rentomojo",
    ticker: "RENTOMOJO",
    yfTicker: "RENTOMOJO.NS",
    sector: "Platforms",
    listedDate: "2026-09-17",
    ipoPrice: 404,
    isPortfolio: false,
  });
});
