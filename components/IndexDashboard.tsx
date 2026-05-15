"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useIndexData, type StockData } from "@/hooks/useIndexData";
import { useDarkMode } from "@/hooks/useDarkMode";
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
const EMPTY_STOCKS: StockData[] = [];

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

// ─── Skeleton pulse ───────────────────────────────────────────────────────────

function Skeleton({ w, h, r = 6 }: { w?: string | number; h: number; r?: number }) {
  return (
    <div
      style={{
        width: w ?? "100%",
        height: h,
        borderRadius: r,
        background: "var(--nei-grid-strong)",
        animation: "nei-pulse 1.8s ease-in-out infinite",
      }}
    />
  );
}

// ─── Movers card ──────────────────────────────────────────────────────────────

interface MoverRow {
  ticker: string;
  name: string;
  changePct: number | null;
}

function MoversCard({ title, rows }: { title: string; rows: MoverRow[] }) {
  return (
    <div className="nei-card" style={{ padding: "18px 20px" }}>
      <div className="nei-label" style={{ marginBottom: 14 }}>
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {rows.map((r) => (
          <div
            key={r.ticker}
            style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "var(--font-jetbrains), ui-monospace, monospace",
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
                  color: r.changePct >= 0 ? "var(--nei-pos)" : "var(--nei-neg)",
                }}
              >
                {fmtPct(r.changePct)}
              </span>
            )}
          </div>
        ))}
        {rows.length === 0 && (
          <div style={{ fontSize: 12, color: "var(--nei-muted)" }}>No data yet</div>
        )}
      </div>
    </div>
  );
}

// ─── Sector card ──────────────────────────────────────────────────────────────

