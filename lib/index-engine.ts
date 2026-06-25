/**
 * Market-cap-weighted, quarterly-reconstituted divisor index engine.
 *
 * Mirrors the canonical CapIQ model:
 *   index(t) = Σ(close_i(t) × shares_i(Q) × flag_i(Q)) / divisor(Q)
 *   where Q = the most recent quarter-end on/before t.
 *
 * Each quarter-end (rebalance):
 *   - market cap_i = point-in-time shares_i(Q) × price_i(Q)
 *   - companies are ranked by market cap; the top `topN` get flag = 1
 *   - divisor is chain-linked so the level is continuous across the rebalance:
 *       divisor(Q) = divisor(Q-1) × newCompCap(Q) / oldCompCap(Q)
 *     valuing both compositions at Q's prices.
 *
 * Within a quarter, shares/flags/divisor are frozen and only daily prices move.
 * The same engine drives the full index (topN = 50) and the portfolio sub-index
 * (topN = ∞ — all members included).
 */

export type EngineMember = {
  ticker: string;
  listedDate: string; // ISO yyyy-mm-dd
};

export type DailyPrices = Map<string, Map<string, number>>; // date -> (ticker -> close)

/** Point-in-time share counts, sorted ascending by asOf date. */
export type SharePoint = { asOf: string; shares: number };
export type QuarterlySharesMap = Map<string, SharePoint[]>; // ticker -> points

export type IndexPoint = {
  date: string;
  value: number;
  numCompanies: number;
};

/** A constituent of the current quarter: ticker + its frozen share count. */
export type LiveMember = { ticker: string; shares: number };

export type IndexResult = {
  points: IndexPoint[];
  /** Current-quarter divisor — use to extend the chain with live prices. */
  divisor: number;
  /** Current-quarter constituents (flagged in) with their frozen shares. */
  members: LiveMember[];
};

export type EngineOptions = {
  baseValue: number;
  baseDate: string; // first quarter-end (index = baseValue here)
  topN: number; // max constituents per quarter (Infinity for no cap)
};

/** Quarter-end dates (Mar 31 / Jun 30 / Sep 30 / Dec 31) from baseDate through lastDate. */
function quarterEnds(baseDate: string, lastDate: string): string[] {
  const out: string[] = [];
  let y = Number(baseDate.slice(0, 4));
  let m = Number(baseDate.slice(5, 7)); // expected 3,6,9,12
  for (let i = 0; i < 200; i++) {
    const last = new Date(Date.UTC(y, m, 0)); // last day of month m
    const q = last.toISOString().slice(0, 10);
    if (q > lastDate) break;
    out.push(q);
    m += 3;
    if (m > 12) {
      m -= 12;
      y += 1;
    }
  }
  return out;
}

/** Point-in-time shares for `q`: latest point on/before q, else earliest (held back). */
function sharesAt(points: SharePoint[] | undefined, q: string): number | null {
  if (!points || !points.length) return null;
  let val: number | null = null;
  for (const p of points) {
    if (p.asOf <= q) val = p.shares;
    else break;
  }
  return val ?? points[0].shares;
}

/** Latest close on/before `d` from a sorted [date, close][] array. */
function priceAsOf(sorted: [string, number][], d: string): number | null {
  let best: number | null = null;
  for (const [dt, c] of sorted) {
    if (dt <= d) best = c;
    else break;
  }
  return best;
}

