import { neon } from "@neondatabase/serverless";
import {
  COMPANIES,
  INDEX_ANCHOR_DATE,
  INDEX_BASE_DATE,
  INDEX_BASE_VALUE,
  PORTFOLIO_TICKERS,
  SECTORS,
  type Sector,
} from "@/lib/companies";
import type { IndexHistoryPoint, SectorHistoryPoint } from "@/lib/index-api";
import { round } from "@/lib/index-math";
import {
  computeIndexSeries,
  type DailyPrices,
  type EngineMember,
  type EngineOptions,
  type IndexPoint,
  type LiveMember,
  type QuarterlySharesMap,
} from "@/lib/index-engine";

const STOCK_BATCH_SIZE = 500;
const LIVE_STATE_KEY = "live_index_state";

// Index includes the top 50 by market cap each quarter; sub-indices use all members.
const INDEX_TOP_N = 50;
const SUBINDEX_TOP_N = Number.POSITIVE_INFINITY;
const INDEX_ENGINE_OPTIONS: EngineOptions = {
  baseValue: INDEX_BASE_VALUE,
  baseDate: INDEX_BASE_DATE,
  topN: INDEX_TOP_N,
  anchorDate: INDEX_ANCHOR_DATE,
};
const SUBINDEX_ENGINE_OPTIONS: EngineOptions = {
  baseValue: INDEX_BASE_VALUE,
  baseDate: INDEX_BASE_DATE,
  topN: SUBINDEX_TOP_N,
  anchorDate: INDEX_ANCHOR_DATE,
};

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

export type IndexRangeStats = {
  fromDate: string;
  toDate: string;
  high: number | null;
  low: number | null;
};

export type StockSnapshotInput = {
  date: string;
  ticker: string;
  closePrice: number;
  changePct: number | null;
  source?: string;
  providerSymbol?: string | null;
  observedAt?: string;
};

export type LatestStockPrice = {
  price: number;
  changePct: number | null;
};

export type LatestStockSnapshot = LatestStockPrice & {
  date: string;
};

export type DivisorState = {
  divisor: number;
  members: LiveMember[];
};

export type LiveIndexState = DivisorState & {
  /** Portfolio sub-index divisor state, for a consistent live portfolio value. */
  portfolio?: DivisorState;
};

export type CronRunStatus = "running" | "success" | "failed" | "skipped";

export type CronRunFinishInput = {
  status: Exclude<CronRunStatus, "running">;
  date?: string | null;
  stockRows?: number | null;
  missingTickers?: string[];
  indexValue?: number | null;
  error?: string | null;
};

