import assert from "node:assert/strict";
import test from "node:test";
import { buildHeroSeries, type HeroSparkPoint } from "../components/index-dashboard/heroSeries";

const history: HeroSparkPoint[] = [
  { date: "2026-07-27", value: 1000 },
  { date: "2026-07-28", value: 1100 },
];

test("hero sparkline appends live value when history ends before today", () => {
  assert.deepEqual(buildHeroSeries(history, 1125, "2026-07-29"), [1000, 1100, 1125]);
});

test("hero sparkline replaces today's history point with live value", () => {
  const todayHistory: HeroSparkPoint[] = [
    ...history,
    { date: "2026-07-29", value: 1110 },
  ];

  assert.deepEqual(buildHeroSeries(todayHistory, 1125, "2026-07-29"), [1000, 1100, 1125]);
});

test("hero sparkline does not add a duplicate endpoint when values match", () => {
  const todayHistory: HeroSparkPoint[] = [
    ...history,
    { date: "2026-07-29", value: 1125 },
  ];

  assert.deepEqual(buildHeroSeries(todayHistory, 1125, "2026-07-29"), [1000, 1100, 1125]);
});

test("hero sparkline can fall back to base plus live value before history loads", () => {
  assert.deepEqual(buildHeroSeries([], 1125, "2026-07-29"), [1000, 1125]);
});
