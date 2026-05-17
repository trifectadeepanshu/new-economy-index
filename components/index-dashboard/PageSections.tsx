import Image from "next/image";
import type { ReactNode } from "react";
import { CompanyGrid } from "@/components/CompanyGrid";
import { IndexChart } from "@/components/IndexChart";
import type { StockData } from "@/lib/index-api";
import {
  SectionEyebrow,
  TickFrame,
} from "@/components/index-dashboard/DashboardChrome";
import { SectorComposition } from "@/components/index-dashboard/SectorComposition";

const METHOD_CARDS = [
  {
    number: "01",
    title: "Equal-weighted, by design",
    body: "No single constituent dominates the read. Each company contributes 1/n of the index value, then the cohort is rebalanced quarterly.",
  },
  {
    number: "03",
    title: "Built from our seat",
    body: "₹8,000 Cr deployed across 220+ companies in five funds. Trifecta Capital has been at the center of this asset class for a decade.",
  },
  {
    number: "04",
    title: "Free, public, shareable",
    body: "No paywall, no login. Use it for screenshots, decks, internal MIS, or just to check the level. Data is informational only.",
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
  mutedTitle: string;
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
              <span> {mutedTitle}</span>
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
      title="The NEI since day one."
      mutedTitle="Every high, every correction, one line."
      copy={`Equal-weighted across all 53 constituents, rebalanced quarterly. Base 1,000 set in March 2021.`}
    >
      <IndexChart liveValue={indexValue} stocks={stocks} variant="reference" />
    </ReferenceShell>
  );
}

export function ConstituentsSection({
  stocks,
  isLoading,
  numCompanies,
}: {
  stocks: StockData[];
  isLoading: boolean;
  numCompanies: number;
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
          <SectionEyebrow number="03" label="Inside the Index" light />
          <div className="nei-index-header">
            <h2 className="nei-heading nei-index-title">
              The full cohort, laid out.
              <span> Filter by sector, sort by performance, see where things stand.</span>
            </h2>
            <p className="nei-index-copy">
              {numCompanies} companies across 8 sectors. The complete public-market picture of India&apos;s new economy.
            </p>
          </div>
          <div className="nei-index-panel">
            <CompanyGrid
              stocks={stocks}
              isLoading={isLoading}
              variant="terminal"
            />
          </div>
        </div>
      </TickFrame>
    </section>
  );
}

export function SectorSection({
  stocks,
  numCompanies,
}: {
  stocks: StockData[];
  numCompanies: number;
}) {
  return (
    <ReferenceShell
      id="sectors"
      eyebrow={{ number: "04", label: "Sector Composition" }}
      title="Fintech, SaaS, deep tech, gaming."
      mutedTitle="What does India's new economy actually look like?"
      copy="Deeper than fintech. Broader than consumer. See for yourself."
    >
      <SectorComposition stocks={stocks} totalListings={numCompanies} />
    </ReferenceShell>
  );
}

export function MethodologySection({ numCompanies }: { numCompanies: number }) {
  const methodStats = [
    { label: "Deployed", value: "₹8,000 Cr" },
    { label: "Companies invested", value: "220+" },
    { label: "Funds", value: "5" },
    { label: "Years", value: "10+" },
  ];
  const cards = [
    METHOD_CARDS[0],
    {
      number: "02",
      title: `${numCompanies} listings, one number`,
      body: "Platforms, consumer brands, fintech, B2B, SaaS, edtech, gaming, and deep tech — public-market expressions of India's new economy.",
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
                A benchmark for the cohort
                <span> we underwrote.</span>
              </h2>
              <p className="nei-method-copy">
                Trifecta Capital launched India&apos;s first venture debt fund in 2015.
                A decade later many of those companies are publicly listed. The
                NEI tracks them as a single asset class from the seat that watched
                it form.
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
                Data via NSE · refreshed every 5 min during market hours. © 2026
                Trifecta Capital. The New Economy Index is for informational
                purposes only, not investment advice.
              </p>
            </div>
            <div className="nei-footer-links">
              <div>
                <strong>The Index</strong>
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
