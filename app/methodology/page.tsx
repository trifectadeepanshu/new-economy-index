import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { DashboardFooter } from "@/components/index-dashboard/PageSections";
import { MethodologyToc, type TocItem } from "@/components/methodology/MethodologyToc";

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

const TOC: TocItem[] = [
  { id: "objective", n: "01", label: "Objective" },
  { id: "specifications", n: "02", label: "Index specifications" },
  { id: "eligibility", n: "03", label: "Eligibility & inclusion" },
  { id: "rebalancing", n: "04", label: "Rebalancing & review" },
  { id: "corporate-actions", n: "05", label: "Corporate actions & divisor" },
  { id: "market-data", n: "06", label: "Market data & settlement" },
  { id: "governance", n: "07", label: "Governance & policy" },
  { id: "trifecta-portfolio", n: "08", label: "Trifecta Capital Portfolio" },
];

function DocSection({
  id,
  n,
  title,
  children,
}: {
  id: string;
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="nei-doc-section">
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
            width={1800}
            height={517}
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

      <div className="nei-doc-layout">
        <MethodologyToc items={TOC} />

        <main className="nei-doc-body">
        <h1 className="nei-heading nei-doc-title">
          NEI Top 50 <span>methodology &amp; governance</span>
        </h1>
        <p className="nei-doc-lede">
          The New Economy Index (NEI Top 50) is a full
          market-capitalisation-weighted benchmark tracking the equity
          performance of the top 50 institutionally backed, technology-driven
          public companies listed on the National Stock Exchange (NSE).
        </p>

        <DocSection id="objective" n="01" title="Objective">
          <p>
            The primary objective of the NEI Top 50 is to provide a transparent,
            continuous, and representative benchmark capturing performance of
            India&apos;s emerging digital and public technology ecosystem.
          </p>
        </DocSection>

        <DocSection id="specifications" n="02" title="Index specifications">
          <div className="nei-doc-spec">
            {SPECS.map(([k, v]) => (
              <div key={k} className="nei-doc-spec-row">
                <span className="nei-doc-spec-k">{k}</span>
                <span className="nei-doc-spec-v nei-mono">{v}</span>
              </div>
            ))}
          </div>
        </DocSection>

        <DocSection id="eligibility" n="03" title="Eligibility & inclusion criteria">
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

        <DocSection id="rebalancing" n="04" title="Rebalancing & review framework">
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
              If a newly listed New Economy company&apos;s full market
              capitalisation evaluated at its official IPO Offer Price ranks
              within the Top 50 universe, it is added to the index effective at
              the market open of its listing day, using its IPO Offer Price as
              the base price to capture performance.
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

        <DocSection id="corporate-actions" n="05" title="Corporate actions & divisor maintenance">
          <p>
            The index uses a divisor methodology to maintain
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

        <DocSection id="market-data" n="06" title="Market data, calculation & settlement">
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
            <li id="note-absolute-return">
              <strong>Absolute Return uses each company&apos;s effective base.</strong>{" "}
              The column shows cumulative price return from 31 December 2020 for
              a company that was already public on the index base date. For a
              company listed later, it starts from the IPO Offer Price so the
              listing-day move remains part of the tracked return.
            </li>
            <li id="note-time-since-base-date">
              <strong>Time Since Base Date measures each company&apos;s tracked tenure.</strong>{" "}
              For a company listed after 31 December 2020, its effective base
              date is its IPO date. For a company listed on or before the index
              base date, its effective base date is 31 December 2020. The
              duration runs from that effective base date to the latest market
              data date and is displayed in completed years, months, and days.
            </li>
            <li id="note-irr">
              <strong>IRR is the annualized price return for the selected period.</strong>{" "}
              The selector offers 1, 3, and 5 year lookbacks, plus the Since
              Base Date. Calculations use the closing price from the start of
              the lookback period and the constituent&apos;s current price to
              annualize the absolute return. The return field is left blank
              when a company was not yet public at the start of the period or
              when required price or tenure data is unavailable.
            </li>
          </ul>
        </DocSection>

        <DocSection id="governance" n="07" title="Governance & policy updates">
          <p>
            The index framework is monitored on an ongoing basis and evaluated as
            deemed necessary to reflect evolving market structures, corporate
            actions, and regulatory shifts in India&apos;s new economy. Material
            changes to this methodology are versioned and published here.
          </p>
        </DocSection>

        <DocSection id="trifecta-portfolio" n="08" title="Trifecta Capital portfolio">
          <p>
            Certain NEI Top 50 constituents carry a separate &quot;Trifecta
            Capital portfolio&quot; designation, shown in the constituent grid,
            the market-cap view, and the performance chart&apos;s portfolio
            overlay. It indicates a past or present relationship with Trifecta
            Capital, and reflects relationship history rather than a real-time
            statement of current holdings.
          </p>
          <ul>
            <li>
              <strong>Venture Debt relationships.</strong> A company may carry
              this designation where it previously had a relationship with
              Trifecta Capital&apos;s Venture Debt platform, typically at an
              earlier, pre-IPO stage of the company&apos;s lifecycle. Trifecta
              Capital may or may not continue to hold equity, warrants, or
              other securities in these companies as of the current date.
            </li>
            <li>
              <strong>Growth equity investments.</strong> A company may carry
              this designation where Trifecta Capital&apos;s growth equity arm
              has made, or has previously made, an investment in the company.
              Trifecta Capital may or may not continue to actively hold shares
              in these companies as of the current date.
            </li>
          </ul>
          <p>
            This designation is disclosed for transparency and context only.
            It does not constitute investment advice, a recommendation, an
            indication of current position size, or a representation that
            Trifecta Capital holds any ongoing economic interest in the
            company as of today.
          </p>
        </DocSection>

        <p className="nei-doc-disclaimer">
          The NEI Top 50 is provided for informational purposes only and does not
          constitute investment advice, a recommendation, or an offer to buy or
          sell any security. Data is sourced from public feeds and may be delayed
          or subject to error. © {new Date().getFullYear()} Trifecta Capital.
        </p>
        </main>
      </div>

      <DashboardFooter />
    </div>
  );
}
