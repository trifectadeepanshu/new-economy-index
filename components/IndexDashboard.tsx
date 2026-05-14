"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useIndexData } from "@/hooks/useIndexData";
import { IndexChart } from "@/components/IndexChart";
import { CompanyGrid } from "@/components/CompanyGrid";
import {
  COMPANIES,
  INDEX_BASE_DATE,
  INDEX_BASE_VALUE,
  SECTORS,
} from "@/lib/companies";
import { isMarketOpen, formatLastUpdated } from "@/lib/market-hours";

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtNum(n: number | null, d = 2): string {
  if (n == null || isNaN(n)) return "—";
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

function fmtPct(n: number): string {
  return (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
}

const inceptionLabel = new Date(`${INDEX_BASE_DATE}T00:00:00+05:30`).toLocaleString(
  "en-IN",
  { month: "short", year: "numeric", timeZone: "Asia/Kolkata" }
);

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ series, height = 80 }: { series: number[]; height?: number }) {
  if (series.length < 2) return null;
  const min = Math.min(...series) * 0.998;
  const max = Math.max(...series) * 1.002;
  const range = max - min || 1;
  const W = 400;
  const pts = series
    .map((v, i) => {
      const x = (i / (series.length - 1)) * W;
      const y = height - ((v - min) / range) * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const area = pts + ` L${W},${height} L0,${height} Z`;
  const isUp = series[series.length - 1] >= series[0];
  const color = isUp ? "var(--nei-pos)" : "var(--nei-neg)";

  return (
    <svg
      viewBox={`0 0 ${W} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sparkGrad)" />
      <path
        d={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// ─── Market status ────────────────────────────────────────────────────────────

function MarketStatus() {
  const open = isMarketOpen();
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        fontSize: 11,
        fontFamily: "var(--font-jetbrains), ui-monospace, monospace",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "var(--nei-muted)",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: open ? "var(--nei-pos)" : "var(--nei-muted)",
          boxShadow: open ? "0 0 0 3px rgba(44, 110, 60, 0.22)" : "none",
          flexShrink: 0,
        }}
      />
      Market {open ? "Open" : "Closed"}
    </span>
  );
}

// ─── Movers card ──────────────────────────────────────────────────────────────

interface MoverRow {
  ticker: string;
  name: string;
  changePct: number | null;
}

function MoversCard({
  title,
  rows,
}: {
  title: string;
  rows: MoverRow[];
}) {
  return (
    <div className="nei-card" style={{ padding: "18px 20px" }}>
      <div className="nei-label" style={{ marginBottom: 14 }}>
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {rows.map((r) => (
          <div
            key={r.ticker}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 8,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily:
                    "var(--font-jetbrains), ui-monospace, monospace",
                  fontWeight: 600,
                  fontSize: 13,
                  letterSpacing: "0.02em",
                  color: "var(--nei-fg)",
                }}
              >
                {r.ticker}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--nei-muted)",
                  marginTop: 2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: 160,
                }}
              >
                {r.name.replace(/\([^)]*\)/g, "").trim()}
              </div>
            </div>
            {r.changePct !== null && (
              <span
                style={{
                  fontFamily: "var(--font-jetbrains), ui-monospace, monospace",
                  fontSize: 13,
                  fontWeight: 600,
                  flexShrink: 0,
                  color:
                    r.changePct >= 0 ? "var(--nei-pos)" : "var(--nei-neg)",
                }}
              >
                {fmtPct(r.changePct)}
              </span>
            )}
          </div>
        ))}
        {rows.length === 0 && (
          <div style={{ fontSize: 12, color: "var(--nei-muted)" }}>
            No data yet
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sector change card ───────────────────────────────────────────────────────

function SectorCard({
  stocks,
}: {
  stocks: { sector: string; changePct: number | null }[];
}) {
  const sectors = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    for (const s of stocks) {
      if (s.changePct === null) continue;
      if (!map[s.sector]) map[s.sector] = { total: 0, count: 0 };
      map[s.sector].total += s.changePct;
      map[s.sector].count++;
    }
    return SECTORS.map((name) => ({
      name,
      avg: map[name] ? map[name].total / map[name].count : null,
    }))
      .filter((s) => s.avg !== null)
      .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0));
  }, [stocks]);

  return (
    <div className="nei-card" style={{ padding: "18px 20px" }}>
      <div className="nei-label" style={{ marginBottom: 14 }}>
        Sector performance
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {sectors.map((s) => (
          <div key={s.name}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 5,
              }}
            >
              <span
                style={{ fontSize: 12, color: "var(--nei-fg)", fontWeight: 500 }}
              >
                {s.name}
              </span>
              <span
                style={{
                  fontFamily:
                    "var(--font-jetbrains), ui-monospace, monospace",
                  fontSize: 12,
                  fontWeight: 600,
                  color: s.avg! >= 0 ? "var(--nei-pos)" : "var(--nei-neg)",
                }}
              >
                {fmtPct(s.avg!)}
              </span>
            </div>
            <div
              style={{
                height: 3,
                background: "var(--nei-grid)",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, Math.abs(s.avg!) * 15)}%`,
                  height: "100%",
                  background:
                    s.avg! >= 0 ? "var(--nei-pos)" : "var(--nei-neg)",
                  borderRadius: 2,
                }}
              />
            </div>
          </div>
        ))}
        {sectors.length === 0 && (
          <div style={{ fontSize: 12, color: "var(--nei-muted)" }}>
            No data yet
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Skeleton pulse ───────────────────────────────────────────────────────────

function Skeleton({ w, h, r = 6 }: { w?: string | number; h: number; r?: number }) {
  return (
    <div
      style={{
        width: w ?? "100%",
        height: h,
        borderRadius: r,
        background: "rgba(16,24,38,0.07)",
        animation: "nei-pulse 1.8s ease-in-out infinite",
      }}
    />
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export function IndexDashboard() {
  const { data, isLoading } = useIndexData();
  const [sparkSeries, setSparkSeries] = useState<number[]>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    fetch("/api/index/history?range=1Y")
      .then((r) => r.json())
      .then((json) => {
        setSparkSeries(
          (json.data ?? []).map((d: { value: number }) => Number(d.value))
        );
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const indexValue = data?.indexValue ?? null;
  const changePct = data?.indexChangePct ?? null;
  const numCompanies = data?.numCompanies ?? COMPANIES.length;
  const stocks = data?.stocks ?? [];

  const sinceInception =
    indexValue !== null
      ? ((indexValue - INDEX_BASE_VALUE) / INDEX_BASE_VALUE) * 100
      : null;

  const advancers = stocks.filter((s) => (s.changePct ?? 0) > 0).length;
  const decliners = stocks.filter((s) => (s.changePct ?? 0) < 0).length;

  const topGainers = useMemo(
    () =>
      [...stocks]
        .filter((s) => s.changePct !== null)
        .sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0))
        .slice(0, 3),
    [stocks]
  );

  const topLosers = useMemo(
    () =>
      [...stocks]
        .filter((s) => s.changePct !== null)
        .sort((a, b) => (a.changePct ?? 0) - (b.changePct ?? 0))
        .slice(0, 3),
    [stocks]
  );

  const maxW: React.CSSProperties = { maxWidth: 1240, margin: "0 auto" };
  const section = (
    extra: React.CSSProperties = {}
  ): React.CSSProperties => ({
    padding: "40px 32px",
    ...extra,
  });

  return (
    <div
      style={{
        background: "var(--nei-bg)",
        minHeight: "100vh",
        color: "var(--nei-fg)",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
      }}
    >
      {/* ─── NAV ─── */}
      <header
        style={{
          padding: "16px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "rgba(236,238,242,0.88)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--nei-grid)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Image
            src="/trifecta-capital-logo.png"
            alt="Trifecta Capital"
            width={80}
            height={24}
            style={{ height: 20, width: "auto" }}
            priority
          />
          <span
            style={{ width: 1, height: 14, background: "var(--nei-grid-strong)" }}
          />
          <span
            style={{
              fontSize: 11,
              padding: "3px 8px",
              borderRadius: 6,
              background: "var(--nei-chip)",
              color: "var(--nei-muted)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            NEI
          </span>
        </div>
        <nav
          className="nei-nav-links"
          style={{ display: "flex", gap: 24, alignItems: "center", fontSize: 13 }}
        >
          <a
            href="#performance"
            style={{ color: "var(--nei-muted)", textDecoration: "none" }}
          >
            Performance
          </a>
          <a
            href="#constituents"
            style={{ color: "var(--nei-muted)", textDecoration: "none" }}
          >
            Companies
          </a>
          <a
            href="#methodology"
            style={{ color: "var(--nei-muted)", textDecoration: "none" }}
          >
            Methodology
          </a>
          <a
            href="https://trifectacapital.in"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: "var(--nei-accent)",
              color: "#FFFFFF",
              padding: "7px 14px",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 500,
              fontSize: 13,
            }}
          >
            trifectacapital.in ↗
          </a>
        </nav>
      </header>

      {/* ─── HERO ─── */}
      <section style={section({ padding: "56px 32px 32px" })}>
        <div style={maxW}>
          {/* Label row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 32,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 11,
                padding: "5px 10px 5px 8px",
                borderRadius: 999,
                background: "var(--nei-chip)",
                color: "var(--nei-muted)",
                letterSpacing: "0.04em",
                textTransform: "uppercase" as const,
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "var(--nei-accent)",
                }}
              />
              New Economy Index · NEI
            </span>
            <MarketStatus />
          </div>

          <div className="nei-hero-grid">
            {/* Left: heading + sub */}
            <div>
              <h1
                className="nei-heading"
                style={{
                  fontWeight: 600,
                  fontSize: "clamp(34px, 4.4vw, 58px)",
                  lineHeight: 1.05,
                  letterSpacing: "-0.035em",
                  margin: "0 0 18px",
                  color: "var(--nei-fg)",
                }}
              >
                India's new economy,
                <br />
                in one number.
              </h1>
              <p
                style={{
                  fontSize: 16,
                  lineHeight: 1.6,
                  color: "var(--nei-muted)",
                  maxWidth: 460,
                  margin: "0 0 28px",
                }}
              >
                {numCompanies} VC-backed Indian companies now in public
                markets, tracked as a single equal-weighted index. Built by
                Trifecta Capital — backers of this asset class since 2015.
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <a
                  href="#methodology"
                  style={{
                    padding: "11px 18px",
                    background: "var(--nei-fg)",
                    color: "#FFFFFF",
                    borderRadius: 10,
                    textDecoration: "none",
                    fontWeight: 500,
                    fontSize: 14,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  Methodology{" "}
                  <span style={{ opacity: 0.55, fontSize: 12 }}>→</span>
                </a>
                <a
                  href="#constituents"
                  style={{
                    padding: "11px 18px",
                    background: "transparent",
                    color: "var(--nei-fg)",
                    border: "1px solid var(--nei-grid-strong)",
                    borderRadius: 10,
                    textDecoration: "none",
                    fontWeight: 500,
                    fontSize: 14,
                  }}
                >
                  All {numCompanies} companies
                </a>
              </div>
            </div>

            {/* Right: index card */}
            <div
              className="nei-card"
              style={{ padding: "28px 28px 24px", overflow: "hidden" }}
            >
              {data?.isStale && (
                <div
                  style={{
                    background: "rgba(180, 90, 46, 0.08)",
                    border: "1px solid rgba(180, 90, 46, 0.2)",
                    borderRadius: 8,
                    padding: "7px 12px",
                    fontSize: 12,
                    color: "var(--nei-neg)",
                    marginBottom: 16,
                  }}
                >
                  Showing last market close · Live prices unavailable
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 12,
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div className="nei-label" style={{ marginBottom: 5 }}>
                    Index Level
                  </div>
                  <div
                    style={{ fontSize: 12, color: "var(--nei-muted)" }}
                  >
                    Base 1,000 · {inceptionLabel}
                  </div>
                </div>
                {changePct !== null && (
                  <span
                    style={{
                      fontSize: 12,
                      padding: "4px 10px",
                      borderRadius: 999,
                      fontFamily:
                        "var(--font-jetbrains), ui-monospace, monospace",
                      fontWeight: 600,
                      background:
                        changePct >= 0
                          ? "rgba(44,110,60,0.12)"
                          : "rgba(180,90,46,0.12)",
                      color:
                        changePct >= 0 ? "var(--nei-pos)" : "var(--nei-neg)",
                    }}
                  >
                    {fmtPct(changePct)} today
                  </span>
                )}
              </div>

              {/* Big number */}
              {isLoading && indexValue === null ? (
                <div style={{ margin: "8px 0 6px" }}>
                  <Skeleton h={72} r={8} />
                </div>
              ) : (
                <div
                  className="nei-mono"
                  style={{
                    fontSize: "clamp(48px, 6.5vw, 80px)",
                    fontWeight: 500,
                    letterSpacing: "-0.04em",
                    lineHeight: 0.95,
                    marginBottom: 6,
                    color: "var(--nei-fg)",
                  }}
                >
                  {fmtNum(indexValue)}
                </div>
              )}

              {sinceInception !== null && (
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--nei-muted)",
                    marginBottom: 18,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    className="nei-mono"
                    style={{
                      color:
                        sinceInception >= 0
                          ? "var(--nei-pos)"
                          : "var(--nei-neg)",
                      fontWeight: 600,
                    }}
                  >
                    {fmtPct(sinceInception)}
                  </span>
                  <span>since inception</span>
                  {data?.lastUpdated && (
                    <span style={{ fontSize: 11, color: "var(--nei-muted-faint)" }}>
                      · updated {formatLastUpdated(data.lastUpdated, now)}
                    </span>
                  )}
                </div>
              )}

              {/* Sparkline */}
              <div style={{ height: 72, margin: "0 -4px" }}>
                {sparkSeries.length > 1 ? (
                  <Sparkline series={sparkSeries} height={72} />
                ) : (
                  <Skeleton h={72} r={6} />
                )}
              </div>

              {/* Advancers / Decliners */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  marginTop: 16,
                  paddingTop: 16,
                  borderTop: "1px solid var(--nei-grid)",
                }}
              >
                {[
                  { l: "Advancers", v: advancers, c: "var(--nei-pos)" },
                  { l: "Decliners", v: decliners, c: "var(--nei-neg)" },
                  {
                    l: "Unchanged",
                    v: Math.max(0, numCompanies - advancers - decliners),
                    c: "var(--nei-muted)",
                  },
                ].map((s, i) => (
                  <div
                    key={s.l}
                    style={{
                      borderRight:
                        i < 2 ? "1px solid var(--nei-grid)" : "none",
                      paddingLeft: i > 0 ? 14 : 0,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--nei-muted)",
                        marginBottom: 4,
                      }}
                    >
                      {s.l}
                    </div>
                    <div
                      className="nei-mono"
                      style={{ fontSize: 18, fontWeight: 600, color: s.c }}
                    >
                      {isLoading && stocks.length === 0 ? "—" : s.v}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ─── Movers row ─── */}
          <div
            style={{
              marginTop: 20,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 14,
            }}
          >
            <MoversCard title="Top gainers" rows={topGainers} />
            <MoversCard title="Top decliners" rows={topLosers} />
            <SectorCard stocks={stocks} />
          </div>
        </div>
      </section>

      {/* ─── PERFORMANCE ─── */}
      <section id="performance" style={section()}>
        <div style={maxW}>
          <div className="nei-card" style={{ padding: "28px 28px" }}>
            <div
              style={{
                marginBottom: 4,
              }}
            >
              <h2
                className="nei-heading"
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  margin: "0 0 4px",
                  color: "var(--nei-fg)",
                }}
              >
                Performance
              </h2>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--nei-muted)",
                  margin: 0,
                }}
              >
                Equal-weighted · base 1,000 on {inceptionLabel} · hover to
                inspect
              </p>
            </div>
            <IndexChart liveValue={indexValue} />
          </div>
        </div>
      </section>

      {/* ─── CONSTITUENTS ─── */}
      <section id="constituents" style={section({ padding: "16px 32px 40px" })}>
        <div style={maxW}>
          <div className="nei-card" style={{ padding: "28px 28px" }}>
            <div style={{ marginBottom: 20 }}>
              <h2
                className="nei-heading"
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  margin: "0 0 4px",
                  color: "var(--nei-fg)",
                }}
              >
                All {numCompanies} companies
              </h2>
              <p
                style={{ fontSize: 13, color: "var(--nei-muted)", margin: 0 }}
              >
                Sort by any column, search, or switch to cards view.
              </p>
            </div>
            <CompanyGrid stocks={stocks} isLoading={isLoading} />
          </div>
        </div>
      </section>

      {/* ─── METHODOLOGY ─── */}
      <section id="methodology" style={section({ padding: "48px 32px 72px" })}>
        <div style={maxW}>
          <div className="nei-why-grid">
            {/* Left sticky */}
            <div className="nei-why-sticky" style={{ position: "sticky", top: 88 }}>
              <div className="nei-label" style={{ marginBottom: 14 }}>
                Why we built this
              </div>
              <h2
                className="nei-heading"
                style={{
                  fontSize: "clamp(24px, 3vw, 38px)",
                  fontWeight: 600,
                  letterSpacing: "-0.025em",
                  lineHeight: 1.1,
                  margin: "0 0 16px",
                  color: "var(--nei-fg)",
                }}
              >
                A benchmark
                <br />
                for the cohort
                <br />
                we underwrote.
              </h2>
              <p
                style={{
                  fontSize: 15,
                  lineHeight: 1.6,
                  color: "var(--nei-muted)",
                  margin: 0,
                  maxWidth: 360,
                }}
              >
                Trifecta launched India&apos;s first venture debt fund in 2015.
                A decade later, many of those companies are publicly listed.
                The NEI tracks them as a single asset class.
              </p>
            </div>

            {/* Right: feature cards */}
            <div style={{ display: "grid", gap: 12 }}>
              {[
                {
                  n: "01",
                  t: "Equal-weighted, by design",
                  b: "No single constituent dominates the read. Each company contributes equally — the index reflects the cohort, not its biggest names. Rebalanced quarterly.",
                },
                {
                  n: "02",
                  t: `${numCompanies} listings, one number`,
                  b: "Consumer internet, fintech, logistics, SaaS, mobility, healthtech — India's new economy across sectors and stages, distilled into a single level.",
                },
                {
                  n: "03",
                  t: "Built from our seat",
                  b: "200+ portfolio companies. $600M+ AUM. Trifecta has been at the center of this asset class for a decade — we built the lens we wanted to use ourselves.",
                },
                {
                  n: "04",
                  t: "Free, public, shareable",
                  b: "No paywall, no login. Use it for screenshots, decks, internal MIS, or just to check the level. Data is provided for informational purposes only.",
                },
              ].map((card) => (
                <div
                  key={card.n}
                  className="nei-card"
                  style={{
                    padding: "20px 24px",
                    display: "grid",
                    gridTemplateColumns: "40px 1fr",
                    gap: 16,
                    alignItems: "start",
                  }}
                >
                  <span
                    className="nei-mono"
                    style={{
                      fontSize: 12,
                      color: "var(--nei-accent)",
                      letterSpacing: "0.06em",
                      paddingTop: 2,
                      opacity: 0.8,
                    }}
                  >
                    {card.n}
                  </span>
                  <div>
                    <h3
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        margin: "0 0 6px",
                        letterSpacing: "-0.01em",
                        color: "var(--nei-fg)",
                      }}
                    >
                      {card.t}
                    </h3>
                    <p
                      style={{
                        fontSize: 13.5,
                        lineHeight: 1.6,
                        color: "var(--nei-muted)",
                        margin: 0,
                      }}
                    >
                      {card.b}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer
        style={{
          padding: "36px 32px 28px",
          borderTop: "1px solid var(--nei-grid)",
        }}
      >
        <div
          style={{
            ...maxW,
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 24,
            alignItems: "flex-end",
          }}
        >
          <div>
            <Image
              src="/trifecta-capital-logo.png"
              alt="Trifecta Capital"
              width={80}
              height={24}
              style={{ height: 18, width: "auto", opacity: 0.65 }}
            />
            <div
              style={{
                marginTop: 10,
                fontSize: 12,
                color: "var(--nei-muted)",
                lineHeight: 1.7,
              }}
            >
              Data via NSE · Real-time during market hours · Updated every 15
              minutes
              <br />© 2026 Trifecta Capital. Index is for informational
              purposes only. Not investment advice.
            </div>
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--nei-muted)",
              textAlign: "right",
              lineHeight: 1.8,
            }}
          >
            <div>nei@trifectacapital.in</div>
            <div>
              <a
                href="https://trifectacapital.in"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--nei-accent)", textDecoration: "none" }}
              >
                trifectacapital.in ↗
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
