import { neon } from "@neondatabase/serverless";
import { COMPANIES, INDEX_BASE_VALUE, SECTORS, type Sector } from "@/lib/companies";

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL env var is not set");
  return neon(url);
}

export async function ensureSchema() {
  const sql = getSql();
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
  await sql`
    CREATE TABLE IF NOT EXISTS settings (
      key        VARCHAR(100) PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

// ── Settings / token storage ─────────────────────────────────────────────────

export async function getUpstoxToken(): Promise<string | null> {
  const sql = getSql();
  const rows = await sql`SELECT value FROM settings WHERE key = 'upstox_access_token'`;
  return rows.length ? (rows[0].value as string) : null;
}

export async function setUpstoxToken(token: string): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO settings (key, value, updated_at)
    VALUES ('upstox_access_token', ${token}, NOW())
    ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value, updated_at = NOW()
  `;
}

// ── Index snapshots ─────────────────────────────────────────────────────────

export async function upsertIndexSnapshot(
  date: string,
  value: number,
  changePct: number | null,
  numCompanies: number
) {
  const sql = getSql();
  await sql`
    INSERT INTO index_snapshots (date, value, change_pct, num_companies)
    VALUES (${date}, ${value}, ${changePct}, ${numCompanies})
    ON CONFLICT (date) DO UPDATE
      SET value = EXCLUDED.value,
          change_pct = EXCLUDED.change_pct,
          num_companies = EXCLUDED.num_companies
  `;
}

export async function getIndexHistory(
  fromDate: string,
  toDate: string
): Promise<{ date: string; value: number }[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT date::text, value::float
    FROM index_snapshots
    WHERE date >= ${fromDate} AND date <= ${toDate}
    ORDER BY date ASC
  `;
  return rows.map((r) => ({ date: r.date, value: Number(r.value) }));
}

export interface SectorIndexHistoryPoint {
  date: string;
  sector: Sector;
  value: number;
  numCompanies: number;
}

export async function getSectorIndexHistory(
  fromDate: string,
  toDate: string
): Promise<SectorIndexHistoryPoint[]> {
  const sql = getSql();
  const [rows, basePrices] = await Promise.all([
    sql`
      SELECT date::text, ticker, close_price::float
      FROM stock_snapshots
      WHERE date >= ${fromDate} AND date <= ${toDate}
      ORDER BY date ASC
    `,
    getEarliestPricesPerTicker(),
  ]);

  const pricesByDate = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const date = r.date as string;
    const ticker = r.ticker as string;
    const price = Number(r.close_price);
    const prices = pricesByDate.get(date) ?? new Map<string, number>();
    prices.set(ticker, price);
    pricesByDate.set(date, prices);
  }

  const companiesBySector = new Map(
    SECTORS.map((sector) => [
      sector,
      COMPANIES.filter((company) => company.sector === sector),
    ])
  );

  const points: SectorIndexHistoryPoint[] = [];

  for (const [date, prices] of pricesByDate) {
    for (const sector of SECTORS) {
      const sectorCompanies = companiesBySector.get(sector) ?? [];
      const eligible = sectorCompanies.filter(
        (company) =>
          company.listedDate <= date &&
          basePrices[company.ticker] !== undefined &&
          prices.has(company.ticker)
      );

      if (eligible.length === 0) continue;

      const avgRatio =
        eligible.reduce((sum, company) => {
          const basePrice = basePrices[company.ticker];
          const closePrice = prices.get(company.ticker);
          if (basePrice === undefined || closePrice === undefined || basePrice === 0) {
            return sum;
          }
          return sum + closePrice / basePrice;
        }, 0) / eligible.length;

      points.push({
        date,
        sector,
        value: Math.round(INDEX_BASE_VALUE * avgRatio * 10000) / 10000,
        numCompanies: eligible.length,
      });
    }
  }

  return points;
}

export async function getLatestIndexSnapshot(): Promise<{
  date: string;
  value: number;
  changePct: number | null;
} | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT date::text, value::float, change_pct::float
    FROM index_snapshots
    ORDER BY date DESC
    LIMIT 1
  `;
  if (!rows.length) return null;
  return { date: rows[0].date, value: Number(rows[0].value), changePct: rows[0].change_pct !== null ? Number(rows[0].change_pct) : null };
}

