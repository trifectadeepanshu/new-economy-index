import { CompanyLogo } from "@/components/company-grid/CompanyLogo";
import {
  formatMarketCap,
  formatPrice,
  formatSignedPercent,
} from "@/components/company-grid/format";
import { RowSparkline } from "@/components/company-grid/RowSparkline";
import type {
  CompanyGridVariant,
  ConstituentRow,
  SortKey,
  SortState,
} from "@/components/company-grid/types";

const COLUMNS: Array<{
  key: SortKey;
  label: string;
  align: "left" | "right";
}> = [
  { key: "name", label: "Ticker / Name", align: "left" },
  { key: "sector", label: "Sector", align: "left" },
  { key: "price", label: "Price", align: "right" },
  { key: "marketCap", label: "Market Cap", align: "right" },
  { key: "changePct", label: "Day %", align: "right" },
  { key: "ratio", label: "Since Base", align: "right" },
];

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
  const icon = active ? (sort.dir === 1 ? "↑" : "↓") : "↕";

  return (
    <button
      type="button"
      onClick={() => onSort(column.key)}
      className={active ? "is-active" : ""}
    >
      {column.label}
      <span aria-hidden="true">{icon}</span>
    </button>
  );
}

function TableHeader({
  sort,
  onSort,
}: {
  sort: SortState;
  onSort: (key: SortKey) => void;
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
          >
            <SortButton column={column} sort={sort} onSort={onSort} />
          </th>
        ))}
        <th className="is-right">30D</th>
      </tr>
    </thead>
  );
}

function CompanyCell({
  row,
  showLogo,
}: {
  row: ConstituentRow;
  showLogo: boolean;
}) {
  return (
    <div className="nei-company-cell">
      {showLogo && <CompanyLogo ticker={row.ticker} name={row.name} size={30} />}
      <div>
        <strong>{row.ticker}</strong>
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
}: {
  rows: ConstituentRow[];
  sort: SortState;
  onSort: (key: SortKey) => void;
  variant?: CompanyGridVariant;
}) {
  const isTerminal = variant === "terminal";

  return (
    <div className={`nei-constituents ${isTerminal ? "is-terminal" : ""}`}>
      <div className="nei-constituent-table-wrap">
        <table className="nei-constituent-table">
          <TableHeader sort={sort} onSort={onSort} />
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.ticker}>
                <td className="nei-row-number">
                  {String(index + 1).padStart(2, "0")}
                </td>
                <td>
                  <CompanyCell row={row} showLogo={!isTerminal} />
                </td>
                <td>
                  <span className="nei-sector-name">{row.sector}</span>
                </td>
                <td className="is-right nei-mono">{formatPrice(row.price)}</td>
                <td className="is-right nei-mono">{formatMarketCap(row.marketCap)}</td>
                <td
                  className={`is-right nei-mono ${
                    (row.changePct ?? 0) >= 0 ? "is-positive" : "is-negative"
                  }`}
                >
                  {formatSignedPercent(row.changePct)}
                </td>
                <td
                  className={`is-right nei-mono ${
                    (row.sinceBase ?? 0) >= 0 ? "is-positive" : "is-negative"
                  }`}
                >
                  {formatSignedPercent(row.sinceBase, 1)}
                </td>
                <td className="is-right">
                  <RowSparkline row={row} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
