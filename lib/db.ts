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

  // Fetch ALL historical data for portfolio tickers (not capped to fromDate) so the
  // chain-linked level is accurate before we slice to the requested range.
  const rows = await sql`
    SELECT date::text, ticker, close_price::float
    FROM stock_snapshots
    WHERE ticker = ANY(${tickers}::varchar[])
    ORDER BY date ASC
  `;

  const pricesByDate = stockPricesByDate(rows);
  const sortedDates = [...pricesByDate.keys()].sort();

  if (!sortedDates.length) return [];

  // Chain-link: compound daily returns instead of averaging price/base ratios.
  // When a new company lists it contributes 0% on its first day → no discontinuity.
  let indexValue = INDEX_BASE_VALUE;
  const allPoints: IndexHistoryPoint[] = [{ date: sortedDates[0], value: round(indexValue) }];

  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = sortedDates[i - 1];
    const currDate = sortedDates[i];
    const prevPrices = pricesByDate.get(prevDate)!;
    const currPrices = pricesByDate.get(currDate)!;

    // Only include companies that were listed by prevDate and have prices on both days.
    // A company on its IPO day (listedDate === currDate) is excluded here — it joins
    // from the next session onwards with 0% first-day drag on the level.
    const returns: number[] = [];
    for (const company of portfolioCompanies) {
      if (company.listedDate > prevDate) continue;
      const prev = prevPrices.get(company.ticker);
      const curr = currPrices.get(company.ticker);
      if (prev && curr && prev > 0) returns.push(curr / prev - 1);
    }

    if (returns.length > 0) {
      const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
      indexValue = indexValue * (1 + avgReturn);
    }

    allPoints.push({ date: currDate, value: round(indexValue) });
  }

  return allPoints.filter((p) => p.date >= fromDate && p.date <= toDate);
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
