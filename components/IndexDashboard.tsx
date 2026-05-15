"use client";

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
        borderRadius: 8,
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

// ─── Reference-frame helpers ──────────────────────────────────────────────────

function useMouseGlow<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let frame = 0;
    let targetX = 50;
    let targetY = 42;
    let currentX = 50;
    let currentY = 42;

    const tick = () => {
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;
      el.style.setProperty("--mx", `${currentX.toFixed(2)}%`);
      el.style.setProperty("--my", `${currentY.toFixed(2)}%`);

      if (Math.abs(targetX - currentX) > 0.1 || Math.abs(targetY - currentY) > 0.1) {
        frame = window.requestAnimationFrame(tick);
      } else {
        frame = 0;
      }
    };

    const handleMove = (event: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      targetX = ((event.clientX - rect.left) / rect.width) * 100;
      targetY = ((event.clientY - rect.top) / rect.height) * 100;
      if (!frame) frame = window.requestAnimationFrame(tick);
    };

    const handleLeave = () => {
      targetX = 50;
      targetY = 42;
      if (!frame) frame = window.requestAnimationFrame(tick);
    };

    el.style.setProperty("--mx", "50%");
    el.style.setProperty("--my", "42%");
    el.addEventListener("mousemove", handleMove);
    el.addEventListener("mouseleave", handleLeave);

    return () => {
      el.removeEventListener("mousemove", handleMove);
      el.removeEventListener("mouseleave", handleLeave);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return ref;
}

function KineticBackdrop() {
  return (
    <div aria-hidden="true" className="nei-kinetic-backdrop">
      <div className="nei-kinetic-sheen" />
      <div className="nei-kinetic-field" />
      <div className="nei-kinetic-glow" />
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
}: {
  from: string;
  to: string;
  label?: string;
  labelColor?: string;
}) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "relative",
        height: 56,
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

function HeroNav() {
  return (
    <header className="nei-v2-nav">
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <span
          style={{
            fontFamily: "var(--font-sora), var(--font-inter), system-ui, sans-serif",
            fontWeight: 600,
            fontSize: 16,
            letterSpacing: 0,
            color: "#F2F4F8",
          }}
        >
          Trifecta Capital
        </span>
        <span
          style={{
            fontFamily: "var(--font-jetbrains), ui-monospace, monospace",
            fontSize: 10,
            padding: "3px 8px",
            borderRadius: 5,
            background: "rgba(122,149,242,0.14)",
            color: "#A9C0FF",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            fontWeight: 600,
            border: "1px solid rgba(122,149,242,0.28)",
          }}
        >
          NEI
        </span>
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
    <div className="nei-ticker-drift" aria-label="Constituent ticker tape">
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
  const [constituentsView, setConstituentsView] = useState<"table" | "grid">("table");
  const heroRef = useMouseGlow<HTMLElement>();
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
  const dayChange = changePct ?? 0;
  const numCompanies = data?.numCompanies ?? COMPANIES.length;
  const stocks = data?.stocks ?? EMPTY_STOCKS;
  const lastUpdated = data?.lastUpdated ?? null;

  const sinceInception =
    indexValue !== null
      ? ((indexValue - INDEX_BASE_VALUE) / INDEX_BASE_VALUE) * 100
      : null;
  const sinceInceptionValue = sinceInception ?? 0;

  const advancers = stocks.filter((s) => (s.changePct ?? 0) > 0).length;
  const decliners = stocks.filter((s) => (s.changePct ?? 0) < 0).length;
  const unchanged = Math.max(0, numCompanies - advancers - decliners);

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
      }}
    >
      <section
        ref={heroRef}
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
        <TickFrame
          className="nei-hero-frame"
          inset={24}
          tone="paper"
          lineLen={90}
          corner={22}
          opacity={0.7}
          padded={false}
          style={{ position: "relative", zIndex: 3, minHeight: "94dvh" }}
        >
          <HeroNav />

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
              <span style={{ opacity: 0.5 }}>—</span>
              <span>NEI · equal-weighted</span>
              <span style={{ opacity: 0.5 }}>—</span>
              <span>{numCompanies} listings · since {inceptionLabel}</span>
            </div>

            <div className="nei-hero-grid">
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-jetbrains), ui-monospace, monospace",
                    fontSize: 11,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: "rgba(232,235,240,0.55)",
                    marginBottom: 20,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <span style={{ display: "inline-block", width: 28, height: 1, background: "rgba(232,235,240,0.45)" }} />
                  The New Economy Index
                </div>
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
                <TickFrame inset={0} tone="paper" lineLen={48} corner={14} opacity={0.45} padded={false}>
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
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 12,
                        marginBottom: 12,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontFamily: "var(--font-jetbrains), ui-monospace, monospace",
                            fontSize: 11,
                            letterSpacing: "0.18em",
                            textTransform: "uppercase",
                            color: "rgba(232,235,240,0.55)",
                            fontWeight: 600,
                            marginBottom: 6,
                          }}
                        >
                          NEI · Index Level
                        </div>
                        <div style={{ fontSize: 12, color: "rgba(232,235,240,0.58)" }}>
                          {open ? "Live" : "15:30 IST · close"} · updated {lastUpdatedLabel}
                        </div>
                      </div>
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
                        className="nei-mono"
                        style={{
                          fontSize: "clamp(56px, 8vw, 96px)",
                          fontWeight: 500,
                          letterSpacing: 0,
                          lineHeight: 0.95,
                          color: "#F2F4F8",
                          marginBottom: 6,
                        }}
                      >
                        {fmtNum(indexValue)}
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
                      ].map((item) => (
                        <div key={item.l}>
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

            <div className="nei-scroll-cue">
              <span />
              Scroll to explore
            </div>
          </div>
        </TickFrame>
        <TickerDrift stocks={stocks} />
      </section>

      <ShoulderDivider from="#172C54" to="var(--nei-bg)" label="performance" />

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
                l: "Advance/Decline",
                v: stocks.length > 0 ? `${advancers}/${decliners}/${unchanged}` : "—",
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
                    letterSpacing: 0,
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

      <ShoulderDivider from="var(--nei-accent)" to="#172C54" label="sectors" />

      {/* ─── §03 TODAY'S MARKET ─── */}
      <section
        id="sectors"
        style={{
          ...darkSectionVars,
          padding: "76px 32px 72px",
          background: "#172C54",
          color: "#E8EBF0",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(70% 50% at 50% 0%, rgba(169,192,255,0.13), transparent 64%), linear-gradient(180deg, rgba(7,11,22,0.05), rgba(7,11,22,0.28))",
            pointerEvents: "none",
          }}
        />
        <div style={{ ...maxW, position: "relative", zIndex: 1 }}>
          <SectionEyebrow n="03" label="Sectors & Movers" light />
          <h2
            className="nei-heading"
            style={{
              fontSize: "clamp(26px, 3vw, 36px)",
              fontWeight: 600,
              letterSpacing: 0,
              margin: "0 0 32px",
              lineHeight: 1.1,
              color: "#fff",
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
                  letterSpacing: 0,
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
                  letterSpacing: 0,
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
                  letterSpacing: 0,
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
                    borderRadius: 8,
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
                        letterSpacing: 0,
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
