"use client";

import { useEffect, useState } from "react";
import { CompanyCards } from "@/components/company-grid/CompanyCards";
import { CompanyGridSkeleton } from "@/components/company-grid/CompanyGridSkeleton";
import { ConstituentTools } from "@/components/company-grid/ConstituentTools";
import { ConstituentTable } from "@/components/company-grid/ConstituentTable";
import {
  nextSort,
  useConstituentRows,
} from "@/components/company-grid/useConstituentRows";
import { ViewToggle } from "@/components/company-grid/ViewToggle";
import type {
  CompanyGridProps,
  CompanyGridView,
  SectorFilter,
  SortKey,
  SortState,
} from "@/components/company-grid/types";

const INITIAL_SORT: SortState = { key: "ratio", dir: -1 };
const MOBILE_CARD_VIEW = "(max-width: 640px)";

export function CompanyGrid({
  stocks,
  isLoading,
  view: externalView,
  onViewChange,
  showToggle: showToggleProp,
  variant = "default",
}: CompanyGridProps) {
  const [internalView, setInternalView] = useState<CompanyGridView>("table");
  const [hasChosenView, setHasChosenView] = useState(false);
  const [sort, setSort] = useState<SortState>(INITIAL_SORT);
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState<SectorFilter>("All");

  const view = externalView ?? internalView;
  const showToggle = showToggleProp ?? externalView === undefined;
  const rows = useConstituentRows(stocks, sort, sector, query);

  useEffect(() => {
    if (externalView !== undefined || hasChosenView) return;

    const media = window.matchMedia(MOBILE_CARD_VIEW);
    const syncView = () => setInternalView(media.matches ? "grid" : "table");

    syncView();
    media.addEventListener("change", syncView);
    return () => media.removeEventListener("change", syncView);
  }, [externalView, hasChosenView]);

  function handleViewChange(nextView: CompanyGridView) {
    setHasChosenView(true);
    if (onViewChange) {
      onViewChange(nextView);
      return;
    }

    setInternalView(nextView);
  }

  function handleSort(key: SortKey) {
    setSort((current) => nextSort(current, key));
  }

  if (isLoading && stocks.length === 0) {
    return (
      <CompanyGridSkeleton
        view={view}
        showToggle={showToggle}
        onViewChange={handleViewChange}
      />
    );
  }

  return (
    <div className={`nei-company-grid ${variant === "terminal" ? "is-terminal" : ""}`}>
      {showToggle && (
        <div className="nei-company-grid-toolbar">
          <ViewToggle value={view} onChange={handleViewChange} />
        </div>
      )}
      <ConstituentTools
        query={query}
        sector={sector}
        count={rows.length}
        total={stocks.length}
        onQueryChange={setQuery}
        onSectorChange={setSector}
      />
      {view === "table" ? (
        <ConstituentTable
          rows={rows}
          sort={sort}
          onSort={handleSort}
          variant={variant}
        />
      ) : (
        <CompanyCards stocks={rows} />
      )}
    </div>
  );
}
