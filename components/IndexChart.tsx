"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import { INDEX_BASE_VALUE } from "@/lib/companies";

type Range = "1W" | "1M" | "1Y" | "ALL";
const RANGES: Range[] = ["1W", "1M", "1Y", "ALL"];

interface HistoryPoint {
  date: string;
  value: number;
}

interface ChartPoint {
  date: string;
  value: number;
}

function formatLabel(date: string, range: Range): string {
  const pattern = range === "1W" || range === "1M" ? "dd MMM" : "MMM ''yy";
  return format(parseISO(date), pattern);
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const v = payload[0]?.value;
  if (v == null) return null;
  const pctFromBase = ((v - INDEX_BASE_VALUE) / INDEX_BASE_VALUE) * 100;

  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid var(--nei-grid-strong)",
        padding: "9px 12px",
        borderRadius: 9,
        fontSize: 12,
        boxShadow: "var(--nei-card-shadow)",
        minWidth: 130,
      }}
    >
      <div
        style={{
          color: "var(--nei-muted)",
          fontSize: 10,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 5,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-jetbrains), ui-monospace, monospace",
          fontSize: 18,
          fontWeight: 600,
          color: "var(--nei-fg)",
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.01em",
        }}
      >
        {v.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </div>
      <div
        style={{
          fontFamily: "var(--font-jetbrains), ui-monospace, monospace",
          fontSize: 12,
          marginTop: 3,
          color: pctFromBase >= 0 ? "var(--nei-pos)" : "var(--nei-neg)",
        }}
      >
        {pctFromBase >= 0 ? "+" : ""}
        {pctFromBase.toFixed(2)}%{" "}
        <span style={{ color: "var(--nei-muted)" }}>from base</span>
      </div>
    </div>
  );
}

export function IndexChart({ liveValue }: { liveValue: number | null }) {
  const [range, setRange] = useState<Range>("1Y");
  const [historyData, setHistoryData] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/index/history?range=${range}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((json) => {
        setHistoryData(json.data ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => controller.abort();
  }, [range]);

  const chartData = useMemo<ChartPoint[]>(() => {
    const pts = historyData.map((p) => ({
      date: formatLabel(p.date, range),
      value: Number(p.value),
    }));
    if (liveValue !== null && pts.length > 0) {
      return [...pts, { date: "Now", value: liveValue }];
    }
    return pts;
  }, [historyData, liveValue, range]);

  return (
    <div style={{ marginTop: 20 }}>
      {/* Range toggle */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            padding: 4,
            background: "var(--nei-chip)",
            borderRadius: 10,
            gap: 2,
          }}
        >
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => {
                if (r !== range) {
                  setLoading(true);
                  setRange(r);
                }
              }}
              style={{
                padding: "6px 14px",
                fontFamily:
                  "var(--font-jetbrains), ui-monospace, monospace",
                fontSize: 11,
                letterSpacing: "0.04em",
                fontWeight: 500,
                background: range === r ? "#FFFFFF" : "transparent",
                color: range === r ? "var(--nei-fg)" : "var(--nei-muted)",
                border: "none",
                borderRadius: 7,
                cursor: "pointer",
                boxShadow:
                  range === r ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                transition: "all 100ms",
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div
          style={{
            height: 320,
            background: "rgba(16,24,38,0.04)",
            borderRadius: 8,
            animation: "nei-pulse 1.8s ease-in-out infinite",
          }}
        />
      ) : chartData.length === 0 ? (
        <div
          style={{
            height: 320,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--nei-muted)",
            fontSize: 13,
          }}
        >
          No historical data yet — run the backfill script to populate history.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart
            data={chartData}
            margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient id="neiAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1E3A5F" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#1E3A5F" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(16,24,38,0.05)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{
                fill: "rgba(16,24,38,0.42)",
                fontSize: 11,
                fontFamily: "var(--font-inter), system-ui",
              }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={["auto", "auto"]}
              tick={{
                fill: "rgba(16,24,38,0.42)",
                fontSize: 11,
                fontFamily:
                  "var(--font-jetbrains), ui-monospace, monospace",
              }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) =>
                v.toLocaleString("en-IN", { maximumFractionDigits: 0 })
              }
              width={54}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={INDEX_BASE_VALUE}
              stroke="rgba(16,24,38,0.12)"
              strokeDasharray="4 4"
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="none"
              fill="url(#neiAreaGrad)"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#1E3A5F"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              activeDot={{
                r: 4,
                fill: "#1E3A5F",
                stroke: "#FFFFFF",
                strokeWidth: 2,
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
