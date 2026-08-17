import { useMemo } from "react";
import type { Currency, StockData } from "@/lib/index-api";
import { getISTDate } from "@/lib/market-hours";
import {
  computeIrr,
  computeSinceBaseIrr,
  getTimeSinceBaseDate,
  getTimeSinceBaseReturn,
  type IrrPricePoint,
} from "@/components/company-grid/returns";
import type {
  ConstituentRow,
  IrrRangeMode,
  SectorFilter,
  SortKey,
  SortState,
} from "@/components/company-grid/types";

export type IrrWindow = {
  mode: IrrRangeMode;
  prices: Record<string, IrrPricePoint> | null;
};

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
  irrWindow?: IrrWindow | null,
  currency: Currency = "inr",
  usdInr: number | null = null
) {
  return useMemo(() => {
    const today = getISTDate();
    const rows = stocks
      .filter((row) => sector === "All" || row.sector === sector)
      .filter((row) => matchesSearch(row, query))
      .map<ConstituentRow>((row) => {
        const sinceBase = getTimeSinceBaseReturn(row.ratio);
        const baseTenure = getTimeSinceBaseDate(row.listedDate, row.asOfDate ?? today);
        let irr: number | null = null;

        if (irrWindow?.mode === "sinceBase") {
          irr = computeSinceBaseIrr(row.ratio, baseTenure?.days ?? null);
        } else if (irrWindow?.prices) {
          irr = computeIrr({
            currentPrice: row.price,
            startPoint: irrWindow.prices[row.ticker],
            toDate: row.asOfDate ?? today,
            currency,
            usdInr,
          });
        }

        return {
          ...row,
          sinceBase,
          timeSinceBaseDate: baseTenure?.days ?? null,
          timeSinceBaseDateLabel: baseTenure?.label ?? "—",
          effectiveBaseDate: baseTenure?.baseDate ?? null,
          irr,
        };
      });

    return rows.sort(compareRows(sort));
  }, [query, sector, sort, stocks, irrWindow, currency, usdInr]);
}
