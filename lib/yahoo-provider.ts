/**
 * Yahoo Finance data provider — the single source for onboarding a constituent
 * and refreshing data going forward. Kept behind one module so the source can
 * later be swapped (broker API / EODHD) without touching the onboarding flow.
 *
 * Prices, point-in-time shares, and financials use Yahoo's undocumented chart
 * and fundamentals-timeseries endpoints; profile + analyst use yahoo-finance2
 * (which handles crumb auth). All unofficial — see the reliability caveats.
 */
import { round } from "@/lib/index-math";

const UA = { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" as const };

// eslint-disable-next-line @typescript-eslint/no-require-imports
const YahooFinanceClass = require("yahoo-finance2").default;
const yf = (() => {
  try {
    return new YahooFinanceClass({ suppressNotices: ["yahooSurvey"] });
  } catch {
    return YahooFinanceClass;
  }
})();

// ---------------------------------------------------------------------------
// Daily prices (chart API)
// ---------------------------------------------------------------------------

export type DailyClose = { date: string; close: number };

/** Split-adjusted daily closes from the index base (2020-12) through today. */
export async function fetchDailyPrices(yfTicker: string): Promise<DailyClose[]> {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfTicker)}` +
    `?period1=1606780800&period2=1900000000&interval=1d`;
  const res = await fetch(url, UA);
  if (!res.ok) throw new Error(`chart HTTP ${res.status}`);
  const json = (await res.json()) as {
    chart?: { result?: Array<{ timestamp?: number[]; indicators?: { quote?: Array<{ close?: (number | null)[] }> } }> };
  };
  const r = json.chart?.result?.[0];
  const ts = r?.timestamp ?? [];
  const closes = r?.indicators?.quote?.[0]?.close ?? [];
  const out: DailyClose[] = [];
  for (let i = 0; i < ts.length; i++) {
    const c = closes[i];
    if (c == null || !(c > 0)) continue;
    out.push({ date: new Date(ts[i] * 1000).toISOString().slice(0, 10), close: c });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Point-in-time shares (fundamentals-timeseries, paged backward)
// ---------------------------------------------------------------------------

export type SharePoint = { asOf: string; shares: number };

// Yahoo caps ~4 periods per request and returns the most recent window, so page
// backward to collect the full available point-in-time share history (FY2022+).
const SHARE_WINDOWS: [number, number][] = [
  [1420070400, 1530316800], // 2015 → 2018-06
  [1514764800, 1625011200], // 2018 → 2021-06
  [1609459200, 1719705600], // 2021 → 2024-06
  [1704067200, 1893456000], // 2024 → 2030
];
const SHARE_TYPES =
  "annualOrdinarySharesNumber,quarterlyOrdinarySharesNumber,annualShareIssued,quarterlyShareIssued";

export async function fetchPointInTimeShares(yfTicker: string): Promise<SharePoint[]> {
  const byDate = new Map<string, number>();
  for (const [p1, p2] of SHARE_WINDOWS) {
    try {
      const url =
        `https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${yfTicker}` +
        `?symbol=${yfTicker}&type=${SHARE_TYPES}&period1=${p1}&period2=${p2}`;
      const res = await fetch(url, UA);
      if (!res.ok) continue;
      const json = (await res.json()) as { timeseries?: { result?: Array<Record<string, unknown>> } };
      for (const block of json.timeseries?.result ?? []) {
        const type = (block.meta as { type?: string[] } | undefined)?.type?.[0];
        if (!type) continue;
        for (const pt of (block[type] as Array<Record<string, unknown>> | undefined) ?? []) {
          const asOf = pt?.asOfDate as string | undefined;
          const raw = (pt?.reportedValue as { raw?: number } | undefined)?.raw;
          if (asOf && typeof raw === "number" && raw > 0 && !byDate.has(asOf)) byDate.set(asOf, raw);
        }
      }
    } catch {
      /* skip window */
    }
  }
  return [...byDate.entries()]
    .map(([asOf, shares]) => ({ asOf, shares }))
    .sort((a, b) => a.asOf.localeCompare(b.asOf));
}

// ---------------------------------------------------------------------------
// Quarterly financials (fundamentals-timeseries)
// ---------------------------------------------------------------------------

export type FinancialRow = {
  period: string;
  revenue: number | null;
  ebitda: number | null;
  pat: number | null;
  assets: number | null;
};

const QUARTERLY_FIN_TYPES =
  "quarterlyTotalRevenue,quarterlyEBITDA,quarterlyNetIncome,quarterlyTotalAssets";

export async function fetchQuarterlyFinancials(yfTicker: string): Promise<FinancialRow[]> {
  const url =
    `https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${yfTicker}` +
    `?symbol=${yfTicker}&type=${QUARTERLY_FIN_TYPES}&period1=1420070400&period2=1900000000`;
  const res = await fetch(url, UA);
  if (!res.ok) throw new Error(`fundamentals HTTP ${res.status}`);
  const json = (await res.json()) as { timeseries?: { result?: Array<Record<string, unknown>> } };
  const byPeriod = new Map<string, FinancialRow>();
  const key = (metric: string): "revenue" | "ebitda" | "pat" | "assets" =>
    metric.includes("Revenue") ? "revenue" : metric.includes("EBITDA") ? "ebitda" : metric.includes("NetIncome") ? "pat" : "assets";
  for (const block of json.timeseries?.result ?? []) {
    const type = (block.meta as { type?: string[] } | undefined)?.type?.[0];
    if (!type) continue;
    for (const pt of (block[type] as Array<Record<string, unknown>> | undefined) ?? []) {
      const period = pt?.asOfDate as string | undefined;
      const raw = (pt?.reportedValue as { raw?: number } | undefined)?.raw;
      if (!period || typeof raw !== "number") continue;
      const row = byPeriod.get(period) ?? { period, revenue: null, ebitda: null, pat: null, assets: null };
      row[key(type)] = raw;
      byPeriod.set(period, row);
    }
  }
  return [...byPeriod.values()].sort((a, b) => a.period.localeCompare(b.period));
}

// ---------------------------------------------------------------------------
// Profile + analyst + current shares (yahoo-finance2 quoteSummary)
// ---------------------------------------------------------------------------

export type AnalystInput = {
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
  ratingKey: string | null;
  numAnalysts: number | null;
};

export type CompanyMeta = {
  description: string | null;
  analyst: AnalystInput | null;
  currentShares: number | null;
};

export async function fetchCompanyMeta(yfTicker: string): Promise<CompanyMeta> {
  const s = await yf.quoteSummary(
    yfTicker,
    { modules: ["assetProfile", "recommendationTrend", "financialData", "defaultKeyStatistics"] },
    { validateResult: false }
  );
  const trend = s.recommendationTrend?.trend?.[0];
  const fd = s.financialData;
  const analyst: AnalystInput | null = trend
    ? {
        strongBuy: trend.strongBuy ?? 0,
        buy: trend.buy ?? 0,
        hold: trend.hold ?? 0,
        sell: trend.sell ?? 0,
        strongSell: trend.strongSell ?? 0,
        ratingKey: fd?.recommendationKey ?? null,
        numAnalysts: fd?.numberOfAnalystOpinions ?? null,
      }
    : null;
  return {
    description: s.assetProfile?.longBusinessSummary ?? null,
    analyst,
    currentShares: s.defaultKeyStatistics?.sharesOutstanding ?? null,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Day-over-day % change to 6 dp, matching the workbook import precision. */
export function changePct(current: number, previous: number | null): number | null {
  return previous != null && previous !== 0 ? round((current / previous - 1) * 100, 6) : null;
}

/** Calendar day before an ISO date (yyyy-mm-dd) — used to place the IPO seed. */
export function previousDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
