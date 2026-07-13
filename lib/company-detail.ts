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

type FinancialRawRow = {
  period: string;
  revenue: number | null;
  ebitda: number | null;
  pat: number | null;
  total_assets: number | null;
};

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
  money: (value: number | null) => number | null = (value) => value
): CompanyFinancialPeriod[] {
  const sorted = [...rows].sort((a, b) => a.period.localeCompare(b.period));
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
      assetIntensity:
        assets != null && trailingRevenue != null && trailingRevenue !== 0
          ? round2(assets / trailingRevenue)
          : null,
    };
  });
}

export async function getCompanyDetail(ticker: string, currency: Currency): Promise<CompanyDetail> {
  const sql = getSql();
  const [finRaw, profRaw, ratingRaw, priceRaw, fx] = await Promise.all([
    sql`SELECT quarter_end::text AS period, revenue::float, ebitda::float, pat::float, total_assets::float
        FROM company_financials_quarterly WHERE ticker = ${ticker} ORDER BY quarter_end ASC`,
    sql`SELECT description FROM company_profiles WHERE ticker = ${ticker}`,
    sql`SELECT strong_buy, buy, hold, sell, strong_sell, rating_key, num_analysts
        FROM analyst_ratings WHERE ticker = ${ticker}`,
    sql`SELECT date::text AS date, close_price::float AS close
        FROM stock_snapshots WHERE ticker = ${ticker} ORDER BY date ASC`,
    getFxRates(),
  ]);
  const finRows = finRaw as FinancialRawRow[];
  const profRows = profRaw as { description: string | null }[];
  const ratingRows = ratingRaw as { strong_buy: number; buy: number; hold: number; sell: number; strong_sell: number; rating_key: string | null; num_analysts: number | null }[];
  const priceRows = priceRaw as { date: string; close: number }[];

  const usd = currency === "usd";
  const rate = usd ? await fetchLiveUsdInr(fx.points.at(-1)?.rate ?? fx.baseRate) : 1;
  const money = (v: number | null): number | null => (v == null ? null : usd ? Math.round((v / rate) * 100) / 100 : v);

  const financials = buildQuarterlyFinancials(finRows, money);

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

  const priceSeries = priceRows.map((p) => ({
    date: p.date,
    close: money(p.close) ?? p.close,
  }));

  return {
    ticker,
    currency,
    description: profRows[0]?.description ?? null,
    financials,
    analyst,
    priceSeries,
  };
}
