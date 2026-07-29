/**
 * Company detail for the constituent modal: description, quarterly financials
 * with derived metrics, analyst consensus, and share-price history. Monetary
 * values are converted to the requested currency (financials reported in INR by
 * Yahoo).
 */
import { neon } from "@neondatabase/serverless";
import { getFxRates, fetchLiveUsdInr } from "@/lib/fx";
import type {
  AnalystConsensus,
  CompanyDetail,
  CompanyFinancialPeriod,
  Currency,
} from "@/lib/index-api";

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL env var is not set");
  return neon(url);
}

export type FinancialRawRow = {
  period: string;
  revenue: number | null;
  ebitda: number | null;
  pat: number | null;
  total_assets: number | null;
};

type FinancialMetric = "revenue" | "ebitda" | "pat";

const FINANCIAL_METRICS: FinancialMetric[] = ["revenue", "ebitda", "pat"];

const pct = (num: number | null, den: number | null): number | null =>
  num != null && den != null && den !== 0 ? Math.round((num / den) * 1000) / 10 : null;

const round1 = (value: number): number => Math.round(value * 10) / 10;
const round2 = (value: number): number => Math.round(value * 100) / 100;

export function quarterLabel(quarterEnd: string): string {
  const [year, month] = quarterEnd.split("-").map(Number);
  const quarterByMonth: Record<number, number> = { 3: 4, 6: 1, 9: 2, 12: 3 };
  const quarter = quarterByMonth[month] ?? Math.ceil(month / 3);
  const fiscalYear = month <= 3 ? year : year + 1;
  return `Q${quarter} FY${String(fiscalYear).slice(2)}`;
}

function sameQuarterPreviousYear(period: string): string {
  const year = Number(period.slice(0, 4));
  return `${year - 1}${period.slice(4)}`;
}

function shiftQuarterEnd(period: string, quarters: number): string {
  const [year, month] = period.split("-").map(Number);
  const monthIndex = month - 1 + quarters * 3;
  const endOfTargetMonth = new Date(Date.UTC(year, monthIndex + 1, 0));
  return endOfTargetMonth.toISOString().slice(0, 10);
}

function fiscalQuarterPeriods(fiscalYearEnd: string) {
  return [-3, -2, -1, 0].map((quarterOffset) =>
    shiftQuarterEnd(fiscalYearEnd, quarterOffset)
  );
}

function emptyFinancialRow(period: string): FinancialRawRow {
  return { period, revenue: null, ebitda: null, pat: null, total_assets: null };
}

function completeQuarterSlots(rows: FinancialRawRow[]) {
  if (!rows.length) return rows;

  const byPeriod = new Map(rows.map((row) => [row.period, row]));
  const sortedPeriods = [...byPeriod.keys()].sort();
  const first = sortedPeriods[0];
  const last = sortedPeriods[sortedPeriods.length - 1];
  const completed: FinancialRawRow[] = [];

  for (let period = first; period <= last; period = shiftQuarterEnd(period, 1)) {
    completed.push(byPeriod.get(period) ?? emptyFinancialRow(period));
  }

  return completed;
}

export function completeQuarterlyFinancialRows(
  quarterlyRows: FinancialRawRow[],
  annualRows: FinancialRawRow[] = []
) {
  const byPeriod = new Map(
    quarterlyRows.map((row) => [row.period, { ...row } satisfies FinancialRawRow])
  );

  for (const annual of [...annualRows].sort((a, b) => a.period.localeCompare(b.period))) {
    const periods = fiscalQuarterPeriods(annual.period);

    for (const metric of FINANCIAL_METRICS) {
      const annualValue = annual[metric];
      if (annualValue == null) continue;

      const missingPeriods = periods.filter((period) => byPeriod.get(period)?.[metric] == null);
      const knownValues = periods
        .map((period) => byPeriod.get(period)?.[metric])
        .filter((value): value is number => value != null);

      if (missingPeriods.length !== 1 || knownValues.length !== 3) continue;

      const missingPeriod = missingPeriods[0];
      const row = byPeriod.get(missingPeriod) ?? emptyFinancialRow(missingPeriod);
      row[metric] = annualValue - knownValues.reduce((sum, value) => sum + value, 0);
      byPeriod.set(missingPeriod, row);
    }

    const fiscalYearEndRow = byPeriod.get(annual.period);
    if (fiscalYearEndRow && fiscalYearEndRow.total_assets == null) {
      fiscalYearEndRow.total_assets = annual.total_assets;
    }
  }

  return completeQuarterSlots([...byPeriod.values()]);
}

function ttmRevenue(rows: FinancialRawRow[], index: number): number | null {
  const trailing = rows.slice(Math.max(0, index - 3), index + 1);
  if (trailing.length < 4) return null;
  let total = 0;
  for (const row of trailing) {
    if (row.revenue == null) return null;
    total += row.revenue;
  }
  return total;
}

