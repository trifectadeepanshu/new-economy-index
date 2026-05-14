interface OHLCData {
  open: number;
  high: number;
  low: number;
  close: number; // previous day close during market hours
}

interface OHLCItem {
  ohlc: OHLCData;
  last_price: number;
  net_change?: number;
  volume?: number;
}

interface OHLCResponse {
  status: string;
  data: Record<string, OHLCItem>;
}

export interface QuoteResult {
  ticker: string;
  instrumentKey: string;
  price: number | null;
  previousClose: number | null;
  changePct: number | null;
}

async function getAccessToken(): Promise<string> {
  // Try DB-stored token first (set via /api/auth/upstox/callback)
  try {
    const { getUpstoxToken } = await import("@/lib/db");
    const token = await getUpstoxToken();
    if (token) return token;
  } catch {
    // fall through to env var
  }
  const token = process.env.UPSTOX_ACCESS_TOKEN;
  if (!token) throw new Error("No Upstox access token available. Visit /auth to authenticate.");
  return token;
}

export async function fetchAllQuotes(
  companies: { ticker: string; instrumentKey: string }[]
): Promise<QuoteResult[]> {
  if (!companies.length) return [];

  const token = await getAccessToken();
  const keys = companies.map((c) => c.instrumentKey).join(",");

  const url = `https://api.upstox.com/v3/market-quote/ohlc?instrument_key=${encodeURIComponent(keys)}&interval=1d`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (res.status === 401) {
    throw new Error("UPSTOX_TOKEN_EXPIRED");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upstox API ${res.status}: ${text}`);
  }

  const json: OHLCResponse = await res.json();
  const data = json.data ?? {};

  return companies.map((c) => {
    // Response keys may use | or : as separator
    const item = data[c.instrumentKey] ?? data[c.instrumentKey.replace("|", ":")];
    if (!item) {
      return { ticker: c.ticker, instrumentKey: c.instrumentKey, price: null, previousClose: null, changePct: null };
    }
    const price = item.last_price;
    const prev = item.ohlc?.close ?? null;
    const changePct =
      price != null && prev != null && prev !== 0
        ? ((price - prev) / prev) * 100
        : null;
    return { ticker: c.ticker, instrumentKey: c.instrumentKey, price, previousClose: prev, changePct };
  });
}
