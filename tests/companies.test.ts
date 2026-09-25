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

test("NSE is configured with the approved index inputs and its BSE Yahoo symbol", () => {
  const nse = COMPANIES.find((company) => company.ticker === "NSE");

  assert.deepEqual(nse, {
    name: "National Stock Exchange of India Limited",
    displayName: "NSE India",
    ticker: "NSE",
    yfTicker: "NSE.BO",
    sector: "Fintech",
    listedDate: "2026-09-24",
    ipoPrice: 1785,
    isPortfolio: false,
  });
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
