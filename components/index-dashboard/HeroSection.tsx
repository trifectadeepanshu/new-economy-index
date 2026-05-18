"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { COMPANIES } from "@/lib/companies";
import type { StockData } from "@/lib/index-api";
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

type TickerItem = Pick<StockData, "ticker" | "price" | "changePct">;

function getTickerItems(stocks: StockData[]): TickerItem[] {
  const rows: TickerItem[] = stocks.length
    ? stocks
    : COMPANIES.map((company) => ({
        ticker: company.ticker,
        price: null,
        changePct: null,
      }));

  return [...rows]
    .sort((a, b) => Math.abs(b.changePct ?? 0) - Math.abs(a.changePct ?? 0))
    .slice(0, 18);
}

export function TickerDrift({ stocks }: { stocks: StockData[] }) {
  const items = useMemo(() => getTickerItems(stocks), [stocks]);
  if (!items.length) return null;

  return (
    <div className="nei-ticker-drift" aria-label="Constituent ticker tape">
      <div className="nei-ticker-track">
        {[...items, ...items].map((row, index) => (
          <span key={`${row.ticker}-${index}`} className="nei-ticker-chip">
            <span className="nei-ticker-symbol">{row.ticker}</span>
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

function HeroNav() {
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
    </header>
  );
}

function HeroIntro({ numCompanies }: { numCompanies: number }) {
  return (
    <div>
      <h1 className="nei-heading nei-hero-title">
        India&apos;s new <br className="nei-hero-mobile-break" />economy,{" "}
        <br />
        <span>
          tracked as a <br className="nei-hero-mobile-break" />single ticker.
        </span>
      </h1>
      <p className="nei-hero-copy">
        Trifecta Capital backed India&apos;s next generation of businesses
        before they had a track record. The New Economy Index tracks what it
        looks like now. {numCompanies} listed companies, one number.
      </p>
      <div className="nei-hero-actions">
        <a className="nei-hero-primary" href="#performance">
          See performance
          <span>→</span>
        </a>
        <a className="nei-hero-secondary" href="#constituents">
          Meet the {numCompanies} companies
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
        {model.changePct !== null && (
          <span
            className={`nei-day-change-pill ${
              model.dayChange >= 0 ? "is-positive" : "is-negative"
            }`}
          >
            {formatPercent(model.dayChange)}
          </span>
        )}
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

      <div className="nei-mktcap-row">
        <span className="nei-hero-stat-label">New Economy · Total Market Cap</span>
        <span className="nei-mono nei-mktcap-value">
          {model.totalMarketCap !== null ? formatMarketCap(model.totalMarketCap) : "—"}
        </span>
      </div>

      <div className="nei-hero-card-stats">
        {model.heroStats.map((stat, index) => (
          <div
            key={stat.label}
            style={
              model.dataLoaded
                ? { animation: `nei-stat-reveal 0.4s ease-out ${index * 90}ms both` }
                : { opacity: 0 }
            }
          >
            <div className="nei-hero-stat-label">{stat.label}</div>
            <div className={`nei-hero-stat-value nei-mono ${stat.tone ? `is-${stat.tone}` : ""}`}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HeroSection({ model }: { model: IndexDashboardModel }) {
  return (
    <section data-screen-label="01 Hero" className="nei-hero-section">
      <KineticBackdrop />
      <div className="nei-hero-layer">
        <HeroNav />
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
        </div>
      </div>
    </section>
  );
}
