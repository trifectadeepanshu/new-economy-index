import { useMemo } from "react";
import type { Currency, StockData } from "@/lib/index-api";
import { INDEX_BASE_DATE } from "@/lib/companies";
import { getISTDate } from "@/lib/market-hours";
import type { CagrPricePoint } from "@/components/company-grid/useCustomCagr";
import type {
  ConstituentRow,
  SectorFilter,
  SortKey,
  SortState,
} from "@/components/company-grid/types";

/** A user-picked CAGR window, overriding the default since-base calculation. */
export type CustomCagrWindow = {
  fromDate: string;
  prices: Record<string, CagrPricePoint>;
};

// Below this many days, annualizing a return extrapolates wildly (a stock up
// 15% in 3 weeks would show as +900%/yr) — show nothing rather than a
// number that reads as broken.
const MIN_CAGR_WINDOW_DAYS = 90;

/** Annualized version of sinceBase, over the same window ("Since Base" uses:
 * the index base date for constituents already listed then, or their listing
 * date for later entrants — mirrored here for the same entry date). */
function computeCagr(sinceBase: number | null, listedDate: string, today: string) {
  if (sinceBase === null) return null;

  const entryDate = listedDate > INDEX_BASE_DATE ? listedDate : INDEX_BASE_DATE;
  const days = (Date.parse(today) - Date.parse(entryDate)) / 86_400_000;
  if (!(days >= MIN_CAGR_WINDOW_DAYS)) return null;

  return (Math.pow(1 + sinceBase / 100, 365.25 / days) - 1) * 100;
}

/** CAGR from an explicit picked date instead of the default entry date —
 * same annualizing formula and minimum-window guard as computeCagr. */
function computeCustomCagr(
  currentPrice: number | null,
  fromPrice: number | undefined,
  fromDate: string,
  today: string
) {
  if (currentPrice === null || !fromPrice || fromPrice <= 0) return null;

  const days = (Date.parse(today) - Date.parse(fromDate)) / 86_400_000;
  if (!(days >= MIN_CAGR_WINDOW_DAYS)) return null;

  return (Math.pow(currentPrice / fromPrice, 365.25 / days) - 1) * 100;
}

/** /api/index/prices-on-date always returns raw INR closes, but `row.price`
 * is in whatever currency the user has selected — convert the fetched price
 * into that same currency before comparing them, or the ratio is meaningless
 * (dividing a USD price by an INR one lands the "return" around -98%). */
function toDisplayCurrency(inrPrice: number, currency: Currency, usdInr: number | null) {
  return currency === "usd" && usdInr && usdInr > 0 ? inrPrice / usdInr : inrPrice;
}

function getSortDirection(key: SortKey) {
  return key === "ticker" || key === "name" || key === "sector" ? 1 : -1;
}

export function nextSort(current: SortState, key: SortKey): SortState {
  return current.key === key
    ? { key, dir: current.dir === 1 ? -1 : 1 }
    : { key, dir: getSortDirection(key) };
}

function matchesSearch(row: StockData, query: string) {
  if (!query) return true;

  const normalized = query.toLowerCase();
  return [row.ticker, row.name, row.sector].some((value) =>
    value.toLowerCase().includes(normalized)
  );
}

function compareRows(sort: SortState) {
  return (a: ConstituentRow, b: ConstituentRow) => {
    const aValue = a[sort.key];
    const bValue = b[sort.key];

    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return 1;
    if (bValue == null) return -1;

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sort.dir * aValue.localeCompare(bValue);
    }

    return sort.dir * (Number(aValue) - Number(bValue));
  };
}

export function useConstituentRows(
  stocks: StockData[],
  sort: SortState,
  sector: SectorFilter,
  query: string,
  customCagr?: CustomCagrWindow | null,
  currency: Currency = "inr",
  usdInr: number | null = null
) {
  return useMemo(() => {
    const today = getISTDate();
    const rows = stocks
      .filter((row) => sector === "All" || row.sector === sector)
      .filter((row) => matchesSearch(row, query))
      .map<ConstituentRow>((row) => {
        const sinceBase = row.ratio === null ? null : (row.ratio - 1) * 100;
        let cagr: number | null;
        if (customCagr) {
          const fromPriceInr = customCagr.prices[row.ticker]?.price;
          const fromPrice =
            fromPriceInr != null ? toDisplayCurrency(fromPriceInr, currency, usdInr) : undefined;
          cagr = computeCustomCagr(row.price, fromPrice, customCagr.fromDate, today);
        } else {
          cagr = computeCagr(sinceBase, row.listedDate, today);
        }
        return { ...row, sinceBase, cagr };
      });

    return rows.sort(compareRows(sort));
  }, [query, sector, sort, stocks, customCagr, currency, usdInr]);
}
