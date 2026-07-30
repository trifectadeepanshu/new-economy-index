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
  ["Methodology", "/methodology"],
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
        <Link href="/" className="nei-brand-link" aria-label="NEI home">
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
          {NAV_LINKS.map(([label, href]) =>
            href.startsWith("/") ? (
              <Link key={label} href={href} onClick={closeMenu}>
                {label}
              </Link>
            ) : (
              <a key={label} href={href} onClick={closeMenu}>
                {label}
              </a>
            )
          )}
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
    <div className="nei-hero-intro">
      <h1 className="nei-heading nei-hero-title">
        NEI Top 50: India&apos;s new <br className="nei-hero-mobile-break" />economy,{" "}
        <span>in one number.</span>
      </h1>
      <p className="nei-hero-copy">
        The New Economy Index: a live, market-cap weighted view of
        India&apos;s top 50 institutionally backed, tech-enabled publicly listed companies.
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
  const usdInrDisplay = model.usdInr !== null ? `₹${model.usdInr.toFixed(2)}` : "—";
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
        <span
          className="nei-hero-fx nei-mono"
          aria-label={
            model.usdInr !== null
              ? `Live USD to INR exchange rate ${usdInrDisplay}`
              : "Live USD to INR exchange rate unavailable"
          }
        >
          USD/INR {usdInrDisplay}
        </span>
      </div>

      {model.isLoading && model.indexValue === null ? (
        <div className="nei-index-value-skeleton">
          <Skeleton height={82} radius={8} />
        </div>
      ) : (
        <div className="nei-hero-value-row">
          <div className={`nei-index-value nei-mono${valueFlashClass}`}>
            {formatNumber(model.displayedValue ?? model.indexValue)}
            {model.marketOpen && <span aria-hidden="true" className="nei-live-cursor" />}
          </div>
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
          <Sparkline series={model.heroSeries} height={82} animate={false} />
        ) : (
          <Skeleton height={82} radius={6} />
        )}
      </div>

      <div className="nei-hero-strip">
        <div className="nei-hero-strip-item">
          <span className="nei-hero-stat-label">Market cap</span>
          <strong className="nei-mono">
            {model.totalMarketCap !== null ? formatMarketCap(model.totalMarketCap, model.currency) : "—"}
          </strong>
        </div>
        <div className="nei-hero-strip-item">
          <span className="nei-hero-stat-label">Trifecta Capital share</span>
          <strong className="nei-mono">
            {model.trifectaWeightPct !== null ? `${model.trifectaWeightPct.toFixed(1)}%` : "—"}
          </strong>
        </div>
        <div className="nei-hero-strip-item">
          <span className="nei-hero-stat-label">52W range</span>
          <strong className="nei-mono">
            {model.marketStats.low52w !== null && model.marketStats.high52w !== null
              ? `${formatNumber(model.marketStats.low52w, 0)} – ${formatNumber(model.marketStats.high52w, 0)}`
              : "—"}
          </strong>
        </div>
      </div>
    </div>
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
        </div>
      </div>
    </section>
  );
}
