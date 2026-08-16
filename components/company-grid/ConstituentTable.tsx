import { CagrRangeControl } from "@/components/company-grid/CagrRangeControl";
import { CompanyLogo } from "@/components/company-grid/CompanyLogo";
import {
  formatMarketCap,
  formatPrice,
  formatSignedPercent,
} from "@/components/company-grid/format";
import type {
  CagrRangeMode,
  CompanyGridVariant,
  ConstituentRow,
  SortKey,
  SortState,
} from "@/components/company-grid/types";
import { PortfolioMark } from "@/components/company-grid/PortfolioMark";
import type { Currency } from "@/lib/index-api";

/** Deep-links a column header to its explanation in the methodology page. */
type ColumnNote = { n: number; anchor: string };

// CAGR is still being verified — visible on every non-production deploy
// (local dev, staging) but hidden on the live index until it's confirmed.
// Vercel sets NEXT_PUBLIC_VERCEL_ENV to "production" only for the
// production domain, so this needs no separate env var of its own.
const SHOW_CAGR = process.env.NEXT_PUBLIC_VERCEL_ENV !== "production";

const ALL_COLUMNS: Array<{
  key: SortKey;
  label: string;
  align: "left" | "right";
  title?: string;
  note?: ColumnNote;
}> = [
  { key: "name", label: "Company", align: "left" },
  { key: "sector", label: "Sector", align: "left" },
  { key: "price", label: "Price", align: "right" },
  { key: "marketCap", label: "Market Cap", align: "right" },
  {
    key: "oneYearChangePct",
    label: "1Y %",
    align: "right",
    title: "Trailing 12-month price return.",
    note: { n: 1, anchor: "note-1y-return" },
  },
  {
    key: "ratio",
    label: "Since Base",
    align: "right",
    title:
      "Return since the constituent's index-entry price — the index base (31 Dec 2020) for names already listed then, or the IPO price for later listings.",
  },
  {
    key: "cagr",
    label: "CAGR",
    align: "right",
    title: "Since Base, annualized. Pick a different window from the dropdown below.",
    note: { n: 2, anchor: "note-cagr" },
  },
];

const COLUMNS = SHOW_CAGR ? ALL_COLUMNS : ALL_COLUMNS.filter((c) => c.key !== "cagr");

// Split into a labeled button plus a separate arrow button (both trigger the
// same sort) so a footnote <sup><a> can sit between them in reading order —
// right after the label, before the arrow — without nesting an <a> inside a
// <button>, which is invalid HTML.
function SortButton({
  column,
  sort,
  onSort,
}: {
  column: (typeof COLUMNS)[number];
  sort: SortState;
  onSort: (key: SortKey) => void;
}) {
  const active = sort.key === column.key;

  return (
    <button
      type="button"
      onClick={() => onSort(column.key)}
      className={active ? "is-active" : ""}
    >
      {column.label}
    </button>
  );
}

function SortArrow({
  column,
  sort,
  onSort,
}: {
  column: (typeof COLUMNS)[number];
  sort: SortState;
  onSort: (key: SortKey) => void;
}) {
  const active = sort.key === column.key;
  const icon = active ? (sort.dir === 1 ? "↑" : "↓") : "↕";

  return (
    <button
      type="button"
      className={`nei-sort-arrow${active ? " is-active" : ""}`}
      onClick={() => onSort(column.key)}
      tabIndex={-1}
      aria-hidden="true"
    >
      {icon}
    </button>
  );
}

