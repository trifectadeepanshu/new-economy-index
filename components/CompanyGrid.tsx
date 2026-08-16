"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { CompanyCards } from "@/components/company-grid/CompanyCards";
import { CompanyGridSkeleton } from "@/components/company-grid/CompanyGridSkeleton";
import { ConstituentTools } from "@/components/company-grid/ConstituentTools";
import { ConstituentTable } from "@/components/company-grid/ConstituentTable";
import {
  nextSort,
  useConstituentRows,
} from "@/components/company-grid/useConstituentRows";
import { useCustomCagrPrices } from "@/components/company-grid/useCustomCagr";
import { ViewToggle } from "@/components/company-grid/ViewToggle";

// Deferred: only needed after a user clicks a company card, and it pulls in
// recharts — no reason to block initial hydration on its JS.
const CompanyModal = dynamic(
  () => import("@/components/company-grid/CompanyModal").then((m) => m.CompanyModal),
  { ssr: false }
);
import { getISTDate } from "@/lib/market-hours";
import type { StockData } from "@/lib/index-api";
import type {
  CagrRangeMode,
  CompanyGridProps,
  CompanyGridView,
  SectorFilter,
  SortKey,
  SortState,
} from "@/components/company-grid/types";

const INITIAL_SORT: SortState = { key: "marketCap", dir: -1 };
const MOBILE_CARD_VIEW = "(max-width: 1100px)";
const INITIAL_CARD_COUNT = 12; // a full 3 rows at the grid's usual 4-column width
// Table rows are far shorter than cards, so a "page" holds more of them.
const INITIAL_TABLE_COUNT = 10;
const EXPANDED_TABLE_COUNT = 25;

function initialCountFor(view: CompanyGridView) {
  return view === "table" ? INITIAL_TABLE_COUNT : INITIAL_CARD_COUNT;
}

// Only the table view steps through a middle tier (10 -> 25 -> all); card
// view reveals the rest in one click straight from the initial 12.
function expandedCountFor(view: CompanyGridView) {
  return view === "table" ? EXPANDED_TABLE_COUNT : null;
}

/** The date to fetch prices for, given the picked CAGR window. Null means
 * "use the default since-base window" (no fetch needed). */
function cagrFromDateFor(mode: CagrRangeMode, customDate: string | null): string | null {
  if (mode === "sinceBase") return null;
  if (mode === "custom") return customDate;

  const years = mode === "1y" ? 1 : mode === "3y" ? 3 : 5;
  const d = new Date(getISTDate());
  d.setUTCFullYear(d.getUTCFullYear() - years);
  return d.toISOString().slice(0, 10);
}

function LoadMoreBar({
  visibleCount,
  total,
  onLoadMore,
}: {
  visibleCount: number;
  total: number;
  onLoadMore: () => void;
}) {
  return (
    <div className="nei-company-list-more">
      <button
        type="button"
        onClick={onLoadMore}
        aria-label={`Load more companies. Showing ${Math.min(visibleCount, total)} of ${total}.`}
      >
        Load more
      </button>
      <span className="nei-mono">
        {Math.min(visibleCount, total)} / {total} shown
      </span>
    </div>
  );
}

function EmptyCompanyState({
  hasActiveFilters,
  onReset,
}: {
  hasActiveFilters: boolean;
  onReset: () => void;
}) {
  return (
    <div className="nei-company-empty" role="status">
      <h3>No companies found</h3>
      <p>
        {hasActiveFilters
          ? "Try a different search or sector filter."
          : "Company data is unavailable right now."}
      </p>
      {hasActiveFilters && (
        <button type="button" onClick={onReset}>
          Clear filters
        </button>
      )}
    </div>
  );
}