export function computeIndexSeries(
  prices: DailyPrices,
  shares: QuarterlySharesMap,
  members: EngineMember[],
  options: EngineOptions
): IndexResult {
  const { baseValue, baseDate, topN } = options;
  const dates = [...prices.keys()].sort();
  if (!dates.length) return { points: [], divisor: 0, members: [] };

  const tickers = members.map((m) => m.ticker);
  const quarters = quarterEnds(baseDate, dates[dates.length - 1]);
  if (!quarters.length) return { points: [], divisor: 0, members: [] };

  // Per-ticker sorted [date, close] for as-of lookups at quarter-ends.
  const sortedPrices = new Map<string, [string, number][]>();
  for (const t of tickers) {
    const arr: [string, number][] = [];
    for (const d of dates) {
      const px = prices.get(d)!.get(t);
      if (px != null) arr.push([d, px]);
    }
    sortedPrices.set(t, arr);
  }

  // Quarter-level frozen state: shares, price, market cap, inclusion flag.
  const qShares = new Map<string, Map<string, number>>(); // q -> ticker -> shares
  const qPrice = new Map<string, Map<string, number>>();
  const qFlag = new Map<string, Set<string>>(); // q -> included tickers

  for (const q of quarters) {
    const sh = new Map<string, number>();
    const px = new Map<string, number>();
    const mc: { ticker: string; cap: number }[] = [];
    for (const m of members) {
      const s = sharesAt(shares.get(m.ticker), q);
      const p = m.listedDate <= q ? priceAsOf(sortedPrices.get(m.ticker) ?? [], q) : null;
      if (s != null) sh.set(m.ticker, s);
      if (p != null) px.set(m.ticker, p);
      if (s != null && p != null && s * p > 0) mc.push({ ticker: m.ticker, cap: s * p });
    }
    mc.sort((a, b) => b.cap - a.cap);
    const included = new Set(mc.slice(0, topN).map((x) => x.ticker));
    qShares.set(q, sh);
    qPrice.set(q, px);
    qFlag.set(q, included);
  }

  const capOf = (q: string, useFlagsFrom: string, priceQ: string): number => {
    // Σ shares(q) × flag(useFlagsFrom) × price(priceQ)
    let total = 0;
    const sh = qShares.get(q)!;
    const flags = qFlag.get(useFlagsFrom)!;
    const px = qPrice.get(priceQ)!;
    for (const t of flags) {
      const s = sh.get(t);
      const p = px.get(t);
      if (s != null && p != null) total += s * p;
    }
    return total;
  };

  // Chain-linked quarterly divisor. Inception is the first quarter that has
  // constituents (a sub-index whose members list later starts at baseValue
  // then); leading empty quarters are left without a divisor (skipped).
  const divisor = new Map<string, number>();
  let prevQ: string | null = null;
  for (const q of quarters) {
    const newCap = capOf(q, q, q);
    if (newCap <= 0) continue;
    if (prevQ === null) {
      divisor.set(q, newCap / baseValue); // index = baseValue at inception
    } else {
      const oldCap = capOf(prevQ, prevQ, q); // prev shares & flags, this quarter's prices
      const prevDiv = divisor.get(prevQ)!;
      divisor.set(q, oldCap > 0 ? prevDiv * (newCap / oldCap) : prevDiv);
    }
    prevQ = q;
  }

  // Daily index — carry forward closes; value with the effective quarter's state.
  const lastClose = new Map<string, number>();
  const out: IndexPoint[] = [];
  let qi = 0;
  for (const date of dates) {
    for (const [t, c] of prices.get(date)!) lastClose.set(t, c);
    if (date < quarters[0]) continue; // before inception
    while (qi + 1 < quarters.length && quarters[qi + 1] <= date) qi++;
    const q = quarters[qi];
    const div = divisor.get(q) ?? 0;
    if (div <= 0) continue;

    const sh = qShares.get(q)!;
    const flags = qFlag.get(q)!;
    let total = 0;
    for (const t of flags) {
      const px = lastClose.get(t);
      const s = sh.get(t);
      if (px != null && s != null) total += px * s;
    }
    if (total <= 0) continue;
    out.push({
      date,
      value: Math.round((total / div) * 10000) / 10000,
      numCompanies: flags.size,
    });
  }

  // Current-quarter state for live extension.
  const curQ = quarters[quarters.length - 1];
  const curDiv = divisor.get(curQ) ?? 0;
  const curSh = qShares.get(curQ)!;
  const curMembers: LiveMember[] = [...(qFlag.get(curQ) ?? [])]
    .filter((t) => curSh.has(t))
    .map((t) => ({ ticker: t, shares: curSh.get(t)! }));

  return { points: out, divisor: curDiv, members: curMembers };
}

/**
 * Live index value consistent with a precomputed series: value the current
 * quarter's frozen constituents with fresh prices, dividing by the same divisor.
 *   liveValue = Σ(price_i × shares_i) / divisor
 */
export function liveIndexValue(
  livePrices: Map<string, number>,
  carryForward: Map<string, number>,
  members: LiveMember[],
  divisor: number
): number | null {
  if (!(divisor > 0)) return null;
  let total = 0;
  for (const { ticker, shares } of members) {
    const px = livePrices.get(ticker) ?? carryForward.get(ticker);
    if (px != null) total += px * shares;
  }
  return total > 0 ? Math.round((total / divisor) * 10000) / 10000 : null;
}
