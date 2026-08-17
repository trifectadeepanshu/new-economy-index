import { IrrRangeControl } from "@/components/company-grid/IrrRangeControl";
import { CompanyLogo } from "@/components/company-grid/CompanyLogo";
import {
  formatMarketCap,
  formatPrice,
  formatSignedPercent,
} from "@/components/company-grid/format";
import type {
  CompanyGridVariant,
  ConstituentRow,
  IrrRangeMode,
  SortKey,
  SortState,
} from "@/components/company-grid/types";
import { PortfolioMark } from "@/components/company-grid/PortfolioMark";
import type { Currency } from "@/lib/index-api";

/** Deep-links a column header to its explanation in the methodology page. */
type ColumnNote = { n: number; anchor: string };

const COLUMNS: Array<{
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
    key: "ratio",
    label: "Absolute Return",
    align: "right",
    title:
      "Cumulative return from 31 Dec 2020 for companies already public then, or from the IPO offer price for later listings.",
    note: { n: 1, anchor: "note-absolute-return" },
  },
  {
    key: "timeSinceBaseDate",
    label: "Time Since Base Date",
    align: "right",
    title:
      "Elapsed time from 31 Dec 2020 for companies already public then, or from the IPO date for later listings.",
    note: { n: 2, anchor: "note-time-since-base-date" },
  },
  {
    key: "irr",
    label: "IRR",
    align: "right",
    title:
      "Annualized price return over the selected 1, 3, or 5 year period, or from the company's effective base date.",
    note: { n: 3, anchor: "note-irr" },
  },
];

// Split the label and arrow into separate buttons so the linked footnote can
// precede the label without nesting an <a> inside a <button>.
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
  irrMode,
  onIrrModeChange,
  irrLoading,
  irrError,
}: {
  sort: SortState;
  onSort: (key: SortKey) => void;
  irrMode: IrrRangeMode;
  onIrrModeChange: (mode: IrrRangeMode) => void;
  irrLoading: boolean;
  irrError: string | null;
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
            <div className="nei-table-heading">
              <span className="nei-table-sort-group">
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
                <SortButton column={column} sort={sort} onSort={onSort} />
                <SortArrow column={column} sort={sort} onSort={onSort} />
              </span>
              {column.key === "irr" && (
                <IrrRangeControl
                  mode={irrMode}
                  onModeChange={onIrrModeChange}
                  isLoading={irrLoading}
                  error={irrError}
                />
              )}
            </div>
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
  irrMode,
  onIrrModeChange,
  irrLoading = false,
  irrError = null,
}: {
  rows: ConstituentRow[];
  sort: SortState;
  onSort: (key: SortKey) => void;
  variant?: CompanyGridVariant;
  currency?: Currency;
  onSelect?: (row: ConstituentRow) => void;
  irrMode: IrrRangeMode;
  onIrrModeChange: (mode: IrrRangeMode) => void;
  irrLoading?: boolean;
  irrError?: string | null;
}) {
  const isTerminal = variant === "terminal";

  return (
    <div className={`nei-constituents ${isTerminal ? "is-terminal" : ""}`}>
      <div className="nei-constituent-table-wrap">
        <table className="nei-constituent-table">
          <TableHeader
            sort={sort}
            onSort={onSort}
            irrMode={irrMode}
            onIrrModeChange={onIrrModeChange}
            irrLoading={irrLoading}
            irrError={irrError}
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
                      (row.sinceBase ?? 0) >= 0 ? "is-positive" : "is-negative"
                    }`}
                  >
                    {formatSignedPercent(row.sinceBase, 1)}
                  </td>
                  <td
                    className="is-right nei-mono"
                    title={
                      row.effectiveBaseDate
                        ? `Effective base date: ${row.effectiveBaseDate}`
                        : undefined
                    }
                  >
                    {row.timeSinceBaseDateLabel}
                  </td>
                  <td
                    className={`is-right nei-mono ${
                      (row.irr ?? 0) >= 0 ? "is-positive" : "is-negative"
                    }`}
                  >
                    {formatSignedPercent(row.irr, 1)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
