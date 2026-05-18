import Image from "next/image";
import { useMemo, type ReactNode } from "react";
import { CompanyGrid } from "@/components/CompanyGrid";
import { IndexChart } from "@/components/IndexChart";
import type { StockData } from "@/lib/index-api";
import { PORTFOLIO_TICKERS, SECTORS } from "@/lib/companies";
import { INDEX_BASE_VALUE } from "@/lib/companies";
import {
  SectionEyebrow,
  TickFrame,
} from "@/components/index-dashboard/DashboardChrome";
import { SectorComposition } from "@/components/index-dashboard/SectorComposition";
import { formatNumber } from "@/components/index-dashboard/format";

const METHOD_CARDS = [
  {
    number: "01",
    title: "Equal-weighted, by design",
    body: "No single name skews the read. Every company carries the same weight, so the index moves with the cohort, not the headlines.",
  },
  {
    number: "03",
    title: "Built by insiders",
    body: "Trifecta Capital has backed this asset class since before it had a name. The NEI is not an external observer's take. It is the scorecard of the firm that helped build the cohort.",
  },
  {
    number: "04",
    title: "Free, public, shareable",
    body: "No paywall, no login. Use it for decks, MIS, research, or just to check the level. Built to be shared.",
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
      title="The NEI since day one."
      mutedTitle="One line, no filter."
      copy={`Equal-weighted across all ${numCompanies} constituents, rebalanced quarterly. Base 1,000 set in March 2021.`}
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
              <span> Filter, sort, explore.</span>
            </h2>
            <p className="nei-index-copy">
              {numCompanies} companies across {SECTORS.length} sectors. The complete public-market picture of India&apos;s new economy.
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
      title="What is India's new economy actually made of?"
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
          <SectionEyebrow number="06" label="Why we built this" light />
          <div className="nei-method-grid">
            <div>
              <h2 className="nei-heading nei-method-title">
                A decade in.
                <span> Here is what we learned.</span>
              </h2>
              <p className="nei-method-copy">
                A decade of backing India&apos;s next generation of businesses
                leaves you with a question: how is the cohort doing, all
                together? The NEI is our answer.
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

export function PortfolioSection({
  stocks,
  indexValue,
}: {
  stocks: StockData[];
  indexValue: number | null;
}) {
  const portfolioStocks = useMemo(
    () => stocks.filter((s) => PORTFOLIO_TICKERS.has(s.ticker)),
    [stocks]
  );

  const portfolioIndexValue = useMemo(() => {
    const ratios = portfolioStocks
      .filter((s) => s.price !== null && s.basePrice !== null && s.basePrice > 0)
      .map((s) => s.price! / s.basePrice!);
    if (!ratios.length) return null;
    return INDEX_BASE_VALUE * (ratios.reduce((a, b) => a + b, 0) / ratios.length);
  }, [portfolioStocks]);

  const portfolioSinceInception =
    portfolioIndexValue !== null
      ? ((portfolioIndexValue - INDEX_BASE_VALUE) / INDEX_BASE_VALUE) * 100
      : null;
  const neiSinceInception =
    indexValue !== null
      ? ((indexValue - INDEX_BASE_VALUE) / INDEX_BASE_VALUE) * 100
      : null;

  const chartRows = useMemo(() =>
    portfolioStocks
      .map((s) => ({
        name: s.name.replace(/\s*\(.*?\)/, "").trim(),
        ticker: s.ticker,
        sinceInc:
          s.price !== null && s.basePrice !== null && s.basePrice > 0
            ? ((s.price / s.basePrice) - 1) * 100
            : null,
      }))
      .sort((a, b) => (b.sinceInc ?? -Infinity) - (a.sinceInc ?? -Infinity)),
    [portfolioStocks]
  );

  const maxAbs = useMemo(() =>
    Math.max(...chartRows.map((r) => Math.abs(r.sinceInc ?? 0)), Math.abs(neiSinceInception ?? 0), 15),
    [chartRows, neiSinceInception]
  );

  const neiLinePos = 50 + ((neiSinceInception ?? 0) / maxAbs) * 50;

  function fmtPct(v: number | null) {
    if (v === null) return "—";
    return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
  }

  const delta =
    portfolioSinceInception !== null && neiSinceInception !== null
      ? portfolioSinceInception - neiSinceInception
      : null;

  return (
    <section id="portfolio" className="nei-portfolio-section nei-dark-section-vars">
      <TickFrame
        className="nei-portfolio-frame"
        inset={32}
        tone="paper"
        lineLen={44}
        corner={14}
        opacity={0.36}
        padded={false}
      >
        <div className="nei-portfolio-inner">
          <SectionEyebrow number="05" label="Trifecta Portfolio" light />
          <div className="nei-portfolio-body">

            {/* Left: bar chart */}
            <div className="nei-portfolio-chart-col">
              <h2 className="nei-heading nei-portfolio-title">
                Our portfolio,<span> benchmarked.</span>
              </h2>
              <div className="nei-pchart">
                {chartRows.map((row) => {
                  const val = row.sinceInc;
                  const isPos = val !== null && val >= 0;
                  const barW = val !== null ? (Math.abs(val) / maxAbs) * 50 : 0;
                  const barLeft = isPos ? 50 : 50 - barW;
                  return (
                    <div key={row.ticker} className="nei-pchart-row">
                      <span className="nei-pchart-name">{row.name}</span>
                      <div className="nei-pchart-track">
                        <div className="nei-pchart-center" />
                        <div className="nei-pchart-nei-line" style={{ left: `${neiLinePos}%` }} />
                        {val !== null && (
                          <div
                            className={`nei-pchart-bar ${isPos ? "nei-pchart-bar--pos" : "nei-pchart-bar--neg"}`}
                            style={{ left: `${barLeft}%`, width: `${barW}%` }}
                          />
                        )}
                      </div>
                      <span className={`nei-pchart-val nei-mono ${val === null ? "" : isPos ? "nei-portfolio-pct--pos" : "nei-portfolio-pct--neg"}`}>
                        {fmtPct(val)}
                      </span>
                    </div>
                  );
                })}
                <div className="nei-pchart-legend">
                  <span>Since IPO · base = 0%</span>
                  <span className="nei-pchart-legend-nei">— NEI benchmark</span>
                </div>
              </div>
            </div>

            {/* Right: stats */}
            <div className="nei-portfolio-stats-col">
              <p className="nei-portfolio-copy">
                10 Trifecta Capital portfolio companies inside the NEI, measured against the broader cohort since each company&apos;s IPO.
              </p>
              <div className="nei-portfolio-stat-pair">
                <div className="nei-portfolio-stat nei-portfolio-stat--highlight">
                  <span className="nei-mono nei-portfolio-stat-label">Trifecta Portfolio</span>
                  <strong className="nei-mono nei-portfolio-stat-value">
                    {portfolioIndexValue !== null ? formatNumber(portfolioIndexValue, 1) : "—"}
                  </strong>
                  <span className={`nei-mono nei-portfolio-stat-pct ${portfolioSinceInception !== null && portfolioSinceInception >= 0 ? "nei-portfolio-pct--pos" : "nei-portfolio-pct--neg"}`}>
                    {fmtPct(portfolioSinceInception)} since inception
                  </span>
                </div>
                <div className="nei-portfolio-stat">
                  <span className="nei-mono nei-portfolio-stat-label">New Economy Index</span>
                  <strong className="nei-mono nei-portfolio-stat-value nei-portfolio-stat-value--muted">
                    {indexValue !== null ? formatNumber(indexValue, 1) : "—"}
                  </strong>
                  <span className={`nei-mono nei-portfolio-stat-pct ${neiSinceInception !== null && neiSinceInception >= 0 ? "nei-portfolio-pct--pos" : "nei-portfolio-pct--neg"}`}>
                    {fmtPct(neiSinceInception)} since inception
                  </span>
                </div>
              </div>
              {delta !== null && (
                <p className="nei-portfolio-delta nei-mono">
                  Portfolio is {delta >= 0 ? "outperforming" : "underperforming"} the index by{" "}
                  <span className={delta >= 0 ? "nei-portfolio-pct--pos" : "nei-portfolio-pct--neg"}>
                    {Math.abs(delta).toFixed(1)} pp
                  </span>
                </p>
              )}
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
                Data via NSE, live during market hours.
                The New Economy Index is for informational purposes only and
                does not constitute investment advice. © 2026 Trifecta Capital.
              </p>
            </div>
            <div className="nei-footer-links">
              <div>
                <strong>The Index</strong>
                <a href="#performance">Performance</a>
                <a href="#constituents">Constituents</a>
                <a href="#sectors">Sectors</a>
                <a href="#methodology">Methodology</a>
                <a href="#portfolio">Portfolio</a>
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
