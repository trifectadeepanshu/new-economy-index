// eslint-disable-next-line @typescript-eslint/no-require-imports
const yahooFinance = require("yahoo-finance2").default;

export interface QuoteResult {
  ticker: string;
  yfTicker: string;
  price: number | null;
  previousClose: number | null;
  changePct: number | null;
  marketCap: number | null;
  currency: string;
}

export interface HistoricalPrice {
  date: string; // YYYY-MM-DD
  close: number;
}

// Fetch current quote for a single ticker
export async function fetchQuote(yfTicker: string): Promise<QuoteResult> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q: any = await yahooFinance.quote(yfTicker, {}, { validateResult: false });
    const price: number | null = q.regularMarketPrice ?? null;
    const prev: number | null = q.regularMarketPreviousClose ?? null;
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
      marketCap: q.marketCap ?? null,
      currency: q.currency ?? "INR",
    };
  } catch {
    return { ticker: yfTicker.replace(".NS", ""), yfTicker, price: null, previousClose: null, changePct: null, marketCap: null, currency: "INR" };
  }
}

// Fetch quotes for all tickers (batched)
export async function fetchAllQuotes(yfTickers: string[]): Promise<QuoteResult[]> {
  // yahoo-finance2 quoteSummary doesn't batch; use Promise.allSettled for concurrency
  const BATCH = 10;
  const results: QuoteResult[] = [];
  for (let i = 0; i < yfTickers.length; i += BATCH) {
    const slice = yfTickers.slice(i, i + BATCH);
    const settled = await Promise.allSettled(slice.map(fetchQuote));
    for (const r of settled) {
      if (r.status === "fulfilled") results.push(r.value);
      else results.push({ ticker: "", yfTicker: "", price: null, previousClose: null, changePct: null, marketCap: null, currency: "INR" });
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: any[] = await yahooFinance.historical(yfTicker, {
      period1: from,
      period2: to,
      interval: "1d",
    }, { validateResult: false });
    return rows
      .filter((r: any) => r.close !== null && r.close !== undefined)
      .map((r: any) => ({
        date: r.date.toISOString().slice(0, 10),
        close: r.close,
      }));
  } catch {
    return [];
  }
}
