"use client";

import { HeroSection, TickerDrift } from "@/components/index-dashboard/HeroSection";
import {
  ConstituentsSection,
  DashboardFooter,
  MethodologySection,
  PerformanceSection,
  PortfolioSection,
  SectorSection,
} from "@/components/index-dashboard/PageSections";
import { useIndexDashboardModel } from "@/components/index-dashboard/useIndexDashboardModel";

export function IndexDashboard() {
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

      <PortfolioSection
        stocks={model.stocks}
        indexValue={model.indexValue}
        portfolioValue={model.portfolioValue}
      />

      <ConstituentsSection
        stocks={model.stocks}
        isLoading={model.isLoading}
        numCompanies={model.numCompanies}
      />

      <SectorSection stocks={model.stocks} numCompanies={model.numCompanies} />

      <MethodologySection numCompanies={model.numCompanies} />
      <DashboardFooter />
    </div>
  );
}
