"use client";

import { HeroSection, TickerDrift } from "@/components/index-dashboard/HeroSection";
import {
  ConstituentsSection,
  DashboardFooter,
  MethodologySection,
  PerformanceSection,
  SectorSection,
} from "@/components/index-dashboard/PageSections";
import { useIndexDashboardModel } from "@/components/index-dashboard/useIndexDashboardModel";
import { CurrencyProvider } from "@/components/index-dashboard/CurrencyContext";

export function IndexDashboard() {
  return (
    <CurrencyProvider>
      <IndexDashboardInner />
    </CurrencyProvider>
  );
}

function IndexDashboardInner() {
  const model = useIndexDashboardModel();

  return (
    <div className="nei-dashboard">
      <TickerDrift stocks={model.stocks} />
      <HeroSection model={model} />

      <PerformanceSection
        indexValue={model.indexValue}
        stocks={model.stocks}
        numCompanies={model.numCompanies}
      />

      <ConstituentsSection
        stocks={model.stocks}
        isLoading={model.isLoading}
        numCompanies={model.numCompanies}
        currency={model.currency}
      />

      <SectorSection
        sectorComposition={model.sectorComposition}
        currency={model.currency}
      />

      <MethodologySection numCompanies={model.numCompanies} />
      <DashboardFooter />
    </div>
  );
}