export type CronRunRecord = {
  id: string;
  job: string;
  date: string | null;
  startedAt: string;
  finishedAt: string | null;
  status: CronRunStatus;
  stockRows: number | null;
  missingTickers: string[];
  indexValue: number | null;
  error: string | null;
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

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
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
      date            DATE NOT NULL,
      ticker          VARCHAR(30) NOT NULL,
      close_price     DECIMAL(12, 4) NOT NULL,
      change_pct      DECIMAL(8, 4),
      source          VARCHAR(24) NOT NULL DEFAULT 'unknown',
      provider_symbol VARCHAR(64),
      observed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (date, ticker)
    )
  `;
  await sql`
    ALTER TABLE stock_snapshots
      ADD COLUMN IF NOT EXISTS source VARCHAR(24) NOT NULL DEFAULT 'unknown'
  `;
  await sql`
    ALTER TABLE stock_snapshots
      ADD COLUMN IF NOT EXISTS provider_symbol VARCHAR(64)
  `;
  await sql`
    ALTER TABLE stock_snapshots
      ADD COLUMN IF NOT EXISTS observed_at TIMESTAMPTZ NOT NULL DEFAULT now()
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_stock_ticker_date
      ON stock_snapshots(ticker, date DESC)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_stock_source_date
      ON stock_snapshots(source, date DESC)
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
  await sql`
    CREATE TABLE IF NOT EXISTS benchmark_prices (
      symbol VARCHAR(24) NOT NULL,
      date   DATE NOT NULL,
      close  NUMERIC(14, 2) NOT NULL,
      PRIMARY KEY (symbol, date)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS cron_runs (
      id              BIGSERIAL PRIMARY KEY,
      job             VARCHAR(64) NOT NULL DEFAULT 'snapshot',
      date            DATE,
      started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      finished_at     TIMESTAMPTZ,
      status          VARCHAR(24) NOT NULL,
      stock_rows      INTEGER,
      missing_tickers JSONB NOT NULL DEFAULT '[]'::jsonb,
      index_value     DECIMAL(12, 4),
      error           TEXT
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_cron_runs_started_at
      ON cron_runs(started_at DESC)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_cron_runs_status_date
      ON cron_runs(status, date DESC)
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS company_financials (
      ticker       VARCHAR(30) NOT NULL,
      fiscal_year  DATE NOT NULL,
      revenue      NUMERIC(20, 0),
      ebitda       NUMERIC(20, 0),
      pat          NUMERIC(20, 0),
      total_assets NUMERIC(20, 0),
      PRIMARY KEY (ticker, fiscal_year)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS company_financials_quarterly (
      ticker       VARCHAR(30) NOT NULL,
      quarter_end  DATE NOT NULL,
      revenue      NUMERIC(20, 0),
      ebitda       NUMERIC(20, 0),
      pat          NUMERIC(20, 0),
      total_assets NUMERIC(20, 0),
      PRIMARY KEY (ticker, quarter_end)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS company_profiles (
      ticker      VARCHAR(30) PRIMARY KEY,
      description TEXT,
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS analyst_ratings (
      ticker       VARCHAR(30) PRIMARY KEY,
      strong_buy   INTEGER NOT NULL DEFAULT 0,
      buy          INTEGER NOT NULL DEFAULT 0,
      hold         INTEGER NOT NULL DEFAULT 0,
      sell         INTEGER NOT NULL DEFAULT 0,
      strong_sell  INTEGER NOT NULL DEFAULT 0,
      rating_key   VARCHAR(24),
      num_analysts INTEGER,
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
}

// ---------------------------------------------------------------------------
// Cron observability
// ---------------------------------------------------------------------------

export async function startCronRun(job: string, date: string | null): Promise<number> {
  const sql = getSql();
  const rows = (await sql`
    INSERT INTO cron_runs (job, date, status, stock_rows, missing_tickers)
    VALUES (${job}, ${date}::date, 'running', 0, '[]'::jsonb)
    RETURNING id
  `) as DbRow[];
  return toNumber(rows[0].id);
}

export async function finishCronRun(id: number, input: CronRunFinishInput) {
  const sql = getSql();
  await sql`
    UPDATE cron_runs
    SET finished_at = now(),
        status = ${input.status},
        date = ${input.date ?? null}::date,
        stock_rows = ${input.stockRows ?? null},
        missing_tickers = ${JSON.stringify(input.missingTickers ?? [])}::jsonb,
        index_value = ${input.indexValue ?? null},
        error = ${input.error ?? null}
    WHERE id = ${id}
  `;
}

export async function getRecentCronRuns(limit = 25): Promise<CronRunRecord[]> {
  const sql = getSql();
  const safeLimit = Math.max(1, Math.min(100, Math.trunc(limit)));
  const rows = (await sql`
    SELECT
      id::text,
      job,
      date::text,
      started_at::text,
      finished_at::text,
      status,
      stock_rows,
      missing_tickers,
      index_value::float,
      error
    FROM cron_runs
    ORDER BY started_at DESC
    LIMIT ${safeLimit}
  `) as DbRow[];

  return rows.map((row) => ({
    id: String(row.id),
    job: String(row.job),
    date: row.date == null ? null : String(row.date),
    startedAt: String(row.started_at),
    finishedAt: row.finished_at == null ? null : String(row.finished_at),
    status: String(row.status) as CronRunStatus,
    stockRows: row.stock_rows == null ? null : Number(row.stock_rows),
    missingTickers: toStringArray(row.missing_tickers),
    indexValue: toNullableNumber(row.index_value),
    error: row.error == null ? null : String(row.error),
  }));
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

/** Slice to [from, to]. The index level is a unitless number (same in any currency). */
function slice(points: IndexPoint[], fromDate: string, toDate: string): IndexHistoryPoint[] {
  return points
    .filter((p) => p.date >= fromDate && p.date <= toDate)
    .map((p) => ({ date: p.date, value: round(p.value, 4) }));
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
  const [prices, shares] = await Promise.all([loadAllPrices(), getSharesMap()]);

  const main = computeIndexSeries(prices, shares, ALL_MEMBERS, INDEX_ENGINE_OPTIONS);
  const data = slice(main.points, fromDate, toDate);

  const sectorData: SectorHistoryPoint[] = [];
  if (opts.sectors) {
    for (const sector of SECTORS) {
      const members = MEMBERS_BY_SECTOR.get(sector) ?? [];
      const result = computeIndexSeries(prices, shares, members, SUBINDEX_ENGINE_OPTIONS);
      for (const p of result.points) {
        if (p.date < fromDate || p.date > toDate) continue;
        sectorData.push({ date: p.date, sector, value: round(p.value, 4), numCompanies: p.numCompanies });
      }
    }
  }

  let portfolioData: IndexHistoryPoint[] = [];
  if (opts.portfolio) {
    const result = computeIndexSeries(prices, shares, PORTFOLIO_MEMBERS, SUBINDEX_ENGINE_OPTIONS);
    portfolioData = slice(result.points, fromDate, toDate);
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
  const { points, divisor, members } = computeIndexSeries(
    prices,
    shares,
    ALL_MEMBERS,
    INDEX_ENGINE_OPTIONS
  );
  const portfolio = computeIndexSeries(
    prices,
    shares,
    PORTFOLIO_MEMBERS,
    SUBINDEX_ENGINE_OPTIONS
  );

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

  // Drop stale rows for dates the engine no longer produces (e.g. a non-trading
  // day that briefly had partial live prices), so history stays in sync.
  await sql`
    DELETE FROM index_snapshots
    WHERE date <> ALL(${rows.map((r) => r.date)}::date[])
  `;

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

/**
 * The index close on the latest trading day strictly before `beforeDate` — the
 * correct reference for an intraday day-change (the previous session's close),
 * so the change doesn't collapse to ~0 once the cron persists today's row.
 */
export async function getReferenceIndexClose(beforeDate: string): Promise<number | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT value::float AS value
    FROM index_snapshots
    WHERE date < ${beforeDate}::date
    ORDER BY date DESC
    LIMIT 1
  `;
  return rows.length ? toNumber(rows[0].value) : null;
}

