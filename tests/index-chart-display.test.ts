import assert from "node:assert/strict";
import test from "node:test";
import {
  getDisplayChartRows,
  getSeriesReturn,
} from "../components/index-chart/data";
import type { ChartRow } from "../components/index-chart/types";

const maxRows: ChartRow[] = [
  { date: "2020-12-31", label: "Dec '20", value: 1000, TRIFECTA: 1000, NIFTY50: 1000 },
  { date: "2021-01-01", label: "Jan '21", value: 1010, TRIFECTA: 1005, NIFTY50: 1001 },
  { date: "now", label: "Now", value: 2000, TRIFECTA: 2500, NIFTY50: 1715.5 },
];

test("MAX chart display starts in January 2021 without mutating raw return rows", () => {
  const displayRows = getDisplayChartRows(maxRows, "MAX");

  assert.equal(displayRows[0].date, "2021-01-01");
  assert.equal(displayRows.at(-1)?.date, "now");
  assert.equal(maxRows[0].date, "2020-12-31");
  assert.equal(getSeriesReturn(maxRows, "value"), 100);
  assert.equal(getSeriesReturn(maxRows, "TRIFECTA"), 150);
});

test("non-MAX chart ranges keep their original display rows", () => {
  assert.equal(getDisplayChartRows(maxRows, "1Y"), maxRows);
  assert.equal(getDisplayChartRows(maxRows, "CUSTOM"), maxRows);
});
