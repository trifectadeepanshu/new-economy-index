"use client";

import Image from "next/image";
import { useMemo, useState, type CSSProperties } from "react";
import { COMPANIES } from "@/lib/companies";

const LOGO_ASSETS: Record<string, { width: number; height: number }> = {
  AADHARHFC:  { width: 500, height: 192 },
  AMAGI:      { width: 64,  height: 64  },
  AWFIS:      { width: 64,  height: 64  },
  BIKAJI:     { width: 64,  height: 64  },
  BLACKBUCK:  { width: 64,  height: 64  },
  BLUESTONE:  { width: 64,  height: 64  },
  CARTRADE:   { width: 64,  height: 64  },
  DELHIVERY:  { width: 64,  height: 64  },
  ETERNAL:    { width: 64,  height: 64  },
  FIVESTAR:   { width: 500, height: 160 },
  GODIGIT:    { width: 64,  height: 64  },
  HOMEFIRST:  { width: 48,  height: 48  },
  HONASA:     { width: 64,  height: 64  },
  IDEAFORGE:  { width: 48,  height: 48  },
  INDIAMART:  { width: 64,  height: 64  },
  INDIGOPNTS: { width: 64,  height: 64  },
  INDIQUBE:   { width: 64,  height: 64  },
  IXIGO:      { width: 64,  height: 64  },
  KISSHT:     { width: 48,  height: 48  },
  LENSKART:   { width: 64,  height: 64  },
  MAPMYINDIA: { width: 64,  height: 64  },
  NAUKRI:     { width: 64,  height: 64  },
  NAZARA:     { width: 64,  height: 64  },
  NORTHARC:   { width: 48,  height: 48  },
  NYKAA:      { width: 64,  height: 64  },
  POLICYBZR:  { width: 48,  height: 48  },
  PWL:        { width: 64,  height: 64  },
  RATEGAIN:   { width: 64,  height: 64  },
  SEDEMAC:    { width: 650, height: 220 },
  SWIGGY:     { width: 64,  height: 64  },
  TBOTEK:     { width: 48,  height: 48  },
  TRACXN:     { width: 64,  height: 64  },
  URBANCO:    { width: 64,  height: 64  },
  ZAGGLE:     { width: 64,  height: 64  },
};

interface StockData {
  ticker: string;
  name: string;
  sector: string;
  price: number | null;
  changePct: number | null;
  ratio: number | null;
}

interface Props {
  stocks: StockData[];
  isLoading: boolean;
  view?: "table" | "grid";
  onViewChange?: (v: "table" | "grid") => void;
}

// Deterministic hue from ticker string
function tickerHue(ticker: string): number {
  let h = 0;
  for (let i = 0; i < ticker.length; i++) h = (h * 31 + ticker.charCodeAt(i)) % 360;
  return h;
}

