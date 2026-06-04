import { neon } from "@neondatabase/serverless";
import { COMPANIES, INDEX_BASE_VALUE, PORTFOLIO_TICKERS, SECTORS, type Sector } from "@/lib/companies";
import type { IndexHistoryPoint, SectorHistoryPoint } from "@/lib/index-api";
import { priceRatio, round, weightedAverage } from "@/lib/index-math";
import type { MarketCapMap } from "@/lib/market-caps";

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

type WeightedSet = { ratios: number[]; weights: number[] };

function collectWeighted(
  companies: { ticker: string; listedDate: string }[],
  date: string,
  prices: Map<string, number>,
  basePrices: Record<string, number>,
  marketCaps: MarketCapMap
): WeightedSet {
  const ratios: number[] = [];
  const weights: number[] = [];
  for (const company of companies) {
    if (company.listedDate > date) continue;
    const ratio = priceRatio(
      prices.get(company.ticker) ?? null,
      basePrices[company.ticker] ?? null
    );
    const cap = marketCaps[company.ticker];
    if (ratio === null || !cap || cap <= 0) continue;
    ratios.push(ratio);
    weights.push(cap);
  }
  return { ratios, weights };
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
  toDate: string,
  marketCaps: MarketCapMap
): Promise<IndexHistoryPoint[]> {
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
  const points: IndexHistoryPoint[] = [];

  for (const [date, prices] of pricesByDate) {
    const { ratios, weights } = collectWeighted(COMPANIES, date, prices, basePrices, marketCaps);
    const weighted = weightedAverage(ratios, weights);
    if (weighted === null) continue;
    points.push({ date, value: round(INDEX_BASE_VALUE * weighted, 4) });
  }

  return points;
}

export type SectorIndexHistoryPoint = SectorHistoryPoint;

export async function getSectorIndexHistory(
  fromDate: string,
  toDate: string,
  marketCaps: MarketCapMap
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
      const companies = COMPANIES_BY_SECTOR.get(sector) ?? [];
      const { ratios, weights } = collectWeighted(companies, date, prices, basePrices, marketCaps);
      const weighted = weightedAverage(ratios, weights);
      if (weighted === null) continue;

      points.push({
        date,
        sector,
        value: round(INDEX_BASE_VALUE * weighted, 4),
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
  toDate: string,
  marketCaps: MarketCapMap
): Promise<IndexHistoryPoint[]> {
  const sql = getSql();
  const tickers = [...PORTFOLIO_TICKERS];
  const portfolioCompanies = COMPANIES.filter((c) => PORTFOLIO_TICKERS.has(c.ticker));

  const [rows, basePrices] = await Promise.all([
    sql`
      SELECT date::text, ticker, close_price::float
      FROM stock_snapshots
      WHERE ticker = ANY(${tickers}::varchar[])
        AND date >= ${fromDate} AND date <= ${toDate}
      ORDER BY date ASC
    `,
    getEarliestPricesPerTicker(),
  ]);

  const pricesByDate = stockPricesByDate(rows);
  const points: IndexHistoryPoint[] = [];

  for (const [date, prices] of pricesByDate) {
    const { ratios, weights } = collectWeighted(
      portfolioCompanies,
      date,
      prices,
      basePrices,
      marketCaps
    );
    const weighted = weightedAverage(ratios, weights);
    if (weighted === null) continue;
    points.push({ date, value: round(INDEX_BASE_VALUE * weighted, 4) });
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
