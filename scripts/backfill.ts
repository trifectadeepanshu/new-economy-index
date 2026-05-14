/**
 * Local backfill script — run with: npx tsx scripts/backfill.ts
 * Reads DATABASE_URL from .env.local and populates stock_snapshots + index_snapshots
 * from Jan 2022 to today.
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { parseISO, format, eachDayOfInterval } from "date-fns";

// Load .env.local manually
const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

import { neon } from "@neondatabase/serverless";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const YahooFinanceClass = require("yahoo-finance2").default;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const yf: any = new YahooFinanceClass({ suppressNotices: ["yahooSurvey"] });

import { COMPANIES } from "../lib/companies";

const DATABASE_URL = process.env.DATABASE_URL!;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not found in .env.local");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function ensureSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS index_snapshots (
      date          DATE PRIMARY KEY,
      value         DECIMAL(10, 4) NOT NULL,
      change_pct    DECIMAL(8, 4),
      num_companies INTEGER NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS stock_snapshots (
      date        DATE NOT NULL,
      ticker      VARCHAR(30) NOT NULL,
      close_price DECIMAL(12, 4) NOT NULL,
      change_pct  DECIMAL(8, 4),
      PRIMARY KEY (date, ticker)
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_stock_ticker_date
      ON stock_snapshots(ticker, date DESC)
  `;
  console.log("Schema ready.");
}

async function bulkUpsertStockRows(
  rows: { date: string; ticker: string; close: number }[]
) {
  if (!rows.length) return;
  // Insert in chunks of 500 rows at a time
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const dates = chunk.map((r) => r.date);
    const tickers = chunk.map((r) => r.ticker);
    const prices = chunk.map((r) => r.close);
    await sql`
      INSERT INTO stock_snapshots (date, ticker, close_price, change_pct)
      SELECT * FROM unnest(
        ${dates}::date[],
        ${tickers}::varchar[],
        ${prices}::decimal[],
        ${new Array(chunk.length).fill(null)}::decimal[]
      ) AS t(date, ticker, close_price, change_pct)
      ON CONFLICT (date, ticker) DO UPDATE
        SET close_price = EXCLUDED.close_price
    `;
  }
}

async function main() {
  await ensureSchema();

  const fromDate = new Date("2021-03-01");
  const toDate = new Date();

  const allPrices: Record<string, Record<string, number>> = {};
  const allRows: { date: string; ticker: string; close: number }[] = [];

  console.log(`Fetching historical data for ${COMPANIES.length} companies...`);

  for (let i = 0; i < COMPANIES.length; i++) {
    const company = COMPANIES[i];
    const effectiveFrom =
      company.listedDate > "2021-03-01" ? parseISO(company.listedDate) : fromDate;

    process.stdout.write(
      `  [${i + 1}/${COMPANIES.length}] ${company.ticker.padEnd(14)} `
    );

    try {
      const rows = await yf.historical(
        company.yfTicker,
        { period1: effectiveFrom, period2: toDate, interval: "1d" },
        { validateResult: false }
      );
      const filtered = (rows as any[]).filter(
        (r: any) => r.close !== null && r.close !== undefined
      );
      allPrices[company.ticker] = {};
      for (const r of filtered) {
        const dateStr = r.date.toISOString().slice(0, 10);
        allPrices[company.ticker][dateStr] = r.close;
        allRows.push({ date: dateStr, ticker: company.ticker, close: r.close });
      }
      console.log(`${filtered.length} days`);
    } catch (e: any) {
      console.log(`ERROR: ${e.message}`);
    }
  }

  console.log(`\nSaving ${allRows.length} stock rows to DB...`);
  await bulkUpsertStockRows(allRows);
  console.log("Stock rows saved.");

  // Build base prices (earliest close per ticker)
  const basePrices: Record<string, number> = {};
  for (const [ticker, dateMap] of Object.entries(allPrices)) {
    const sorted = Object.keys(dateMap).sort();
    if (sorted.length > 0) basePrices[ticker] = dateMap[sorted[0]];
  }

  // Compute index value for every calendar day that has data
  console.log("\nComputing index snapshots...");
  const days = eachDayOfInterval({ start: fromDate, end: toDate });
  let savedCount = 0;

  // Collect index rows for bulk insert
  const indexRows: { date: string; value: number; num: number }[] = [];

  for (const day of days) {
    const dateStr = format(day, "yyyy-MM-dd");
    const eligible = COMPANIES.filter(
      (c) =>
        c.listedDate <= dateStr &&
        basePrices[c.ticker] !== undefined &&
        allPrices[c.ticker]?.[dateStr] !== undefined
    );
    if (eligible.length < 3) continue;

    const avgRatio =
      eligible.reduce(
        (s, c) => s + allPrices[c.ticker][dateStr] / basePrices[c.ticker],
        0
      ) / eligible.length;

    indexRows.push({
      date: dateStr,
      value: Math.round(1000 * avgRatio * 10000) / 10000,
      num: eligible.length,
    });
    savedCount++;
  }

  // Bulk upsert index snapshots
  const CHUNK = 500;
  for (let i = 0; i < indexRows.length; i += CHUNK) {
    const chunk = indexRows.slice(i, i + CHUNK);
    const dates = chunk.map((r) => r.date);
    const values = chunk.map((r) => r.value);
    const nums = chunk.map((r) => r.num);
    await sql`
      INSERT INTO index_snapshots (date, value, change_pct, num_companies)
      SELECT * FROM unnest(
        ${dates}::date[],
        ${values}::decimal[],
        ${new Array(chunk.length).fill(null)}::decimal[],
        ${nums}::integer[]
      ) AS t(date, value, change_pct, num_companies)
      ON CONFLICT (date) DO UPDATE
        SET value = EXCLUDED.value,
            num_companies = EXCLUDED.num_companies
    `;
  }

  console.log(`\nDone! Saved ${savedCount} index snapshots.`);
  console.log(`Companies with data: ${Object.keys(basePrices).length}/${COMPANIES.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