function SectorCard({
  stocks,
  embedded = false,
}: {
  stocks: { sector: string; changePct: number | null }[];
  embedded?: boolean;
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
    <div
      className={embedded ? undefined : "nei-card"}
      style={{
        padding: embedded ? "20px 0 0" : "18px 20px",
        marginTop: embedded ? 20 : 0,
        borderTop: embedded ? "1px solid var(--nei-grid)" : undefined,
      }}
    >
      <div className="nei-label" style={{ marginBottom: 14 }}>
        Sector snapshot
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {sectors.map((s) => (
          <div key={s.name}>
            <div
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}
            >
              <span style={{ fontSize: 12, color: "var(--nei-fg)", fontWeight: 500 }}>{s.name}</span>
              <span
                style={{
                  fontFamily: "var(--font-jetbrains), ui-monospace, monospace",
                  fontSize: 12,
                  fontWeight: 600,
                  color: s.avg! >= 0 ? "var(--nei-pos)" : "var(--nei-neg)",
                }}
              >
                {fmtPct(s.avg!)}
              </span>
            </div>
            <div style={{ height: 3, background: "var(--nei-grid)", borderRadius: 2, overflow: "hidden" }}>
              <div
                style={{
                  width: `${Math.min(100, Math.abs(s.avg!) * 15)}%`,
                  height: "100%",
                  background: s.avg! >= 0 ? "var(--nei-pos)" : "var(--nei-neg)",
                  borderRadius: 2,
                }}
              />
            </div>
          </div>
        ))}
        {sectors.length === 0 && (
          <div style={{ fontSize: 12, color: "var(--nei-muted)" }}>No data yet</div>
        )}
      </div>
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export function IndexDashboard() {
  const { data, isLoading } = useIndexData();
  const { isDark, toggle: toggleDark } = useDarkMode();
  const [sparkSeries, setSparkSeries] = useState<number[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const open = isMarketOpen();

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
  const stocks = data?.stocks ?? EMPTY_STOCKS;

  const sinceInception =
    indexValue !== null
      ? ((indexValue - INDEX_BASE_VALUE) / INDEX_BASE_VALUE) * 100
      : null;

  const advancers = stocks.filter((s) => (s.changePct ?? 0) > 0).length;

  const high52w = useMemo(
    () => (sparkSeries.length > 0 ? Math.max(...sparkSeries) : null),
    [sparkSeries]
  );
  const low52w = useMemo(
    () => (sparkSeries.length > 0 ? Math.min(...sparkSeries) : null),
    [sparkSeries]
  );

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

  const maxW: CSSProperties = { maxWidth: 1240, margin: "0 auto" };
  const section = (extra: CSSProperties = {}): CSSProperties => ({
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
          padding: "18px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "color-mix(in oklab, var(--nei-bg) 88%, transparent)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--nei-grid)",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <span
            style={{
              fontFamily: "var(--font-sora), system-ui, sans-serif",
              fontWeight: 600,
              fontSize: 15,
              letterSpacing: "-0.025em",
              lineHeight: 1,
              color: "var(--nei-fg)",
            }}
          >
            Trifecta Capital
          </span>
          <span
            style={{
              width: 1,
              height: 14,
              background: "var(--nei-grid-strong)",
              alignSelf: "center",
            }}
          />
          <span
            style={{
              fontSize: 13,
              color: "var(--nei-muted)",
              letterSpacing: "0.005em",
            }}
          >
            New Economy Index
          </span>
        </div>

        <nav
          className="nei-nav-links"
          style={{ display: "flex", gap: 28, alignItems: "center", fontSize: 13 }}
        >
          <a href="#performance" style={{ color: "var(--nei-muted)", textDecoration: "none" }}>
            Performance
          </a>
          <a href="#constituents" style={{ color: "var(--nei-muted)", textDecoration: "none" }}>
            Constituents
          </a>
          <a href="#methodology" style={{ color: "var(--nei-muted)", textDecoration: "none" }}>
            Methodology
          </a>
          <button
            onClick={toggleDark}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "1px solid var(--nei-grid-strong)",
              background: "transparent",
              cursor: "pointer",
              color: "var(--nei-muted)",
              fontSize: 15,
              flexShrink: 0,
              transition: "border-color 100ms, color 100ms",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--nei-accent)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--nei-fg)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--nei-grid-strong)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--nei-muted)";
            }}
          >
            {isDark ? "☀" : "☽"}
          </button>
          <a
            href="https://trifectacapital.in"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--nei-fg)", textDecoration: "none", fontSize: 13 }}
          >
            trifectacapital.in{" "}
            <span style={{ color: "var(--nei-muted)" }}>↗</span>
          </a>
        </nav>
      </header>

      {/* ─── HERO ─── */}
      <section style={section({ padding: "72px 32px 64px" })}>
        <div style={maxW}>
          {/* Eyebrow: two-block layout */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 16,
              marginBottom: 40,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontFamily: "var(--font-sora), system-ui, sans-serif",
                letterSpacing: "0.14em",
                textTransform: "uppercase" as const,
                color: "var(--nei-muted)",
                fontWeight: 500,
                lineHeight: 1.6,
              }}
            >
              New Economy
              <br />
              Index
            </div>
            <span
              style={{
                width: 1,
                height: 32,
                background: "var(--nei-grid-strong)",
                flexShrink: 0,
                marginTop: 2,
              }}
            />
            <div
              style={{
                fontSize: 11,
                fontFamily: "var(--font-jetbrains), ui-monospace, monospace",
                letterSpacing: "0.06em",
                textTransform: "uppercase" as const,
                color: "var(--nei-muted)",
                lineHeight: 1.6,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: open ? "var(--nei-pos)" : "var(--nei-muted)",
                    animation: open ? "nei-live-pulse 2s ease-in-out infinite" : "none",
                    flexShrink: 0,
                  }}
                />
                Market
              </div>
              <div>{open ? "Open" : "Closed"}</div>
            </div>
          </div>

          {/* Two-column hero */}
          <div className="nei-hero-grid">
            {/* Left: headline + description */}
            <div>
              <h1
                className="nei-heading"
                style={{
                  fontWeight: 600,
                  fontSize: "clamp(36px, 4.8vw, 64px)",
                  lineHeight: 1.02,
                  letterSpacing: "-0.035em",
                  margin: "0 0 24px",
                  color: "var(--nei-fg)",
                }}
              >
                India&apos;s new economy,
                <br />
                tracked as one
                <br />
                number.
              </h1>
              <p
                style={{
                  fontSize: 16,
                  lineHeight: 1.65,
                  color: "var(--nei-muted)",
                  maxWidth: 480,
                  margin: 0,
                }}
              >
                An equal-weighted index of {numCompanies} venture-backed Indian
                companies now in public markets. Built by Trifecta Capital —
                underwriters of this asset class since 2015.
              </p>
            </div>

            {/* Right: index level — open right-aligned layout */}
            <div style={{ textAlign: "right" }}>
              {data?.isStale && (
                <div
                  style={{
                    background: "color-mix(in oklab, var(--nei-neg) 12%, transparent)",
                    border: "1px solid color-mix(in oklab, var(--nei-neg) 28%, transparent)",
                    borderRadius: 8,
                    padding: "7px 12px",
                    fontSize: 12,
                    color: "var(--nei-neg)",
                    marginBottom: 12,
                    display: "inline-block",
                  }}
                >
                  Showing last market close · Live prices unavailable
                </div>
              )}

              <div
                style={{
                  fontSize: 11,
                  fontFamily: "var(--font-sora), system-ui, sans-serif",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase" as const,
                  color: "var(--nei-muted)",
                  fontWeight: 600,
                  marginBottom: 14,
                }}
              >
                Index Level
              </div>

              {/* Big number */}
              {isLoading && indexValue === null ? (
                <div style={{ marginBottom: 14 }}>
                  <Skeleton h={88} r={8} />
                </div>
              ) : (
                <div
                  className="nei-mono"
                  style={{
                    fontSize: "clamp(56px, 8vw, 104px)",
                    fontWeight: 400,
                    letterSpacing: "-0.04em",
                    lineHeight: 0.95,
                    marginBottom: 14,
                    color: "var(--nei-fg)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {fmtNum(indexValue)}
                </div>
              )}

              {/* Change stats */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 20,
                  marginBottom: 24,
                  fontFamily: "var(--font-jetbrains), ui-monospace, monospace",
                  fontSize: 13,
                  flexWrap: "wrap",
                }}
              >
                {changePct !== null && (
                  <span style={{ whiteSpace: "nowrap" }}>
                    <span
                      style={{
                        color: changePct >= 0 ? "var(--nei-pos)" : "var(--nei-neg)",
                        fontWeight: 600,
                      }}
                    >
                      {fmtPct(changePct)}
                    </span>{" "}
                    <span style={{ color: "var(--nei-muted)" }}>today</span>
                  </span>
                )}
                {sinceInception !== null && (
                  <span style={{ whiteSpace: "nowrap" }}>
                    <span
                      style={{
                        color: sinceInception >= 0 ? "var(--nei-pos)" : "var(--nei-neg)",
                        fontWeight: 600,
                      }}
                    >
                      {fmtPct(sinceInception)}
                    </span>{" "}
                    <span style={{ color: "var(--nei-muted)" }}>since inception</span>
                  </span>
                )}
              </div>

              {/* Sparkline */}
              <div style={{ height: 80, marginBottom: 10 }}>
                {sparkSeries.length > 1 ? (
                  <Sparkline series={sparkSeries} height={80} />
                ) : (
                  <Skeleton h={80} r={6} />
                )}
              </div>

              {/* Base info */}
              <div
                style={{
                  fontSize: 11,
                  color: "var(--nei-muted)",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span>Base 1,000 · {inceptionLabel}</span>
                {data?.lastUpdated && (
                  <span style={{ color: "var(--nei-muted-faint)" }}>
                    · updated {formatLastUpdated(data.lastUpdated, now)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── STAT BAND ─── */}
      <section style={{ background: "var(--nei-accent)", padding: "40px 32px" }}>
        <div style={maxW}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 0,
            }}
          >
            {[
              { l: "Constituents", v: `${numCompanies}`, sub: "public listings" },
              { l: "Inception", v: inceptionLabel, sub: "base 1,000" },
              { l: "Methodology", v: "Equal-weight", sub: "rebalanced quarterly" },
              { l: "52-week high", v: high52w !== null ? fmtNum(high52w, 0) : "—", sub: "" },
              { l: "52-week low", v: low52w !== null ? fmtNum(low52w, 0) : "—", sub: "" },
              {
                l: "Advancers",
                v: stocks.length > 0 ? `${advancers} / ${numCompanies}` : "—",
                sub: "today",
              },
            ].map((s, i, arr) => (
              <div
                key={i}
                style={{
                  padding: "8px 24px 8px 0",
                  paddingLeft: i === 0 ? 0 : 24,
                  borderRight:
                    i < arr.length - 1 ? "1px solid rgba(232,235,240,0.18)" : "none",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "rgba(232,235,240,0.7)",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase" as const,
                    marginBottom: 8,
                    fontWeight: 600,
                    fontFamily: "var(--font-sora), system-ui, sans-serif",
                  }}
                >
                  {s.l}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-sora), system-ui, sans-serif",
                    fontSize: 22,
                    fontWeight: 600,
                    letterSpacing: "-0.025em",
                    color: "#fff",
                    lineHeight: 1.1,
                  }}
                >
                  {s.v}
                </div>
                {s.sub && (
                  <div style={{ fontSize: 11, color: "rgba(232,235,240,0.6)", marginTop: 4 }}>
                    {s.sub}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PERFORMANCE ─── */}
      <section id="performance" style={section()}>
        <div style={maxW}>
          <div className="nei-card" style={{ padding: "28px 28px" }}>
            <div style={{ marginBottom: 4 }}>
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
              <p style={{ fontSize: 13, color: "var(--nei-muted)", margin: 0 }}>
                Equal-weighted · base 1,000 on {inceptionLabel} · daily EOD snapshots,
                live during market hours.
              </p>
            </div>
            <IndexChart liveValue={indexValue} stocks={stocks} />
            <SectorCard stocks={stocks} embedded />
          </div>

          <div
            className="nei-movers-row"
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 14,
            }}
          >
            <MoversCard title="Top gainers" rows={topGainers} />
            <MoversCard title="Top decliners" rows={topLosers} />
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
              <p style={{ fontSize: 13, color: "var(--nei-muted)", margin: 0 }}>
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
                      style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--nei-muted)", margin: 0 }}
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
          padding: "40px 32px 32px",
          background: "#0F2036",
          color: "rgba(232,235,240,0.85)",
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
            <span
              style={{
                fontFamily: "var(--font-sora), system-ui, sans-serif",
                fontWeight: 600,
                fontSize: 15,
                letterSpacing: "-0.025em",
                color: "#fff",
              }}
            >
              Trifecta Capital
            </span>
            <div
              style={{
                marginTop: 10,
                fontSize: 12,
                color: "rgba(232,235,240,0.55)",
                lineHeight: 1.7,
              }}
            >
              Data via NSE · Live during market hours · Refreshed every 5 min
              <br />© 2026 Trifecta Capital. Index is for informational purposes
              only. Not investment advice.
            </div>
          </div>
          <div
            style={{
              fontSize: 12,
              color: "rgba(232,235,240,0.55)",
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
                style={{ color: "rgba(232,235,240,0.85)", textDecoration: "none" }}
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
