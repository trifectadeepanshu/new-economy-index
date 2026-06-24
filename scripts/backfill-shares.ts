/**
 * Quarterly shares-outstanding backfill — run with: npx tsx scripts/backfill-shares.ts
 *
 * Populates the `share_counts` table with one shares-outstanding figure per
 * (ticker, quarter_end) from each company's first post-listing quarter through
 * the latest quarter, for use by the market-cap-weighted divisor index engine.
 *
 * Source strategy (free, 100% coverage — see investigation notes):
 *   Primary: current point-in-time shares outstanding from Yahoo
 *   `defaultKeyStatistics.sharesOutstanding`, held constant across every quarter
 *   of the company's life. Yahoo's daily prices are split/bonus-adjusted, so all
 *   market-cap movement comes from price; only genuine issuances/buybacks (not
 *   split events) are unmodelled.
 *
 *   Why not quarterly `fundamentalsTimeSeries`: for NSE names it only returns
 *   `basicAverageShares` (a period AVERAGE used for EPS), which oscillates with
 *   issuance timing rather than tracking point-in-time count — feeding it into
 *   cap weights would inject fake index jumps at rebalances. We keep the latest
 *   FTS value only as a fallback when current sharesOutstanding is unavailable.
 *
 *   Upgrade path: point-in-time historical shares from NSE shareholding-pattern
 *   filings would let us step shares at real issuance dates; tracked separately.
 */

import { readFileSync } from "fs";
import { resolve } from "path";

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

import { COMPANIES, INDEX_BASE_DATE } from "../lib/companies";

interface FtsRow {
  date: Date | string | number;
  ordinarySharesNumber?: number | null;
  shareIssued?: number | null;
  basicAverageShares?: number | null;
}

interface DksSummary {
  defaultKeyStatistics?: { sharesOutstanding?: number | null };
}