function TableHeader({
  sort,
  onSort,
  cagrMode,
  onCagrModeChange,
  customCagrDate,
  onCustomCagrDateChange,
  cagrLoading,
}: {
  sort: SortState;
  onSort: (key: SortKey) => void;
  cagrMode: CagrRangeMode;
  onCagrModeChange: (mode: CagrRangeMode) => void;
  customCagrDate: string | null;
  onCustomCagrDateChange: (date: string) => void;
  cagrLoading: boolean;
}) {
  return (
    <thead>
      <tr>
        <th className="nei-row-number">#</th>
        {COLUMNS.map((column) => (
          <th
            key={column.key}
            aria-sort={
              sort.key === column.key
                ? sort.dir === 1
                  ? "ascending"
                  : "descending"
                : "none"
            }
            className={column.align === "right" ? "is-right" : undefined}
            title={column.title}
          >
            <SortButton column={column} sort={sort} onSort={onSort} />
            {column.note && (
              <sup className="nei-doc-note-ref">
                <a
                  href={`/methodology#${column.note.anchor}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Footnote ${column.note.n}: how ${column.label} is calculated`}
                >
                  {column.note.n}
                </a>
              </sup>
            )}
            <SortArrow column={column} sort={sort} onSort={onSort} />
            {column.key === "cagr" && (
              <CagrRangeControl
                mode={cagrMode}
                onModeChange={onCagrModeChange}
                customDate={customCagrDate}
                onCustomDateChange={onCustomCagrDateChange}
                isLoading={cagrLoading}
              />
            )}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function CompanyCell({
  row,
  showLogo,
  onSelect,
}: {
  row: ConstituentRow;
  showLogo: boolean;
  onSelect?: (row: ConstituentRow) => void;
}) {
  return (
    <div className="nei-company-cell">
      {showLogo && <CompanyLogo ticker={row.ticker} name={row.name} size={30} />}
      <div>
        {onSelect ? (
          <button
            type="button"
            className="nei-company-cell-button"
            onClick={() => onSelect(row)}
            aria-label={`View ${row.displayName} details`}
          >
            {row.isPortfolio && <PortfolioMark />}
            {row.displayName}
          </button>
        ) : (
          <strong>
            {row.isPortfolio && <PortfolioMark />}
            {row.displayName}
          </strong>
        )}
        <span>{row.name}</span>
      </div>
    </div>
  );
}

export function ConstituentTable({
  rows,
  sort,
  onSort,
  variant = "default",
  currency = "inr",
  onSelect,
  cagrMode,
  onCagrModeChange,
  customCagrDate,
  onCustomCagrDateChange,
  cagrLoading = false,
}: {
  rows: ConstituentRow[];
  sort: SortState;
  onSort: (key: SortKey) => void;
  variant?: CompanyGridVariant;
  currency?: Currency;
  onSelect?: (row: ConstituentRow) => void;
  cagrMode: CagrRangeMode;
  onCagrModeChange: (mode: CagrRangeMode) => void;
  customCagrDate: string | null;
  onCustomCagrDateChange: (date: string) => void;
  cagrLoading?: boolean;
}) {
  const isTerminal = variant === "terminal";

  return (
    <div className={`nei-constituents ${isTerminal ? "is-terminal" : ""}`}>
      <div className="nei-constituent-table-wrap">
        <table className="nei-constituent-table">
          <TableHeader
            sort={sort}
            onSort={onSort}
            cagrMode={cagrMode}
            onCagrModeChange={onCagrModeChange}
            customCagrDate={customCagrDate}
            onCustomCagrDateChange={onCustomCagrDateChange}
            cagrLoading={cagrLoading}
          />
          <tbody>
            {rows.map((row, index) => {
              const isPortfolio = row.isPortfolio;

              return (
                <tr
                  key={row.ticker}
                  className={`nei-constituent-row${isPortfolio ? " is-portfolio" : ""}`}
                >
                  <td className="nei-row-number">
                    {String(index + 1).padStart(2, "0")}
                  </td>
                  <td>
                    <CompanyCell row={row} showLogo={!isTerminal} onSelect={onSelect} />
                  </td>
                  <td>
                    <span className="nei-sector-name">{row.sector}</span>
                  </td>
                  <td className="is-right nei-mono">{formatPrice(row.price, currency)}</td>
                  <td className="is-right nei-mono">{formatMarketCap(row.marketCap, currency)}</td>
                  <td
                    className={`is-right nei-mono ${
                      (row.oneYearChangePct ?? 0) >= 0 ? "is-positive" : "is-negative"
                    }`}
                  >
                    {formatSignedPercent(row.oneYearChangePct)}
                  </td>
                  <td
                    className={`is-right nei-mono ${
                      (row.sinceBase ?? 0) >= 0 ? "is-positive" : "is-negative"
                    }`}
                  >
                    {formatSignedPercent(row.sinceBase, 1)}
                  </td>
                  {SHOW_CAGR && (
                    <td
                      className={`is-right nei-mono ${
                        (row.cagr ?? 0) >= 0 ? "is-positive" : "is-negative"
                      }`}
                    >
                      {formatSignedPercent(row.cagr, 1)}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