export async function getIndexRangeStats(
  fromDate: string,
  toDate: string
): Promise<IndexRangeStats> {
  const sql = getSql();
  const rows = await sql`
    SELECT max(value)::float AS high, min(value)::float AS low
    FROM index_snapshots
    WHERE date >= ${fromDate}::date
      AND date <= ${toDate}::date
  `;
  const row = rows[0] ?? {};
  return {
    fromDate,
    toDate,
    high: toNullableNumber(row.high),
    low: toNullableNumber(row.low),
  };
}

export async function upsertStockSnapshotsBatch(rows: StockSnapshotInput[]) {
  if (!rows.length) return;
  const sql = getSql();

  for (let i = 0; i < rows.length; i += STOCK_BATCH_SIZE) {
    const chunk = rows.slice(i, i + STOCK_BATCH_SIZE);
    await sql`
      INSERT INTO stock_snapshots (
        date,
        ticker,
        close_price,
        change_pct,
        source,
        provider_symbol,
        observed_at
      )
      SELECT * FROM unnest(
        ${chunk.map((r) => r.date)}::date[],
        ${chunk.map((r) => r.ticker)}::varchar[],
        ${chunk.map((r) => r.closePrice)}::decimal[],
        ${chunk.map((r) => r.changePct)}::decimal[],
        ${chunk.map((r) => r.source ?? "unknown")}::varchar[],
        ${chunk.map((r) => r.providerSymbol ?? null)}::varchar[],
        ${chunk.map((r) => r.observedAt ?? new Date().toISOString())}::timestamptz[]
      ) AS t(date, ticker, close_price, change_pct, source, provider_symbol, observed_at)
      ON CONFLICT (date, ticker) DO UPDATE
        SET close_price = EXCLUDED.close_price,
            change_pct = EXCLUDED.change_pct,
            source = EXCLUDED.source,
            provider_symbol = EXCLUDED.provider_symbol,
            observed_at = EXCLUDED.observed_at
    `;
  }
}

export async function getLatestStockPrices(): Promise<Record<string, LatestStockPrice>> {
  const snapshots = await getLatestStockSnapshots();
  return Object.fromEntries(
    Object.entries(snapshots).map(([ticker, { price, changePct }]) => [
      ticker,
      { price, changePct },
    ])
  );
}

export async function getLatestStockSnapshots(): Promise<Record<string, LatestStockSnapshot>> {
  const sql = getSql();
  const rows = await sql`
    SELECT DISTINCT ON (ticker) ticker, date::text, close_price::float, change_pct::float
    FROM stock_snapshots
    ORDER BY ticker, date DESC
  `;

  const prices: Record<string, LatestStockSnapshot> = {};
  for (const row of rows) {
    prices[toTicker(row.ticker)] = {
      date: String(row.date),
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
