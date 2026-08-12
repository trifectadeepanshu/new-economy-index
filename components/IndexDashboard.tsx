"use client";

import { HeroSection, TickerDrift } from "@/components/index-dashboard/HeroSection";
import {
  ConstituentsSection,
  DashboardFooter,
  MarketCapSection,
  PerformanceSection,
  SectorSection,
} from "@/components/index-dashboard/PageSections";
import { useIndexDashboardModel } from "@/components/index-dashboard/useIndexDashboardModel";
import { CurrencyProvider } from "@/components/index-dashboard/CurrencyContext";
import type { LiveIndexPayload } from "@/lib/index-api";

export function IndexDashboard({
  initialLiveData,
}: {
  initialLiveData?: LiveIndexPayload | null;
}) {
  return (
    <CurrencyProvider>
      <IndexDashboardInner initialLiveData={initialLiveData} />
    </CurrencyProvider>
  );
}

function IndexDashboardInner({
  initialLiveData,
}: {
  initialLiveData?: LiveIndexPayload | null;
}) {
  const model = useIndexDashboardModel(initialLiveData);

  return (
    <div className="nei-dashboard">
      <TickerDrift items={model.tickerTape} />
      <HeroSection model={model} />

      <PerformanceSection
        indexValue={model.indexValue}
        stocks={model.stocks}
      />

      <SectorSection
        sectorComposition={model.sectorComposition}
        stocks={model.stocks}
        currency={model.currency}
      />

      <MarketCapSection
        stocks={model.stocks}
        isLoading={model.isLoading}
        currency={model.currency}
        usdInr={model.usdInr}
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
