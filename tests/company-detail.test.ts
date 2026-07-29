import assert from "node:assert/strict";
import test from "node:test";
import {
  buildQuarterlyFinancials,
  completeQuarterlyFinancialRows,
  quarterLabel,
} from "../lib/company-detail";

test("quarter labels follow Indian fiscal-year quarters", () => {
  assert.equal(quarterLabel("2025-03-31"), "Q4 FY25");
  assert.equal(quarterLabel("2025-06-30"), "Q1 FY26");
  assert.equal(quarterLabel("2025-09-30"), "Q2 FY26");
  assert.equal(quarterLabel("2025-12-31"), "Q3 FY26");
});

test("quarterly financials calculate same-quarter YoY growth", () => {
  const financials = buildQuarterlyFinancials([
    { period: "2025-03-31", revenue: 100, ebitda: 20, pat: 10, total_assets: 1000 },
    { period: "2025-06-30", revenue: 110, ebitda: 22, pat: 11, total_assets: null },
    { period: "2025-09-30", revenue: 120, ebitda: 24, pat: 12, total_assets: null },
    { period: "2025-12-31", revenue: 130, ebitda: 26, pat: 13, total_assets: null },
    { period: "2026-03-31", revenue: 150, ebitda: 45, pat: 15, total_assets: 1600 },
  ]);

  assert.equal(financials.at(-1)?.label, "Q4 FY26");
  assert.equal(financials.at(-1)?.revenueGrowth, 50);
});

test("asset turnover is TTM revenue over latest available assets", () => {
  const financials = buildQuarterlyFinancials([
    { period: "2025-03-31", revenue: 100, ebitda: null, pat: null, total_assets: 1000 },
    { period: "2025-06-30", revenue: 110, ebitda: null, pat: null, total_assets: null },
    { period: "2025-09-30", revenue: 120, ebitda: null, pat: null, total_assets: null },
    { period: "2025-12-31", revenue: 130, ebitda: null, pat: null, total_assets: null },
    { period: "2026-03-31", revenue: 150, ebitda: null, pat: null, total_assets: 1600 },
  ]);

  // Q3 FY26: TTM revenue 100+110+120+130 = 460 over assets 1000 = 0.46
  assert.equal(financials[3].assetTurnover, 0.46);
  // Q4 FY26: TTM revenue 110+120+130+150 = 510 over assets 1600 = 0.32
  assert.equal(financials[4].assetTurnover, 0.32);
});

test("missing quarterly P&L can be derived from annual minus reported quarters", () => {
  const rows = completeQuarterlyFinancialRows(
    [
      { period: "2025-06-30", revenue: 110, ebitda: 22, pat: 11, total_assets: null },
      { period: "2025-12-31", revenue: 130, ebitda: 26, pat: 13, total_assets: null },
      { period: "2026-03-31", revenue: 150, ebitda: 45, pat: 15, total_assets: null },
    ],
    [
      { period: "2026-03-31", revenue: 500, ebitda: 100, pat: 50, total_assets: 1600 },
    ]
  );

  const q2 = rows.find((row) => row.period === "2025-09-30");
  assert.equal(q2?.revenue, 110);
  assert.equal(q2?.ebitda, 7);
  assert.equal(q2?.pat, 11);
  assert.equal(rows.find((row) => row.period === "2026-03-31")?.total_assets, 1600);
});

test("quarterly financials preserve visible slots when a quarter has no data", () => {
  const financials = buildQuarterlyFinancials([
    { period: "2025-06-30", revenue: 110, ebitda: null, pat: null, total_assets: null },
    { period: "2025-12-31", revenue: 130, ebitda: null, pat: null, total_assets: null },
  ]);

  assert.deepEqual(
    financials.map((row) => row.label),
    ["Q1 FY26", "Q2 FY26", "Q3 FY26"]
  );
  assert.equal(financials[1].revenue, null);
});
