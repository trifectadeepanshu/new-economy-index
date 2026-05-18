const UPSTOX_BASE_URL = "https://api.upstox.com/v2";

// NSE ticker → Upstox instrument key (ISIN-based)
const INSTRUMENT_KEYS: Record<string, string> = {
  ETERNAL:    "NSE_EQ|INE758T01015",
  SWIGGY:     "NSE_EQ|INE00H001014",
  POLICYBZR:  "NSE_EQ|INE417T01026",
  MEESHO:     "NSE_EQ|INE0VDM01015",
  NYKAA:      "NSE_EQ|INE388Y01029",
  URBANCO:    "NSE_EQ|INE0CAZ01013",
  NAUKRI:     "NSE_EQ|INE663F01032",
  CARTRADE:   "NSE_EQ|INE290S01011",
  IXIGO:      "NSE_EQ|INE0HV901016",
  YATRA:      "NSE_EQ|INE0JR601024",
  FIRSTCRY:   "NSE_EQ|INE02RE01045",
  INDIGOPNTS: "NSE_EQ|INE09VQ01012",
  GOCOLORS:   "NSE_EQ|INE0BJS01011",
  SULA:       "NSE_EQ|INE142Q01026",
  WAKEFIT:    "NSE_EQ|INE0E7301029",
  OLAELEC:    "NSE_EQ|INE0LXG01040",
  BIKAJI:     "NSE_EQ|INE00E101023",
  HONASA:     "NSE_EQ|INE0J5401028",
  BLUESTONE:  "NSE_EQ|INE304W01038",
  ATHERENERG: "NSE_EQ|INE0LEZ01016",
  LENSKART:   "NSE_EQ|INE956O01016",
  PAYTM:      "NSE_EQ|INE982J01020",
  GROWW:      "NSE_EQ|INE0HOQ01053",
  PINELABS:   "NSE_EQ|INE15B701018",
  ZAGGLE:     "NSE_EQ|INE07K301024",
  MOBIKWIK:   "NSE_EQ|INE0HLU01028",
  KISSHT:     "NSE_EQ|INE12F801023",
  GODIGIT:    "NSE_EQ|INE03JT01014",
  AADHARHFC:  "NSE_EQ|INE883F01010",
  FIVESTAR:   "NSE_EQ|INE128S01021",
  HOMEFIRST:  "NSE_EQ|INE481N01025",
  INDIASHLTR: "NSE_EQ|INE922K01024",
  NORTHARC:   "NSE_EQ|INE850M01015",
  AYE:        "NSE_EQ|INE501X01029",
  DELHIVERY:  "NSE_EQ|INE148O01028",
  INDIAMART:  "NSE_EQ|INE933S01016",
  TBOTEK:     "NSE_EQ|INE673O01025",
  BLACKBUCK:  "NSE_EQ|INE0UIZ01018",
  AWFIS:      "NSE_EQ|INE108V01019",
  MEDIASSIST: "NSE_EQ|INE456Z01021",
  IDEAFORGE:  "NSE_EQ|INE349Y01013",
  INDIQUBE:   "NSE_EQ|INE06ST01018",
  UNIECOM:    "NSE_EQ|INE00U401027",
  SHADOWFAX:  "NSE_EQ|INE12UN01015",
  MAPMYINDIA: "NSE_EQ|INE0BV301023",
  FRACTAL:    "NSE_EQ|INE212S01015",
  CAPILLARY:  "NSE_EQ|INE0ILV01024",
  AMAGI:      "NSE_EQ|INE121R01077",
  RATEGAIN:   "NSE_EQ|INE0CLI01024",
  TRACXN:     "NSE_EQ|INE0HMF01019",
  PWL:        "NSE_EQ|INE0LP301011",
  NAZARA:     "NSE_EQ|INE418L01047",
  SEDEMAC:    "NSE_EQ|INE00XB01019",
};

// Reverse map: instrument_token → ticker
const TOKEN_TO_TICKER = Object.fromEntries(
  Object.entries(INSTRUMENT_KEYS).map(([ticker, key]) => [key, ticker])
);

interface UpstoxQuote {
  last_price: number;
  net_change: number;
  instrument_token: string;
  ohlc?: { open: number; high: number; low: number; close: number };
}

export interface QuoteResult {
  ticker: string;
  price: number | null;
  previousClose: number | null;
  changePct: number | null;
  marketCap: number | null;
  currency: string;
}

function emptyQuote(ticker: string): QuoteResult {
  return { ticker, price: null, previousClose: null, changePct: null, marketCap: null, currency: "INR" };
}

export async function fetchAllQuotes(tickers: string[]): Promise<QuoteResult[]> {
  const token = process.env.UPSTOX_API_TOKEN;
  if (!token) throw new Error("UPSTOX_API_TOKEN not set");

  const keys = tickers.map(t => INSTRUMENT_KEYS[t]).filter(Boolean);
  if (!keys.length) return tickers.map(emptyQuote);

  const url = `${UPSTOX_BASE_URL}/market-quote/quotes?instrument_key=${encodeURIComponent(keys.join(","))}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Upstox API ${res.status}: ${await res.text()}`);

  const json = await res.json() as { status: string; data: Record<string, UpstoxQuote> };
  const data = json.data ?? {};

  const byTicker: Record<string, QuoteResult> = {};

  for (const quote of Object.values(data)) {
    const ticker = TOKEN_TO_TICKER[quote.instrument_token];
    if (!ticker) continue;

    const price = quote.last_price ?? null;
    const netChange = quote.net_change ?? null;
    const previousClose =
      price !== null && netChange !== null ? price - netChange : null;
    const changePct =
      netChange !== null && previousClose && previousClose !== 0
        ? (netChange / previousClose) * 100
        : null;

    byTicker[ticker] = { ticker, price, previousClose, changePct, marketCap: null, currency: "INR" };
  }

  return tickers.map(t => byTicker[t] ?? emptyQuote(t));
}
