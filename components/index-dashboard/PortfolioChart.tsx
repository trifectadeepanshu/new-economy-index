"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { INDEX_BASE_VALUE } from "@/lib/companies";
import { formatLabel } from "@/components/index-chart/format";
import type { HistoryRange, IndexHistoryPayload, IndexHistoryPoint } from "@/lib/index-api";

type PortfolioPoint = {
  date: string;
  label: string;
  nei: number | null;
  portfolio: number | null;
};

function buildChartData(
  neiData: IndexHistoryPoint[],
  portfolioData: IndexHistoryPoint[],
  liveNeiValue: number | null,
  range: HistoryRange
): PortfolioPoint[] {
  const byDate = new Map<string, PortfolioPoint>();

  for (const p of neiData) {
    byDate.set(p.date, { date: p.date, label: formatLabel(p.date, range), nei: p.value, portfolio: null });
  }
  for (const p of portfolioData) {
    const existing = byDate.get(p.date);
    if (existing) {
      existing.portfolio = p.value;
    } else {
      byDate.set(p.date, { date: p.date, label: formatLabel(p.date, range), nei: null, portfolio: p.value });
    }
  }

  const points = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));

  // Append live NEI value — it uses the same ratio-based methodology as the
  // historical NEI series so the scale is consistent.
  // Live portfolio is NOT appended: the stats panel uses raw price/basePrice
  // ratios while the historical chart uses adjusted bases — appending it would
  // create a visible step at the right edge of the chart.
  if (liveNeiValue !== null) {
    points.push({ date: "now", label: "Now", nei: liveNeiValue, portfolio: null });
  }

  return points;
}

const RANGES: HistoryRange[] = ["1Y", "ALL"];

export function PortfolioChart({
  liveNeiValue,
}: {
  liveNeiValue: number | null;
}) {
  const [range, setRange] = useState<HistoryRange>("1Y");
  const [neiData, setNeiData] = useState<IndexHistoryPoint[]>([]);
  const [portfolioData, setPortfolioData] = useState<IndexHistoryPoint[]>([]);
  const [loadedRange, setLoadedRange] = useState<HistoryRange | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/index/history?range=${range}&portfolio=1`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<IndexHistoryPayload>;
      })
      .then((json) => {
        setNeiData(json.data ?? []);
        setPortfolioData(json.portfolioData ?? []);
        setLoadedRange(range);
      })
      .catch(() => {/* silently ignore aborts and errors */});

    return () => controller.abort();
  }, [range]);

  const chartData = useMemo(
    () => buildChartData(neiData, portfolioData, liveNeiValue, range),
    [neiData, portfolioData, liveNeiValue, range]
  );

  const isLoading = loadedRange !== range;

  return (
    <div className="nei-portfolio-chart">
      <div className="nei-portfolio-chart-header">
        <div className="nei-portfolio-chart-legend">
          <span className="nei-pcl-item nei-pcl-item--portfolio">Trifecta Portfolio</span>
          <span className="nei-pcl-item nei-pcl-item--nei">New Economy Index</span>
        </div>
        <div className="nei-portfolio-range-tabs">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              className={`nei-portfolio-range-btn${r === range ? " is-active" : ""}`}
              onClick={() => setRange(r)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="nei-portfolio-chart-canvas">
        {isLoading ? (
          <div className="nei-portfolio-chart-state">Loading…</div>
        ) : chartData.length === 0 ? (
          <div className="nei-portfolio-chart-state">No data available.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 12, right: 20, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(232,235,240,0.07)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "rgba(232,235,240,0.38)", fontSize: 10, fontFamily: "var(--font-inter), system-ui" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fill: "rgba(232,235,240,0.38)", fontSize: 10, fontFamily: "var(--font-jetbrains), ui-monospace" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                width={52}
              />
              <Tooltip
                contentStyle={{
                  background: "#0D1E3A",
                  border: "1px solid rgba(232,235,240,0.12)",
                  borderRadius: 6,
                  fontSize: 12,
                  fontFamily: "var(--font-jetbrains), ui-monospace",
                }}
                labelStyle={{ color: "rgba(232,235,240,0.45)", marginBottom: 6, fontSize: 11 }}
                itemStyle={{ color: "#F2F4F8", padding: "1px 0" }}
              />
              <ReferenceLine
                y={INDEX_BASE_VALUE}
                stroke="rgba(232,235,240,0.14)"
                strokeDasharray="4 4"
                label={{
                  value: "Base 1,000",
                  position: "insideTopLeft",
                  fill: "rgba(232,235,240,0.3)",
                  fontSize: 10,
                  fontFamily: "var(--font-inter), system-ui",
                }}
              />
              <Line
                type="monotone"
                dataKey="nei"
                name="NEI"
                stroke="rgba(169,192,255,0.55)"
                strokeWidth={1.8}
                dot={false}
                connectNulls
                isAnimationActive={false}
                activeDot={{ r: 3, fill: "rgba(169,192,255,0.8)", stroke: "none" }}
              />
              <Line
                type="monotone"
                dataKey="portfolio"
                name="Portfolio"
                stroke="#E07A38"
                strokeWidth={2.2}
                dot={false}
                connectNulls
                isAnimationActive={false}
                activeDot={{ r: 4, fill: "#E07A38", stroke: "#FFFFFF", strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
