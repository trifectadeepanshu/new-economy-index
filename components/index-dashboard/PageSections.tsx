import Image from "next/image";
import Link from "next/link";
import { type ReactNode } from "react";
import { CompanyGrid } from "@/components/CompanyGrid";
import { IndexChart } from "@/components/IndexChart";
import type { Currency, SectorCompositionPoint, StockData } from "@/lib/index-api";
import { SECTORS } from "@/lib/companies";
import {
  SectionEyebrow,
  TickFrame,
} from "@/components/index-dashboard/DashboardChrome";
import { SectorBento } from "@/components/index-dashboard/SectorBento";

function ReferenceShell({
  id,
  eyebrow,
  title,
  mutedTitle,
  copy,
  children,
}: {
  id: string;
  eyebrow: { number: string; label: string };
  title: ReactNode;
  mutedTitle?: string;
  copy: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="nei-reference-section">
      <TickFrame
        className="nei-reference-frame"
        inset={32}
        tone="ink"
        lineLen={44}
        corner={14}
        opacity={0.35}
        padded={false}
      >
        <div className="nei-reference-inner">
          <SectionEyebrow number={eyebrow.number} label={eyebrow.label} />
          <div className="nei-reference-header">
            <h2 className="nei-heading nei-reference-title">
              {title}
              {mutedTitle ? <span> {mutedTitle}</span> : null}
            </h2>
            <p className="nei-reference-copy">{copy}</p>
          </div>
          {children}
        </div>
      </TickFrame>
    </section>
  );
}

export function PerformanceSection({
  indexValue,
  stocks,
}: {
  indexValue: number | null;
  stocks: StockData[];
}) {
  return (
    <ReferenceShell
      id="performance"
      eyebrow={{ number: "02", label: "Performance" }}
      title={
        <>
          The NEI Top 50<br />since day one.
        </>
      }
      copy="Base 1,000 set in January 2021. Tracked live since."
    >
      <IndexChart liveValue={indexValue} stocks={stocks} variant="reference" />
    </ReferenceShell>
  );
}

export function ConstituentsSection({
  stocks,
  isLoading,
  numCompanies,
  currency,
}: {
  stocks: StockData[];
  isLoading: boolean;
  numCompanies: number;
  currency: Currency;
}) {
  return (
    <section id="constituents" className="nei-index-section nei-dark-section-vars">
      <div aria-hidden="true" className="nei-index-section-glow" />
      <TickFrame
        className="nei-index-frame"
        inset={32}
        tone="paper"
        lineLen={44}
        corner={14}
        opacity={0.36}
        padded={false}
      >
        <div className="nei-index-inner">
          <SectionEyebrow number="04" label="Inside the Cohort" light />
          <div className="nei-index-header">
            <h2 className="nei-heading nei-index-title">
              The full cohort,
              <span> laid out.</span>
            </h2>
            <p className="nei-index-copy">
              {numCompanies} companies. {SECTORS.length} sectors. The full public-market picture.
            </p>
          </div>
          <div className="nei-index-panel">
            <CompanyGrid
              stocks={stocks}
              isLoading={isLoading}
              variant="terminal"
              currency={currency}
            />
          </div>
        </div>
      </TickFrame>
    </section>
  );
}

export function SectorSection({
  sectorComposition,
  stocks,
  currency,
}: {
  sectorComposition: SectorCompositionPoint[];
  stocks: StockData[];
  currency: Currency;
}) {
  return (
    <ReferenceShell
      id="sectors"
      eyebrow={{ number: "03", label: "Sector Composition" }}
      title="India's new economy,"
      mutedTitle="broken down."
      copy="Deeper than fintech. Broader than consumer. Constantly evolving."
    >
      <SectorBento sectors={sectorComposition} stocks={stocks} currency={currency} />
    </ReferenceShell>
  );
}

export function DashboardFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="nei-footer-v2">
      <TickFrame inset={32} tone="paper" lineLen={36} corner={12} opacity={0.3} padded={false}>
        <div className="nei-footer-inner">
          <div className="nei-footer-top">
            <div className="nei-footer-brand-col">
              <div className="nei-footer-brand">
                <Image
                  src="/trifecta-capital-logo.png"
                  alt="Trifecta Capital"
                  width={166}
                  height={48}
                  className="nei-footer-logo"
                />
              </div>
              <p>
                Market data sourced from Yahoo Finance, updated during market
                hours. Provided for informational purposes only; not investment
                advice. © {year} Trifecta Capital.
              </p>
            </div>
            <div className="nei-footer-links">
              <div>
                <strong>NEI Top 50</strong>
                <Link href="/#performance">Performance</Link>
                <Link href="/#constituents">Constituents</Link>
                <Link href="/#sectors">Sectors</Link>
                <Link href="/methodology">Methodology</Link>
              </div>
              <div>
                <strong>Trifecta Capital</strong>
                <a href="https://trifectacapital.in" target="_blank" rel="noopener noreferrer">
                  trifectacapital.in ↗
                </a>
                <a href="mailto:info@trifectacapital.in">info@trifectacapital.in</a>
              </div>
            </div>
          </div>
          <div className="nei-footer-bottom">
            <span>2015 → {year} →</span>
            <span>Gurugram · Mumbai · Bengaluru</span>
          </div>
        </div>
      </TickFrame>
    </footer>
  );
}
