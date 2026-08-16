/**
 * USD/INR foreign-exchange helpers.
 *
 * The index LEVEL is a unitless number (like Nifty) — the same value in any
 * currency — so it is never FX-converted. Only monetary quantities convert:
 * prices and market caps are shown in USD by dividing the INR value by the
 * (live or daily) USD/INR rate. `baseRate` (USD/INR on the index base date) is
 * kept only as a sensible fallback when the live rate is unavailable.
 */

import { INDEX_BASE_DATE } from "@/lib/companies";
import { getReadSql, getWriteSql } from "@/lib/db-connection";

const LIVE_TTL_MS = 15 * 60 * 1000; // refresh the live rate every 15 minutes
const FALLBACK_RATE = 83; // last-resort if nothing is available

export type FxRates = {
  /** date (yyyy-mm-dd) -> USD/INR, ascending. */
  points: { date: string; rate: number }[];
  baseRate: number;
};

/** Load stored daily USD/INR rates and resolve the base-date rate. */
export async function getFxRates(): Promise<FxRates> {
  const sql = getReadSql();
  const rows = (await sql`
    SELECT date::text AS date, rate::float AS rate FROM fx_rates ORDER BY date ASC
  `) as { date: string; rate: number }[];
  const points = rows.map((r) => ({ date: String(r.date), rate: Number(r.rate) }));
  return { points, baseRate: rateAsOf(points, INDEX_BASE_DATE) ?? points[0]?.rate ?? FALLBACK_RATE };
}

/** Record (or update) the USD/INR rate for a given date. */
export async function upsertFxRate(date: string, rate: number): Promise<void> {
  const sql = getWriteSql();
  await sql`
    INSERT INTO fx_rates (date, rate) VALUES (${date}, ${rate})
    ON CONFLICT (date) DO UPDATE SET rate = EXCLUDED.rate
  `;
}

/** USD/INR on the latest date on/before `date` (carry-forward). */
export function rateAsOf(points: { date: string; rate: number }[], date: string): number | null {
  let val: number | null = null;
  for (const p of points) {
    if (p.date <= date) val = p.rate;
    else break;
  }
  return val ?? (points.length ? points[0].rate : null);
}

let liveCache: { rate: number; at: number } | null = null;

/** Live USD/INR from Yahoo, cached for 15 minutes; falls back to the last DB rate. */
export async function fetchLiveUsdInr(fallback: number): Promise<number> {
  const now = Date.now();
  if (liveCache && now - liveCache.at < LIVE_TTL_MS) return liveCache.rate;
  try {
    const res = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/USDINR=X?range=1d&interval=1d",
      { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as {
      chart?: { result?: Array<{ meta?: { regularMarketPrice?: number } }> };
    };
    const rate = json.chart?.result?.[0]?.meta?.regularMarketPrice;
    if (typeof rate === "number" && rate > 0) {
      liveCache = { rate, at: now };
      return rate;
    }
    throw new Error("no rate in response");
  } catch {
    return fallback;
  }
}
