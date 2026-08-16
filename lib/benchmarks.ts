/**
 * Benchmark indices overlaid on the main chart, rebased to 1,000 at the index
 * anchor date so they're directly comparable to the NEI.
 */
import { INDEX_ANCHOR_DATE, INDEX_BASE_VALUE } from "@/lib/companies";
import type { BenchmarkKey, BenchmarkSeries } from "@/lib/index-api";
import { getReadSql, getWriteSql } from "@/lib/db-connection";

export const BENCHMARKS: { symbol: BenchmarkKey; label: string; yf: string }[] = [
  { symbol: "NIFTY50", label: "Nifty 50", yf: "^NSEI" },
  { symbol: "NIFTY500", label: "Nifty 500", yf: "^CRSLDX" },
];

/**
 * Load each benchmark, rebase to INDEX_BASE_VALUE at the first close on/after the
 * anchor date, and slice to [fromDate, toDate].
 */
export async function getBenchmarkSeries(fromDate: string, toDate: string): Promise<BenchmarkSeries[]> {
  const sql = getReadSql();
  const rows = (await sql`
    SELECT symbol, date::text AS date, close::float AS close
    FROM benchmark_prices
    WHERE date >= ${INDEX_ANCHOR_DATE} AND date <= ${toDate}
    ORDER BY symbol, date ASC
  `) as { symbol: string; date: string; close: number }[];

  const bySymbol = new Map<string, { date: string; close: number }[]>();
  for (const r of rows) {
    let arr = bySymbol.get(r.symbol);
    if (!arr) bySymbol.set(r.symbol, (arr = []));
    arr.push({ date: String(r.date), close: Number(r.close) });
  }

  const out: BenchmarkSeries[] = [];
  for (const b of BENCHMARKS) {
    const series = bySymbol.get(b.symbol);
    if (!series || !series.length) continue;
    const anchorClose = series[0].close; // first row is on/after the anchor date
    if (!(anchorClose > 0)) continue;
    const points = series
      .filter((p) => p.date >= fromDate && p.date <= toDate)
      .map((p) => ({ date: p.date, value: Math.round((INDEX_BASE_VALUE * p.close) / anchorClose * 100) / 100 }));
    out.push({ symbol: b.symbol, label: b.label, points });
  }
  return out;
}

/** Record (or update) today's close for a benchmark (used by the cron). */
export async function upsertBenchmarkClose(symbol: BenchmarkKey, date: string, close: number): Promise<void> {
  const sql = getWriteSql();
  await sql`
    INSERT INTO benchmark_prices (symbol, date, close) VALUES (${symbol}, ${date}, ${close})
    ON CONFLICT (symbol, date) DO UPDATE SET close = EXCLUDED.close
  `;
}