interface YahooFinanceClient {
  fundamentalsTimeSeries(
    yfTicker: string,
    queryOptions: { period1: string; period2: string; type: "quarterly"; module: string },
    moduleOptions?: { validateResult?: boolean }
  ): Promise<FtsRow[]>;
  quoteSummary(
    yfTicker: string,
    queryOptions: { modules: string[] },
    moduleOptions?: { validateResult?: boolean }
  ): Promise<DksSummary>;
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

const TODAY = new Date();

/** Last calendar day of the quarter containing `d` (UTC), as yyyy-mm-dd. */
function quarterEnd(d: Date): string {
  const y = d.getUTCFullYear();
  const q = Math.floor(d.getUTCMonth() / 3); // 0..3
  const endMonth = q * 3 + 2; // 2,5,8,11
  const last = new Date(Date.UTC(y, endMonth + 1, 0));
  return last.toISOString().slice(0, 10);
}

/** All quarter-end dates from `fromQ` through the quarter containing `to`, inclusive. */
function quarterEndsBetween(fromQ: string, to: Date): string[] {
  const out: string[] = [];
  const [fy, fm] = fromQ.split("-").map(Number);
  let y = fy;
  let m = fm; // 3,6,9,12
  const toQ = quarterEnd(to);
  // safety cap
  for (let i = 0; i < 80; i++) {
    const qe = quarterEnd(new Date(Date.UTC(y, m - 1, 15)));
    out.push(qe);
    if (qe >= toQ) break;
    m += 3;
    if (m > 12) {
      m -= 12;
      y += 1;
    }
  }
  return out;
}

function sharesOf(r: FtsRow): number | null {
  const v = r.ordinarySharesNumber ?? r.shareIssued ?? r.basicAverageShares ?? null;
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;
}

async function ensureSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS share_counts (
      ticker       VARCHAR(30) NOT NULL,
      quarter_end  DATE NOT NULL,
      shares       NUMERIC(20, 0) NOT NULL,
      source       VARCHAR(20) NOT NULL,
      PRIMARY KEY (ticker, quarter_end)
    )
  `;
  console.log("share_counts schema ready.");
}

type KnownPoint = { q: string; shares: number };

async function fetchKnownShares(yfTicker: string): Promise<KnownPoint[]> {
  const rows = await yf.fundamentalsTimeSeries(
    yfTicker,
    { period1: "2020-01-01", period2: TODAY.toISOString().slice(0, 10), type: "quarterly", module: "financials" },
    { validateResult: false }
  );
  const byQ = new Map<string, number>();
  for (const r of Array.isArray(rows) ? rows : []) {
    const s = sharesOf(r);
    if (s == null) continue;
    byQ.set(quarterEnd(new Date(r.date)), s);
  }
  return [...byQ.entries()]
    .map(([q, shares]) => ({ q, shares }))
    .sort((a, b) => a.q.localeCompare(b.q));
}

async function fetchCurrentShares(yfTicker: string): Promise<number | null> {
  try {
    const s = await yf.quoteSummary(yfTicker, { modules: ["defaultKeyStatistics"] }, { validateResult: false });
    const v = s.defaultKeyStatistics?.sharesOutstanding;
    return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

/**
 * Resolve the constant point-in-time share count for a company.
 * Prefer current `sharesOutstanding` (clean point-in-time); fall back to the
 * latest FTS average only if current is unavailable.
 */
function resolveConstantShares(
  known: KnownPoint[],
  current: number | null
): { shares: number; source: string } | null {
  if (current != null) return { shares: current, source: "current-const" };
  if (known.length) return { shares: known[known.length - 1].shares, source: "fts-fallback" };
  return null;
}

async function main() {
  await ensureSchema();

  const allRows: { ticker: string; q: string; shares: number; source: string }[] = [];
  const gaps: string[] = [];

  for (let i = 0; i < COMPANIES.length; i++) {
    const c = COMPANIES[i];
    process.stdout.write(`  [${i + 1}/${COMPANIES.length}] ${c.ticker.padEnd(14)} `);

    let known: KnownPoint[] = [];
    try {
      known = await fetchKnownShares(c.yfTicker);
    } catch (e) {
      console.log(`FTS ERROR: ${e instanceof Error ? e.message : e}`);
    }
    const current = await fetchCurrentShares(c.yfTicker);

    // Quarters from the company's listing quarter (or index base) through now.
    const startQ = quarterEnd(new Date(c.listedDate < INDEX_BASE_DATE ? INDEX_BASE_DATE : c.listedDate));
    const quarters = quarterEndsBetween(startQ, TODAY);

    const res = resolveConstantShares(known, current);
    let filled = 0;
    if (res) {
      for (const q of quarters) {
        allRows.push({ ticker: c.ticker, q, shares: Math.round(res.shares), source: res.source });
        filled++;
      }
    } else {
      gaps.push(`${c.ticker} (NO shares: known=${known.length}, current=${current ?? "—"})`);
    }
    console.log(
      `known=${known.length} current=${current ?? "—"} → ${res?.source ?? "NONE"} ×${filled} quarters`
    );
  }

  console.log(`\nUpserting ${allRows.length} share_counts rows...`);
  const CHUNK = 500;
  for (let i = 0; i < allRows.length; i += CHUNK) {
    const chunk = allRows.slice(i, i + CHUNK);
    await sql`
      INSERT INTO share_counts (ticker, quarter_end, shares, source)
      SELECT * FROM unnest(
        ${chunk.map((r) => r.ticker)}::varchar[],
        ${chunk.map((r) => r.q)}::date[],
        ${chunk.map((r) => r.shares)}::numeric[],
        ${chunk.map((r) => r.source)}::varchar[]
      ) AS t(ticker, quarter_end, shares, source)
      ON CONFLICT (ticker, quarter_end) DO UPDATE
        SET shares = EXCLUDED.shares, source = EXCLUDED.source
    `;
  }

  console.log("Done.");
  if (gaps.length) {
    console.log(`\n⚠ Coverage notes (${gaps.length}):`);
    for (const g of gaps) console.log(`   ${g}`);
  } else {
    console.log("\n✓ Full coverage — every company filled for every quarter in range.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
