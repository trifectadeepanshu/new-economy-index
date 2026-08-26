import type { CSSProperties, ReactNode } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { DashboardFooter } from "@/components/index-dashboard/DashboardFooter";
import "../styles/nei-doc.css";
import "../styles/nei-footer.css";
import "../styles/nei-insights.css";

export const metadata: Metadata = {
  title: "Platform Sector Insights | NEI Top 50 | Trifecta Capital",
  description:
    "A concise operating view of India's listed platform economy: reach, transaction pools, growth engines, profitability, and company-level signals.",
};

const HERO_METRICS = [
  { label: "Sector GMV · Q1FY27", value: "₹76,777 Cr", detail: "+34.2% YoY · +9.9% QoQ" },
  { label: "Transaction value · FY26", value: "₹2.58 L Cr", detail: "+40.1% vs FY25" },
  { label: "Marketplace revenue · Q1FY27", value: "₹1,838 Cr", detail: "4 asset-light platforms · 31% margin" },
  { label: "Reach · leading platform", value: "274 mm", detail: "annual shoppers on Meesho" },
] as const;

const REACH_GROUPS = [
  {
    title: "Monthly transacting users",
    note: "Q1FY27 average · million",
    rows: [
      ["Blinkit", "31.8"],
      ["Zomato", "27.2"],
      ["Swiggy food", "19.18"],
      ["Instamart", "13.52"],
    ],
  },
  {
    title: "Annual transacting users",
    note: "Unique buyers · million",
    rows: [
      ["Meesho", "274.1"],
      ["Nykaa", "25.5"],
      ["ixigo", "18.97"],
      ["Urban Company", "9.28"],
      ["PhysicsWallah", "5.34"],
    ],
  },
  {
    title: "Marketplace visitors",
    note: "Non-transacting reach · million",
    rows: [
      ["Just Dial · quarterly", "193"],
      ["CarTrade · monthly", "80"],
    ],
  },
] as const;

const VALUE_POOLS = [
  ["Quick commerce", 22949],
  ["Food delivery", 20259],
  ["Horizontal e-commerce", 11614],
  ["Travel", 7625],
  ["Going-out & entertainment", 4747],
  ["Hyperpure / supply chain", 4229],
  ["Fashion & BPC", 2835],
  ["Home & local services", 1465],
  ["Education", 1054],
] as const;

const GROWTH_POOLS = [
  ["Quick commerce", 71.4],
  ["Going-out & entertainment", 54.7],
  ["Home & local services", 42.1],
  ["Horizontal e-commerce", 33.8],
  ["Fashion & BPC", 32.7],
  ["Food delivery", 18.8],
  ["Travel", 18.2],
  ["Hyperpure / supply chain", -7.1],
] as const;

const GROWTH_ENGINES = [
  { name: "Blinkit", pool: "Quick commerce", gmv: 117.0, users: 116.7, frequency: -0.2, basket: 0.4 },
  { name: "Instamart", pool: "Quick commerce", gmv: 69.9, users: 73.7, frequency: -16.9, basket: 17.7 },
  { name: "Meesho", pool: "Horizontal e-commerce", gmv: 38.6, users: 33.0, frequency: 9.4, basket: -3.4 },
  { name: "Urban Company", pool: "Home services", gmv: 31.2, users: 24.2, frequency: 10.4, basket: -4.3 },
  { name: "Nykaa", pool: "Fashion & BPC", gmv: 27.8, users: 26.3, frequency: -3.2, basket: 4.6 },
  { name: "Zomato", pool: "Food delivery", gmv: 15.6, users: 18.0, frequency: -2.7, basket: 0.7 },
] as const;

const TRANSACTION_MARGINS = [
  ["PhysicsWallah", "Education", 12.9],
  ["Nykaa", "Fashion & BPC", 8.3],
  ["Eternal food", "Food delivery", 5.6],
  ["Swiggy food", "Food delivery", 3.1],
  ["Yatra", "Travel", 0.7],
  ["Blinkit", "Quick commerce", 0.6],
  ["ixigo", "Travel", 0.5],
  ["Meesho", "Horizontal e-commerce", -1.5],
  ["Urban Company", "Home services", -4.4],
  ["Instamart", "Quick commerce", -13.4],
] as const;

