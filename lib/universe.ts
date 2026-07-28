/**
 * The index universe, loaded from the `constituents` table (managed via the
 * /admin/constituents CMS). Falls back to the seed list in lib/companies.ts if
 * the table is empty or unreachable, so the app never has an empty universe.
 *
 * Cached briefly per server instance; call invalidateUniverse() after a write
 * (e.g. a CMS add) so the next read reflects it immediately.
 */
import { neon } from "@neondatabase/serverless";
import { COMPANIES, type Company, type Sector } from "@/lib/companies";

const CACHE_TTL_MS = 60_000;

type DbRow = Record<string, unknown>;

let cache: { at: number; universe: Company[] } | null = null;

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL env var is not set");
  return neon(url);
}

function rowToCompany(row: DbRow): Company {
  return {
    name: String(row.name),
    displayName: String(row.display_name),
    ticker: String(row.ticker),
    yfTicker: String(row.yf_ticker),
    sector: String(row.sector) as Sector,
    listedDate: String(row.listed_date),
    ipoPrice: row.ipo_price == null ? null : Number(row.ipo_price),
    isPortfolio: Boolean(row.is_trifecta),
  };
}

/** Active constituents, ordered by listing date. DB-backed with a seed fallback. */
export async function getUniverse(): Promise<Company[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.universe;
  try {
    const sql = getSql();
    const rows = (await sql`
      SELECT ticker, name, display_name, yf_ticker, sector,
             listed_date::text AS listed_date, ipo_price::float AS ipo_price, is_trifecta
      FROM constituents
      WHERE is_active = true
      ORDER BY listed_date ASC, ticker ASC
    `) as DbRow[];
    if (rows.length) {
      const universe = rows.map(rowToCompany);
      cache = { at: Date.now(), universe };
      return universe;
    }
  } catch {
    /* fall through to the seed list */
  }
  return COMPANIES;
}

/** Clear the cache so the next getUniverse() re-reads the DB (call after writes). */
export function invalidateUniverse() {
  cache = null;
}
