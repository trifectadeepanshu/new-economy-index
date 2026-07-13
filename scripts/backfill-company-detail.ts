/**
 * Backfill per-company detail — run: npx tsx scripts/backfill-company-detail.ts
 * Populates four tables from Yahoo for every constituent:
 *   company_financials            — annual revenue / EBITDA / PAT / total assets
 *   company_financials_quarterly  — quarterly revenue / EBITDA / PAT / total assets
 *   company_profiles              — business description
 *   analyst_ratings               — Buy/Hold/Sell consensus
 */
import { readFileSync } from "fs";
import { resolve } from "path";

for (const line of readFileSync(resolve(process.cwd(), ".env.local"), "utf-8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

import { neon } from "@neondatabase/serverless";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const YahooFinanceClass = require("yahoo-finance2").default;
const yf = (() => {
  try {
    return new YahooFinanceClass({ suppressNotices: ["yahooSurvey"] });
  } catch {
    return YahooFinanceClass;
  }
})();

import { COMPANIES } from "../lib/companies";

const sql = neon(process.env.DATABASE_URL!);

const ANNUAL_FIN_TYPES = [
  "annualTotalRevenue",
  "annualEBITDA",
  "annualNetIncome",
  "annualTotalAssets",
];
const QUARTERLY_FIN_TYPES = [
  "quarterlyTotalRevenue",
  "quarterlyEBITDA",
  "quarterlyNetIncome",
  "quarterlyTotalAssets",
];

type FinRow = {
  period: string;
  revenue: number | null;
  ebitda: number | null;
  pat: number | null;
  assets: number | null;
};

async function fetchFinancials(yfTicker: string, types: string[]): Promise<FinRow[]> {
  const typeList = types.join(",");
  const url =
    `https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${yfTicker}` +
    `?symbol=${yfTicker}&type=${typeList}&period1=1420070400&period2=1790000000`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as { timeseries?: { result?: Array<Record<string, unknown>> } };
  const byPeriod = new Map<string, FinRow>();
  const key = (metric: string): "revenue" | "ebitda" | "pat" | "assets" =>
    metric.includes("Revenue") ? "revenue" : metric.includes("EBITDA") ? "ebitda" : metric.includes("NetIncome") ? "pat" : "assets";
  for (const r of json.timeseries?.result ?? []) {
    const meta = r.meta as { type?: string[] } | undefined;
    const type = meta?.type?.[0];
    if (!type) continue;
    for (const pt of (r[type] as Array<Record<string, unknown>> | undefined) ?? []) {
      if (!pt) continue;
      const period = pt.asOfDate as string | undefined;
      const raw = (pt.reportedValue as { raw?: number } | undefined)?.raw;
      if (!period || typeof raw !== "number") continue;
      const row = byPeriod.get(period) ?? {
        period,
        revenue: null,
        ebitda: null,
        pat: null,
        assets: null,
      };
      row[key(type)] = raw;
      byPeriod.set(period, row);
    }
  }
  return [...byPeriod.values()].sort((a, b) => a.period.localeCompare(b.period));
}

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS company_financials (
      ticker       VARCHAR(30) NOT NULL,
      fiscal_year  DATE NOT NULL,
      revenue      NUMERIC(20, 0),
      ebitda       NUMERIC(20, 0),
      pat          NUMERIC(20, 0),
      total_assets NUMERIC(20, 0),
      PRIMARY KEY (ticker, fiscal_year)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS company_financials_quarterly (
      ticker       VARCHAR(30) NOT NULL,
      quarter_end  DATE NOT NULL,
      revenue      NUMERIC(20, 0),
      ebitda       NUMERIC(20, 0),
      pat          NUMERIC(20, 0),
      total_assets NUMERIC(20, 0),
      PRIMARY KEY (ticker, quarter_end)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS company_profiles (
      ticker      VARCHAR(30) PRIMARY KEY,
      description TEXT,
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS analyst_ratings (
      ticker       VARCHAR(30) PRIMARY KEY,
      strong_buy   INTEGER NOT NULL DEFAULT 0,
      buy          INTEGER NOT NULL DEFAULT 0,
      hold         INTEGER NOT NULL DEFAULT 0,
      sell         INTEGER NOT NULL DEFAULT 0,
      strong_sell  INTEGER NOT NULL DEFAULT 0,
      rating_key   VARCHAR(24),
      num_analysts INTEGER,
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  const gaps: string[] = [];
  for (let i = 0; i < COMPANIES.length; i++) {
    const c = COMPANIES[i];
    process.stdout.write(`  [${i + 1}/${COMPANIES.length}] ${c.ticker.padEnd(12)} `);
    let annualN = 0;
    let quarterlyN = 0;
    const notes: string[] = [];

    try {
      const fins = await fetchFinancials(c.yfTicker, ANNUAL_FIN_TYPES);
      for (const f of fins) {
        await sql`
          INSERT INTO company_financials (ticker, fiscal_year, revenue, ebitda, pat, total_assets)
          VALUES (${c.ticker}, ${f.period}, ${f.revenue}, ${f.ebitda}, ${f.pat}, ${f.assets})
          ON CONFLICT (ticker, fiscal_year) DO UPDATE
            SET revenue = EXCLUDED.revenue, ebitda = EXCLUDED.ebitda,
                pat = EXCLUDED.pat, total_assets = EXCLUDED.total_assets
        `;
      }
      annualN = fins.length;
    } catch {
      notes.push("no-annual-fin");
    }

    try {
      const fins = await fetchFinancials(c.yfTicker, QUARTERLY_FIN_TYPES);
      for (const f of fins) {
        await sql`
          INSERT INTO company_financials_quarterly (ticker, quarter_end, revenue, ebitda, pat, total_assets)
          VALUES (${c.ticker}, ${f.period}, ${f.revenue}, ${f.ebitda}, ${f.pat}, ${f.assets})
          ON CONFLICT (ticker, quarter_end) DO UPDATE
            SET revenue = EXCLUDED.revenue, ebitda = EXCLUDED.ebitda,
                pat = EXCLUDED.pat, total_assets = EXCLUDED.total_assets
        `;
      }
      quarterlyN = fins.length;
    } catch {
      notes.push("no-quarterly-fin");
    }

    try {
      const s = await yf.quoteSummary(
        c.yfTicker,
        { modules: ["assetProfile", "recommendationTrend", "financialData"] },
        { validateResult: false }
      );
      const desc = s.assetProfile?.longBusinessSummary ?? null;
      await sql`
        INSERT INTO company_profiles (ticker, description, updated_at)
        VALUES (${c.ticker}, ${desc}, now())
        ON CONFLICT (ticker) DO UPDATE SET description = EXCLUDED.description, updated_at = now()
      `;
      const t = s.recommendationTrend?.trend?.[0];
      const fd = s.financialData;
      if (t || fd) {
        await sql`
          INSERT INTO analyst_ratings (ticker, strong_buy, buy, hold, sell, strong_sell, rating_key, num_analysts, updated_at)
          VALUES (${c.ticker}, ${t?.strongBuy ?? 0}, ${t?.buy ?? 0}, ${t?.hold ?? 0}, ${t?.sell ?? 0}, ${t?.strongSell ?? 0},
                  ${fd?.recommendationKey ?? null}, ${fd?.numberOfAnalystOpinions ?? null}, now())
          ON CONFLICT (ticker) DO UPDATE
            SET strong_buy = EXCLUDED.strong_buy, buy = EXCLUDED.buy, hold = EXCLUDED.hold,
                sell = EXCLUDED.sell, strong_sell = EXCLUDED.strong_sell,
                rating_key = EXCLUDED.rating_key, num_analysts = EXCLUDED.num_analysts, updated_at = now()
        `;
      } else {
        notes.push("no-analyst");
      }
    } catch {
      notes.push("no-profile");
    }

    if (notes.length) gaps.push(`${c.ticker}(${notes.join(",")})`);
    console.log(
      `annual=${annualN} quarterly=${quarterlyN} ${notes.length ? "⚠ " + notes.join(",") : "✓"}`
    );
    await new Promise((r) => setTimeout(r, 150));
  }

  console.log("\nDone.");
  if (gaps.length) console.log(`Coverage notes (${gaps.length}): ${gaps.join(", ")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
