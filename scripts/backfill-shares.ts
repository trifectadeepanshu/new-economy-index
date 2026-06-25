/**
 * Point-in-time share-count backfill — run: npx tsx scripts/backfill-shares.ts
 *
 * Populates `share_counts` with (ticker, as_of, shares) point-in-time rows from
 * Yahoo's fundamentals-timeseries endpoint (ordinarySharesNumber / shareIssued,
 * quarterly + annual). The divisor engine looks up the latest point on/before
 * each quarter-end; for quarters before Yahoo's earliest point it holds the
 * earliest value constant (older constituents have near-flat share counts).
 *
 * Run after backfill.ts so every constituent's listing is covered.
 */

import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
for (const line of readFileSync(envPath, "utf-8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

import { neon } from "@neondatabase/serverless";
import { COMPANIES } from "../lib/companies";

const sql = neon(process.env.DATABASE_URL!);

const TYPES = [
  "quarterlyOrdinarySharesNumber",
  "annualOrdinarySharesNumber",
  "quarterlyShareIssued",
  "annualShareIssued",
];
const PREFERENCE = ["OrdinarySharesNumber", "ShareIssued"]; // prefer point-in-time count

type Point = { asOf: string; shares: number };

async function fetchShares(yfTicker: string): Promise<Point[]> {
  const url =
    `https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${yfTicker}` +
    `?symbol=${yfTicker}&type=${TYPES.join(",")}&period1=1577836800&period2=1790000000`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as {
    timeseries?: { result?: Array<Record<string, unknown>> };
  };

  // asOf -> { rank, shares } keeping the most-preferred source per date.
  const best = new Map<string, { rank: number; shares: number }>();
  for (const r of json.timeseries?.result ?? []) {
    const meta = r.meta as { type?: string[] } | undefined;
    const key = meta?.type?.[0];
    if (!key) continue;
    const rank = PREFERENCE.findIndex((p) => key.includes(p));
    for (const pt of (r[key] as Array<Record<string, unknown>> | undefined) ?? []) {
      if (!pt) continue;
      const asOf = pt.asOfDate as string | undefined;
      const raw = (pt.reportedValue as { raw?: number } | undefined)?.raw;
      if (!asOf || typeof raw !== "number" || raw <= 0) continue;
      const cur = best.get(asOf);
      if (!cur || rank < cur.rank) best.set(asOf, { rank, shares: raw });
    }
  }
  return [...best.entries()]
    .map(([asOf, v]) => ({ asOf, shares: Math.round(v.shares) }))
    .sort((a, b) => a.asOf.localeCompare(b.asOf));
}

async function main() {
  await sql`DROP TABLE IF EXISTS share_counts`;
  await sql`
    CREATE TABLE share_counts (
      ticker  VARCHAR(30) NOT NULL,
      as_of   DATE NOT NULL,
      shares  NUMERIC(20, 0) NOT NULL,
      source  VARCHAR(24) NOT NULL,
      PRIMARY KEY (ticker, as_of)
    )
  `;

  const rows: { ticker: string; asOf: string; shares: number }[] = [];
  const gaps: string[] = [];

  for (let i = 0; i < COMPANIES.length; i++) {
    const c = COMPANIES[i];
    process.stdout.write(`  [${i + 1}/${COMPANIES.length}] ${c.ticker.padEnd(12)} `);
    let pts: Point[] = [];
    try {
      pts = await fetchShares(c.yfTicker);
    } catch (e) {
      console.log(`ERROR: ${e instanceof Error ? e.message : e}`);
    }
    if (!pts.length) {
      gaps.push(c.ticker);
      console.log("no shares");
    } else {
      for (const p of pts) rows.push({ ticker: c.ticker, asOf: p.asOf, shares: p.shares });
      console.log(`${pts.length} pts (${pts[0].asOf} → ${pts[pts.length - 1].asOf})`);
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  console.log(`\nInserting ${rows.length} share points…`);
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    await sql`
      INSERT INTO share_counts (ticker, as_of, shares, source)
      SELECT * FROM unnest(
        ${chunk.map((r) => r.ticker)}::varchar[],
        ${chunk.map((r) => r.asOf)}::date[],
        ${chunk.map((r) => r.shares)}::numeric[],
        ${chunk.map(() => "yahoo-pit")}::varchar[]
      ) AS t(ticker, as_of, shares, source)
    `;
  }

  console.log("Done.");
  if (gaps.length) console.log(`⚠ No share data for ${gaps.length}: ${gaps.join(", ")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
