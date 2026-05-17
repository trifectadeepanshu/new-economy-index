"use client";

import { useState } from "react";
import { CompanyCards } from "@/components/company-grid/CompanyCards";
import { CompanyGridSkeleton } from "@/components/company-grid/CompanyGridSkeleton";
import { ConstituentTable } from "@/components/company-grid/ConstituentTable";
import { ViewToggle } from "@/components/company-grid/ViewToggle";
import type {
  CompanyGridProps,
  CompanyGridView,
} from "@/components/company-grid/types";

export function CompanyGrid({
  stocks,
  isLoading,
  view: externalView,
  onViewChange,
  showToggle: showToggleProp,
  variant = "default",
}: CompanyGridProps) {
  const [internalView, setInternalView] = useState<CompanyGridView>("table");

  const view = externalView ?? internalView;
  const setView = onViewChange ?? setInternalView;
  const showToggle = showToggleProp ?? externalView === undefined;

  if (isLoading && stocks.length === 0) {
    return (
      <CompanyGridSkeleton
        view={view}
        showToggle={showToggle}
        onViewChange={setView}
      />
    );
  }

  return (
    <div>
      {showToggle && (
        <div className="nei-company-grid-toolbar">
          <ViewToggle value={view} onChange={setView} />
        </div>
      )}
      {view === "table" ? (
        <ConstituentTable
          stocks={stocks}
          variant={variant}
        />
      ) : (
        <CompanyCards stocks={stocks} />
      )}
    </div>
  );
}
