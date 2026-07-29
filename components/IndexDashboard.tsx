"use client";

import { HeroSection, TickerDrift } from "@/components/index-dashboard/HeroSection";
import {
  ConstituentsSection,
  DashboardFooter,
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
      <TickerDrift items={model.tickerTape} />
      <HeroSection model={model} />

      <PerformanceSection
        indexValue={model.indexValue}
        stocks={model.stocks}
        numCompanies={model.numCompanies}
      />

      <SectorSection
        sectorComposition={model.sectorComposition}
        stocks={model.stocks}
        currency={model.currency}
      />

      <ConstituentsSection
        stocks={model.stocks}
        isLoading={model.isLoading}
        numCompanies={model.numCompanies}
        currency={model.currency}
      />

      <DashboardFooter />
    </div>
  );
}
