import assert from "node:assert/strict";
import test from "node:test";
import { getSeriesReturn } from "../components/index-chart/data";
import type { ChartRow } from "../components/index-chart/types";

// Max runs from the base (1,000 at inception) through the live "now" point, so
// its return is the true since-inception figure — matching the hero card.
const maxRows: ChartRow[] = [
  { date: "2020-12-31", label: "Dec '20", value: 1000, TRIFECTA: 1000, NIFTY50: 1000 },
  { date: "2021-01-20", label: "Jan '21", value: 1083, TRIFECTA: 1200, NIFTY50: 1050 },
  { date: "now", label: "Now", value: 2000, TRIFECTA: 2500, NIFTY50: 1715.5 },
];

test("getSeriesReturn is first→last percent for each series", () => {
  assert.equal(getSeriesReturn(maxRows, "value"), 100); // 1000 → 2000
  assert.equal(getSeriesReturn(maxRows, "TRIFECTA"), 150); // 1000 → 2500
  assert.equal(getSeriesReturn(maxRows, "NIFTY50"), 71.55); // 1000 → 1715.5
});

test("getSeriesReturn ignores missing/non-numeric points at the edges", () => {
  const rows: ChartRow[] = [
    { date: "a", label: "a", value: 100 },
    { date: "b", label: "b", value: 150 },
  ];
  assert.equal(getSeriesReturn(rows, "TRIFECTA"), null); // no such series
  assert.equal(getSeriesReturn(rows, "value"), 50);
});
