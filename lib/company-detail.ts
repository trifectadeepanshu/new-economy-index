/**
 * Company detail for the constituent modal: description, annual financials with
 * derived metrics, analyst consensus, and share-price history. Monetary values
 * are converted to the requested currency (financials reported in INR by Yahoo).
 */
import { neon } from "@neondatabase/serverless";
import { getFxRates, fetchLiveUsdInr } from "@/lib/fx";
import type {
  AnalystConsensus,
  CompanyDetail,
  CompanyFinancialYear,
  Currency,
} from "@/lib/index-api";

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL env var is not set");
  return neon(url);
}

function fyLabel(fiscalYear: string): string {
  // Indian FY ends in March; label by the ending year (2026-03-31 -> FY26).
  const [y, m] = fiscalYear.split("-").map(Number);
  const endYear = m <= 3 ? y : y + 1;
  return `FY${String(endYear).slice(2)}`;
}

const pct = (num: number | null, den: number | null): number | null =>
  num != null && den != null && den !== 0 ? Math.round((num / den) * 1000) / 10 : null;

export async function getCompanyDetail(ticker: string, currency: Currency): Promise<CompanyDetail> {
  const sql = getSql();
  const [finRaw, profRaw, ratingRaw, priceRaw, fx] = await Promise.all([
    sql`SELECT fiscal_year::text AS fy, revenue::float, ebitda::float, pat::float, total_assets::float
        FROM company_financials WHERE ticker = ${ticker} ORDER BY fiscal_year ASC`,
    sql`SELECT description FROM company_profiles WHERE ticker = ${ticker}`,
    sql`SELECT strong_buy, buy, hold, sell, strong_sell, rating_key, num_analysts
        FROM analyst_ratings WHERE ticker = ${ticker}`,
    sql`SELECT date::text AS date, close_price::float AS close
        FROM stock_snapshots WHERE ticker = ${ticker} ORDER BY date ASC`,
    getFxRates(),
  ]);
  const finRows = finRaw as { fy: string; revenue: number | null; ebitda: number | null; pat: number | null; total_assets: number | null }[];
  const profRows = profRaw as { description: string | null }[];
  const ratingRows = ratingRaw as { strong_buy: number; buy: number; hold: number; sell: number; strong_sell: number; rating_key: string | null; num_analysts: number | null }[];
  const priceRows = priceRaw as { date: string; close: number }[];

  const usd = currency === "usd";
  const rate = usd ? await fetchLiveUsdInr(fx.points.at(-1)?.rate ?? fx.baseRate) : 1;
  const money = (v: number | null): number | null => (v == null ? null : usd ? Math.round((v / rate) * 100) / 100 : v);

  const financials: CompanyFinancialYear[] = finRows.map((r, i) => {
    const prev = i > 0 ? finRows[i - 1] : null;
    return {
      fy: fyLabel(r.fy),
      revenue: money(r.revenue),
      pat: money(r.pat),
      ebitdaMargin: pct(r.ebitda, r.revenue),
      patMargin: pct(r.pat, r.revenue),
      revenueGrowth:
        prev && prev.revenue && r.revenue ? Math.round((r.revenue / prev.revenue - 1) * 1000) / 10 : null,
      assetIntensity:
        r.total_assets && r.revenue ? Math.round((r.total_assets / r.revenue) * 100) / 100 : null,
    };
  });

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
