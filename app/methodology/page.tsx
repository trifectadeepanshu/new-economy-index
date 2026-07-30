import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { DashboardFooter } from "@/components/index-dashboard/PageSections";

export const metadata: Metadata = {
  title: "Index Methodology & Governance | NEI Top 50 | Trifecta Capital",
  description:
    "The official methodology and governance framework for the NEI Top 50 — eligibility, rebalancing, divisor maintenance, corporate actions, and data sourcing.",
};

const SPECS: [string, string][] = [
  ["Index name", "New Economy Index Top 50 — NEI Top 50"],
  ["Symbol", "NEI Top 50"],
  ["Base date", "January 2021"],
  ["Base value", "1,000.00"],
  ["Weighting", "Full market-capitalisation weighted"],
  ["Target constituents", "50 companies"],
  ["Calculation currency", "Indian Rupee (INR)"],
  ["Intraday refresh", "~30-second intervals (delayed public feed)"],
  ["Primary data source", "Public market data (Yahoo Finance)"],
];

const ELIGIBILITY: [string, string][] = [
  [
    "Exchange listing",
    "Actively listed and traded on the National Stock Exchange (NSE).",
  ],
  [
    "Business model",
    "Operating as a new-age, digital-first, or technology-enabled business.",
  ],
  [
    "Institutional backing",
    "Must have received capital from institutional Private Equity (PE), Venture Capital (VC), or Growth Equity funds at some point in its corporate lifecycle.",
  ],
  [
    "Market-cap rank",
    "Must rank within the Top 50 eligible companies by full market capitalisation on the review date.",
  ],
];

