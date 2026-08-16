import assert from "node:assert/strict";
import test from "node:test";
import { buildHistoryRequest } from "../components/index-chart/useChartHistory";
import { resolveHistoryWindow } from "../lib/index-history-window";

const TODAY = "2026-08-16";

function resolvePreset(requestedRange: string) {
  return resolveHistoryWindow({
    requestedRange,
    fromParam: null,
    toParam: null,
    todayDate: TODAY,
  });
}

test("1W resolves to an inclusive seven-day window", () => {
  const result = resolvePreset("1W");
  assert.deepEqual(result, {
    ok: true,
    window: {
      range: "1W",
      fromDate: "2026-08-09",
      toDate: TODAY,
      isCustom: false,
    },
  });
});

test("1M resolves by calendar month", () => {
  const result = resolvePreset("1M");
  assert.equal(result.ok && result.window.fromDate, "2026-07-16");
  assert.equal(result.ok && result.window.toDate, TODAY);
});

test("1Y resolves by calendar year", () => {
  const result = resolvePreset("1Y");
  assert.equal(result.ok && result.window.fromDate, "2025-08-16");
  assert.equal(result.ok && result.window.toDate, TODAY);
});

test("Max resolves from the index anchor through today", () => {
  const result = resolvePreset("ALL");
  assert.equal(result.ok && result.window.fromDate, "2020-12-31");
  assert.equal(result.ok && result.window.toDate, TODAY);
});

test("1Y handles leap-day subtraction", () => {
  const result = resolveHistoryWindow({
    requestedRange: "1Y",
    fromParam: null,
    toParam: null,
    todayDate: "2024-02-29",
  });
  assert.equal(result.ok && result.window.fromDate, "2023-02-28");
});

test("Custom uses the exact selected dates and reports an ALL payload range", () => {
  const result = resolveHistoryWindow({
    requestedRange: "1Y",
    fromParam: "2024-03-01",
    toParam: "2024-05-31",
    todayDate: TODAY,
  });
  assert.deepEqual(result, {
    ok: true,
    window: {
      range: "ALL",
      fromDate: "2024-03-01",
      toDate: "2024-05-31",
      isCustom: true,
    },
  });
});

test("Custom orders reversed endpoints", () => {
  const result = resolveHistoryWindow({
    requestedRange: "1Y",
    fromParam: "2025-12-31",
    toParam: "2025-01-01",
    todayDate: TODAY,
  });
  assert.equal(result.ok && result.window.fromDate, "2025-01-01");
  assert.equal(result.ok && result.window.toDate, "2025-12-31");
});

test("Custom clamps dates before inception", () => {
  const result = resolveHistoryWindow({
    requestedRange: "1Y",
    fromParam: "2018-01-01",
    toParam: "2019-01-01",
    todayDate: TODAY,
  });
  assert.equal(result.ok && result.window.fromDate, "2020-12-31");
  assert.equal(result.ok && result.window.toDate, "2020-12-31");
});

test("Custom clamps future dates to today", () => {
  const result = resolveHistoryWindow({
    requestedRange: "1Y",
    fromParam: "2027-01-01",
    toParam: "2028-01-01",
    todayDate: TODAY,
  });
  assert.equal(result.ok && result.window.fromDate, TODAY);
  assert.equal(result.ok && result.window.toDate, TODAY);
});

test("Custom rejects an incomplete endpoint pair", () => {
  const result = resolveHistoryWindow({
    requestedRange: "1Y",
    fromParam: "2025-01-01",
    toParam: null,
    todayDate: TODAY,
  });
  assert.equal(result.ok, false);
});

test("Custom rejects impossible calendar dates", () => {
  const result = resolveHistoryWindow({
    requestedRange: "1Y",
    fromParam: "2026-02-30",
    toParam: "2026-03-01",
    todayDate: TODAY,
  });
  assert.equal(result.ok, false);
});

test("Preset requests reject unknown ranges", () => {
  assert.equal(resolvePreset("2Y").ok, false);
});

test("1W control requests the 1W API range", () => {
  const request = buildHistoryRequest("1W", null);
  assert.equal(new URL(request.url, "https://test.local").searchParams.get("range"), "1W");
});

test("1M control requests the 1M API range", () => {
  const request = buildHistoryRequest("1M", null);
  assert.equal(new URL(request.url, "https://test.local").searchParams.get("range"), "1M");
});

test("1Y control requests the 1Y API range", () => {
  const request = buildHistoryRequest("1Y", null);
  assert.equal(new URL(request.url, "https://test.local").searchParams.get("range"), "1Y");
});

test("Max control requests all available history", () => {
  const request = buildHistoryRequest("MAX", null);
  assert.equal(new URL(request.url, "https://test.local").searchParams.get("range"), "ALL");
});

test("Custom control sends both selected endpoints", () => {
  const request = buildHistoryRequest("CUSTOM", {
    from: "2024-03-01",
    to: "2024-05-31",
  });
  const params = new URL(request.url, "https://test.local").searchParams;
  assert.equal(params.get("from"), "2024-03-01");
  assert.equal(params.get("to"), "2024-05-31");
  assert.equal(params.get("range"), null);
});
