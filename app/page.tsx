"use client";

import { useIndexData } from "@/hooks/useIndexData";
import { Header } from "@/components/Header";
import { IndexHero } from "@/components/IndexHero";
import { IndexChart } from "@/components/IndexChart";
import { SectorBreakdown } from "@/components/SectorBreakdown";
import { CompanyGrid } from "@/components/CompanyGrid";
import { INDEX_BASE_VALUE } from "@/lib/companies";

export default function Home() {
  const { data, isLoading, error } = useIndexData();

  const sinceInceptionPct =
    data?.indexValue != null
      ? ((data.indexValue - INDEX_BASE_VALUE) / INDEX_BASE_VALUE) * 100
      : null;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Header />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="mt-4 rounded-lg border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-400">
            Failed to load live data: {error}
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

        <div className="grid grid-cols-1 gap-6 pb-12 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <IndexChart liveValue={data?.indexValue ?? null} />
            <CompanyGrid stocks={data?.stocks ?? []} isLoading={isLoading} />
          </div>
          <div className="space-y-6">
            <SectorBreakdown stocks={data?.stocks ?? []} />
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-800 py-6 text-center text-xs text-zinc-600">
        Data via Yahoo Finance · 15-min delayed during market hours · NSE trading days only
        <br />
        © {new Date().getFullYear()} Trifecta Capital. Index is for informational purposes only.
      </footer>
    </div>
  );
}
