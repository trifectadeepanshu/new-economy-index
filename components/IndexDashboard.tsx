"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useIndexData, type StockData } from "@/hooks/useIndexData";
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

// ─── Count-up animation ───────────────────────────────────────────────────────

function useCountUp(target: number | null): number | null {
  const [displayed, setDisplayed] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const fromRef = useRef<number>(INDEX_BASE_VALUE);

  useEffect(() => {
    if (target === null) return;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

    const from = fromRef.current;
    const isFirst = from === INDEX_BASE_VALUE;
    const duration = isFirst ? 1400 : 600;
    const easeExp = isFirst ? 4 : 2;
    const startTime = performance.now();

    const tick = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, easeExp);
      setDisplayed(from + (target - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplayed(target);
        fromRef.current = target;
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target]);

  return displayed;
}

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
      <path d={area} fill="url(#sparkGrad)" className="nei-spark-area" />
      <path
        d={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        pathLength="1"
        strokeDasharray="1"
        strokeDashoffset="1"
        className="nei-spark-line"
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
    <div style={{ display: "inline-flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
      <span
        style={{
          height: 1,
          width: 22,
          background: light ? "rgba(232,235,240,0.45)" : "rgba(11,15,25,0.35)",
        }}
      />
      <span
        style={{
          fontFamily: "var(--font-jetbrains), ui-monospace, monospace",
          fontSize: 11,
          fontWeight: 600,
          color: light ? "rgba(232,235,240,0.95)" : "var(--nei-accent)",
          letterSpacing: "0.14em",
        }}
      >
        §{n}
      </span>
      <span
        style={{
          fontFamily: "var(--font-jetbrains), ui-monospace, monospace",
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.14em",
          textTransform: "uppercase" as const,
          color: light ? "rgba(232,235,240,0.72)" : "rgba(11,15,25,0.6)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          height: 1,
          width: 36,
          background: light ? "rgba(232,235,240,0.45)" : "rgba(11,15,25,0.35)",
        }}
      />
    </div>
  );
}

function SectorComposition({
  stocks,
  totalListings,
}: {
  stocks: StockData[];
  totalListings: number;
}) {
  const sectors = useMemo(() => {
    const source =
      stocks.length > 0
        ? stocks
        : COMPANIES.map((company) => ({
            sector: company.sector,
            changePct: null,
          }));
    const total = source.length || totalListings || 1;
    const map = new Map<string, { count: number; changeTotal: number; changeCount: number }>();

    for (const row of source) {
      const item = map.get(row.sector) ?? { count: 0, changeTotal: 0, changeCount: 0 };
      item.count += 1;
      if (row.changePct !== null) {
        item.changeTotal += row.changePct;
        item.changeCount += 1;
      }
      map.set(row.sector, item);
    }

    return SECTORS.map((name) => {
      const item = map.get(name) ?? { count: 0, changeTotal: 0, changeCount: 0 };
      return {
        name,
        count: item.count,
        pct: (item.count / total) * 100,
        avgChange: item.changeCount ? item.changeTotal / item.changeCount : null,
      };
    })
      .filter((sector) => sector.count > 0)
      .sort((a, b) => b.pct - a.pct);
  }, [stocks, totalListings]);

  return (
    <div className="nei-sector-composition">
      {sectors.map((sector, index) => (
        <div className="nei-sector-row" key={sector.name}>
          <div className="nei-sector-row-top">
            <div className="nei-sector-row-title">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{sector.name}</strong>
              <em>{sector.count} {sector.count === 1 ? "listing" : "listings"}</em>
            </div>
            <div className="nei-sector-row-values">
              <span
                className={`nei-mono ${
                  (sector.avgChange ?? 0) >= 0 ? "is-positive" : "is-negative"
                }`}
              >
                {sector.avgChange !== null ? fmtPct(sector.avgChange) : "—"}
              </span>
              <strong className="nei-mono">{sector.pct.toFixed(1)}%</strong>
            </div>
          </div>
          <div className="nei-sector-track" aria-hidden="true">
            <span style={{ width: `${sector.pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Reference-frame helpers ──────────────────────────────────────────────────

function KineticBackdrop() {
  return (
    <div aria-hidden="true" className="nei-kinetic-backdrop">
      <div className="nei-kinetic-sheen" />
      <div className="nei-kinetic-field" />
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="nei-kinetic-grid"
      >
        <defs>
          <pattern id="nei-dot-grid" x="0" y="0" width="3.4" height="3.4" patternUnits="userSpaceOnUse">
            <circle cx="0.2" cy="0.2" r="0.18" fill="rgba(232,235,240,0.18)" />
          </pattern>
          <radialGradient id="nei-dot-mask" cx="50%" cy="40%" r="65%">
            <stop offset="0%" stopColor="white" stopOpacity="0.9" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <mask id="nei-dot-mask-ref">
            <rect x="0" y="0" width="100" height="100" fill="url(#nei-dot-mask)" />
          </mask>
        </defs>
        <rect x="0" y="0" width="100" height="100" fill="url(#nei-dot-grid)" mask="url(#nei-dot-mask-ref)" />
      </svg>
      <div className="nei-kinetic-vignette" />
    </div>
  );
}

function TickFrame({
  children,
  className,
  inset = 24,
  lineLen = 76,
  corner = 18,
  opacity = 0.55,
  padded = true,
  tone = "ink",
  style,
}: {
  children: ReactNode;
  className?: string;
  inset?: number;
  lineLen?: number;
  corner?: number;
  opacity?: number;
  padded?: boolean;
  tone?: "paper" | "ink";
  style?: CSSProperties;
}) {
  const color =
    tone === "paper"
      ? `rgba(232,235,240,${opacity})`
      : `rgba(11,15,25,${opacity * 0.85})`;
  const corners: CSSProperties[] = [
    { top: inset, left: inset, transform: "rotate(0deg)" },
    { top: inset, right: inset, transform: "rotate(90deg)" },
    { right: inset, bottom: inset, transform: "rotate(180deg)" },
    { bottom: inset, left: inset, transform: "rotate(270deg)" },
  ];

  return (
    <div className={className} style={{ position: "relative", ...style }}>
      {corners.map((position, i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{
            position: "absolute",
            width: lineLen,
            height: lineLen,
            pointerEvents: "none",
            zIndex: 1,
            ...position,
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              height: 1,
              width: lineLen,
              background: color,
            }}
          />
          <span
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 1,
              height: lineLen,
              background: color,
            }}
          />
          <span
            style={{
              position: "absolute",
              top: -corner / 2,
              left: -corner / 2,
              width: corner,
              height: corner,
              borderTop: `1px solid ${color}`,
              borderLeft: `1px solid ${color}`,
            }}
          />
        </span>
      ))}
      <div style={{ position: "relative", zIndex: 2, padding: padded ? inset + 22 : 0 }}>
        {children}
      </div>
    </div>
  );
}

function ShoulderDivider({
  from,
  to,
  label,
  labelColor = "rgba(232,235,240,0.45)",
  height = 56,
}: {
  from: string;
  to: string;
  label?: string;
  labelColor?: string;
  height?: number;
}) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "relative",
        height,
        background: from,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          clipPath: "polygon(0 100%, 100% 12%, 100% 100%, 0 100%)",
          background: to,
        }}
      />
      {label && (
        <div
          style={{
            position: "absolute",
            bottom: 8,
            left: "50%",
            transform: "translateX(-50%)",
            fontFamily: "var(--font-jetbrains), ui-monospace, monospace",
            fontSize: 10,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: labelColor,
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}

function HeroNav({ compact }: { compact: boolean }) {
  return (
    <header className={`nei-v2-nav${compact ? " is-compact" : ""}`}>
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
      <nav className="nei-v2-links" aria-label="Primary navigation">
        {[
          ["Performance", "#performance"],
          ["Constituents", "#constituents"],
          ["Sectors", "#sectors"],
          ["Methodology", "#methodology"],
        ].map(([label, href]) => (
          <a key={label} href={href}>
            {label}
          </a>
        ))}
        <a href="https://trifectacapital.in" target="_blank" rel="noopener noreferrer" className="nei-v2-nav-cta">
          trifectacapital.in ↗
        </a>
      </nav>
    </header>
  );
}

function TickerDrift({ stocks }: { stocks: StockData[] }) {
  const items = useMemo(() => {
    const rows = stocks.length
      ? stocks
      : COMPANIES.map((company) => ({
          ticker: company.ticker,
          price: null,
          changePct: null,
        }));

    return [...rows]
      .sort((a, b) => Math.abs(b.changePct ?? 0) - Math.abs(a.changePct ?? 0))
      .slice(0, 18)
      .map((row) => ({
        ticker: row.ticker,
        price: row.price,
        changePct: row.changePct,
      }));
  }, [stocks]);

  if (!items.length) return null;

  return (
    <div
      className="nei-ticker-drift"
      aria-label="Constituent ticker tape"
    >
      <div className="nei-ticker-track">
        {[...items, ...items].map((row, index) => (
          <span key={`${row.ticker}-${index}`} className="nei-ticker-chip">
            <span className="nei-ticker-symbol">{row.ticker}</span>
            <span className="nei-ticker-price">
              {row.price !== null ? row.price.toFixed(2) : "—"}
            </span>
            <span
              className="nei-ticker-change"
              style={{
                color:
                  (row.changePct ?? 0) >= 0
                    ? "var(--nei-pos-bright)"
                    : "var(--nei-neg-bright)",
              }}
            >
              {row.changePct !== null ? fmtPct(row.changePct) : "—"}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export function IndexDashboard() {
  const { data, isLoading } = useIndexData();
  const [sparkSeries, setSparkSeries] = useState<number[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [compactChrome, setCompactChrome] = useState(() =>
    typeof window === "undefined" ? false : window.scrollY > 36
  );
  const [valueFlash, setValueFlash] = useState<"" | "pos" | "neg">("");
  const [dataLoaded, setDataLoaded] = useState(false);
  const prevIndexRef = useRef<number | null>(null);
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
    const interval = open ? 10_000 : 60_000;
    const t = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(t);
  }, [open]);

  useEffect(() => {
    const updateChrome = () => setCompactChrome(window.scrollY > 36);
    window.addEventListener("scroll", updateChrome, { passive: true });
    return () => window.removeEventListener("scroll", updateChrome);
  }, []);

  const indexValue = data?.indexValue ?? null;
  const stocks = data?.stocks ?? EMPTY_STOCKS;

  useEffect(() => {
    if (indexValue === null) return;
    if (prevIndexRef.current !== null && prevIndexRef.current !== indexValue) {
      const dir = indexValue > prevIndexRef.current ? "pos" : "neg";
      setValueFlash(dir);
      const t = setTimeout(() => setValueFlash(""), 700);
      prevIndexRef.current = indexValue;
      return () => clearTimeout(t);
    }
    prevIndexRef.current = indexValue;
  }, [indexValue]);

  useEffect(() => {
    if (!dataLoaded && stocks.length > 0) setDataLoaded(true);
  }, [dataLoaded, stocks.length]);

  const changePct = data?.indexChangePct ?? null;
  const dayChange = changePct ?? 0;
  const numCompanies = data?.numCompanies ?? COMPANIES.length;
  const lastUpdated = data?.lastUpdated ?? null;

  const sinceInception =
    indexValue !== null
      ? ((indexValue - INDEX_BASE_VALUE) / INDEX_BASE_VALUE) * 100
      : null;
  const sinceInceptionValue = sinceInception ?? 0;

  const advancers = stocks.filter((s) => (s.changePct ?? 0) > 0).length;
  const decliners = stocks.filter((s) => (s.changePct ?? 0) < 0).length;

  const heroSeries = useMemo(() => {
    if (sparkSeries.length === 0) {
      return indexValue !== null ? [INDEX_BASE_VALUE, indexValue] : [];
    }

    if (indexValue === null) return sparkSeries;

    const last = sparkSeries[sparkSeries.length - 1];
    return Math.abs(last - indexValue) < 0.01 ? sparkSeries : [...sparkSeries, indexValue];
  }, [indexValue, sparkSeries]);

  const high52w = useMemo(
    () => (heroSeries.length > 0 ? Math.max(...heroSeries) : null),
    [heroSeries]
  );
  const low52w = useMemo(
    () => (heroSeries.length > 0 ? Math.min(...heroSeries) : null),
    [heroSeries]
  );

  const displayedValue = useCountUp(indexValue);

  const nowIST = new Date(now).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
  const lastUpdatedLabel = lastUpdated
    ? formatLastUpdated(lastUpdated, now)
    : open
      ? "live"
      : "last close";
  const heroStyle = {
    "--nei-pos": "#7DD89B",
    "--nei-neg": "#E89175",
    "--nei-grid": "rgba(232,235,240,0.10)",
    "--nei-grid-strong": "rgba(232,235,240,0.16)",
    "--nei-muted": "rgba(232,235,240,0.66)",
    "--nei-fg": "#F2F4F8",
  } as CSSProperties;
  const darkSectionVars = {
    "--nei-surface": "rgba(255,255,255,0.065)",
    "--nei-fg": "#F2F4F8",
    "--nei-muted": "rgba(232,235,240,0.68)",
    "--nei-muted-faint": "rgba(232,235,240,0.42)",
    "--nei-grid": "rgba(232,235,240,0.10)",
    "--nei-grid-strong": "rgba(232,235,240,0.16)",
    "--nei-hover": "rgba(232,235,240,0.06)",
    "--nei-chip": "rgba(232,235,240,0.08)",
    "--nei-card-shadow": "0 24px 60px rgba(7,11,22,0.28)",
    "--nei-pos": "#7DD89B",
    "--nei-neg": "#E89175",
    "--nei-accent": "#A9C0FF",
  } as CSSProperties;

  return (
    <div
      style={{
        background: "var(--nei-bg)",
        minHeight: "100vh",
        color: "var(--nei-fg)",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
        paddingTop: 40,
      }}
    >
      <TickerDrift stocks={stocks} />
      <section
        data-screen-label="01 Hero"
        style={{
          ...heroStyle,
          position: "relative",
          minHeight: "94dvh",
          background: "#172C54",
          color: "#E8EBF0",
          overflow: "hidden",
        }}
      >
        <KineticBackdrop />
        <div style={{ position: "relative", zIndex: 3, minHeight: "94dvh" }}>
          <HeroNav compact={compactChrome} />

          <div className="nei-hero-inner">
            <div className="nei-hero-meta">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 999,
                    background: open ? "#5FBE7E" : "rgba(232,235,240,0.45)",
                    boxShadow: open ? "0 0 0 0 rgba(95,190,126,0.6)" : "none",
                    animation: open ? "nei-live-pulse 2.2s ease-out infinite" : "none",
                  }}
                />
                Market {open ? "open" : "closed"} · {nowIST}
              </span>
            </div>

            <div className="nei-hero-grid">
              <div>
                <h1
                  className="nei-heading"
                  style={{
                    fontWeight: 500,
                    fontSize: "clamp(40px, 5.6vw, 76px)",
                    lineHeight: 0.98,
                    letterSpacing: 0,
                    margin: "0 0 28px",
                    color: "#F2F4F8",
                    maxWidth: 720,
                  }}
                >
                  India&apos;s new economy,
                  <br />
                  <span style={{ color: "rgba(232,235,240,0.55)" }}>
                    tracked as a single ticker.
                  </span>
                </h1>
                <p
                  style={{
                    fontSize: 17,
                    lineHeight: 1.55,
                    color: "rgba(232,235,240,0.72)",
                    maxWidth: 540,
                    margin: 0,
                  }}
                >
                  {numCompanies} VC-backed Indian companies that have listed on
                  public markets, weighted equally and rebalanced quarterly.
                  Built by Trifecta Capital — backers of this asset class since 2015.
                </p>

                <div style={{ display: "flex", gap: 10, marginTop: 36, flexWrap: "wrap" }}>
                  <a className="nei-hero-primary" href="#performance">
                    See performance
                    <span style={{ opacity: 0.55 }}>→</span>
                  </a>
                  <a className="nei-hero-secondary" href="#constituents">
                    All {numCompanies} constituents
                  </a>
                </div>
              </div>

              <div style={{ position: "relative" }}>
                <TickFrame inset={0} tone="paper" lineLen={32} corner={10} opacity={0.35} padded={false}>
                  <div className="nei-hero-card">
                    {data?.isStale && (
                      <div
                        style={{
                          background: "rgba(232,145,117,0.10)",
                          border: "1px solid rgba(232,145,117,0.28)",
                          borderRadius: 8,
                          padding: "7px 12px",
                          fontSize: 12,
                          color: "#E89175",
                          marginBottom: 14,
                        }}
                      >
                        Showing last market close · live prices unavailable
                      </div>
                    )}

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        alignItems: "flex-start",
                        gap: 12,
                        marginBottom: 12,
                      }}
                    >
                      {changePct !== null && (
                        <span
                          style={{
                            fontFamily: "var(--font-jetbrains), ui-monospace, monospace",
                            fontSize: 12,
                            fontWeight: 600,
                            padding: "4px 10px",
                            borderRadius: 999,
                            color: dayChange >= 0 ? "#7DD89B" : "#E89175",
                            background:
                              dayChange >= 0
                                ? "rgba(95,190,126,0.10)"
                                : "rgba(221,122,78,0.10)",
                            border:
                              dayChange >= 0
                                ? "1px solid rgba(95,190,126,0.28)"
                                : "1px solid rgba(221,122,78,0.28)",
                            flexShrink: 0,
                          }}
                        >
                          {fmtPct(dayChange)}
                        </span>
                      )}
                    </div>

                    {isLoading && indexValue === null ? (
                      <div style={{ margin: "8px 0 10px" }}>
                        <Skeleton h={82} r={8} />
                      </div>
                    ) : (
                      <div
                        className={`nei-mono${valueFlash ? ` nei-value-flash-${valueFlash}` : ""}`}
                        style={{
                          fontSize: "clamp(56px, 8vw, 96px)",
                          fontWeight: 500,
                          letterSpacing: 0,
                          lineHeight: 0.95,
                          color: "#F2F4F8",
                          marginBottom: 6,
                          display: "flex",
                          alignItems: "baseline",
                          gap: 2,
                        }}
                      >
                        {fmtNum(displayedValue ?? indexValue)}
                        {open && (
                          <span
                            aria-hidden="true"
                            className="nei-live-cursor"
                          />
                        )}
                      </div>
                    )}

                    {sinceInception !== null && (
                      <div style={{ fontSize: 13, color: "rgba(232,235,240,0.62)", marginBottom: 22 }}>
                        <span
                          className="nei-mono"
                          style={{
                            color: sinceInceptionValue >= 0 ? "#7DD89B" : "#E89175",
                            fontWeight: 600,
                          }}
                        >
                          {fmtPct(sinceInceptionValue)}
                        </span>{" "}
                        since inception · base 1,000
                      </div>
                    )}

                    <div style={{ height: 82, margin: "0 -8px 18px" }}>
                      {heroSeries.length > 1 ? (
                        <Sparkline series={heroSeries} height={82} />
                      ) : (
                        <Skeleton h={82} r={6} />
                      )}
                    </div>

                    <div className="nei-hero-card-stats">
                      {[
                        { l: "52W High", v: high52w !== null ? fmtNum(high52w, 0) : "—" },
                        { l: "52W Low", v: low52w !== null ? fmtNum(low52w, 0) : "—" },
                        { l: "Adv", v: stocks.length > 0 ? advancers : "—", c: "#7DD89B" },
                        { l: "Dec", v: stocks.length > 0 ? decliners : "—", c: "#E89175" },
                      ].map((item, idx) => (
                        <div
                          key={item.l}
                          style={dataLoaded ? {
                            animation: `nei-stat-reveal 0.4s ease-out ${idx * 90}ms both`,
                          } : { opacity: 0 }}
                        >
                          <div className="nei-hero-stat-label">{item.l}</div>
                          <div
                            className="nei-mono"
                            style={{
                              fontSize: 18,
                              fontWeight: 500,
                              color: item.c ?? "#E8EBF0",
                              letterSpacing: 0,
                            }}
                          >
                            {item.v}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TickFrame>
              </div>
            </div>

          </div>
        </div>
      </section>

      <ShoulderDivider from="#172C54" to="var(--nei-bg)" height={64} />

      {/* ─── §02 PERFORMANCE ─── */}
      <section id="performance" className="nei-reference-section">
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
            <SectionEyebrow n="02" label="Performance" />
            <div className="nei-reference-header">
              <h2 className="nei-heading nei-reference-title">
                How the index has moved
                <span> since inception.</span>
              </h2>
              <p className="nei-reference-copy">
                Equal-weighted, base 1,000 on {inceptionLabel}. Hover the chart
                to inspect any day. Rebalanced quarterly to keep the cohort honest.
              </p>
            </div>
            <IndexChart liveValue={indexValue} stocks={stocks} variant="reference" />
          </div>
        </TickFrame>
      </section>

      <ShoulderDivider from="var(--nei-bg)" to="#172C54" height={72} label="Inside the Index" />

      {/* ─── §03 INSIDE THE INDEX ─── */}
      <section
        id="constituents"
        className="nei-index-section"
        style={{
          ...darkSectionVars,
          background: "#172C54",
          color: "#E8EBF0",
        }}
      >
        <div
          aria-hidden="true"
          className="nei-index-section-glow"
        />
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
            <SectionEyebrow n="03" label="Inside the Index" light />
            <div className="nei-index-header">
              <h2 className="nei-heading nei-index-title">
                {numCompanies} listings.
                <span> One asset class.</span>
              </h2>
              <p className="nei-index-copy">
                Search and filter the listed cohort by sector, then sort the table
                by price, daily move, or performance since the index base.
              </p>
            </div>
            <div className="nei-index-panel">
              <CompanyGrid
                stocks={stocks}
                isLoading={isLoading}
                view="table"
                showToggle={false}
                variant="terminal"
              />
            </div>
          </div>
        </TickFrame>
      </section>

      <ShoulderDivider from="#172C54" to="var(--nei-bg)" height={64} />

      {/* ─── §04 SECTOR COMPOSITION ─── */}
      <section id="sectors" className="nei-reference-section">
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
            <SectionEyebrow n="04" label="Sector Composition" />
            <div className="nei-reference-header">
              <h2 className="nei-heading nei-reference-title">
                What India&apos;s public new economy
                <span> is actually made of.</span>
              </h2>
              <p className="nei-reference-copy">
                Each sector shown as a share of listed constituents in the equal-weighted
                cohort. Movement shown is the cohort-average for today.
              </p>
            </div>
            <SectorComposition stocks={stocks} totalListings={numCompanies} />
          </div>
        </TickFrame>
      </section>

      <ShoulderDivider from="var(--nei-bg)" to="#172C54" height={72} label="Methodology" />

      {/* ─── §05 WHY WE BUILT THIS ─── */}
      <section
        id="methodology"
        className="nei-method-section"
        style={{ ...darkSectionVars }}
      >
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
            <SectionEyebrow n="05" label="Why we built this" light />
            <div className="nei-method-grid">
              <div>
                <h2 className="nei-heading nei-method-title">
                  A benchmark for the cohort
                  <span> we underwrote.</span>
                </h2>
                <p className="nei-method-copy">
                  Trifecta launched India&apos;s first venture debt fund in 2015.
                  A decade later many of those companies are publicly listed.
                  The NEI tracks them as a single asset class from the seat that
                  watched it form.
                </p>
                <div className="nei-method-stats">
                  {[
                    { l: "Portfolio companies", v: "200+" },
                    { l: "AUM", v: "$600M+" },
                    { l: "Years", v: "10+" },
                    { l: "Listings tracked", v: numCompanies },
                  ].map((stat) => (
                    <div key={stat.l}>
                      <span>{stat.l}</span>
                      <strong className="nei-mono">{stat.v}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="nei-method-cards">
                {[
                  {
                    n: "01",
                    t: "Equal-weighted, by design",
                    b: "No single constituent dominates the read. Each company contributes 1/n of the index value, then the cohort is rebalanced quarterly.",
                  },
                  {
                    n: "02",
                    t: `${numCompanies} listings, one number`,
                    b: "Platforms, consumer brands, fintech, B2B, BFSI, software, and other public-market expressions of India's new economy.",
                  },
                  {
                    n: "03",
                    t: "Built from our seat",
                    b: "200+ portfolio companies. $600M+ AUM. Trifecta has been at the center of this asset class for a decade.",
                  },
                  {
                    n: "04",
                    t: "Free, public, shareable",
                    b: "No paywall, no login. Use it for screenshots, decks, internal MIS, or just to check the level. Data is informational only.",
                  },
                ].map((card) => (
                  <div key={card.n} className="nei-method-card">
                    <span className="nei-mono">§{card.n}</span>
                    <div>
                      <h3>{card.t}</h3>
                      <p>{card.b}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TickFrame>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="nei-footer-v2">
        <TickFrame inset={32} tone="paper" lineLen={36} corner={12} opacity={0.3} padded={false}>
          <div className="nei-footer-inner">
            <div className="nei-footer-top">
              <div className="nei-footer-brand">
                <Image
                  src="/trifecta-capital-logo.png"
                  alt="Trifecta Capital"
                  width={166}
                  height={48}
                  className="nei-footer-logo"
                />
                <span>NEI</span>
              </div>
              <p>
                Data via NSE · refreshed every 5 min during market hours.
                © 2026 Trifecta Capital. The New Economy Index is for
                informational purposes only, not investment advice.
              </p>
              <div className="nei-footer-links">
                <div>
                  <strong>The Index</strong>
                  <a href="#performance">Performance</a>
                  <a href="#constituents">Constituents</a>
                  <a href="#sectors">Sectors</a>
                  <a href="#methodology">Methodology</a>
                </div>
                <div>
                  <strong>Trifecta</strong>
                  <a href="https://trifectacapital.in" target="_blank" rel="noopener noreferrer">
                    trifectacapital.in ↗
                  </a>
                  <a href="mailto:nei@trifectacapital.in">nei@trifectacapital.in</a>
                </div>
              </div>
            </div>
            <div className="nei-footer-bottom">
              <span>NEI · v2.4 · 2015 → 2026</span>
              <span>Gurgaon · Mumbai · Bengaluru</span>
            </div>
          </div>
        </TickFrame>
      </footer>
    </div>
  );
}
