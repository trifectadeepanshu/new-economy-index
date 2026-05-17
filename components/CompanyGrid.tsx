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
const INITIAL_CARD_COUNT = 4;
const EXPANDED_CARD_COUNT = 8;

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
  const [visibleCardCount, setVisibleCardCount] = useState(INITIAL_CARD_COUNT);

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
    setVisibleCardCount(INITIAL_CARD_COUNT);

    if (onViewChange) {
      onViewChange(nextView);
      return;
    }

    setInternalView(nextView);
  }

  function handleSort(key: SortKey) {
    setVisibleCardCount(INITIAL_CARD_COUNT);
    setSort((current) => nextSort(current, key));
  }

  function handleQueryChange(nextQuery: string) {
    setVisibleCardCount(INITIAL_CARD_COUNT);
    setQuery(nextQuery);
  }

  function handleSectorChange(nextSector: SectorFilter) {
    setVisibleCardCount(INITIAL_CARD_COUNT);
    setSector(nextSector);
  }

  function handleLoadMoreCards() {
    setVisibleCardCount((current) =>
      current < EXPANDED_CARD_COUNT ? EXPANDED_CARD_COUNT : rows.length
    );
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
        onQueryChange={handleQueryChange}
        onSectorChange={handleSectorChange}
      />
      {view === "table" ? (
        <ConstituentTable
          rows={rows}
          sort={sort}
          onSort={handleSort}
          variant={variant}
        />
      ) : (
        <>
          <CompanyCards stocks={rows.slice(0, visibleCardCount)} />
          {visibleCardCount < rows.length && (
            <div className="nei-company-card-more">
              <button
                type="button"
                onClick={handleLoadMoreCards}
                aria-label={`Load more companies. Showing ${Math.min(
                  visibleCardCount,
                  rows.length
                )} of ${rows.length}.`}
              >
                Load more
              </button>
              <span className="nei-mono">
                {Math.min(visibleCardCount, rows.length)} / {rows.length} shown
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
