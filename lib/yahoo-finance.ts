// eslint-disable-next-line @typescript-eslint/no-require-imports
const YahooFinanceClass = require("yahoo-finance2").default as YahooFinanceConstructor;
// yahoo-finance2 v3 requires instantiation
const yahooFinance = new YahooFinanceClass({ suppressNotices: ["yahooSurvey"] });

interface YahooQuote {
  regularMarketPrice?: number | null;
  regularMarketPreviousClose?: number | null;
  marketCap?: number | null;
  currency?: string | null;
}

interface YahooFinanceClient {
  quote(
    yfTicker: string,
    queryOptions?: Record<string, never>,
    moduleOptions?: { validateResult?: boolean }
  ): Promise<YahooQuote>;
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
  marketCap: number | null;
  currency: string;
}

async function fetchQuote(yfTicker: string): Promise<QuoteResult> {
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
      marketCap: q?.marketCap ?? null,
      currency: q?.currency ?? "INR",
    };
  } catch {
    return {
      ticker: yfTicker.replace(".NS", ""),
      yfTicker,
      price: null,
      previousClose: null,
      changePct: null,
      marketCap: null,
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
          marketCap: null,
          currency: "INR",
        });
      }
    }
  }
  return results;
}