const MARKETPLACES = [
  { name: "Info Edge", logo: "/logos/NAUKRI.png", margin: "39%", revenue: "₹881 Cr", growth: "+11.4%" },
  { name: "CarTrade", logo: "/logos/CARTRADE.png", margin: "49%", revenue: "₹201 Cr", growth: "+16.3%" },
  { name: "Just Dial", logo: "/logos/JUSTDIAL.png", margin: "27%", revenue: "₹328 Cr", growth: "+9.9%" },
  { name: "Nazara", logo: "/logos/NAZARA.png", margin: "11%", revenue: "₹429 Cr", growth: "−14.0%" },
] as const;

const COMPANY_SNAPSHOTS = [
  { name: "Zomato", pool: "Food delivery", logo: "/logos/ETERNAL.png", value: "₹10,769 Cr", growth: "+20.1%", reach: "27.2 mm monthly", basket: "₹388", margin: "+5.6%" },
  { name: "Swiggy food", pool: "Food delivery", logo: "/logos/SWIGGY.png", value: "₹9,490 Cr", growth: "+17.4%", reach: "19.2 mm monthly", basket: "₹484", margin: "+3.1%" },
  { name: "Blinkit", pool: "Quick commerce", logo: "/logos/ETERNAL.png", value: "₹17,132 Cr", growth: "+86.2%", reach: "31.8 mm monthly", basket: "₹530", margin: "+0.6%" },
  { name: "Instamart", pool: "Quick commerce", logo: "/logos/SWIGGY.png", value: "₹5,817 Cr", growth: "+38.9%", reach: "13.5 mm monthly", basket: "₹490", margin: "−13.4%" },
  { name: "Meesho", pool: "Horizontal e-commerce", logo: "/logos/MEESHO.png", value: "₹11,614 Cr", growth: "+33.8%", reach: "274 mm annual", basket: "₹265", margin: "−1.5%" },
  { name: "Nykaa", pool: "Fashion & BPC", logo: "/logos/NYKAA.png", value: "₹2,835 Cr", growth: "+32.7%", reach: "25.5 mm annual", basket: "₹1,318", margin: "+8.3%" },
  { name: "Urban Company", pool: "Home services", logo: "/logos/URBANCO.png", value: "₹1,465 Cr", growth: "+42.1%", reach: "9.3 mm annual", basket: "₹1,278", margin: "−4.4%" },
  { name: "ixigo", pool: "Travel", logo: "/logos/IXIGO.png", value: "₹5,524 Cr", growth: "+18.9%", reach: "19.0 mm annual", basket: "₹1,321", margin: "+0.5%" },
  { name: "PhysicsWallah", pool: "Education", logo: "/logos/PWL.png", value: "₹1,054 Cr", growth: "+24.4%", reach: "5.3 mm annual", basket: "—", margin: "+12.9%" },
] as const;

const TAKEAWAYS = [
  {
    title: "Quick commerce leads growth, not profit.",
    copy: "It is now the largest transaction pool. Blinkit crossing into positive EBITDA is the marker; Instamart remains in investment mode.",
    proof: "₹22,949 Cr · +71% YoY",
  },
  {
    title: "New users are doing the heavy lifting.",
    copy: "Across the cohort, customer growth explains far more of the expansion than higher frequency or larger baskets.",
    proof: "Blinkit users +117% · basket +0.4%",
  },
  {
    title: "Reach and monetisation are separate levers.",
    copy: "Meesho and classifieds touch hundreds of millions; smaller platforms such as Nykaa monetise a narrower, higher-value base.",
    proof: "Meesho 274 mm · Nykaa AOV ₹1,318",
  },
  {
    title: "Margin profiles are diverging by pool.",
    copy: "Education and fashion are profitable, food delivery is maturing, and grocery quick commerce is only beginning its margin journey.",
    proof: "PW +12.9% · Instamart −13.4%",
  },
  {
    title: "Asset-light models remain the cash engines.",
    copy: "Recruitment and classifieds sit outside the GMV frame, but produce the strongest revenue margins in the platform cohort.",
    proof: "CarTrade 49% · Info Edge 39%",
  },
  {
    title: "Food delivery is the profit template.",
    copy: "Growth has settled near 19% while margins expand, showing the path newer pools are trying to follow: scale, then operating leverage.",
    proof: "₹20,259 Cr · +18.8% YoY",
  },
] as const;

