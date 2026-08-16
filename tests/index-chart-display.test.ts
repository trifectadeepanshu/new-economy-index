import assert from "node:assert/strict";
import test from "node:test";
import { getAxisTicks, getSeriesReturn } from "../components/index-chart/data";
import { buildIndexChartData } from "../components/index-chart/useIndexChartModel";
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

test("axis ticks use unique dates while displaying de-duped labels", () => {
  const rows: ChartRow[] = [
    { date: "2026-01-01", label: "Jan '26", value: 100 },
    { date: "2026-01-02", label: "Jan '26", value: 101 },
    { date: "2026-02-02", label: "Feb '26", value: 102 },
    { date: "now", label: "Now", value: 103 },
  ];

  assert.deepEqual(getAxisTicks(rows), ["2026-01-01", "2026-02-02", "now"]);
});

test("past custom windows do not append today's live point", () => {
  const rows = buildIndexChartData({
    historyData: [
      { date: "2024-01-02", value: 1000 },
      { date: "2024-01-03", value: 1010 },
    ],
    portfolioData: [],
    benchmarks: [],
    liveValue: 1500,
    shortDayIndex: true,
    includeLivePoint: false,
    todayDate: "2026-08-16",
  });

  assert.equal(rows.at(-1)?.date, "2024-01-03");
  assert.equal(rows.at(-1)?.value, 1010);
});

test("overlays rebase to their first shared NEI date", () => {
  const rows = buildIndexChartData({
    historyData: [
      { date: "2026-01-01", value: 1000 },
      { date: "2026-01-02", value: 1200 },
      { date: "2026-01-03", value: 1300 },
    ],
    portfolioData: [],
    benchmarks: [
      {
        symbol: "NIFTY50",
        label: "Nifty 50",
        points: [
          { date: "2026-01-02", value: 200 },
          { date: "2026-01-03", value: 220 },
        ],
      },
    ],
    liveValue: null,
    shortDayIndex: true,
    includeLivePoint: false,
    todayDate: "2026-01-03",
  });

  assert.equal(rows[1].NIFTY50, 1200);
  assert.equal(rows[2].NIFTY50, 1320);
});

test("live point carries the last available overlay value forward", () => {
  const rows = buildIndexChartData({
    historyData: [
      { date: "2026-01-01", value: 1000 },
      { date: "2026-01-02", value: 1100 },
    ],
    portfolioData: [],
    benchmarks: [
      {
        symbol: "NIFTY50",
        label: "Nifty 50",
        points: [{ date: "2026-01-01", value: 100 }],
      },
    ],
    liveValue: 1200,
    shortDayIndex: true,
    includeLivePoint: true,
    todayDate: "2026-01-03",
  });

  assert.equal(rows.at(-1)?.date, "now");
  assert.equal(rows.at(-1)?.NIFTY50, 1000);
});
