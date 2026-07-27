/**
 * Backfill daily benchmark index history — run: npx tsx scripts/backfill-benchmarks.ts
 * Populates benchmark_prices from Yahoo for the configured benchmarks (Nifty
 * 500), from the index base through today. Rebasing happens at read time.
 */
import { readFileSync } from "fs";
import { resolve } from "path";

for (const line of readFileSync(resolve(process.cwd(), ".env.local"), "utf-8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

import { neon } from "@neondatabase/serverless";
import { BENCHMARKS } from "../lib/benchmarks";

const sql = neon(process.env.DATABASE_URL!);

async function fetchDaily(yfSymbol: string): Promise<{ date: string; close: number }[]> {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfSymbol)}` +
    `?period1=1606694400&period2=1790000000&interval=1d`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as {
    chart: { result: Array<{ timestamp: number[]; indicators: { quote: Array<{ close: (number | null)[] }> } }> };
  };
  const r = json.chart.result[0];
  const out: { date: string; close: number }[] = [];
  r.timestamp.forEach((t, i) => {
    const c = r.indicators.quote[0].close[i];
    if (c != null && Number.isFinite(c)) {
      out.push({ date: new Date(t * 1000).toISOString().slice(0, 10), close: Math.round(c * 100) / 100 });
    }
  });
  return out;
}

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS benchmark_prices (
      symbol VARCHAR(24) NOT NULL,
      date   DATE NOT NULL,
      close  NUMERIC(14, 2) NOT NULL,
      PRIMARY KEY (symbol, date)
    )
  `;

  for (const b of BENCHMARKS) {
    const rows = await fetchDaily(b.yf);
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      await sql`
        INSERT INTO benchmark_prices (symbol, date, close)
        SELECT * FROM unnest(
          ${chunk.map(() => b.symbol)}::varchar[],
          ${chunk.map((r) => r.date)}::date[],
          ${chunk.map((r) => r.close)}::numeric[]
        ) AS t(symbol, date, close)
        ON CONFLICT (symbol, date) DO UPDATE SET close = EXCLUDED.close
      `;
    }
    console.log(`${b.symbol} (${b.yf}): ${rows.length} rows (${rows[0]?.date} → ${rows.at(-1)?.date})`);
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
