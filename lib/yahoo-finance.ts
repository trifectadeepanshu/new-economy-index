// eslint-disable-next-line @typescript-eslint/no-require-imports
const YahooFinanceClass = require("yahoo-finance2").default as YahooFinanceConstructor;
const yahooFinance = new YahooFinanceClass({ suppressNotices: ["yahooSurvey"] });

const DEFAULT_CURRENCY = "INR";
const NSE_SUFFIX = ".NS";
const QUOTE_BATCH_SIZE = 10;

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

async function fetchQuote(yfTicker: string): Promise<QuoteResult> {
  try {
    const quote = await yahooFinance.quote(yfTicker, {}, { validateResult: false });
    return normalizeQuote(yfTicker, quote);
  } catch {
    return emptyQuote(yfTicker);
  }
}

function chunks<T>(items: T[], size: number) {
  const batches: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }

  return batches;
}

export async function fetchAllQuotes(yfTickers: string[]): Promise<QuoteResult[]> {
  const results: QuoteResult[] = [];

  for (const batch of chunks(yfTickers, QUOTE_BATCH_SIZE)) {
    results.push(...(await Promise.all(batch.map(fetchQuote))));
  }

  return results;
}
