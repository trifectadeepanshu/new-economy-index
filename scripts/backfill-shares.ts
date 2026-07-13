/**
 * Deprecated destructive script.
 *
 * This used to drop and rebuild share_counts from Yahoo fundamentals data. It
 * is intentionally blocked because point-in-time share counts are now loaded
 * from the canonical CapIQ workbook import and used by the divisor engine.
 */

const message = [
  "scripts/backfill-shares.ts is retired and must not be run.",
  "",
  "Historical rebuild:",
  '  npm run import:capiq -- --workbook "/path/to/TLF New Economy Index Data_v2.xlsx" --apply',
  "",
  "This preserves source metadata and avoids replacing share_counts with Yahoo-only estimates.",
].join("\n");

console.error(message);
process.exit(1);

export {};
