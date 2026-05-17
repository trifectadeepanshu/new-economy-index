import { useMemo } from "react";
import type { StockData } from "@/lib/index-api";
import type {
  ConstituentRow,
  SectorFilter,
  SortKey,
  SortState,
} from "@/components/company-grid/types";

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
    const rows = stocks
      .filter((row) => sector === "All" || row.sector === sector)
      .filter((row) => matchesSearch(row, query))
      .map<ConstituentRow>((row) => ({
        ...row,
        sinceBase: row.ratio === null ? null : (row.ratio - 1) * 100,
      }));

    return rows.sort(compareRows(sort));
  }, [query, sector, sort, stocks]);
}