// ── Stock snapshots ──────────────────────────────────────────────────────────

export async function upsertStockSnapshot(
  date: string,
  ticker: string,
  closePrice: number,
  changePct: number | null
) {
  const sql = getSql();
  await sql`
    INSERT INTO stock_snapshots (date, ticker, close_price, change_pct)
    VALUES (${date}, ${ticker}, ${closePrice}, ${changePct})
    ON CONFLICT (date, ticker) DO UPDATE
      SET close_price = EXCLUDED.close_price,
          change_pct = EXCLUDED.change_pct
  `;
}

export async function upsertStockSnapshotsBatch(
  rows: { date: string; ticker: string; closePrice: number; changePct: number | null }[]
) {
  if (!rows.length) return;
  const sql = getSql();
  const CHUNK_SIZE = 500;

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const dates = chunk.map((r) => r.date);
    const tickers = chunk.map((r) => r.ticker);
    const prices = chunk.map((r) => r.closePrice);
    const changes = chunk.map((r) => r.changePct);

    await sql`
      INSERT INTO stock_snapshots (date, ticker, close_price, change_pct)
      SELECT * FROM unnest(
        ${dates}::date[],
        ${tickers}::varchar[],
        ${prices}::decimal[],
        ${changes}::decimal[]
      ) AS t(date, ticker, close_price, change_pct)
      ON CONFLICT (date, ticker) DO UPDATE
        SET close_price = EXCLUDED.close_price,
            change_pct = EXCLUDED.change_pct
    `;
  }
}

// Get the most recent stored close price + changePct per ticker
export async function getLatestStockPrices(): Promise<Record<string, { price: number; changePct: number | null }>> {
  const sql = getSql();
  const rows = await sql`
    SELECT DISTINCT ON (ticker) ticker, close_price::float, change_pct::float
    FROM stock_snapshots
    ORDER BY ticker, date DESC
  `;
  const map: Record<string, { price: number; changePct: number | null }> = {};
  for (const r of rows) {
    map[r.ticker as string] = {
      price: Number(r.close_price),
      changePct: r.change_pct != null ? Number(r.change_pct) : null,
    };
  }
  return map;
}

// Get the earliest stored close price for each ticker (used as base prices)
export async function getBasePrices(): Promise<Record<string, number>> {
  const sql = getSql();
  // For each company, get the price on the effective base date
  const rows = await sql`
    SELECT DISTINCT ON (ticker) ticker, close_price::float, date::text
    FROM stock_snapshots
    ORDER BY ticker, date ASC
  `;
  const map: Record<string, number> = {};
  for (const r of rows) map[r.ticker] = Number(r.close_price);
  return map;
}

export async function getStockPricesOnDate(
  date: string
): Promise<Record<string, number>> {
  const sql = getSql();
  const rows = await sql`
    SELECT ticker, close_price::float FROM stock_snapshots WHERE date = ${date}
  `;
  const map: Record<string, number> = {};
  for (const r of rows) map[r.ticker] = Number(r.close_price);
  return map;
}

// Get the earliest stored price for each ticker (used as that ticker's base price)
export async function getEarliestPricesPerTicker(): Promise<Record<string, number>> {
  const sql = getSql();
  const rows = await sql`
    SELECT DISTINCT ON (ticker) ticker, close_price::float
    FROM stock_snapshots
    ORDER BY ticker, date ASC
  `;
  const map: Record<string, number> = {};
  for (const r of rows) map[r.ticker] = Number(r.close_price);
  return map;
}
