"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SECTORS, type Sector } from "@/lib/companies";
import type { IndexHistoryPayload, SectorHistoryPoint } from "@/lib/index-api";
import { SECTOR_CHART_COLORS } from "@/components/index-chart/constants";

function monthLabel(date: string): string {
  const d = new Date(date);
  return `${d.toLocaleDateString("en-US", { month: "short" })} '${String(d.getUTCFullYear()).slice(2)}`;
}

/** One sector sub-index chart at a time, switched via the sector selector. */
export function SectorCharts() {
  const [points, setPoints] = useState<SectorHistoryPoint[]>([]);
  const [selected, setSelected] = useState<Sector>("Platforms");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/index/history?range=1Y&includeSectors=1", { signal: controller.signal })
      .then((r) => (r.ok ? (r.json() as Promise<IndexHistoryPayload>) : Promise.reject()))
      .then((json) => setPoints(json.sectorData ?? []))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const series = useMemo(
    () =>
      points
        .filter((p) => p.sector === selected)
        .map((p) => ({ date: p.date, label: monthLabel(p.date), value: p.value })),
    [points, selected]
  );

  const latest = series.at(-1)?.value;
  const first = series[0]?.value;
  const chg = latest != null && first ? (latest / first - 1) * 100 : null;
  const color = SECTOR_CHART_COLORS[selected];

  return (
    <div className="nei-sector-single">
      <div className="nei-sector-tabs-row" role="tablist" aria-label="Sector">
        {SECTORS.map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={s === selected}
            className={`nei-sector-tab${s === selected ? " is-active" : ""}`}
            onClick={() => setSelected(s)}
          >
            <span className="nei-sector-tab-dot" style={{ background: SECTOR_CHART_COLORS[s] }} />
            {s}
          </button>
        ))}
      </div>

      <div className="nei-sector-single-head">
        <strong>{selected}</strong>
        {latest != null && (
          <span className="nei-mono nei-sector-single-val">
            {Math.round(latest).toLocaleString("en-IN")}
          </span>
        )}
        {chg != null && (
          <span className={`nei-mono nei-sector-single-chg ${chg >= 0 ? "is-pos" : "is-neg"}`}>
            {chg >= 0 ? "+" : ""}
            {chg.toFixed(1)}% · 1Y
          </span>
        )}
      </div>

      <div className="nei-sector-single-chart">
        {series.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 10, right: 18, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,15,25,0.06)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "rgba(11,15,25,0.45)", fontFamily: "var(--font-inter), system-ui" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={44}
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fontSize: 11, fill: "rgba(11,15,25,0.45)", fontFamily: "var(--font-jetbrains), ui-monospace, monospace" }}
                axisLine={false}
                tickLine={false}
                width={50}
                tickFormatter={(v: number) => Math.round(v).toLocaleString("en-IN")}
              />
              <Tooltip
                contentStyle={{
                  background: "#0D1E3A",
                  border: "1px solid rgba(232,235,240,0.12)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: "rgba(232,235,240,0.55)", fontSize: 11 }}
                itemStyle={{ color: "#FFFFFF" }}
                formatter={(v) => [Math.round(Number(v)).toLocaleString("en-IN"), selected]}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2.2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="nei-cm-nodata">Loading…</p>
        )}
      </div>
    </div>
  );
}
