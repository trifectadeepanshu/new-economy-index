import assert from "node:assert/strict";
import test from "node:test";
import { IRR_OPTIONS } from "../components/company-grid/IrrRangeControl";
import {
  computeIrr,
  getEffectiveBaseDate,
  getIrrStartDate,
  getTimeSinceBaseDate,
  getTimeSinceBaseReturn,
} from "../components/company-grid/returns";

function closeTo(actual: number | null, expected: number, tolerance = 1e-9) {
  assert.notEqual(actual, null);
  assert.ok(Math.abs(actual! - expected) <= tolerance, `${actual} is not close to ${expected}`);
}

test("IRR selector exposes only the three requested fixed periods", () => {
  assert.deepEqual(IRR_OPTIONS, [
    { value: "1y", label: "1 Year" },
    { value: "3y", label: "3 Years" },
    { value: "5y", label: "5 Years" },
  ]);
});

test("1 year period resolves to one calendar year earlier", () => {
  assert.equal(getIrrStartDate("1y", "2026-08-17"), "2025-08-17");
});

test("3 year period resolves to three calendar years earlier", () => {
  assert.equal(getIrrStartDate("3y", "2026-08-17"), "2023-08-17");
});

test("5 year period resolves to five calendar years earlier", () => {
  assert.equal(getIrrStartDate("5y", "2026-08-17"), "2021-08-17");
});

test("period subtraction handles leap day by using the last day of February", () => {
  assert.equal(getIrrStartDate("1y", "2024-02-29"), "2023-02-28");
});

test("Absolute Return converts the effective-base ratio to cumulative return", () => {
  closeTo(getTimeSinceBaseReturn(3.204), 220.4);
  closeTo(getTimeSinceBaseReturn(0.746), -25.4);
  assert.equal(getTimeSinceBaseReturn(null), null);
});

test("pre-base listings use the index base date for their tracked tenure", () => {
  assert.equal(getEffectiveBaseDate("2006-11-21"), "2020-12-31");
  assert.deepEqual(getTimeSinceBaseDate("2006-11-21", "2026-08-17"), {
    baseDate: "2020-12-31",
    days: 2055,
    label: "5y 7m",
  });
});

test("post-base listings use their IPO date for their tracked tenure", () => {
  assert.equal(getEffectiveBaseDate("2024-06-18"), "2024-06-18");
  assert.deepEqual(getTimeSinceBaseDate("2024-06-18", "2026-08-17"), {
    baseDate: "2024-06-18",
    days: 790,
    label: "2y 1m",
  });
});

test("recent listings show months and days", () => {
  assert.deepEqual(getTimeSinceBaseDate("2026-05-08", "2026-08-17"), {
    baseDate: "2026-05-08",
    days: 101,
    label: "3m 9d",
  });
});

test("tenure is blank when the effective base date is after the data date", () => {
  assert.equal(getTimeSinceBaseDate("2026-09-01", "2026-08-17"), null);
});

test("IRR annualizes between the actual historical close date and current price", () => {
  const actual = computeIrr({
    currentPrice: 200,
    startPoint: { date: "2025-08-15", price: 100 },
    toDate: "2026-08-17",
    currency: "inr",
    usdInr: null,
  });
  const expected = (Math.pow(2, 365.25 / 367) - 1) * 100;
  closeTo(actual, expected);
});

test("IRR is blank when a company has no public price at the period start", () => {
  assert.equal(
    computeIrr({
      currentPrice: 150,
      startPoint: undefined,
      toDate: "2026-08-17",
      currency: "inr",
      usdInr: null,
    }),
    null
  );
});

test("IRR rejects zero prices and non-positive date windows", () => {
  assert.equal(
    computeIrr({
      currentPrice: 100,
      startPoint: { date: "2025-08-17", price: 0 },
      toDate: "2026-08-17",
      currency: "inr",
      usdInr: null,
    }),
    null
  );
  assert.equal(
    computeIrr({
      currentPrice: 100,
      startPoint: { date: "2026-08-17", price: 90 },
      toDate: "2026-08-17",
      currency: "inr",
      usdInr: null,
    }),
    null
  );
});

test("USD IRR matches INR IRR after converting the historical price", () => {
  const inr = computeIrr({
    currentPrice: 180,
    startPoint: { date: "2025-08-17", price: 90 },
    toDate: "2026-08-17",
    currency: "inr",
    usdInr: null,
  });
  const usd = computeIrr({
    currentPrice: 2,
    startPoint: { date: "2025-08-17", price: 90 },
    toDate: "2026-08-17",
    currency: "usd",
    usdInr: 90,
  });
  assert.equal(usd, inr);
});

test("USD IRR is blank instead of mixing currencies when the FX rate is missing", () => {
  assert.equal(
    computeIrr({
      currentPrice: 2,
      startPoint: { date: "2025-08-17", price: 90 },
      toDate: "2026-08-17",
      currency: "usd",
      usdInr: null,
    }),
    null
  );
});
