/**
 * Market-cap-weighted, divisor-based index engine.
 *
 * Computes a continuous index from daily closing prices and (constant)
 * point-in-time share counts. Each company joins on its listing day; the
 * divisor is chain-linked whenever the composition changes so the index level
 * never jumps purely because a new constituent was added.
 *
 * index(t) = totalMarketCap(t, activeComposition) / activeDivisor
 *   where marketCap_i(t) = close_i(t) × shares_i
 *
 * The same engine drives the full index and any subset (sector / portfolio
 * sub-indices) — pass the member list you want.
 */

export type EngineMember = {
  ticker: string;
  listedDate: string; // ISO yyyy-mm-dd
};

export type DailyPrices = Map<string, Map<string, number>>; // date -> (ticker -> close)

export type IndexPoint = {
  date: string;
  value: number;
  numCompanies: number;
};

export type IndexResult = {
  points: IndexPoint[];
  /** Active divisor at the final point — use to extend the chain with live prices. */
  divisor: number;
  /** Tickers in the index at the final point. */
  composition: string[];
};

/**
 * Live index value consistent with a precomputed series: extend the chain by
 * one step using fresh prices, the same divisor, and the same composition.
 *   liveValue = Σ(price_i × shares_i) / divisor
 * Falls back to carry-forward closes for any composition member missing a live price.
 */
export function liveIndexValue(
  livePrices: Map<string, number>,
  carryForward: Map<string, number>,
  shares: Map<string, number>,
  composition: string[],
  divisor: number
): number | null {
  if (!(divisor > 0)) return null;
  let mc = 0;
  for (const ticker of composition) {
    const px = livePrices.get(ticker) ?? carryForward.get(ticker);
    const sh = shares.get(ticker);
    if (px == null || sh == null) continue;
    mc += px * sh;
  }
  return mc > 0 ? Math.round((mc / divisor) * 10000) / 10000 : null;
}

export type EngineOptions = {
  baseValue: number;
};

/** Whether `member` is in the index on `date` — included from its listing day. */
function isIncluded(member: EngineMember, date: string): boolean {
  return member.listedDate <= date;
}

/**
 * Compute the full daily index series.
 *
 * @param prices  date -> (ticker -> close), any order; iterated chronologically.
 * @param shares  ticker -> constant point-in-time share count.
 * @param members companies eligible for this index (full set or a subset).
 */
export function computeIndexSeries(
  prices: DailyPrices,
  shares: Map<string, number>,
  members: EngineMember[],
  options: EngineOptions
): IndexResult {
  const baseValue = options.baseValue;

  const dates = [...prices.keys()].sort();
  if (!dates.length) return { points: [], divisor: 0, composition: [] };

  const lastClose = new Map<string, number>(); // carry-forward prices
  let activeComposition: EngineMember[] = [];
  let activeSignature = ""; // tickers currently in the index
  let activeDivisor = 0;
  let seenInception = false;

  const out: IndexPoint[] = [];

  const totalMarketCap = (comp: EngineMember[]): number => {
    let total = 0;
    for (const m of comp) {
      const px = lastClose.get(m.ticker);
      const sh = shares.get(m.ticker);
      if (px == null || sh == null) continue;
      total += px * sh;
    }
    return total;
  };

  for (const date of dates) {
    // Update carry-forward prices with today's closes.
    const today = prices.get(date)!;
    for (const [ticker, close] of today) lastClose.set(ticker, close);

    // Eligible = listed on/before today, with both a (carry-forward) price and
    // a known share count. Requiring shares ensures a company only enters once it
    // can actually contribute market cap (otherwise it would inflate the count,
    // contribute nothing, and never re-link once shares later arrive).
    const eligible = members.filter(
      (m) => isIncluded(m, date) && lastClose.has(m.ticker) && shares.has(m.ticker)
    );
    const signature = eligible.map((m) => m.ticker).sort().join(",");

    // Re-link the divisor whenever the composition changes (new listings).
    if (eligible.length > 0 && signature !== activeSignature) {
      const newMc = totalMarketCap(eligible);
      if (newMc > 0) {
        if (!seenInception) {
          activeDivisor = newMc / baseValue; // index = baseValue at inception
          seenInception = true;
        } else {
          const levelBefore =
            activeComposition.length && activeDivisor > 0
              ? totalMarketCap(activeComposition) / activeDivisor
              : baseValue;
          if (levelBefore > 0) activeDivisor = newMc / levelBefore;
        }
        activeComposition = eligible;
        activeSignature = signature;
      }
    }

    if (!seenInception || activeDivisor <= 0) continue;

    const mc = totalMarketCap(activeComposition);
    if (mc <= 0) continue;
    out.push({
      date,
      value: Math.round((mc / activeDivisor) * 10000) / 10000,
      numCompanies: activeComposition.length,
    });
  }

  return {
    points: out,
    divisor: activeDivisor,
    composition: activeComposition.map((m) => m.ticker),
  };
}
