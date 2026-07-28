"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { LiveTickerPayload } from "@/lib/index-api";
import {
  KineticBackdrop,
  Skeleton,
  Sparkline,
  TickFrame,
} from "@/components/index-dashboard/DashboardChrome";
import {
  formatMarketCap,
  formatNumber,
  formatPercent,
} from "@/components/index-dashboard/format";
import type { IndexDashboardModel } from "@/components/index-dashboard/useIndexDashboardModel";

const NAV_LINKS = [
  ["Performance", "#performance"],
  ["Constituents", "#constituents"],
  ["Sectors", "#sectors"],
  ["Methodology", "#methodology"],
] as const;

function getTickerItems(items: LiveTickerPayload[]): LiveTickerPayload[] {
  return [...items]
    .sort((a, b) => Math.abs(b.changePct ?? 0) - Math.abs(a.changePct ?? 0))
    .slice(0, 18);
}

export function TickerDrift({ items }: { items: LiveTickerPayload[] }) {
  const tickerItems = useMemo(() => getTickerItems(items), [items]);
  if (!tickerItems.length) return null;

  return (
    <div className="nei-ticker-drift" aria-label="Constituent ticker tape">
      <div className="nei-ticker-track">
        {[...tickerItems, ...tickerItems].map((row, index) => (
          <span key={`${row.ticker}-${index}`} className="nei-ticker-chip">
            <span className="nei-ticker-symbol">{row.displayName}</span>
            <span className="nei-ticker-price">
              {row.price !== null ? row.price.toFixed(2) : "—"}
            </span>
            <span
              className={`nei-ticker-change ${
                (row.changePct ?? 0) >= 0 ? "is-positive" : "is-negative"
              }`}
            >
              {row.changePct !== null ? formatPercent(row.changePct) : "—"}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

function CurrencyToggle({
  selectedCurrency,
  setCurrency,
  className = "",
}: Pick<IndexDashboardModel, "selectedCurrency" | "setCurrency"> & { className?: string }) {
  return (
    <div
      className={`nei-currency-toggle${className ? ` ${className}` : ""}`}
      role="group"
      aria-label="Display currency"
    >
      {(["inr", "usd"] as const).map((c) => (
        <button
          key={c}
          type="button"
          className={`nei-currency-btn${selectedCurrency === c ? " is-active" : ""}`}
          aria-pressed={selectedCurrency === c}
          onClick={() => setCurrency(c)}
        >
          {c.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function HeroNav({
  selectedCurrency,
  setCurrency,
}: Pick<IndexDashboardModel, "selectedCurrency" | "setCurrency">) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="nei-v2-nav">
      <div className="nei-brand-lockup">
        <Link href="/" className="nei-brand-link" aria-label="New Economy Index home">
          <Image
            src="/trifecta-capital-logo.png"
            alt="Trifecta Capital"
            width={166}
            height={48}
            priority
            className="nei-brand-logo"
          />
        </Link>
      </div>
      <div className="nei-v2-nav-right">
        <nav
          id="nei-primary-navigation"
          className={`nei-v2-links ${isMenuOpen ? "is-open" : ""}`}
          aria-label="Primary navigation"
        >
          {NAV_LINKS.map(([label, href]) => (
            <a key={label} href={href} onClick={closeMenu}>
              {label}
            </a>
          ))}
          <a
            href="https://trifectacapital.in"
            target="_blank"
            rel="noopener noreferrer"
            className="nei-v2-nav-cta"
            onClick={closeMenu}
          >
            trifectacapital.in ↗
          </a>
        </nav>
        <CurrencyToggle
          selectedCurrency={selectedCurrency}
          setCurrency={setCurrency}
          className="nei-nav-currency-toggle"
        />
        <button
          type="button"
          className="nei-mobile-menu-button"
          aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-controls="nei-primary-navigation"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </header>
  );
}

function HeroIntro({ numCompanies }: { numCompanies: number }) {
  return (
    <div>
      <h1 className="nei-heading nei-hero-title">
        India&apos;s listed new economy,
        <br />
        <span>in one live view.</span>
      </h1>
      <p className="nei-hero-copy">
        A market-cap weighted view of {numCompanies} public, technology-driven
        companies from India&apos;s venture ecosystem, updated live across INR and
        USD.
      </p>
      <div className="nei-hero-actions">
        <a className="nei-hero-primary" href="#performance">
          See performance
          <span>→</span>
        </a>
      </div>
    </div>
  );
}

function MarketStatus({ marketOpen, nowIST }: { marketOpen: boolean; nowIST: string }) {
  return (
    <span className="nei-market-status">
      <span className={`nei-market-dot ${marketOpen ? "is-open" : ""}`} />
      Market {marketOpen ? "open" : "closed"} · {nowIST}
    </span>
  );
}

function HeroCard({ model }: { model: IndexDashboardModel }) {
  const sinceInceptionValue = model.sinceInception ?? 0;
  const valueFlashClass = model.valueFlash ? ` nei-value-flash-${model.valueFlash}` : "";
  const statusBanner = model.dataError
    ? "Live data unavailable. Showing the latest values we have."
    : model.staleConstituents.length
      ? `Some constituent prices are stale: ${model.staleConstituents.join(", ")}.`
      : model.isStale
      ? "Showing last market close. Live prices unavailable."
      : null;

  return (
    <div className="nei-hero-card">
      {statusBanner && (
        <div className={`nei-stale-banner ${model.dataError ? "is-error" : ""}`}>
          <span>{statusBanner}</span>
          {model.dataError && (
            <button type="button" onClick={model.refreshData}>
              Retry
            </button>
          )}
        </div>
      )}

      <div className="nei-hero-card-header">
        <MarketStatus marketOpen={model.marketOpen} nowIST={model.nowIST} />
      </div>

      {model.isLoading && model.indexValue === null ? (
        <div className="nei-index-value-skeleton">
          <Skeleton height={82} radius={8} />
        </div>
      ) : (
        <div className={`nei-index-value nei-mono${valueFlashClass}`}>
          {formatNumber(model.displayedValue ?? model.indexValue)}
          {model.marketOpen && <span aria-hidden="true" className="nei-live-cursor" />}
        </div>
      )}

      {model.sinceInception !== null && (
        <div className="nei-since-inception">
          <span
            className={`nei-since-inception-value nei-mono ${
              sinceInceptionValue >= 0 ? "is-positive" : "is-negative"
            }`}
          >
            {formatPercent(sinceInceptionValue)}
          </span>{" "}
          since inception · base 1,000
        </div>
      )}

      <div className="nei-hero-spark">
        {model.heroSeries.length > 1 ? (
          <Sparkline series={model.heroSeries} height={82} />
        ) : (
          <Skeleton height={82} radius={6} />
        )}
      </div>
    </div>
  );
}

function getHeroMetricLabel(label: string) {
  if (label === "Adv") return "Advancers";
  if (label === "Dec") return "Decliners";
  return label;
}

type HeroMetric = {
  label: string;
  value: string | number;
  tone?: IndexDashboardModel["heroStats"][number]["tone"];
};

function HeroMetricStrip({ model }: { model: IndexDashboardModel }) {
  const metrics: HeroMetric[] = [
    {
      label: "New Economy Market Cap",
      value:
        model.totalMarketCap !== null
          ? formatMarketCap(model.totalMarketCap, model.currency)
          : "—",
    },
    {
      label: "Trifecta Portfolio Share",
      value:
        model.trifectaWeightPct !== null ? `${model.trifectaWeightPct.toFixed(1)}%` : "—",
    },
    ...model.heroStats.map((stat) => ({
      label: getHeroMetricLabel(stat.label),
      value: stat.value,
      tone: stat.tone,
    })),
  ];

  return (
    <dl className="nei-hero-metric-strip" aria-label="New Economy market summary">
      {metrics.map((metric) => (
        <div className="nei-hero-metric" key={metric.label}>
          <dt className="nei-hero-metric-label">{metric.label}</dt>
          <dd
            className={`nei-hero-metric-value nei-mono ${
              metric.tone ? `is-${metric.tone}` : ""
            }`}
          >
            {metric.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function HeroSection({ model }: { model: IndexDashboardModel }) {
  return (
    <section data-screen-label="01 Hero" className="nei-hero-section">
      <KineticBackdrop />
      <div className="nei-hero-layer">
        <HeroNav selectedCurrency={model.selectedCurrency} setCurrency={model.setCurrency} />
        <div className="nei-hero-inner">
          <div className="nei-hero-grid">
            <HeroIntro numCompanies={model.numCompanies} />
            <div className="nei-hero-frame-wrap">
              <TickFrame
                inset={0}
                tone="paper"
                lineLen={32}
                corner={10}
                opacity={0.35}
                padded={false}
              >
                <HeroCard model={model} />
              </TickFrame>
            </div>
          </div>
          <HeroMetricStrip model={model} />
        </div>
      </div>
    </section>
  );
}