export function CompanyGrid({
  stocks,
  isLoading,
  currency = "inr",
  usdInr = null,
  view: externalView,
  onViewChange,
  showToggle: showToggleProp,
  variant = "default",
}: CompanyGridProps) {
  const [internalView, setInternalView] = useState<CompanyGridView | null>(null);
  const [isMobileCardViewport, setIsMobileCardViewport] = useState<boolean | null>(null);
  const [hasChosenView, setHasChosenView] = useState(false);
  const [sort, setSort] = useState<SortState>(INITIAL_SORT);
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState<SectorFilter>("All");
  const [visibleCount, setVisibleCount] = useState(INITIAL_CARD_COUNT);
  const [selected, setSelected] = useState<StockData | null>(null);
  const [cagrMode, setCagrMode] = useState<CagrRangeMode>("sinceBase");
  const [customCagrDate, setCustomCagrDate] = useState<string | null>(null);

  const view = externalView ?? internalView ?? "grid";
  const hasResolvedAutoView = externalView !== undefined || internalView !== null;
  const hasResolvedViewport = isMobileCardViewport !== null;
  const showToggle = showToggleProp ?? externalView === undefined;

  const cagrFromDate = useMemo(
    () => cagrFromDateFor(cagrMode, customCagrDate),
    [cagrMode, customCagrDate]
  );
  const { prices: cagrPrices, isLoading: cagrLoading } = useCustomCagrPrices(cagrFromDate);
  const customCagr = cagrFromDate && cagrPrices ? { fromDate: cagrFromDate, prices: cagrPrices } : null;

  const rows = useConstituentRows(stocks, sort, sector, query, customCagr, currency, usdInr);
  const hasActiveFilters = query.trim().length > 0 || sector !== "All";
  // Re-resolve against the live rows every render so an open modal keeps
  // tracking its company's price/change as `stocks` refreshes on the 30s
  // poll (useIndexData.ts), instead of showing the frozen object captured
  // at click time. Falls back to the click-time snapshot if the ticker
  // briefly isn't in `rows` (e.g. a search filter narrowed it out).
  const liveSelected = selected
    ? (rows.find((r) => r.ticker === selected.ticker) ?? selected)
    : null;

  // Progressive disclosure applies in every view (grid or table, any
  // viewport) — reset to that view's initial page whenever the view itself
  // changes (including the very first auto-detected view). Adjusted during
  // render (React's recommended pattern) rather than in an effect, since it's
  // pure derived state and doesn't need an extra render pass.
  const [prevView, setPrevView] = useState(view);
  let effectiveVisibleCount = visibleCount;
  if (view !== prevView) {
    effectiveVisibleCount = initialCountFor(view);
    setPrevView(view);
    setVisibleCount(effectiveVisibleCount);
  }

  const visibleRows = rows.slice(0, effectiveVisibleCount);
  const canLoadMore = effectiveVisibleCount < rows.length;

  useEffect(() => {
    const media = window.matchMedia(MOBILE_CARD_VIEW);
    const syncView = () => {
      const isMobile = media.matches;

      setIsMobileCardViewport(isMobile);
      if (externalView === undefined && !hasChosenView) {
        setInternalView(isMobile ? "grid" : "table");
      }
    };

    syncView();
    media.addEventListener("change", syncView);
    return () => media.removeEventListener("change", syncView);
  }, [externalView, hasChosenView]);

  function handleViewChange(nextView: CompanyGridView) {
    setHasChosenView(true);
    setVisibleCount(initialCountFor(nextView));

    if (onViewChange) {
      onViewChange(nextView);
      return;
    }

    setInternalView(nextView);
  }

  function handleSort(key: SortKey) {
    setVisibleCount(initialCountFor(view));
    setSort((current) => nextSort(current, key));
  }

  function handleQueryChange(nextQuery: string) {
    setVisibleCount(initialCountFor(view));
    setQuery(nextQuery);
  }

  function handleSectorChange(nextSector: SectorFilter) {
    setVisibleCount(initialCountFor(view));
    setSector(nextSector);
  }

  function handleLoadMore() {
    const expanded = expandedCountFor(view);
    if (expanded === null) {
      setVisibleCount(rows.length);
      return;
    }
    setVisibleCount((current) => (current < expanded ? expanded : rows.length));
  }

  function handleResetFilters() {
    setQuery("");
    setSector("All");
    setVisibleCount(initialCountFor(view));
  }

  if (!hasResolvedViewport || !hasResolvedAutoView || (isLoading && stocks.length === 0)) {
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
      {rows.length === 0 ? (
        <EmptyCompanyState
          hasActiveFilters={hasActiveFilters}
          onReset={handleResetFilters}
        />
      ) : null}
      {rows.length > 0 && view === "table" ? (
        <>
          <ConstituentTable
            rows={visibleRows}
            sort={sort}
            onSort={handleSort}
            variant={variant}
            currency={currency}
            onSelect={setSelected}
            cagrMode={cagrMode}
            onCagrModeChange={setCagrMode}
            customCagrDate={customCagrDate}
            onCustomCagrDateChange={setCustomCagrDate}
            cagrLoading={cagrLoading}
          />
          {canLoadMore && (
            <LoadMoreBar visibleCount={effectiveVisibleCount} total={rows.length} onLoadMore={handleLoadMore} />
          )}
        </>
      ) : rows.length > 0 ? (
        <>
          <CompanyCards stocks={visibleRows} currency={currency} onSelect={setSelected} />
          {canLoadMore && (
            <LoadMoreBar visibleCount={effectiveVisibleCount} total={rows.length} onLoadMore={handleLoadMore} />
          )}
        </>
      ) : null}

      <CompanyModal stock={liveSelected} onClose={() => setSelected(null)} />
    </div>
  );
}
