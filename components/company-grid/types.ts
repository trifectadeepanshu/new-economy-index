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
  | "ratio"
  | "irr";
export type SectorFilter = "All" | string;
export type IrrRangeMode = "1y" | "3y" | "5y";

export type CompanyGridProps = {
  stocks: StockData[];
  isLoading: boolean;
  currency?: Currency;
  /** Live USD/INR rate — needed to convert the (always-INR) historical IRR
   * lookup price into the display currency before comparing it to `price`. */
  usdInr?: number | null;
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
  /** Annualized price return over the selected fixed period. */
  irr: number | null;
};
