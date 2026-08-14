import { useMemo } from "react";
import type { StockData } from "@/lib/index-api";
import { INDEX_BASE_DATE } from "@/lib/companies";
import { getISTDate } from "@/lib/market-hours";
import type {
  ConstituentRow,
  SectorFilter,
  SortKey,
  SortState,
} from "@/components/company-grid/types";

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
  query: string
) {
  return useMemo(() => {
    const today = getISTDate();
    const rows = stocks
      .filter((row) => sector === "All" || row.sector === sector)
      .filter((row) => matchesSearch(row, query))
      .map<ConstituentRow>((row) => {
        const sinceBase = row.ratio === null ? null : (row.ratio - 1) * 100;
        return {
          ...row,
          sinceBase,
          cagr: computeCagr(sinceBase, row.listedDate, today),
        };
      });

    return rows.sort(compareRows(sort));
  }, [query, sector, sort, stocks]);
}
