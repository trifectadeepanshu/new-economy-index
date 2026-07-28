/**
 * Seed (or re-sync) the `constituents` table from lib/companies.ts.
 * Idempotent — run: npx tsx scripts/seed-constituents.ts
 *
 * This is the one-time migration from the hardcoded universe to the DB-backed
 * one. After this, the CMS (/admin/constituents) is the source of truth.
 */
import { readFileSync } from "fs";
import { resolve } from "path";

for (const line of readFileSync(resolve(process.cwd(), ".env.local"), "utf-8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] ??= m[2].trim().replace(/^['"]|['"]$/g, "");
}

import { neon } from "@neondatabase/serverless";
import { COMPANIES } from "../lib/companies";
import { ensureSchema } from "../lib/db";

async function main() {
  await ensureSchema();
  const sql = neon(process.env.DATABASE_URL!);

  for (const c of COMPANIES) {
    await sql`
      INSERT INTO constituents (ticker, name, display_name, yf_ticker, sector, listed_date, ipo_price, is_trifecta, is_active)
      VALUES (${c.ticker}, ${c.name}, ${c.displayName}, ${c.yfTicker}, ${c.sector}, ${c.listedDate}, ${c.ipoPrice}, ${c.isPortfolio}, true)
      ON CONFLICT (ticker) DO UPDATE
        SET name = EXCLUDED.name, display_name = EXCLUDED.display_name, yf_ticker = EXCLUDED.yf_ticker,
            sector = EXCLUDED.sector, listed_date = EXCLUDED.listed_date, ipo_price = EXCLUDED.ipo_price,
            is_trifecta = EXCLUDED.is_trifecta, updated_at = now()
    `;
  }

  const rows = (await sql`SELECT count(*)::int AS n, count(*) FILTER (WHERE is_trifecta)::int AS pf FROM constituents WHERE is_active`) as { n: number; pf: number }[];
  console.log(`Seeded constituents: ${rows[0].n} active (${rows[0].pf} Trifecta) from ${COMPANIES.length} in companies.ts`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
