/**
 * Local backfill script — run with: npx tsx scripts/backfill.ts
 * Reads DATABASE_URL from .env.local and populates stock_snapshots + index_snapshots
 * from the index inception date to today.
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { parseISO } from "date-fns";

// Load .env.local manually
const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

import { neon } from "@neondatabase/serverless";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const YahooFinanceClass = require("yahoo-finance2").default as YahooFinanceConstructor;
const yf = new YahooFinanceClass({ suppressNotices: ["yahooSurvey"] });

import { COMPANIES } from "../lib/companies";

interface YahooHistoricalRow {
  date: Date | string | number;
  close?: number | null;
}

interface YahooFinanceClient {
  historical(
    yfTicker: string,
    queryOptions: { period1: Date; period2: Date; interval: "1d" },
    moduleOptions?: { validateResult?: boolean }
  ): Promise<YahooHistoricalRow[]>;
}

type YahooFinanceConstructor = new (options?: {
  suppressNotices?: string[];
}) => YahooFinanceClient;

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

  const fromDate = new Date("2020-12-31");
  const toDate = new Date();

  const allPrices: Record<string, Record<string, number>> = {};
  const allRows: { date: string; ticker: string; close: number }[] = [];

  console.log(`Fetching historical data for ${COMPANIES.length} companies...`);

  for (let i = 0; i < COMPANIES.length; i++) {
    const company = COMPANIES[i];
    const effectiveFrom =
      company.listedDate > "2020-12-31" ? parseISO(company.listedDate) : fromDate;

    process.stdout.write(
      `  [${i + 1}/${COMPANIES.length}] ${company.ticker.padEnd(14)} `
    );

    try {
      const rows = await yf.historical(
        company.yfTicker,
        { period1: effectiveFrom, period2: toDate, interval: "1d" },
        { validateResult: false }
      );
      const filtered = rows.filter(
        (r): r is YahooHistoricalRow & { close: number } =>
          typeof r.close === "number" && Number.isFinite(r.close)
      );
      allPrices[company.ticker] = {};
      for (const r of filtered) {
        const dateStr = new Date(r.date).toISOString().slice(0, 10);
        allPrices[company.ticker][dateStr] = r.close;
        allRows.push({ date: dateStr, ticker: company.ticker, close: r.close });
      }
      console.log(`${filtered.length} days`);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      console.log(`ERROR: ${message}`);
    }
  }

  console.log(`\nSaving ${allRows.length} stock rows to DB...`);
  await bulkUpsertStockRows(allRows);
  console.log("Stock rows saved.");

  // Recompute and persist the market-cap-weighted divisor index from all
  // stored closes (requires share_counts — run backfill-shares.ts first).
  console.log("\nRecomputing divisor index snapshots...");
  const { recomputeAndPersistIndex } = await import("../lib/db");
  const result = await recomputeAndPersistIndex();

  console.log(
    `\nDone! Index latest: ${result.latestDate} = ${result.latestValue} (n=${result.numCompanies}).`
  );
  console.log(`Companies with price data: ${Object.keys(allPrices).length}/${COMPANIES.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
