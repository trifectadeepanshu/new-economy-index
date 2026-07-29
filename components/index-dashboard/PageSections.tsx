import Image from "next/image";
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
import { PortfolioMark } from "@/components/company-grid/PortfolioMark";

const METHOD_CARDS = [
  {
    number: "01",
    title: "Market-cap weighted, by design",
    body: "Each company's weight reflects its public-market size. The cohort moves with the aggregate value of its companies.",
  },
  {
    number: "03",
    title: "A decade in the ecosystem",
    body: "Trifecta Capital has backed India's new economy for over a decade, long before many of these companies became household names. The NEI Top 50 grew out of that vantage point — an objective read on how the whole cohort is performing.",
  },
  {
    number: "04",
    title: "Free, public, shareable",
    body: "No paywall, no login. Use it for decks, MIS, research, or just to get a pulse check on the New Economy.",
  },
] as const;

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
  title: string;
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
  numCompanies,
}: {
  indexValue: number | null;
  stocks: StockData[];
  numCompanies: number;
}) {
  return (
    <ReferenceShell
      id="performance"
      eyebrow={{ number: "02", label: "Performance" }}
      title="The NEI Top 50 since day one."
      copy={`Market-cap weighted across the top ${numCompanies} constituents. Base 1,000 set in January 2021.`}
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
          <SectionEyebrow number="03" label="Inside the Cohort" light />
          <div className="nei-index-header">
            <h2 className="nei-heading nei-index-title">
              The full cohort, laid out.
              <span> Filter, sort, explore.</span>
            </h2>
            <p className="nei-index-copy">
              {numCompanies} companies across {SECTORS.length} sectors. The complete public-market picture of India&apos;s new economy. Names marked with the <PortfolioMark /> are Trifecta Capital portfolio companies.
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
      eyebrow={{ number: "04", label: "Sector Composition" }}
      title="What is India's new economy actually made of?"
      copy="Deeper than fintech. Broader than consumer. Constantly evolving. Open any sector for its trend and holdings."
    >
      <SectorBento sectors={sectorComposition} stocks={stocks} currency={currency} />
    </ReferenceShell>
  );
}

export function MethodologySection({ numCompanies }: { numCompanies: number }) {
  const methodStats = [
    { label: "Deployed", value: "$1B" },
    { label: "Companies invested", value: "220+" },
    { label: "Funds", value: "5" },
    { label: "Years", value: "10+" },
  ];
  const cards = [
    METHOD_CARDS[0],
    {
      number: "02",
      title: "The full picture, not the highlights",
      body: `${numCompanies} companies across ${SECTORS.length} sectors. Not just the names everyone knows, but the complete public-market expression of India's new economy.`,
    },
    METHOD_CARDS[1],
    METHOD_CARDS[2],
  ];

  return (
    <section id="methodology" className="nei-method-section nei-dark-section-vars">
      <TickFrame
        className="nei-method-frame"
        inset={32}
        tone="paper"
        lineLen={44}
        corner={14}
        opacity={0.42}
        padded={false}
      >
        <div className="nei-method-inner">
          <SectionEyebrow number="05" label="Why we built this" light />
          <div className="nei-method-grid">
            <div>
              <h2 className="nei-heading nei-method-title">
                A decade in.
                <span> Here is what we learned.</span>
              </h2>
              <p className="nei-method-copy">
                A decade of backing India&apos;s next generation of businesses
                leaves you with a question: how is the cohort doing, all
                together? The NEI Top 50 is our answer.
              </p>
              <div className="nei-method-stats">
                {methodStats.map((stat) => (
                  <div key={stat.label}>
                    <span>{stat.label}</span>
                    <strong className="nei-mono">{stat.value}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="nei-method-cards">
              {cards.map((card) => (
                <div key={card.number} className="nei-method-card">
                  <span className="nei-mono">§{card.number}</span>
                  <div>
                    <h3>{card.title}</h3>
                    <p>{card.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </TickFrame>
    </section>
  );
}

export function DashboardFooter() {
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
                Market data for NSE-listed companies, sourced from public feeds
                and updated during market hours. The NEI Top 50 is for
                informational purposes only and does not constitute investment
                advice. © 2026 Trifecta Capital.
              </p>
            </div>
            <div className="nei-footer-links">
              <div>
                <strong>NEI Top 50</strong>
                <a href="#performance">Performance</a>
                <a href="#constituents">Constituents</a>
                <a href="#sectors">Sectors</a>
                <a href="#methodology">Methodology</a>
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
            <span>2015 → 2026 →</span>
            <span>Gurugram · Mumbai · Bengaluru</span>
          </div>
        </div>
      </TickFrame>
    </footer>
  );
}
