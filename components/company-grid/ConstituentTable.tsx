import { useState } from "react";
import { SECTORS } from "@/lib/companies";
import type { StockData } from "@/lib/index-api";
import { CompanyLogo } from "@/components/company-grid/CompanyLogo";
import {
  formatPrice,
  formatSignedPercent,
} from "@/components/company-grid/format";
import { RowSparkline } from "@/components/company-grid/RowSparkline";
import {
  nextSort,
  useConstituentRows,
} from "@/components/company-grid/useConstituentRows";
import type {
  CompanyGridVariant,
  SectorFilter,
  SortKey,
  SortState,
} from "@/components/company-grid/types";

const INITIAL_SORT: SortState = { key: "ratio", dir: -1 };

const COLUMNS: Array<{
  key: SortKey;
  label: string;
  align: "left" | "right";
}> = [
  { key: "name", label: "Ticker / Name", align: "left" },
  { key: "sector", label: "Sector", align: "left" },
  { key: "price", label: "Price", align: "right" },
  { key: "changePct", label: "Day %", align: "right" },
  { key: "ratio", label: "Since Base", align: "right" },
];

const SECTOR_OPTIONS = ["All", ...SECTORS];

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

function SectorFilter({
  value,
  onChange,
}: {
  value: SectorFilter;
  onChange: (value: SectorFilter) => void;
}) {
  return (
    <div className="nei-sector-filter" aria-label="Filter by sector">
      {SECTOR_OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          className={value === option ? "is-active" : ""}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function TableTools({
  query,
  sector,
  count,
  total,
  onQueryChange,
  onSectorChange,
}: {
  query: string;
  sector: SectorFilter;
  count: number;
  total: number;
  onQueryChange: (value: string) => void;
  onSectorChange: (value: SectorFilter) => void;
}) {
  return (
    <div className="nei-constituent-tools">
      <label className="sr-only" htmlFor="constituent-search">
        Search constituents
      </label>
      <input
        id="constituent-search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Search ticker, name..."
        className="nei-constituent-search"
      />
      <SectorFilter value={sector} onChange={onSectorChange} />
      <span className="nei-constituent-count">
        {count} / {total} listings
      </span>
    </div>
  );
}

function CompanyCell({
  row,
  showLogo,
}: {
  row: StockData;
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
  stocks,
  variant = "default",
}: {
  stocks: StockData[];
  variant?: CompanyGridVariant;
}) {
  const [sort, setSort] = useState<SortState>(INITIAL_SORT);
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState<SectorFilter>("All");
  const rows = useConstituentRows(stocks, sort, sector, query);
  const isTerminal = variant === "terminal";

  return (
    <div className={`nei-constituents ${isTerminal ? "is-terminal" : ""}`}>
      <TableTools
        query={query}
        sector={sector}
        count={rows.length}
        total={stocks.length}
        onQueryChange={setQuery}
        onSectorChange={setSector}
      />

      <div className="nei-constituent-table-wrap">
        <table className="nei-constituent-table">
          <TableHeader sort={sort} onSort={(key) => setSort(nextSort(sort, key))} />
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