function signed(value: number) {
  return `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(1)}%`;
}

function barStyle(value: number, max: number): CSSProperties {
  return { width: `${Math.max(2, (Math.abs(value) / max) * 100)}%` };
}

function InsightSection({
  number,
  eyebrow,
  title,
  copy,
  tone = "paper",
  children,
}: {
  number: string;
  eyebrow: string;
  title: string;
  copy: string;
  tone?: "paper" | "soft" | "dark";
  children: ReactNode;
}) {
  return (
    <section className={`nei-insight-section is-${tone}`}>
      <div className="nei-insight-inner">
        <header className="nei-insight-heading-block">
          <div className="nei-insight-eyebrow">
            <span className="nei-mono">{number}</span>
            <span>{eyebrow}</span>
          </div>
          <h2 className="nei-heading">{title}</h2>
          <p>{copy}</p>
        </header>
        {children}
      </div>
    </section>
  );
}

export default function InsightsPage() {
  const maxPool = VALUE_POOLS[0][1];
  const maxGrowth = Math.max(...GROWTH_POOLS.map(([, value]) => Math.abs(value)));

  return (
    <div className="nei-insights-page">
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

      <main>
        <section className="nei-insights-hero">
          <div className="nei-insights-hero-inner">
            <div className="nei-insights-kicker">
              <span className="nei-mono">INSIGHTS 01</span>
              <span>Platform sector · Q1FY27</span>
            </div>
            <h1 className="nei-heading">India&apos;s platform economy, decoded.</h1>
            <p className="nei-insights-hero-copy">
              A common operating lens for listed platforms: users × frequency × basket,
              flowing into transaction value and, eventually, profit.
            </p>

            <div className="nei-insights-hero-metrics">
              {HERO_METRICS.map((metric) => (
                <div key={metric.label} className="nei-insights-hero-metric">
                  <span>{metric.label}</span>
                  <strong className="nei-mono">{metric.value}</strong>
                  <small>{metric.detail}</small>
                </div>
              ))}
            </div>
          </div>
        </section>

        <InsightSection
          number="01"
          eyebrow="The sector in one view"
          title="A ₹2.6 lakh crore machine, still compounding at 40%."
          copy="FY26 transaction value reached ₹2.58 lakh crore. Q1FY27 remained strong at +34% YoY, while the asset-light marketplace cohort generated ₹1,838 crore of quarterly revenue at a 31% blended margin."
        >
          <div className="nei-measure-chain" aria-label="Platform sector measurement chain">
            {[
              ["Users", "Transacting customers", "×"],
              ["Frequency", "Orders per user", "×"],
              ["Basket", "Value per order", "→"],
              ["Transaction value", "GMV / GOV / NMV", "→"],
              ["Revenue", "Platform monetisation", "→"],
              ["Profit", "Adjusted EBITDA", ""],
            ].map(([label, note, operator]) => (
              <div key={label} className="nei-measure-node">
                <strong>{label}</strong>
                <span>{note}</span>
                {operator ? <em aria-hidden="true">{operator}</em> : null}
              </div>
            ))}
          </div>
          <div className="nei-insight-callouts">
            <div><span>Largest pool</span><strong>Quick commerce</strong><small>₹22,949 Cr · +71% YoY</small></div>
            <div><span>Fastest FY26 grower</span><strong>Quick commerce</strong><small>Transaction value +101%</small></div>
            <div><span>Tracked separately</span><strong>4 marketplaces</strong><small>Revenue, never added to GMV</small></div>
          </div>
        </InsightSection>

        <InsightSection
          number="02"
          eyebrow="Reach"
          title="Digital reach is vast, but the bases are not interchangeable."
          copy="Monthly buyers, annual shoppers and visitors measure different behaviours. They are grouped below to show scale without creating a misleading sector total."
          tone="soft"
        >
          <div className="nei-reach-grid">
            {REACH_GROUPS.map((group) => (
              <div key={group.title} className="nei-reach-group">
                <div className="nei-reach-group-head">
                  <strong>{group.title}</strong>
                  <span>{group.note}</span>
                </div>
                <div className="nei-reach-rows">
                  {group.rows.map(([name, value]) => (
                    <div key={name}>
                      <span>{name}</span>
                      <strong className="nei-mono">{value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="nei-insight-read">
            <strong>Read:</strong> reach and transaction intensity are different games.
            Meesho and classifieds win on breadth; Nykaa and Urban Company monetise a
            smaller, higher-basket base.
          </p>
        </InsightSection>

        <InsightSection
          number="03"
          eyebrow="Where value flows"
          title="Quick commerce has overtaken food delivery."
          copy="At ₹22,949 crore in Q1FY27, quick commerce is now the largest transaction pool. It has grown from ₹13,390 crore in five quarters and crossed food delivery during H2FY26."
          tone="dark"
        >
          <div className="nei-pool-chart" role="img" aria-label="Transaction value by platform pool in Q1 FY27">
            {VALUE_POOLS.map(([name, value], index) => (
              <div key={name} className="nei-pool-row">
                <span className="nei-pool-rank nei-mono">{String(index + 1).padStart(2, "0")}</span>
                <span className="nei-pool-name">{name}</span>
                <span className="nei-pool-track" aria-hidden="true">
                  <span style={barStyle(value, maxPool)} />
                </span>
                <strong className="nei-mono">₹{value.toLocaleString("en-IN")} Cr</strong>
              </div>
            ))}
          </div>
        </InsightSection>

        <InsightSection
          number="04"
          eyebrow="Growth by pool"
          title="Growth is broad, but far from uniform."
          copy="Seven of the eight tracked transaction pools below are growing at double digits. Quick commerce leads; Hyperpure reflects a deliberate B2B supply-chain pullback."
        >
          <div className="nei-growth-chart" role="img" aria-label="Year on year transaction value growth by platform pool">
            {GROWTH_POOLS.map(([name, value]) => (
              <div key={name} className={`nei-growth-row ${value < 0 ? "is-negative" : ""}`}>
                <span>{name}</span>
                <div className="nei-growth-track" aria-hidden="true">
                  <span style={barStyle(value, maxGrowth)} />
                </div>
                <strong className="nei-mono">{signed(value)}</strong>
              </div>
            ))}
          </div>
          <p className="nei-insight-read">
            <strong>Separate basis:</strong> Info Edge revenue grew 11%, CarTrade 16%
            and Just Dial 10%; Nazara declined 14%. These are revenue figures, not GMV.
          </p>
        </InsightSection>

        <InsightSection
          number="05"
          eyebrow="What powers growth"
          title="This is a customer-acquisition story, not a pricing story."
          copy="Across the major platforms, user growth explains most of the FY26 expansion. Frequency and average basket value are generally flat, mixed or negative."
          tone="soft"
        >
          <div className="nei-engine-table">
            <div className="nei-engine-head" aria-hidden="true">
              <span>Platform</span><span>GMV</span><span>Users</span><span>Frequency</span><span>Basket</span>
            </div>
            {GROWTH_ENGINES.map((row) => (
              <div key={row.name} className="nei-engine-row">
                <div><strong>{row.name}</strong><span>{row.pool}</span></div>
                <strong className="nei-mono">{signed(row.gmv)}</strong>
                <span className="nei-mono is-driver">{signed(row.users)}</span>
                <span className={`nei-mono ${row.frequency < 0 ? "is-down" : ""}`}>{signed(row.frequency)}</span>
                <span className={`nei-mono ${row.basket < 0 ? "is-down" : ""}`}>{signed(row.basket)}</span>
              </div>
            ))}
          </div>
        </InsightSection>

        <InsightSection
          number="06"
          eyebrow="Profitability"
          title="A profitable core, and an investing frontier."
          copy="Education, fashion, food delivery and travel are profitable on transaction value. Quick commerce is split: Blinkit has crossed into positive EBITDA, while Instamart continues to invest."
          tone="dark"
        >
          <div className="nei-profit-layout">
            <div className="nei-margin-panel">
              <div className="nei-profit-subhead">
                <strong>Adjusted EBITDA margin</strong>
                <span>% of transaction value · Q1FY27</span>
              </div>
              <div className="nei-margin-axis" aria-hidden="true"><span>Loss</span><span>0</span><span>Profit</span></div>
              {TRANSACTION_MARGINS.map(([name, pool, value]) => (
                <div key={name} className="nei-margin-row">
                  <div><strong>{name}</strong><span>{pool}</span></div>
                  <div className="nei-margin-track" aria-hidden="true">
                    <span
                      className={value >= 0 ? "is-positive" : "is-negative"}
                      style={{ width: `${(Math.abs(value) / 15) * 48}%` }}
                    />
                  </div>
                  <strong className={`nei-mono ${value < 0 ? "is-negative" : ""}`}>{signed(value)}</strong>
                </div>
              ))}
            </div>

            <div className="nei-marketplace-panel">
              <div className="nei-profit-subhead">
                <strong>Asset-light marketplaces</strong>
                <span>EBITDA margin on revenue · Q1FY27</span>
              </div>
              <div className="nei-marketplace-grid">
                {MARKETPLACES.map((company) => (
                  <article key={company.name}>
                    <Image src={company.logo} alt="" width={44} height={44} />
                    <div><strong>{company.name}</strong><span>{company.revenue} revenue</span></div>
                    <strong className="nei-mono">{company.margin}</strong>
                    <small className={company.growth.startsWith("−") ? "is-negative" : ""}>{company.growth} YoY</small>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </InsightSection>

        <InsightSection
          number="07"
          eyebrow="Company depth"
          title="Nine operating snapshots, one comparable frame."
          copy="Transaction value, reach, basket and adjusted EBITDA margin are shown together. Reach retains each company's reported monthly or annual basis."
        >
          <div className="nei-company-snapshot-grid">
            {COMPANY_SNAPSHOTS.map((company) => (
              <article key={company.name} className="nei-company-snapshot">
                <div className="nei-company-snapshot-head">
                  <Image src={company.logo} alt="" width={44} height={44} />
                  <div><strong>{company.name}</strong><span>{company.pool}</span></div>
                  <em className={`nei-mono ${company.margin.startsWith("−") ? "is-negative" : ""}`}>{company.margin}</em>
                </div>
                <div className="nei-company-snapshot-metrics">
                  <div><span>Transaction value</span><strong className="nei-mono">{company.value}</strong><small>{company.growth} YoY</small></div>
                  <div><span>Reach</span><strong className="nei-mono">{company.reach}</strong></div>
                  <div><span>Average basket</span><strong className="nei-mono">{company.basket}</strong></div>
                </div>
              </article>
            ))}
          </div>
        </InsightSection>

        <InsightSection
          number="08"
          eyebrow="What we learned"
          title="Six signals from the platform sector."
          copy="The sector is not a single growth or margin story. These are the operating patterns that matter across pools."
          tone="soft"
        >
          <div className="nei-takeaway-grid">
            {TAKEAWAYS.map((item, index) => (
              <article key={item.title}>
                <span className="nei-mono">{String(index + 1).padStart(2, "0")}</span>
                <h3 className="nei-heading">{item.title}</h3>
                <p>{item.copy}</p>
                <strong className="nei-mono">{item.proof}</strong>
              </article>
            ))}
          </div>
        </InsightSection>

        <section className="nei-insights-source">
          <div>
            <strong>Basis &amp; definitions</strong>
            <p>
              Figures cover the listed platform cohort for Q1FY26–Q1FY27.
              Transaction value means net GMV, GOV or NMV as reported by each
              company. Asset-light marketplaces are shown on revenue and are never
              summed into transaction totals. For information only; not investment advice.
            </p>
          </div>
          <Link href="/methodology">Read the index methodology →</Link>
        </section>
      </main>

      <DashboardFooter />
    </div>
  );
}
