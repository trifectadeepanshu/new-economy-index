import type { Currency, StockData } from "@/lib/index-api";

export type CompanyGridView = "table" | "grid";
export type CompanyGridVariant = "default" | "terminal";
export type SortDirection = 1 | -1;
export type SortKey =
  | "ticker"
  | "name"
  | "sector"
  | "price"
  | "marketCap"
  | "changePct"
  | "oneYearChangePct"
  | "ratio"
  | "cagr";
export type SectorFilter = "All" | string;

export type CompanyGridProps = {
  stocks: StockData[];
  isLoading: boolean;
  currency?: Currency;
  view?: CompanyGridView;
  onViewChange?: (view: CompanyGridView) => void;
  showToggle?: boolean;
  variant?: CompanyGridVariant;
};

export type SortState = {
  key: SortKey;
  dir: SortDirection;
};

export type ConstituentRow = StockData & {
  sinceBase: number | null;
  /** Annualized version of sinceBase (CAGR since index entry). Null for
   * constituents that entered too recently for annualizing to be meaningful. */
  cagr: number | null;
};
