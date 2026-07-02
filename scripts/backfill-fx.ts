/**
 * Backfill daily USD/INR rates — run: npx tsx scripts/backfill-fx.ts
 * Populates fx_rates from Yahoo (USDINR=X) from the index base date to today.
 */
import { readFileSync } from "fs";
import { resolve } from "path";

for (const line of readFileSync(resolve(process.cwd(), ".env.local"), "utf-8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

async function main() {
  await sql`CREATE TABLE IF NOT EXISTS fx_rates (date DATE PRIMARY KEY, rate NUMERIC(10,4) NOT NULL)`;

  const res = await fetch(
    "https://query1.finance.yahoo.com/v8/finance/chart/USDINR=X?period1=1606694400&period2=1790000000&interval=1d",
    { headers: { "User-Agent": "Mozilla/5.0" } }
  );
  const json = (await res.json()) as {
    chart: { result: Array<{ timestamp: number[]; indicators: { quote: Array<{ close: (number | null)[] }> } }> };
  };
  const r = json.chart.result[0];
  const rows: { date: string; rate: number }[] = [];
  r.timestamp.forEach((t, i) => {
    const c = r.indicators.quote[0].close[i];
    if (c != null && Number.isFinite(c)) {
      rows.push({ date: new Date(t * 1000).toISOString().slice(0, 10), rate: Math.round(c * 10000) / 10000 });
    }
  });

  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    await sql`
      INSERT INTO fx_rates (date, rate)
      SELECT * FROM unnest(${chunk.map((x) => x.date)}::date[], ${chunk.map((x) => x.rate)}::numeric[])
        AS t(date, rate)
      ON CONFLICT (date) DO UPDATE SET rate = EXCLUDED.rate
    `;
  }
  console.log(`fx_rates: ${rows.length} rows (${rows[0]?.date} → ${rows.at(-1)?.date}, latest ${rows.at(-1)?.rate})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
