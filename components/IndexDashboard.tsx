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

// ─── Section eyebrow ──────────────────────────────────────────────────────────

function SectionEyebrow({ n, label, light = false }: { n: string; label: string; light?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
      <span
        style={{
          fontFamily: "var(--font-jetbrains), ui-monospace, monospace",
          fontSize: 12,
          fontWeight: 600,
          color: light ? "rgba(232,235,240,0.95)" : "var(--nei-accent)",
          letterSpacing: "0.02em",
        }}
      >
        § {n}
      </span>
      <span
        style={{
          height: 1,
          width: 28,
          background: light
            ? "rgba(232,235,240,0.25)"
            : "color-mix(in oklab, var(--nei-accent) 30%, transparent)",
        }}
      />
      <span
        style={{
          fontFamily: "var(--font-sora), system-ui, sans-serif",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.18em",
          textTransform: "uppercase" as const,
          color: light ? "rgba(232,235,240,0.55)" : "var(--nei-muted)",
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ─── Movers card ──────────────────────────────────────────────────────────────

interface MoverRow {
  ticker: string;
  name: string;
  changePct: number | null;
}

function MoversCard({ title, rows, positive }: { title: string; rows: MoverRow[]; positive?: boolean }) {
  return (
    <div
      className="nei-card"
      style={{ padding: "20px 22px" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 16,
        }}
      >
        <span
          style={{
            width: 3,
            height: 14,
            borderRadius: 2,
            background: positive ? "var(--nei-pos)" : "var(--nei-neg)",
          }}
        />
        <div className="nei-label">{title}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
                  maxWidth: 180,
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

function SectorCard({ stocks }: { stocks: { sector: string; changePct: number | null }[] }) {
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
    <div className="nei-card" style={{ padding: "20px 22px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <span style={{ width: 3, height: 14, borderRadius: 2, background: "var(--nei-accent)" }} />
        <div className="nei-label">Sector snapshot</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {sectors.map((s) => (
          <div key={s.name}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
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

// ─── View toggle (for constituents section header) ────────────────────────────

function ViewToggle({
  value,
  onChange,
}: {
  value: "table" | "grid";
  onChange: (v: "table" | "grid") => void;
}) {
  const opts: { v: "table" | "grid"; l: string }[] = [
    { v: "table", l: "Table" },
    { v: "grid", l: "Cards" },
  ];
  return (
    <div
      style={{
        display: "inline-flex",
        padding: 4,
        background: "var(--nei-chip)",
        borderRadius: 10,
        gap: 2,
      }}
    >
      {opts.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          style={{
            padding: "6px 14px",
            fontSize: 12,
            fontWeight: 500,
            fontFamily: "var(--font-inter), system-ui",
            background: value === o.v ? "var(--nei-surface)" : "transparent",
            color: value === o.v ? "var(--nei-fg)" : "var(--nei-muted)",
            border: "none",
            borderRadius: 7,
            cursor: "pointer",
            boxShadow: value === o.v ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
            transition: "all 100ms",
          }}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export function IndexDashboard() {
  const { data, isLoading } = useIndexData();
  const { isDark, toggle: toggleDark } = useDarkMode();
  const [sparkSeries, setSparkSeries] = useState<number[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [constituentsView, setConstituentsView] = useState<"table" | "grid">("table");
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
  const decliners = stocks.filter((s) => (s.changePct ?? 0) < 0).length;

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

  // Current IST close time string for the card header
  const nowIST = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
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
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontFamily: "var(--font-sora), system-ui, sans-serif",
              fontWeight: 600,
              fontSize: 15,
              letterSpacing: "-0.025em",
              color: "var(--nei-fg)",
            }}
          >
            Trifecta Capital
          </span>
          <span
            style={{
              fontSize: 11,
              padding: "3px 9px",
              borderRadius: 6,
              background: "color-mix(in oklab, var(--nei-accent) 14%, transparent)",
              color: "var(--nei-accent)",
              fontFamily: "var(--font-sora), system-ui, sans-serif",
              letterSpacing: "0.10em",
              textTransform: "uppercase" as const,
              fontWeight: 700,
            }}
          >
            NEI
          </span>
        </div>

        <nav
          className="nei-nav-links"
          style={{ display: "flex", gap: 24, alignItems: "center", fontSize: 13 }}
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
              transition: "border-color 100ms",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--nei-accent)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--nei-grid-strong)";
            }}
          >
            {isDark ? "☀" : "☽"}
          </button>
          <a
            href="https://trifectacapital.in"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: "var(--nei-accent)",
              color: "#fff",
              padding: "8px 14px",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            trifectacapital.in ↗
          </a>
        </nav>
      </header>

      {/* ─── §01 HERO ─── */}
      <section style={{ padding: "64px 32px 72px", background: "var(--nei-bg)" }}>
        <div style={maxW}>
          {/* Eyebrow row */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 36, flexWrap: "wrap" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 11,
                padding: "6px 12px 6px 10px",
                borderRadius: 999,
                background: "color-mix(in oklab, var(--nei-accent) 12%, transparent)",
                color: "var(--nei-accent)",
                letterSpacing: "0.08em",
                fontWeight: 600,
                border: "1px solid color-mix(in oklab, var(--nei-accent) 24%, transparent)",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: "var(--nei-accent)",
                }}
              />
              AN INDEX BY TRIFECTA CAPITAL
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                fontSize: 11,
                fontFamily: "var(--font-jetbrains), ui-monospace, monospace",
                letterSpacing: "0.06em",
                textTransform: "uppercase" as const,
                color: "var(--nei-muted)",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: open ? "var(--nei-pos)" : "var(--nei-muted)",
                  animation: open ? "nei-live-pulse 2s ease-in-out infinite" : "none",
                }}
              />
              Market {open ? "Open" : "Closed"}
            </span>
          </div>

          {/* Two-column grid */}
          <div className="nei-hero-grid">
            {/* Left */}
            <div>
              <h1
                className="nei-heading"
                style={{
                  fontWeight: 600,
                  fontSize: "clamp(40px, 5vw, 64px)",
                  lineHeight: 1.02,
                  letterSpacing: "-0.035em",
                  margin: "0 0 22px",
                  color: "var(--nei-fg)",
                }}
              >
                India&apos;s new economy,
                <br />
                in one ticker.
              </h1>
              <p
                style={{
                  fontSize: 17,
                  lineHeight: 1.55,
                  color: "var(--nei-muted)",
                  maxWidth: 480,
                  margin: "0 0 32px",
                }}
              >
                {numCompanies} VC-backed Indian companies that have listed on
                public markets, tracked as a single equal-weighted index. Built
                by Trifecta Capital — backers of this asset class since 2015.
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <a
                  href="#methodology"
                  style={{
                    padding: "13px 20px",
                    background: "var(--nei-accent)",
                    color: "#fff",
                    borderRadius: 10,
                    textDecoration: "none",
                    fontWeight: 600,
                    fontSize: 14,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    letterSpacing: "-0.005em",
                  }}
                >
                  See methodology
                  <span style={{ opacity: 0.7 }}>→</span>
                </a>
                <a
                  href="#constituents"
                  style={{
                    padding: "13px 20px",
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
              style={{ padding: "32px 32px 28px", overflow: "hidden", position: "relative" }}
            >
              {/* Blue accent top stripe */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  background: "var(--nei-accent)",
                }}
              />

              {data?.isStale && (
                <div
                  style={{
                    background: "color-mix(in oklab, var(--nei-neg) 12%, transparent)",
                    border: "1px solid color-mix(in oklab, var(--nei-neg) 28%, transparent)",
                    borderRadius: 8,
                    padding: "7px 12px",
                    fontSize: 12,
                    color: "var(--nei-neg)",
                    marginBottom: 14,
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
                  marginBottom: 14,
                  gap: 8,
                }}
              >
                <div>
                  <div className="nei-label" style={{ marginBottom: 4 }}>
                    NEI · Index Level
                  </div>
                  <div style={{ fontSize: 12, color: "var(--nei-muted)" }}>
                    {nowIST} · {open ? "Live" : "15:30 IST · close"}
                  </div>
                </div>
                {changePct !== null && (
                  <span
                    style={{
                      fontSize: 12,
                      padding: "5px 11px",
                      borderRadius: 999,
                      fontFamily: "var(--font-jetbrains), ui-monospace, monospace",
                      fontWeight: 600,
                      background:
                        changePct >= 0
                          ? "color-mix(in oklab, var(--nei-pos) 18%, transparent)"
                          : "color-mix(in oklab, var(--nei-neg) 18%, transparent)",
                      color: changePct >= 0 ? "var(--nei-pos)" : "var(--nei-neg)",
                      flexShrink: 0,
                    }}
                  >
                    {fmtPct(changePct)}
                  </span>
                )}
              </div>

              {/* Big number */}
              {isLoading && indexValue === null ? (
                <div style={{ margin: "8px 0 6px" }}>
                  <Skeleton h={80} r={8} />
                </div>
              ) : (
                <div
                  className="nei-mono"
                  style={{
                    fontSize: "clamp(56px, 8vw, 88px)",
                    fontWeight: 500,
                    letterSpacing: "-0.035em",
                    lineHeight: 0.95,
                    marginBottom: 6,
                    color: "var(--nei-fg)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {fmtNum(indexValue)}
                </div>
              )}

              {sinceInception !== null && (
                <div style={{ fontSize: 13, color: "var(--nei-muted)", marginBottom: 22 }}>
                  <span
                    className="nei-mono"
                    style={{
                      color: sinceInception >= 0 ? "var(--nei-pos)" : "var(--nei-neg)",
                      fontWeight: 600,
                    }}
                  >
                    {fmtPct(sinceInception)}
                  </span>{" "}
                  since inception · base 1,000
                  {data?.lastUpdated && (
                    <span style={{ marginLeft: 8, fontSize: 11, color: "var(--nei-muted-faint)" }}>
                      · {formatLastUpdated(data.lastUpdated, now)}
                    </span>
                  )}
                </div>
              )}

              {/* Sparkline */}
              <div style={{ height: 86, margin: "0 -8px" }}>
                {sparkSeries.length > 1 ? (
                  <Sparkline series={sparkSeries} height={86} />
                ) : (
                  <Skeleton h={86} r={6} />
                )}
              </div>

              {/* Advancers / Decliners / Unchanged */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  marginTop: 18,
                  paddingTop: 18,
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
                      borderRight: i < 2 ? "1px solid var(--nei-grid)" : "none",
                      paddingLeft: i > 0 ? 14 : 0,
                    }}
                  >
                    <div style={{ fontSize: 11, color: "var(--nei-muted)", marginBottom: 4, fontWeight: 500 }}>
                      {s.l}
                    </div>
                    <div
                      className="nei-mono"
                      style={{ fontSize: 20, fontWeight: 600, color: s.c }}
                    >
                      {isLoading && stocks.length === 0 ? "—" : s.v}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── §02 STAT BAND ─── */}
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

      {/* ─── §03 TODAY'S MARKET ─── */}
      <section style={{ padding: "72px 32px 56px", background: "var(--nei-surface)" }}>
        <div style={maxW}>
          <SectionEyebrow n="03" label="Today's Market" />
          <h2
            className="nei-heading"
            style={{
              fontSize: "clamp(26px, 3vw, 36px)",
              fontWeight: 600,
              letterSpacing: "-0.025em",
              margin: "0 0 32px",
              lineHeight: 1.1,
              color: "var(--nei-fg)",
            }}
          >
            Where the index moved today.
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            <MoversCard title="Top gainers" rows={topGainers} positive />
            <MoversCard title="Top decliners" rows={topLosers} />
            <SectorCard stocks={stocks} />
          </div>
        </div>
      </section>

      {/* ─── §04 PERFORMANCE ─── */}
      <section id="performance" style={{ padding: "64px 32px", background: "var(--nei-bg)" }}>
        <div style={maxW}>
          <SectionEyebrow n="04" label="Performance" />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginBottom: 28,
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <div>
              <h2
                className="nei-heading"
                style={{
                  fontSize: "clamp(26px, 3vw, 36px)",
                  fontWeight: 600,
                  letterSpacing: "-0.025em",
                  margin: "0 0 8px",
                  lineHeight: 1.1,
                  color: "var(--nei-fg)",
                }}
              >
                Index history
              </h2>
              <p style={{ fontSize: 14, color: "var(--nei-muted)", margin: 0 }}>
                Equal-weighted, base 1,000 on {inceptionLabel}. Hover the chart to inspect any day.
              </p>
            </div>
          </div>
          <div
            className="nei-card"
            style={{
              padding: "28px 28px 18px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Blue left accent stripe */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: 4,
                bottom: 0,
                background: "var(--nei-accent)",
              }}
            />
            <IndexChart liveValue={indexValue} stocks={stocks} />
          </div>
        </div>
      </section>

      {/* ─── §05 INSIDE THE INDEX ─── */}
      <section
        id="constituents"
        style={{ padding: "64px 32px 72px", background: "var(--nei-surface)" }}
      >
        <div style={maxW}>
          <SectionEyebrow n="05" label="Inside the Index" />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginBottom: 28,
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <div>
              <h2
                className="nei-heading"
                style={{
                  fontSize: "clamp(26px, 3vw, 36px)",
                  fontWeight: 600,
                  letterSpacing: "-0.025em",
                  margin: "0 0 8px",
                  lineHeight: 1.1,
                  color: "var(--nei-fg)",
                }}
              >
                All {numCompanies} companies
              </h2>
              <p style={{ fontSize: 14, color: "var(--nei-muted)", margin: 0 }}>
                Sort, search, or switch between table and cards.
              </p>
            </div>
            <ViewToggle value={constituentsView} onChange={setConstituentsView} />
          </div>
          <div className="nei-card" style={{ padding: "24px 28px" }}>
            <CompanyGrid
              stocks={stocks}
              isLoading={isLoading}
              view={constituentsView}
              onViewChange={setConstituentsView}
            />
          </div>
        </div>
      </section>

      {/* ─── §06 WHY WE BUILT THIS ─── */}
      <section
        id="methodology"
        style={{
          padding: "88px 32px 72px",
          background: "var(--nei-accent)",
          color: "#E8EBF0",
        }}
      >
        <div style={{ ...maxW, color: "#E8EBF0" }}>
          <SectionEyebrow n="06" label="Why we built this" light />
          <div
            className="nei-why-grid"
            style={{ alignItems: "start" }}
          >
            {/* Left */}
            <div>
              <h2
                className="nei-heading"
                style={{
                  fontSize: "clamp(30px, 3.8vw, 48px)",
                  fontWeight: 600,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.08,
                  margin: "0 0 24px",
                  color: "#fff",
                }}
              >
                A benchmark for the cohort we underwrote.
              </h2>
              <p
                style={{
                  fontSize: 15,
                  lineHeight: 1.65,
                  color: "rgba(232,235,240,0.85)",
                  margin: 0,
                  maxWidth: 420,
                }}
              >
                Trifecta launched India&apos;s first venture debt fund in 2015. A
                decade later many of those companies are publicly listed. The NEI
                tracks them as a single asset class — from the seat that watched
                it form.
              </p>
            </div>

            {/* Right: feature cards */}
            <div style={{ display: "grid", gap: 12 }}>
              {[
                {
                  n: "01",
                  t: "Equal-weighted, by design",
                  b: "No single constituent dominates the read. Rebalanced quarterly so the index reflects the cohort, not its biggest names.",
                },
                {
                  n: "02",
                  t: `${numCompanies} listings, one number`,
                  b: "Consumer internet, fintech, logistics, SaaS, mobility, healthtech. India's new economy across sectors and stages.",
                },
                {
                  n: "03",
                  t: "Built from our seat",
                  b: "200+ portfolio companies. $600M+ AUM. Trifecta has been at the center of this asset class for a decade — we built the lens we wanted.",
                },
                {
                  n: "04",
                  t: "Free, public, shareable",
                  b: "No paywall, no login. Use it for screenshots, decks, internal MIS, or just to check the level. Data is informational only.",
                },
              ].map((card) => (
                <div
                  key={card.n}
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(232,235,240,0.14)",
                    borderRadius: 16,
                    padding: "22px 24px",
                    display: "grid",
                    gridTemplateColumns: "52px 1fr",
                    gap: 16,
                    alignItems: "start",
                  }}
                >
                  <span
                    className="nei-mono"
                    style={{
                      fontSize: 13,
                      color: "rgba(232,235,240,0.6)",
                      letterSpacing: "0.04em",
                      fontWeight: 600,
                      paddingTop: 2,
                    }}
                  >
                    {card.n}
                  </span>
                  <div>
                    <h3
                      style={{
                        fontSize: 17,
                        fontWeight: 600,
                        margin: "0 0 6px",
                        letterSpacing: "-0.01em",
                        color: "#fff",
                      }}
                    >
                      {card.t}
                    </h3>
                    <p
                      style={{
                        fontSize: 14,
                        lineHeight: 1.55,
                        color: "rgba(232,235,240,0.78)",
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

          {/* Footer row within section */}
          <div
            style={{
              marginTop: 64,
              paddingTop: 24,
              borderTop: "1px solid rgba(232,235,240,0.18)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-sora), system-ui, sans-serif",
                fontSize: 13,
                color: "rgba(232,235,240,0.75)",
              }}
            >
              Trifecta Capital · 2015 → 2026
            </span>
            <span
              style={{
                fontFamily: "var(--font-sora), system-ui, sans-serif",
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase" as const,
                color: "rgba(232,235,240,0.75)",
                fontWeight: 600,
              }}
            >
              200+ Portfolio Cos · $600M+ AUM · Gurgaon · Mumbai · Bengaluru
            </span>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer
        style={{
          padding: "28px 32px",
          background: "#0A1929",
          color: "rgba(232,235,240,0.45)",
        }}
      >
        <div
          style={{
            ...maxW,
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            fontSize: 12,
          }}
        >
          <span>
            Data via NSE · Refreshed every 5 min during market hours
          </span>
          <span>
            © 2026 Trifecta Capital. For informational purposes only. Not
            investment advice. ·{" "}
            <a
              href="mailto:nei@trifectacapital.in"
              style={{ color: "rgba(232,235,240,0.55)", textDecoration: "none" }}
            >
              nei@trifectacapital.in
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
