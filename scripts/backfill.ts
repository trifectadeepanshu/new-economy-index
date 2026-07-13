/**
 * Deprecated destructive script.
 *
 * This used to backfill stock_snapshots directly from Yahoo Finance and then
 * recompute the index. It is intentionally blocked because the canonical
 * historical dataset now comes from the CapIQ workbook import, with source
 * metadata and workbook ticker mapping preserved.
 */

const message = [
  "scripts/backfill.ts is retired and must not be run.",
  "",
  "Historical rebuild:",
  '  npm run import:capiq -- --workbook "/path/to/TLF New Economy Index Data_v2.xlsx" --apply',
  "",
  "Daily forward update:",
  "  call /api/cron/snapshot with CRON_SECRET after market close.",
].join("\n");

console.error(message);
process.exit(1);

export {};
