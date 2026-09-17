/**
 * Onboard any company present in lib/companies.ts but not yet in the DB:
 * backfills Yahoo price/share history (seeding the IPO-pop day per the
 * onboarding rule), inserts the constituent row, then refreshes the rest of
 * the active universe's point-in-time shares so the divisor chain-links
 * correctly at the new rebalance date, and recomputes the index.
 *
 * Idempotent — run: npx tsx scripts/onboard-constituent.ts
 * Mirrors the POST /api/admin/constituents flow, run directly against the DB.
 */
import { readFileSync } from "fs";
import { resolve } from "path";

for (const line of readFileSync(resolve(process.cwd(), ".env.local"), "utf-8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] ??= m[2].trim().replace(/^['"]|['"]$/g, "");
}

import { COMPANIES, type Company } from "../lib/companies";
import { ensureSchema, listConstituents, upsertConstituent, type ConstituentRecord } from "../lib/db";
import { onboardConstituent } from "../lib/onboard";
import { refreshConstituentData } from "../lib/data-refresh";

async function main() {
  await ensureSchema();
  const existing = await listConstituents();
  const existingTickers = new Set(existing.map((c) => c.ticker));
  const newCompanies = COMPANIES.filter((c) => !existingTickers.has(c.ticker)).sort((a, b) =>
    a.listedDate.localeCompare(b.listedDate)
  );

  if (!newCompanies.length) {
    console.log("Nothing to onboard — every company in lib/companies.ts already has a constituent row.");
    return;
  }

  console.log(`Onboarding ${newCompanies.length} new constituent(s): ${newCompanies.map((c) => c.ticker).join(", ")}`);

  let others: Pick<Company, "ticker" | "yfTicker">[] = existing.filter((c) => c.isActive);

  for (const c of newCompanies) {
    console.log(`\n--- ${c.ticker} (${c.name}) ---`);
    const onboard = await onboardConstituent({
      ticker: c.ticker,
      yfTicker: c.yfTicker,
      listedDate: c.listedDate,
      ipoPrice: c.ipoPrice,
    });
    console.log(
      `  prices: ${onboard.priceRows} rows [${onboard.firstDate} → ${onboard.lastDate}], ipoSeeded=${onboard.ipoSeeded}, shares: ${onboard.shareRows} points`
    );

    await upsertConstituent({
      ticker: c.ticker,
      name: c.name,
      displayName: c.displayName,
      yfTicker: c.yfTicker,
      sector: c.sector,
      listedDate: c.listedDate,
      ipoPrice: c.ipoPrice,
      isPortfolio: c.isPortfolio,
      isActive: true,
    });

    console.log(`  refreshing ${others.length} existing constituents + recomputing index...`);
    const refresh = await refreshConstituentData(others, {
      includeShares: true,
      includeFinancials: false,
      includeMeta: false,
    });
    console.log(`  index value: ${refresh.indexValue}, failures: ${refresh.failures.length}`);
    if (refresh.failures.length) console.log("  ", refresh.failures);

    const newRecord: ConstituentRecord = {
      ticker: c.ticker,
      name: c.name,
      displayName: c.displayName,
      yfTicker: c.yfTicker,
      sector: c.sector,
      listedDate: c.listedDate,
      ipoPrice: c.ipoPrice,
      isPortfolio: c.isPortfolio,
      isActive: true,
      updatedAt: new Date().toISOString(),
    };
    others = [...others, newRecord];
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
