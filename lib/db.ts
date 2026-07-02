import { neon } from "@neondatabase/serverless";
import {
  COMPANIES,
  INDEX_BASE_DATE,
  INDEX_BASE_VALUE,
  PORTFOLIO_TICKERS,
  SECTORS,
  type Sector,
} from "@/lib/companies";
import type { IndexHistoryPoint, SectorHistoryPoint } from "@/lib/index-api";
import { round } from "@/lib/index-math";
import { getFxRates, rateAsOf, toUsdIndex, type FxRates } from "@/lib/fx";
import {
  computeIndexSeries,
  type DailyPrices,
  type EngineMember,
  type IndexPoint,
  type LiveMember,
  type QuarterlySharesMap,
} from "@/lib/index-engine";

const STOCK_BATCH_SIZE = 500;
const LIVE_STATE_KEY = "live_index_state";

// Index includes the top 50 by market cap each quarter; sub-indices use all members.
const INDEX_TOP_N = 50;
const SUBINDEX_TOP_N = Number.POSITIVE_INFINITY;

const ALL_MEMBERS: EngineMember[] = COMPANIES.map((c) => ({
  ticker: c.ticker,
  listedDate: c.listedDate,
}));
const MEMBERS_BY_SECTOR = new Map<Sector, EngineMember[]>(
  SECTORS.map((sector) => [
    sector,
    COMPANIES.filter((c) => c.sector === sector).map((c) => ({
      ticker: c.ticker,
      listedDate: c.listedDate,
    })),
  ])
);
const PORTFOLIO_MEMBERS: EngineMember[] = COMPANIES.filter((c) =>
  PORTFOLIO_TICKERS.has(c.ticker)
).map((c) => ({ ticker: c.ticker, listedDate: c.listedDate }));

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

export type DivisorState = {
  divisor: number;
  members: LiveMember[];
};

