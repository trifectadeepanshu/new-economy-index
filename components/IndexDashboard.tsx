"use client";

import { HeroSection, TickerDrift } from "@/components/index-dashboard/HeroSection";
import {
  ConstituentsSection,
  DashboardFooter,
  MethodologySection,
  PerformanceSection,
  SectorSection,
} from "@/components/index-dashboard/PageSections";
import { ShoulderDivider } from "@/components/index-dashboard/DashboardChrome";
import { useIndexDashboardModel } from "@/components/index-dashboard/useIndexDashboardModel";

export function IndexDashboard() {
  const model = useIndexDashboardModel();

  return (
    <div className="nei-dashboard">
      <TickerDrift stocks={model.stocks} />
      <HeroSection model={model} />

      <ShoulderDivider from="#172C54" to="var(--nei-bg)" height={64} />
      <PerformanceSection indexValue={model.indexValue} stocks={model.stocks} />

      <ShoulderDivider from="var(--nei-bg)" to="#172C54" height={72} label="Inside the Index" />
      <ConstituentsSection
        stocks={model.stocks}
        isLoading={model.isLoading}
        numCompanies={model.numCompanies}
      />

      <ShoulderDivider from="#172C54" to="var(--nei-bg)" height={64} />
      <SectorSection stocks={model.stocks} numCompanies={model.numCompanies} />

      <ShoulderDivider from="var(--nei-bg)" to="#172C54" height={72} label="Methodology" />
      <MethodologySection numCompanies={model.numCompanies} />
      <DashboardFooter />
    </div>
  );
}