function CompanyLogo({
  ticker,
  name,
  size = 40,
}: {
  ticker: string;
  name: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const logo = LOGO_ASSETS[ticker];
  const wideLogo = logo ? logo.width / logo.height > 1.8 : false;
  const initials = name
    .replace(/\([^)]*\)/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const h = tickerHue(ticker);
  const tileStyle: CSSProperties = {
    width: size,
    height: size,
    borderRadius: Math.max(8, Math.round(size * 0.25)),
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid var(--nei-grid-strong)",
    background: "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.72)",
    overflow: "hidden",
  };

  if (logo && !failed) {
    return (
      <div style={tileStyle}>
        <Image
          src={`/logos/${ticker}.png`}
          alt=""
          width={logo.width}
          height={logo.height}
          sizes="40px"
          style={{
            maxWidth: wideLogo ? size * 0.84 : size * 0.7,
            maxHeight: size * 0.7,
            width: "auto",
            height: "auto",
            objectFit: "contain",
          }}
          onError={() => setFailed(true)}
          unoptimized
        />
      </div>
    );
  }

  return (
    <div style={tileStyle}>
      <span
        style={{
          width: size * 0.68,
          height: size * 0.68,
          borderRadius: Math.max(6, Math.round(size * 0.18)),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `oklch(0.94 0.025 ${h})`,
          color: `oklch(0.28 0.07 ${h})`,
          fontFamily: "var(--font-sora), var(--font-inter), system-ui",
          fontWeight: 600,
          fontSize: Math.max(10, Math.round(size * 0.31)),
          letterSpacing: "-0.01em",
          lineHeight: 1,
        }}
      >
        {initials}
      </span>
    </div>
  );
}

// ─── Table view ───────────────────────────────────────────────────────────────

type SortKey = "ticker" | "name" | "sector" | "price" | "changePct" | "ratio";

function TableView({ stocks }: { stocks: StockData[] }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({
    key: "changePct",
    dir: -1,
  });
  const [q, setQ] = useState("");

  const sorted = useMemo(() => {
    const filtered = stocks.filter((r) => {
      if (!q) return true;
      const Q = q.toLowerCase();
      return (
        r.ticker.toLowerCase().includes(Q) ||
        r.name.toLowerCase().includes(Q) ||
        r.sector.toLowerCase().includes(Q)
      );
    });
    return [...filtered].sort((a, b) => {
      const va = a[sort.key];
      const vb = b[sort.key];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "string" && typeof vb === "string") {
        return sort.dir * va.localeCompare(vb);
      }
      return sort.dir * ((va as number) - (vb as number));
    });
  }, [stocks, sort, q]);

  const toggleSort = (key: SortKey) => {
    setSort((s) =>
      s.key === key
        ? { key, dir: (s.dir === 1 ? -1 : 1) as 1 | -1 }
        : { key, dir: -1 }
    );
  };

  const cols: {
    key: SortKey;
    label: string;
    align: "left" | "right";
    w: string;
  }[] = [
    { key: "ticker",    label: "Ticker",     align: "left",  w: "90px"  },
    { key: "name",      label: "Company",    align: "left",  w: "auto"  },
    { key: "sector",    label: "Sector",     align: "left",  w: "130px" },
    { key: "price",     label: "Price",      align: "right", w: "110px" },
    { key: "changePct", label: "Day %",      align: "right", w: "90px"  },
    { key: "ratio",     label: "Since base", align: "right", w: "110px" },
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 12, color: "var(--nei-muted)" }}>
          Showing {sorted.length} of {stocks.length}
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter by ticker, company, sector…"
          style={{
            background: "var(--nei-chip)",
            border: "1px solid var(--nei-grid-strong)",
            color: "var(--nei-fg)",
            padding: "7px 12px",
            fontSize: 12,
            fontFamily: "var(--font-inter), system-ui",
            borderRadius: 8,
            outline: "none",
            width: 260,
            maxWidth: "100%",
          }}
        />
      </div>
      <div
        style={{
          overflowX: "auto",
          border: "1px solid var(--nei-grid-strong)",
          borderRadius: "var(--nei-radius-sm)",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13,
            minWidth: 580,
          }}
        >
          <thead>
            <tr>
              {cols.map((c) => (
                <th
                  key={c.key}
                  onClick={() => toggleSort(c.key)}
                  style={{
                    textAlign: c.align,
                    padding: "11px 14px",
                    fontWeight: 600,
                    fontSize: 10,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color:
                      sort.key === c.key ? "var(--nei-fg)" : "var(--nei-muted)",
                    cursor: "pointer",
                    userSelect: "none",
                    borderBottom: "1px solid var(--nei-grid-strong)",
                    width: c.w,
                    whiteSpace: "nowrap",
                    background: "var(--nei-surface)",
                    fontFamily: "var(--font-inter), system-ui",
                  }}
                >
                  {c.label}{" "}
                  <span style={{ opacity: sort.key === c.key ? 1 : 0.3 }}>
                    {sort.key === c.key ? (sort.dir === 1 ? "↑" : "↓") : "↕"}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => {
              const sinceBase =
                r.ratio !== null ? (r.ratio - 1) * 100 : null;
              const isLast = i === sorted.length - 1;
              return (
                <tr
                  key={r.ticker}
                  style={{
                    borderBottom: isLast
                      ? "none"
                      : "1px solid var(--nei-grid)",
                    transition: "background 80ms",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--nei-hover)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <td
                    style={{
                      padding: "10px 14px",
                      fontFamily:
                        "var(--font-jetbrains), ui-monospace, monospace",
                      fontWeight: 600,
                      fontSize: 12,
                      letterSpacing: "0.03em",
                      color: "var(--nei-fg)",
                    }}
                  >
                    {r.ticker}
                  </td>
                  <td
                    style={{
                      padding: "10px 14px",
                      color: "var(--nei-fg)",
                      fontSize: 13,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        minWidth: 0,
                      }}
                    >
                      <CompanyLogo ticker={r.ticker} name={r.name} size={30} />
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r.name}
                      </span>
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "10px 14px",
                      color: "var(--nei-muted)",
                      fontSize: 12,
                    }}
                  >
                    {r.sector}
                  </td>
                  <td
                    style={{
                      padding: "10px 14px",
                      textAlign: "right",
                      fontFamily:
                        "var(--font-jetbrains), ui-monospace, monospace",
                      fontVariantNumeric: "tabular-nums",
                      color: "var(--nei-fg)",
                    }}
                  >
                    {r.price !== null
                      ? `₹${r.price.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`
                      : "—"}
                  </td>
                  <td
                    style={{
                      padding: "10px 14px",
                      textAlign: "right",
                      fontFamily:
                        "var(--font-jetbrains), ui-monospace, monospace",
                      fontWeight: 600,
                      color:
                        (r.changePct ?? 0) >= 0
                          ? "var(--nei-pos)"
                          : "var(--nei-neg)",
                    }}
                  >
                    {r.changePct !== null
                      ? (r.changePct >= 0 ? "+" : "") +
                        r.changePct.toFixed(2) +
                        "%"
                      : "—"}
                  </td>
                  <td
                    style={{
                      padding: "10px 14px",
                      textAlign: "right",
                      fontFamily:
                        "var(--font-jetbrains), ui-monospace, monospace",
                      fontWeight: 600,
                      color:
                        sinceBase !== null
                          ? sinceBase >= 0
                            ? "var(--nei-pos)"
                            : "var(--nei-neg)"
                          : "var(--nei-muted)",
                    }}
                  >
                    {sinceBase !== null
                      ? (sinceBase >= 0 ? "+" : "") +
                        sinceBase.toFixed(1) +
                        "%"
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Card view ────────────────────────────────────────────────────────────────

function CardView({ stocks }: { stocks: StockData[] }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
        gap: 12,
      }}
    >
      {stocks.map((r) => {
        const company = COMPANIES.find((c) => c.ticker === r.ticker);
        const listedYear = company?.listedDate.slice(0, 4) ?? "";
        const isUp = (r.changePct ?? 0) >= 0;
        const displayName =
          r.name.replace(/\([^)]*\)/g, "").trim() || r.name;

        return (
          <div
            key={r.ticker}
            style={{
              border: "1px solid var(--nei-grid-strong)",
              borderRadius: "var(--nei-radius-sm)",
              padding: "16px 18px 14px",
              background: "var(--nei-surface)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              transition: "border-color 100ms",
              cursor: "default",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.borderColor = "var(--nei-accent)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.borderColor = "var(--nei-grid-strong)")
            }
          >
            {/* Logo + name */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <CompanyLogo ticker={r.ticker} name={r.name} />
              <div style={{ minWidth: 0 }}>
                <div
                  className="nei-heading"
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    letterSpacing: "-0.01em",
                    lineHeight: 1.2,
                    color: "var(--nei-fg)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {displayName}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontFamily:
                      "var(--font-jetbrains), ui-monospace, monospace",
                    color: "var(--nei-muted)",
                    letterSpacing: "0.03em",
                    marginTop: 2,
                  }}
                >
                  {r.ticker}
                  {listedYear && (
                    <span
                      style={{
                        marginLeft: 6,
                        color: "var(--nei-muted-faint)",
                      }}
                    >
                      · {listedYear}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Price + change */}
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                paddingTop: 10,
                borderTop: "1px solid var(--nei-grid)",
              }}
            >
              <span
                className="nei-mono"
                style={{
                  fontSize: 17,
                  color: "var(--nei-fg)",
                  letterSpacing: "-0.01em",
                }}
              >
                {r.price !== null
                  ? `₹${r.price.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
                  : "—"}
              </span>
              <span
                className="nei-mono"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: isUp ? "var(--nei-pos)" : "var(--nei-neg)",
                }}
              >
                {r.changePct !== null
                  ? (r.changePct >= 0 ? "+" : "") +
                    r.changePct.toFixed(2) +
                    "%"
                  : "—"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── View toggle ──────────────────────────────────────────────────────────────

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

// ─── Main export ──────────────────────────────────────────────────────────────

export function CompanyGrid({ stocks, isLoading, view: externalView, onViewChange }: Props) {
  const [internalView, setInternalView] = useState<"table" | "grid">("table");
  const view = externalView ?? internalView;
  const setView = onViewChange ?? setInternalView;
  const showToggle = externalView === undefined;

  if (isLoading && stocks.length === 0) {
    return (
      <div>
        {showToggle && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: 16,
            }}
          >
            <ViewToggle value={view} onChange={setView} />
          </div>
        )}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
            gap: 12,
          }}
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: 96,
                background: "var(--nei-chip)",
                borderRadius: "var(--nei-radius-sm)",
                animation: "nei-pulse 1.8s ease-in-out infinite",
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {showToggle && (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: 16,
          }}
        >
          <ViewToggle value={view} onChange={setView} />
        </div>
      )}
      {view === "table" ? (
        <TableView stocks={stocks} />
      ) : (
        <CardView stocks={stocks} />
      )}
    </div>
  );
}
