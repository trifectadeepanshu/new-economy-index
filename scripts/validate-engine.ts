/**
 * Dry-run the divisor engine against live DB data and report sanity checks.
 * Does NOT write anything. Run: npx tsx scripts/validate-engine.ts
 */
import { readFileSync } from "fs";
import { resolve } from "path";

const envContent = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
for (const line of envContent.split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

import { neon } from "@neondatabase/serverless";
import { COMPANIES, PORTFOLIO_TICKERS } from "../lib/companies";
import { computeIndexSeries, type DailyPrices } from "../lib/index-engine";

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  const priceRows = (await sql`
    SELECT date::text AS date, ticker, close_price::float AS close
    FROM stock_snapshots ORDER BY date ASC
  `) as { date: string; ticker: string; close: number }[];

  const shareRows = (await sql`
    SELECT DISTINCT ON (ticker) ticker, shares::float AS shares
    FROM share_counts ORDER BY ticker, quarter_end DESC
  `) as { ticker: string; shares: number }[];

  const prices: DailyPrices = new Map();
  for (const r of priceRows) {
    let m = prices.get(r.date);
    if (!m) prices.set(r.date, (m = new Map()));
    m.set(r.ticker, r.close);
  }
  const shares = new Map(shareRows.map((r) => [r.ticker, r.shares]));
  const members = COMPANIES.map((c) => ({ ticker: c.ticker, listedDate: c.listedDate }));

  const { points: series } = computeIndexSeries(prices, shares, members, { baseValue: 1000 });

  console.log(`Days computed: ${series.length}`);
  console.log(`Inception:  ${series[0]?.date} = ${series[0]?.value} (n=${series[0]?.numCompanies})`);
  console.log(`Latest:     ${series.at(-1)?.date} = ${series.at(-1)?.value} (n=${series.at(-1)?.numCompanies})`);

  // Constituent growth at each year-start
  console.log("\nConstituent count over time:");
  let lastN = -1;
  for (const p of series) {
    if (p.numCompanies !== lastN) {
      console.log(`  ${p.date}  n=${p.numCompanies}  value=${p.value}`);
      lastN = p.numCompanies;
    }
  }

  // Compare to stored index_snapshots on a few dates
  const sampleDates = ["2021-03-01", "2022-01-03", "2023-01-02", "2024-01-01", "2025-01-01", series.at(-1)!.date];
  const stored = (await sql`
    SELECT date::text AS date, value::float AS value FROM index_snapshots
    WHERE date = ANY(${sampleDates}::date[])
  `) as { date: string; value: number }[];
  const storedMap = new Map(stored.map((r) => [r.date, r.value]));
  const seriesMap = new Map(series.map((p) => [p.date, p.value]));
  console.log("\nNew engine vs stored (current live) index:");
  for (const d of sampleDates) {
    console.log(`  ${d}  new=${seriesMap.get(d) ?? "—"}   stored=${storedMap.get(d) ?? "—"}`);
  }

  // Portfolio sub-index sanity
  const portfolioMembers = members.filter((m) => PORTFOLIO_TICKERS.has(m.ticker));
  const { points: port } = computeIndexSeries(prices, shares, portfolioMembers, { baseValue: 1000 });
  console.log(`\nPortfolio sub-index: ${port[0]?.date}=${port[0]?.value} → ${port.at(-1)?.date}=${port.at(-1)?.value} (n=${port.at(-1)?.numCompanies})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
