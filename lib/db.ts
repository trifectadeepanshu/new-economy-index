import { neon } from "@neondatabase/serverless";
import { COMPANIES, INDEX_BASE_VALUE, PORTFOLIO_TICKERS, SECTORS, type Sector } from "@/lib/companies";
import type { IndexHistoryPoint, SectorHistoryPoint } from "@/lib/index-api";
import { average, priceRatio, round } from "@/lib/index-math";

const STOCK_BATCH_SIZE = 500;
const COMPANIES_BY_SECTOR = new Map(
  SECTORS.map((sector) => [
    sector,
    COMPANIES.filter((company) => company.sector === sector),
  ])
);

type DbRow = Record<string, unknown>;

export type LatestIndexSnapshot = {
  date: string;
  value: number;
  changePct: number | null;
};

export type StockSnapshotInput = {
  date: string;
  ticker: string;
  closePrice: number;
  changePct: number | null;
};

export type LatestStockPrice = {
  price: number;
  changePct: number | null;
};

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL env var is not set");
  return neon(url);
}

function toNumber(value: unknown) {
  return Number(value);
}

function toNullableNumber(value: unknown) {
  return value == null ? null : Number(value);
}

function toTicker(value: unknown) {
  return String(value);
}

function setNestedPrice(
  map: Map<string, Map<string, number>>,
  date: string,
  ticker: string,
  price: number
) {
  const prices = map.get(date) ?? new Map<string, number>();
  prices.set(ticker, price);
  map.set(date, prices);
}

function stockPricesByDate(rows: DbRow[]) {
  const pricesByDate = new Map<string, Map<string, number>>();

  for (const row of rows) {
    setNestedPrice(
      pricesByDate,
      String(row.date),
      toTicker(row.ticker),
      toNumber(row.close_price)
    );
  }

  return pricesByDate;
}

function sectorRatios(
  sector: Sector,
  date: string,
  prices: Map<string, number>,
  basePrices: Record<string, number>
) {
  return (COMPANIES_BY_SECTOR.get(sector) ?? []).flatMap((company) => {
    if (company.listedDate > date) return [];

    const ratio = priceRatio(prices.get(company.ticker) ?? null, basePrices[company.ticker] ?? null);
    return ratio === null ? [] : [ratio];
  });
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
}


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
): Promise<IndexHistoryPoint[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT date::text, value::float
    FROM index_snapshots
    WHERE date >= ${fromDate} AND date <= ${toDate}
    ORDER BY date ASC
  `;
  return rows.map((row) => ({
    date: String(row.date),
    value: toNumber(row.value),
  }));
}

export type SectorIndexHistoryPoint = SectorHistoryPoint;

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

  const pricesByDate = stockPricesByDate(rows);
  const points: SectorIndexHistoryPoint[] = [];

  for (const [date, prices] of pricesByDate) {
    for (const sector of SECTORS) {
      const ratios = sectorRatios(sector, date, prices, basePrices);
      const avgRatio = average(ratios);
      if (avgRatio === null) continue;

      points.push({
        date,
        sector,
        value: round(INDEX_BASE_VALUE * avgRatio, 4),
        numCompanies: ratios.length,
      });
    }
  }

  return points;
}

export async function getLatestIndexSnapshot(): Promise<LatestIndexSnapshot | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT date::text, value::float, change_pct::float
    FROM index_snapshots
    ORDER BY date DESC
    LIMIT 1
  `;
  if (!rows.length) return null;
  const row = rows[0];

  return {
    date: String(row.date),
    value: toNumber(row.value),
    changePct: toNullableNumber(row.change_pct),
  };
}

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

export async function upsertStockSnapshotsBatch(rows: StockSnapshotInput[]) {
  if (!rows.length) return;
  const sql = getSql();

  for (let i = 0; i < rows.length; i += STOCK_BATCH_SIZE) {
    const chunk = rows.slice(i, i + STOCK_BATCH_SIZE);
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

export async function getLatestStockPrices(): Promise<Record<string, LatestStockPrice>> {
  const sql = getSql();
  const rows = await sql`
    SELECT DISTINCT ON (ticker) ticker, close_price::float, change_pct::float
    FROM stock_snapshots
    ORDER BY ticker, date DESC
  `;

  const prices: Record<string, LatestStockPrice> = {};
  for (const row of rows) {
    prices[toTicker(row.ticker)] = {
      price: toNumber(row.close_price),
      changePct: toNullableNumber(row.change_pct),
    };
  }

  return prices;
}

export async function getPortfolioIndexHistory(
  fromDate: string,
  toDate: string
): Promise<IndexHistoryPoint[]> {
  const sql = getSql();
  const tickers = [...PORTFOLIO_TICKERS];
  const portfolioCompanies = COMPANIES.filter((c) => PORTFOLIO_TICKERS.has(c.ticker));

  // Fetch ALL history (no date cap) so adjusted bases are computed from the
  // very first trading day of each company, regardless of the requested range.
  const rows = await sql`
    SELECT date::text, ticker, close_price::float
    FROM stock_snapshots
    WHERE ticker = ANY(${tickers}::varchar[])
    ORDER BY date ASC
  `;

  const pricesByDate = stockPricesByDate(rows);
  const sortedDates = [...pricesByDate.keys()].sort();
  if (!sortedDates.length) return [];

  // Adjusted-base splice: when a new company joins, set its base price to
  // first_price / current_avg_ratio so the index level is unchanged on entry.
  // Subsequent days use price / adjusted_base normally — no discontinuity.
  const adjustedBase: Record<string, number> = {};
  const active = new Set<string>();

  for (const date of sortedDates) {
    const prices = pricesByDate.get(date)!;
    for (const co of portfolioCompanies) {
      if (active.has(co.ticker) || co.listedDate > date) continue;
      const p = prices.get(co.ticker);
      if (!p) continue;

      if (active.size === 0) {
        adjustedBase[co.ticker] = p; // first company: ratio starts at 1.0
      } else {
        const ratios = [...active].flatMap((t) => {
          const tp = prices.get(t), tb = adjustedBase[t];
          return tp && tb && tb > 0 ? [tp / tb] : [];
        });
        const avg = ratios.length ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 1;
        adjustedBase[co.ticker] = p / avg; // enter at current portfolio level
      }
      active.add(co.ticker);
    }
  }

  // Build the output series, filtered to the requested date range.
  const points: IndexHistoryPoint[] = [];
  for (const date of sortedDates) {
    if (date < fromDate || date > toDate) continue;
    const prices = pricesByDate.get(date)!;
    const ratios = portfolioCompanies.flatMap((co) => {
      if (co.listedDate > date) return [];
      const p = prices.get(co.ticker), b = adjustedBase[co.ticker];
      return p && b && b > 0 ? [p / b] : [];
    });
    const avg = average(ratios);
    if (avg === null) continue;
    points.push({ date, value: round(INDEX_BASE_VALUE * avg, 4) });
  }

  return points;
}

export async function getEarliestPricesPerTicker(): Promise<Record<string, number>> {
  const sql = getSql();
  const rows = await sql`
    SELECT DISTINCT ON (ticker) ticker, close_price::float
    FROM stock_snapshots
    ORDER BY ticker, date ASC
  `;

  const prices: Record<string, number> = {};
  for (const row of rows) {
    prices[toTicker(row.ticker)] = toNumber(row.close_price);
  }

  return prices;
}
