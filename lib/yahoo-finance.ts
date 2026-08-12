// eslint-disable-next-line @typescript-eslint/no-require-imports
const YahooFinanceClass = require("yahoo-finance2").default as YahooFinanceConstructor;
const yahooFinance = new YahooFinanceClass({ suppressNotices: ["yahooSurvey"] });

const DEFAULT_CURRENCY = "INR";
const NSE_SUFFIX = ".NS";

interface YahooQuote {
  symbol: string;
  regularMarketPrice?: number | null;
  regularMarketPreviousClose?: number | null;
  marketCap?: number | null;
  currency?: string | null;
}

interface YahooFinanceClient {
  quote(
    yfTickers: string[],
    queryOptions?: Record<string, never>,
    moduleOptions?: { validateResult?: boolean }
  ): Promise<YahooQuote[]>;
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

function tickerFromYahooSymbol(yfTicker: string) {
  return yfTicker.endsWith(NSE_SUFFIX)
    ? yfTicker.slice(0, -NSE_SUFFIX.length)
    : yfTicker;
}

function toNullableNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getChangePct(price: number | null, previousClose: number | null) {
  return price !== null && previousClose !== null && previousClose !== 0
    ? ((price - previousClose) / previousClose) * 100
    : null;
}

function emptyQuote(yfTicker: string): QuoteResult {
  return {
    ticker: tickerFromYahooSymbol(yfTicker),
    yfTicker,
    price: null,
    previousClose: null,
    changePct: null,
    marketCap: null,
    currency: DEFAULT_CURRENCY,
  };
}

function normalizeQuote(yfTicker: string, quote: YahooQuote | null | undefined): QuoteResult {
  const price = toNullableNumber(quote?.regularMarketPrice);
  const previousClose = toNullableNumber(quote?.regularMarketPreviousClose);

  return {
    ticker: tickerFromYahooSymbol(yfTicker),
    yfTicker,
    price,
    previousClose,
    changePct: getChangePct(price, previousClose),
    marketCap: toNullableNumber(quote?.marketCap),
    currency: quote?.currency ?? DEFAULT_CURRENCY,
  };
}

/**
 * Fetches every ticker's quote in a single Yahoo request instead of one
 * request per ticker (~11x faster in practice: ~165ms vs ~1.9s for 54
 * tickers). Yahoo silently omits bad/delisted symbols from the response
 * rather than failing the whole call, so a missing ticker here just falls
 * back to an empty quote, same as an individual failure did before.
 */
export async function fetchAllQuotes(yfTickers: string[]): Promise<QuoteResult[]> {
  if (!yfTickers.length) return [];

  let quotes: YahooQuote[];
  try {
    quotes = await yahooFinance.quote(yfTickers, {}, { validateResult: false });
  } catch {
    return yfTickers.map(emptyQuote);
  }

  const byTicker = new Map(quotes.map((q) => [q.symbol, q]));
  return yfTickers.map((t) => normalizeQuote(t, byTicker.get(t)));
}
