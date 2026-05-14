// eslint-disable-next-line @typescript-eslint/no-require-imports
const YahooFinanceClass = require("yahoo-finance2").default as YahooFinanceConstructor;
// yahoo-finance2 v3 requires instantiation
const yahooFinance = new YahooFinanceClass({ suppressNotices: ["yahooSurvey"] });

interface YahooQuote {
  regularMarketPrice?: number | null;
  regularMarketPreviousClose?: number | null;
  currency?: string | null;
}

interface YahooHistoricalRow {
  date: Date | string | number;
  close?: number | null;
}

interface YahooFinanceClient {
  quote(
    yfTicker: string,
    queryOptions?: Record<string, never>,
    moduleOptions?: { validateResult?: boolean }
  ): Promise<YahooQuote>;
  historical(
    yfTicker: string,
    queryOptions: { period1: Date; period2: Date; interval: "1d" },
    moduleOptions?: { validateResult?: boolean }
  ): Promise<YahooHistoricalRow[]>;
}

type YahooFinanceConstructor = new (options?: {
  suppressNotices?: string[];
}) => YahooFinanceClient;

export interface QuoteResult {
  ticker: string;
  yfTicker: string;
  price: number | null;
  previousClose: number | null;
  changePct: number | null;
  currency: string;
}

export interface HistoricalPrice {
  date: string; // YYYY-MM-DD
  close: number;
}

// Fetch current quote for a single ticker
export async function fetchQuote(yfTicker: string): Promise<QuoteResult> {
  try {
    const q = await yahooFinance.quote(yfTicker, {}, { validateResult: false });
    const price: number | null = q?.regularMarketPrice ?? null;
    const prev: number | null = q?.regularMarketPreviousClose ?? null;
    const changePct =
      price !== null && prev !== null && prev !== 0
        ? ((price - prev) / prev) * 100
        : null;
    return {
      ticker: yfTicker.replace(".NS", ""),
      yfTicker,
      price,
      previousClose: prev,
      changePct,
      currency: q?.currency ?? "INR",
    };
  } catch {
    return {
      ticker: yfTicker.replace(".NS", ""),
      yfTicker,
      price: null,
      previousClose: null,
      changePct: null,
      currency: "INR",
    };
  }
}

// Fetch quotes for all tickers (batched)
export async function fetchAllQuotes(yfTickers: string[]): Promise<QuoteResult[]> {
  const BATCH = 10;
  const results: QuoteResult[] = [];
  for (let i = 0; i < yfTickers.length; i += BATCH) {
    const slice = yfTickers.slice(i, i + BATCH);
    const settled = await Promise.allSettled(slice.map(fetchQuote));
    for (const r of settled) {
      if (r.status === "fulfilled") results.push(r.value);
      else {
        results.push({
          ticker: "",
          yfTicker: "",
          price: null,
          previousClose: null,
          changePct: null,
          currency: "INR",
        });
      }
    }
  }
  return results;
}

// Fetch daily historical closes for a ticker between two dates
export async function fetchHistorical(
  yfTicker: string,
  from: Date,
  to: Date
): Promise<HistoricalPrice[]> {
  try {
    const rows = await yahooFinance.historical(yfTicker, {
      period1: from,
      period2: to,
      interval: "1d",
    }, { validateResult: false });
    return rows
      .filter((r): r is YahooHistoricalRow & { close: number } => (
        typeof r.close === "number" && Number.isFinite(r.close)
      ))
      .map((r) => ({
        date: new Date(r.date).toISOString().slice(0, 10),
        close: r.close,
      }));
  } catch {
    return [];
  }
}