function DocSection({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="nei-doc-section">
      <h2 className="nei-heading">
        <span className="nei-doc-section-n nei-mono">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function MethodologyPage() {
  return (
    <div className="nei-doc">
      <header className="nei-doc-topbar">
        <Link href="/" className="nei-doc-brand" aria-label="NEI Top 50 home">
          <Image
            src="/trifecta-capital-logo.png"
            alt="Trifecta Capital"
            width={120}
            height={36}
            className="nei-doc-logo"
            priority
          />
        </Link>
        <div className="nei-doc-topbar-right">
          <Link href="/" className="nei-doc-back">
            ← Back to the index
          </Link>
          <a
            href="https://trifectacapital.in"
            target="_blank"
            rel="noopener noreferrer"
            className="nei-doc-topbar-cta"
          >
            trifectacapital.in ↗
          </a>
        </div>
      </header>

      <main className="nei-doc-main">
        <div className="nei-doc-eyebrow nei-mono">Our Index Methodology &amp; Governance</div>
        <h1 className="nei-heading nei-doc-title">
          NEI Top 50 <span>methodology &amp; governance</span>
        </h1>
        <p className="nei-doc-lede">
          The New Economy Index (NEI Top 50) is a full
          market-capitalisation-weighted benchmark tracking the equity
          performance of the top 50 institutionally backed, technology-driven
          public companies listed on the National Stock Exchange (NSE).
        </p>

        <DocSection n="01" title="Objective">
          <p>
            The primary objective of the NEI Top 50 is to provide a transparent,
            continuous, and representative benchmark capturing performance of
            India&apos;s emerging digital and public technology ecosystem.
          </p>
        </DocSection>

        <DocSection n="02" title="Index specifications">
          <div className="nei-doc-spec">
            {SPECS.map(([k, v]) => (
              <div key={k} className="nei-doc-spec-row">
                <span className="nei-doc-spec-k">{k}</span>
                <span className="nei-doc-spec-v nei-mono">{v}</span>
              </div>
            ))}
          </div>
        </DocSection>

        <DocSection n="03" title="Eligibility & inclusion criteria">
          <p>
            To qualify for inclusion in the NEI universe, a company must satisfy{" "}
            <strong>all</strong> of the following criteria on the official review
            date:
          </p>
          <div className="nei-doc-criteria">
            {ELIGIBILITY.map(([k, v], i) => (
              <div key={k} className="nei-doc-criterion">
                <span className="nei-doc-criterion-n nei-mono">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{k}</strong>
                  <p>{v}</p>
                </div>
              </div>
            ))}
          </div>
        </DocSection>

        <DocSection n="04" title="Rebalancing & review framework">
          <h3>4.1 Review triggers & schedule</h3>
          <p>
            The index universe, constituent selection, and market-capitalisation
            weights are reviewed and recalculated under two triggers:
          </p>
          <ul>
            <li>
              <strong>Scheduled quarterly reviews</strong> — executed on the
              final business day of March, June, September, and December.
            </li>
            <li>
              <strong>Event-driven IPO reviews</strong> — executed on the
              official listing day (ex-date) of any qualifying new economy IPO.
            </li>
          </ul>

          <h3>4.2 Scheduled quarterly review</h3>
          <ul>
            <li>
              <strong>Selection</strong> — All eligible companies in the new
              economy universe are ranked in descending order by full market
              capitalisation. The top 50 highest-ranked companies form the
              constituent basket for the subsequent quarter.
            </li>
            <li>
              <strong>Weight reset</strong> — Constituent weights are reset based
              on their closing full market capitalisations on the review date.
            </li>
          </ul>

          <h3>4.3 Intra-quarter constituent retention</h3>
          <p>
            Market-capitalisation rankings are evaluated only on official review
            dates. If an active constituent&apos;s market capitalisation declines
            mid-quarter — causing its rank to drop outside the top 50 between
            review cycles — it <strong>remains an active constituent until the
            next scheduled review</strong>. No constituent is removed mid-quarter
            due to organic price movement.
          </p>

          <h3>4.4 Event-driven IPO fast-entry</h3>
          <ul>
            <li>
              Newly listed new economy companies that meet all business-model and
              institutional-ownership criteria are eligible for immediate entry.
            </li>
            <li>
              On its official listing day, if a company&apos;s full market
              capitalisation (at its listing-day closing price) ranks within the
              top 50 universe, it is added to the index effective at the close of
              that listing day.
            </li>
            <li>
              Upon entry, all constituent weights are recalculated to reflect the
              expanded market-cap basket, and an immediate divisor adjustment is
              applied on the effective date to ensure value-neutral index
              continuity.
            </li>
            <li>
              <strong>Constituent-count enforcer.</strong> To maintain a basket of
              50, the lowest-ranked constituent (rank #51) is removed at the close
              of the listing day, preserving the top-50 focus.
            </li>
          </ul>
        </DocSection>

        <DocSection n="05" title="Corporate actions & divisor maintenance">
          <p>
            The index uses a chain-linked divisor methodology to maintain
            continuous historical levels across quarterly reconstitutions, stock
            additions and deletions, and structural corporate events:
          </p>
          <div className="nei-doc-formula nei-mono" role="img" aria-label="Index level equals the sum over constituents of price times shares, divided by the active divisor">
            <span className="nei-doc-formula-expr">
              Index level = Σ&nbsp;(P<sub>i</sub> × S<sub>i</sub>) / Divisor
            </span>
            <span className="nei-doc-formula-key">
              P<sub>i</sub> = price of constituent i&nbsp;·&nbsp;S<sub>i</sub> = total outstanding shares&nbsp;·&nbsp;Divisor = active divisor
            </span>
          </div>

          <h3>5.1 Divisor neutrality</h3>
          <p>
            When the underlying constituent basket changes, total index market
            capitalisation changes instantly. To prevent artificial price jumps,
            the active divisor is recalculated on the effective date so the index
            level is identical immediately before and after the change.
          </p>

          <h3>5.2 Standard corporate-action treatments</h3>
          <ul>
            <li>
              <strong>Stock splits & bonus issues.</strong> Strictly
              divisor-neutral. Outstanding shares increase by the split/bonus
              ratio while price drops proportionally; total market cap is
              unchanged, so no divisor adjustment is made.
            </li>
            <li>
              <strong>Portfolio reconstitution (adds / drops).</strong> Capital
              changes from added or removed companies are absorbed via a
              proportional expansion or contraction of the divisor on the
              effective rebalance date.
            </li>
            <li>
              <strong>Capital expansion (rights issues / FPOs / buybacks).</strong>{" "}
              Routine share changes are updated on the review date.
            </li>
            <li>
              <strong>Mergers, acquisitions & delistings.</strong> If a
              constituent is delisted, acquired, or goes private mid-quarter, it
              is removed on the ex-date and the divisor is adjusted accordingly.
            </li>
          </ul>
        </DocSection>

        <DocSection n="06" title="Market data, calculation & settlement">
          <ul>
            <li>
              <strong>Public data sourcing.</strong> Market data — stock prices,
              outstanding shares, and fundamental attributes — is sourced via
              public market data feeds (Yahoo Finance). The index does not rely on
              a direct, proprietary exchange ticker feed.
            </li>
            <li>
              <strong>Intraday indicative refreshes.</strong> During Indian equity
              market trading hours (09:15–15:30 IST), the index refreshes roughly
              every 30 seconds using delayed public market quotes. Intraday levels
              are indicative values for monitoring purposes; the official level
              settles after the close once the day&apos;s closing prices are final.
            </li>
            <li>
              <strong>Fundamental & share maintenance.</strong> Outstanding share
              counts, company fundamentals, and related universe metrics are
              refreshed on a quarterly basis, keeping market-capitalisation
              weights current between reviews.
            </li>
          </ul>
        </DocSection>

        <DocSection n="07" title="Governance & policy updates">
          <p>
            The index framework is monitored on an ongoing basis and evaluated as
            deemed necessary to reflect evolving market structures, corporate
            actions, and regulatory shifts in India&apos;s new economy. Material
            changes to this methodology are versioned and published here.
          </p>
        </DocSection>

        <p className="nei-doc-disclaimer">
          The NEI Top 50 is provided for informational purposes only and does not
          constitute investment advice, a recommendation, or an offer to buy or
          sell any security. Data is sourced from public feeds and may be delayed
          or subject to error. © {new Date().getFullYear()} Trifecta Capital.
        </p>
      </main>

      <DashboardFooter />
    </div>
  );
}