export type LiveIndexState = DivisorState & {
  /** Portfolio sub-index divisor state, for a consistent live portfolio value. */
  portfolio?: DivisorState;
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

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export async function ensureSchema() {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS index_snapshots (
      date          DATE PRIMARY KEY,
      value         DECIMAL(12, 4) NOT NULL,
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
    CREATE TABLE IF NOT EXISTS share_counts (
      ticker  VARCHAR(30) NOT NULL,
      as_of   DATE NOT NULL,
      shares  NUMERIC(20, 0) NOT NULL,
      source  VARCHAR(24) NOT NULL,
      PRIMARY KEY (ticker, as_of)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS settings (
      key        VARCHAR(64) PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS fx_rates (
      date DATE PRIMARY KEY,
      rate NUMERIC(10, 4) NOT NULL
    )
  `;
}

// ---------------------------------------------------------------------------
// Engine inputs
// ---------------------------------------------------------------------------

/** Load every stored daily close as date -> (ticker -> close). */
async function loadAllPrices(): Promise<DailyPrices> {
  const sql = getSql();
  const rows = (await sql`
    SELECT date::text AS date, ticker, close_price::float AS close
    FROM stock_snapshots
    ORDER BY date ASC
  `) as DbRow[];

  const prices: DailyPrices = new Map();
  for (const row of rows) {
    const date = String(row.date);
    let day = prices.get(date);
    if (!day) prices.set(date, (day = new Map()));
    day.set(toTicker(row.ticker), toNumber(row.close));
  }
  return prices;
}

/** Point-in-time share-count history per ticker (sorted ascending by asOf). */
export async function getSharesMap(): Promise<QuarterlySharesMap> {
  const sql = getSql();
  const rows = (await sql`
    SELECT ticker, as_of::text AS as_of, shares::float AS shares
    FROM share_counts
    ORDER BY ticker, as_of ASC
  `) as DbRow[];
  const map: QuarterlySharesMap = new Map();
  for (const r of rows) {
    const ticker = toTicker(r.ticker);
    let arr = map.get(ticker);
    if (!arr) map.set(ticker, (arr = []));
    arr.push({ asOf: String(r.as_of), shares: toNumber(r.shares) });
  }
  return map;
}

/** Slice to [from, to] and convert each INR level to USD via that date's rate. */
function slice(points: IndexPoint[], fromDate: string, toDate: string, fx: FxRates): IndexHistoryPoint[] {
  return points
    .filter((p) => p.date >= fromDate && p.date <= toDate)
    .map((p) => ({
      date: p.date,
      value: round(toUsdIndex(p.value, rateAsOf(fx.points, p.date) ?? fx.baseRate, fx.baseRate), 4),
    }));
}

// ---------------------------------------------------------------------------
// History (divisor index — computed from inception, then sliced)
// ---------------------------------------------------------------------------

export type IndexHistoryBundle = {
  data: IndexHistoryPoint[];
  sectorData: SectorHistoryPoint[];
  portfolioData: IndexHistoryPoint[];
};

export async function getIndexHistoryBundle(
  fromDate: string,
  toDate: string,
  opts: { sectors: boolean; portfolio: boolean }
): Promise<IndexHistoryBundle> {
  const [prices, shares, fx] = await Promise.all([loadAllPrices(), getSharesMap(), getFxRates()]);
  const indexOpts = { baseValue: INDEX_BASE_VALUE, baseDate: INDEX_BASE_DATE, topN: INDEX_TOP_N };
  const subOpts = { baseValue: INDEX_BASE_VALUE, baseDate: INDEX_BASE_DATE, topN: SUBINDEX_TOP_N };

  const main = computeIndexSeries(prices, shares, ALL_MEMBERS, indexOpts);
  const data = slice(main.points, fromDate, toDate, fx);

  const sectorData: SectorHistoryPoint[] = [];
  if (opts.sectors) {
    for (const sector of SECTORS) {
      const members = MEMBERS_BY_SECTOR.get(sector) ?? [];
      const result = computeIndexSeries(prices, shares, members, subOpts);
      for (const p of result.points) {
        if (p.date < fromDate || p.date > toDate) continue;
        const rate = rateAsOf(fx.points, p.date) ?? fx.baseRate;
        sectorData.push({
          date: p.date,
          sector,
          value: round(toUsdIndex(p.value, rate, fx.baseRate), 4),
          numCompanies: p.numCompanies,
        });
      }
    }
  }

  let portfolioData: IndexHistoryPoint[] = [];
  if (opts.portfolio) {
    const result = computeIndexSeries(prices, shares, PORTFOLIO_MEMBERS, subOpts);
    portfolioData = slice(result.points, fromDate, toDate, fx);
  }

  return { data, sectorData, portfolioData };
}

// ---------------------------------------------------------------------------
// Recompute + persist (cron / backfill)
// ---------------------------------------------------------------------------

/**
 * Recompute the full divisor index from all stored prices and persist:
 *   - the complete daily series into index_snapshots (corrects history too)
 *   - the live divisor + composition into settings (for intraday live value)
 */
export async function recomputeAndPersistIndex(): Promise<{
  latestDate: string | null;
  latestValue: number | null;
  numCompanies: number;
}> {
  const sql = getSql();
  const [prices, shares] = await Promise.all([loadAllPrices(), getSharesMap()]);
  const indexOpts = { baseValue: INDEX_BASE_VALUE, baseDate: INDEX_BASE_DATE, topN: INDEX_TOP_N };
  const subOpts = { baseValue: INDEX_BASE_VALUE, baseDate: INDEX_BASE_DATE, topN: SUBINDEX_TOP_N };
  const { points, divisor, members } = computeIndexSeries(prices, shares, ALL_MEMBERS, indexOpts);
  const portfolio = computeIndexSeries(prices, shares, PORTFOLIO_MEMBERS, subOpts);

  if (!points.length) {
    return { latestDate: null, latestValue: null, numCompanies: 0 };
  }

  // Daily change_pct = day-over-day index return.
  const rows = points.map((p, i) => ({
    date: p.date,
    value: p.value,
    changePct: i > 0 ? round((p.value / points[i - 1].value - 1) * 100, 4) : null,
    num: p.numCompanies,
  }));

  for (let i = 0; i < rows.length; i += STOCK_BATCH_SIZE) {
    const chunk = rows.slice(i, i + STOCK_BATCH_SIZE);
    await sql`
      INSERT INTO index_snapshots (date, value, change_pct, num_companies)
      SELECT * FROM unnest(
        ${chunk.map((r) => r.date)}::date[],
        ${chunk.map((r) => r.value)}::decimal[],
        ${chunk.map((r) => r.changePct)}::decimal[],
        ${chunk.map((r) => r.num)}::integer[]
      ) AS t(date, value, change_pct, num_companies)
      ON CONFLICT (date) DO UPDATE
        SET value = EXCLUDED.value,
            change_pct = EXCLUDED.change_pct,
            num_companies = EXCLUDED.num_companies
    `;
  }

  const state: LiveIndexState = {
    divisor,
    members,
    portfolio: { divisor: portfolio.divisor, members: portfolio.members },
  };
  await sql`
    INSERT INTO settings (key, value, updated_at)
    VALUES (${LIVE_STATE_KEY}, ${JSON.stringify(state)}, now())
    ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value, updated_at = now()
  `;

  const last = points[points.length - 1];
  return { latestDate: last.date, latestValue: last.value, numCompanies: last.numCompanies };
}

export async function getLiveIndexState(): Promise<LiveIndexState | null> {
  const sql = getSql();
  const rows = (await sql`SELECT value FROM settings WHERE key = ${LIVE_STATE_KEY}`) as DbRow[];
  if (!rows.length) return null;
  try {
    const parsed = JSON.parse(String(rows[0].value)) as LiveIndexState;
    if (typeof parsed.divisor === "number" && Array.isArray(parsed.members)) return parsed;
  } catch {
    /* ignore malformed state */
  }
  return null;
}

// ---------------------------------------------------------------------------
// Snapshots (latest + writes)
// ---------------------------------------------------------------------------

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

export async function upsertStockSnapshotsBatch(rows: StockSnapshotInput[]) {
  if (!rows.length) return;
  const sql = getSql();

  for (let i = 0; i < rows.length; i += STOCK_BATCH_SIZE) {
    const chunk = rows.slice(i, i + STOCK_BATCH_SIZE);
    await sql`
      INSERT INTO stock_snapshots (date, ticker, close_price, change_pct)
      SELECT * FROM unnest(
        ${chunk.map((r) => r.date)}::date[],
        ${chunk.map((r) => r.ticker)}::varchar[],
        ${chunk.map((r) => r.closePrice)}::decimal[],
        ${chunk.map((r) => r.changePct)}::decimal[]
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

/** Earliest stored close per ticker — used for per-stock "since inception" display. */
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