function assetsAsOf(rows: FinancialRawRow[], index: number): number | null {
  for (let i = index; i >= 0; i--) {
    const assets = rows[i].total_assets;
    if (assets != null) return assets;
  }
  return null;
}

export function buildQuarterlyFinancials(
  rows: FinancialRawRow[],
  money: (value: number | null) => number | null = (value) => value,
  annualRows: FinancialRawRow[] = []
): CompanyFinancialPeriod[] {
  const sorted = completeQuarterlyFinancialRows(rows, annualRows);
  const byPeriod = new Map(sorted.map((row) => [row.period, row]));

  return sorted.map((row, index) => {
    const prevYear = byPeriod.get(sameQuarterPreviousYear(row.period));
    const trailingRevenue = ttmRevenue(sorted, index);
    const assets = assetsAsOf(sorted, index);

    return {
      period: row.period,
      label: quarterLabel(row.period),
      revenue: money(row.revenue),
      pat: money(row.pat),
      ebitdaMargin: pct(row.ebitda, row.revenue),
      patMargin: pct(row.pat, row.revenue),
      revenueGrowth:
        prevYear?.revenue && row.revenue
          ? round1((row.revenue / prevYear.revenue - 1) * 100)
          : null,
      assetTurnover:
        assets != null && assets !== 0 && trailingRevenue != null
          ? round2(trailingRevenue / assets)
          : null,
    };
  });
}

export async function getCompanyDetail(ticker: string, currency: Currency): Promise<CompanyDetail> {
  const sql = getSql();
  const [finRaw, annualFinRaw, profRaw, ratingRaw, priceRaw, sharesRaw, fx] = await Promise.all([
    sql`SELECT quarter_end::text AS period, revenue::float, ebitda::float, pat::float, total_assets::float
        FROM company_financials_quarterly WHERE ticker = ${ticker} ORDER BY quarter_end ASC`,
    sql`SELECT fiscal_year::text AS period, revenue::float, ebitda::float, pat::float, total_assets::float
        FROM company_financials WHERE ticker = ${ticker} ORDER BY fiscal_year ASC`,
    sql`SELECT description FROM company_profiles WHERE ticker = ${ticker}`,
    sql`SELECT strong_buy, buy, hold, sell, strong_sell, rating_key, num_analysts
        FROM analyst_ratings WHERE ticker = ${ticker}`,
    sql`SELECT date::text AS date, close_price::float AS close
        FROM stock_snapshots WHERE ticker = ${ticker} ORDER BY date ASC`,
    sql`SELECT as_of::text AS as_of, shares::float AS shares
        FROM share_counts WHERE ticker = ${ticker} ORDER BY as_of ASC`,
    getFxRates(),
  ]);
  const finRows = finRaw as FinancialRawRow[];
  const annualFinRows = annualFinRaw as FinancialRawRow[];
  const profRows = profRaw as { description: string | null }[];
  const ratingRows = ratingRaw as { strong_buy: number; buy: number; hold: number; sell: number; strong_sell: number; rating_key: string | null; num_analysts: number | null }[];
  const priceRows = priceRaw as { date: string; close: number }[];
  const shareRows = sharesRaw as { as_of: string; shares: number }[];

  const usd = currency === "usd";
  const rate = usd ? await fetchLiveUsdInr(fx.points.at(-1)?.rate ?? fx.baseRate) : 1;
  const money = (v: number | null): number | null => (v == null ? null : usd ? Math.round((v / rate) * 100) / 100 : v);

  const financials = buildQuarterlyFinancials(finRows, money, annualFinRows);

  const rt = ratingRows[0];
  const analyst: AnalystConsensus | null =
    rt && (rt.strong_buy || rt.buy || rt.hold || rt.sell || rt.strong_sell || rt.rating_key)
      ? {
          strongBuy: rt.strong_buy,
          buy: rt.buy,
          hold: rt.hold,
          sell: rt.sell,
          strongSell: rt.strong_sell,
          key: rt.rating_key,
          numAnalysts: rt.num_analysts,
        }
      : null;

  // Point-in-time shares for a date: the latest count as of that date, else the
  // earliest known (held back so early history still gets a market cap).
  const sharesAt = (date: string): number | null => {
    if (!shareRows.length) return null;
    let val = shareRows[0].shares;
    for (const s of shareRows) {
      if (s.as_of <= date) val = s.shares;
      else break;
    }
    return val;
  };

  const priceSeries = priceRows.map((p) => {
    const shares = sharesAt(p.date);
    return {
      date: p.date,
      close: money(p.close) ?? p.close,
      marketCap: shares != null ? money(p.close * shares) : null,
    };
  });

  return {
    ticker,
    currency,
    description: profRows[0]?.description ?? null,
    financials,
    analyst,
    priceSeries,
  };
}
