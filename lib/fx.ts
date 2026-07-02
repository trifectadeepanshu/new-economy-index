/**
 * USD/INR foreign-exchange helpers.
 *
 * The index and all monetary values are computed in INR and converted to USD at
 * read time. Because the FX rate is the same across every company on a given
 * day, the USD index is simply:
 *     index_usd(t) = index_inr(t) × baseRate / rate(t)
 * where baseRate is USD/INR on the index base date. Market caps and prices are
 * converted by dividing INR by the (live or daily) rate.
 */

import { neon } from "@neondatabase/serverless";
import { INDEX_BASE_DATE } from "@/lib/companies";

const LIVE_TTL_MS = 15 * 60 * 1000; // refresh the live rate every 15 minutes
const FALLBACK_RATE = 83; // last-resort if nothing is available

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL env var is not set");
  return neon(url);
}

export type FxRates = {
  /** date (yyyy-mm-dd) -> USD/INR, ascending. */
  points: { date: string; rate: number }[];
  baseRate: number;
};

/** Load stored daily USD/INR rates and resolve the base-date rate. */
export async function getFxRates(): Promise<FxRates> {
  const sql = getSql();
  const rows = (await sql`
    SELECT date::text AS date, rate::float AS rate FROM fx_rates ORDER BY date ASC
  `) as { date: string; rate: number }[];
  const points = rows.map((r) => ({ date: String(r.date), rate: Number(r.rate) }));
  return { points, baseRate: rateAsOf(points, INDEX_BASE_DATE) ?? points[0]?.rate ?? FALLBACK_RATE };
}

/** Record (or update) the USD/INR rate for a given date. */
export async function upsertFxRate(date: string, rate: number): Promise<void> {
  const sql = getSql();
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

/** Convert an INR index level to USD: inr × baseRate / rate(date). */
export function toUsdIndex(inr: number, rateForDate: number, baseRate: number): number {
  return rateForDate > 0 ? (inr * baseRate) / rateForDate : inr;
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
