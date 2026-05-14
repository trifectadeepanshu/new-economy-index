"use client";

import { useIndexData } from "@/hooks/useIndexData";
import { CompanyGrid } from "@/components/CompanyGrid";
import { IndexChart } from "@/components/IndexChart";
import { IndexHero } from "@/components/IndexHero";
import { SectorBreakdown } from "@/components/SectorBreakdown";
import { INDEX_BASE_VALUE } from "@/lib/companies";

export function IndexDashboard() {
  const { data, isLoading, error } = useIndexData();

  const sinceInceptionPct =
    data?.indexValue != null
      ? ((data.indexValue - INDEX_BASE_VALUE) / INDEX_BASE_VALUE) * 100
      : null;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 sm:px-8 xl:px-[52px]">
      {data?.isStale && (
        <div className="mt-4 border border-white/10 bg-[#0f1e41]/80 px-4 py-2 font-sans text-xs text-white/45">
          Showing last market close · Live prices unavailable
        </div>
      )}

      {error && !data && (
        <div className="mt-4 border border-red-400/25 bg-red-500/10 px-4 py-2 font-sans text-xs text-red-200">
          Live index data is temporarily unavailable.
        </div>
      )}

      <IndexHero
        indexValue={data?.indexValue ?? null}
        indexChangePct={data?.indexChangePct ?? null}
        numCompanies={data?.numCompanies ?? 0}
        lastUpdated={data?.lastUpdated ?? null}
        sinceInceptionPct={sinceInceptionPct}
        isLoading={isLoading}
      />

      <div className="grid grid-cols-1 gap-6 pb-12 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <div className="min-w-0 space-y-6">
          <IndexChart
            liveValue={data?.indexValue ?? null}
            stocks={data?.stocks ?? []}
          />
          <CompanyGrid stocks={data?.stocks ?? []} isLoading={isLoading} />
        </div>
        <div className="min-w-0 space-y-6">
          <SectorBreakdown stocks={data?.stocks ?? []} />
        </div>
      </div>
    </main>
  );
}
