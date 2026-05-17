import { SECTORS } from "@/lib/companies";
import type { SectorFilter } from "@/components/company-grid/types";

const SECTOR_OPTIONS = ["All", ...SECTORS];

function SectorFilterControl({
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

export function ConstituentTools({
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
      <SectorFilterControl value={sector} onChange={onSectorChange} />
      <span className="nei-constituent-count">
        {count} / {total} listings
      </span>
    </div>
  );
}
