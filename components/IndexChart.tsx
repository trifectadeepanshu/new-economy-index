"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, CartesianGrid,
} from "recharts";
import { format, parseISO } from "date-fns";

type Range = "1W" | "1M" | "1Y" | "ALL";
const RANGES: Range[] = ["1W", "1M", "1Y", "ALL"];

interface DataPoint { date: string; value: number }

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm shadow-xl">
      <p className="text-zinc-400">{label}</p>
      <p className="font-semibold text-white">{payload[0].value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
    </div>
  );
}

export function IndexChart({ liveValue }: { liveValue: number | null }) {
  const [range, setRange] = useState<Range>("1Y");
  const [historyData, setHistoryData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    fetch(`/api/index/history?range=${range}`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        const pts: DataPoint[] = (json.data ?? []).map((d: DataPoint) => ({
          date: format(parseISO(d.date), range === "1W" ? "dd MMM" : range === "1M" ? "dd MMM" : "MMM ''yy"),
          value: Number(d.value),
        }));
        if (!active) return;
        setHistoryData(pts);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!active || (e instanceof DOMException && e.name === "AbortError")) {
          return;
        }
        setHistoryData([]);
        setError(e instanceof Error ? e.message : "Failed to load chart data");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [range]);

  const data = useMemo(() => {
    if (liveValue === null || historyData.length === 0) return historyData;
    return [...historyData, { date: "Now", value: liveValue }];
  }, [historyData, liveValue]);

  const selectRange = (nextRange: Range) => {
    if (nextRange === range) return;
    setLoading(true);
    setRange(nextRange);
  };

  const baseline = data[0]?.value ?? 1000;
  const isUp = data.length > 1 ? data[data.length - 1].value >= baseline : true;
  const lineColor = isUp ? "#34d399" : "#f87171";

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-300">Performance</h2>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={range === r}
              onClick={() => selectRange(r)}
              className={`min-h-9 min-w-11 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                range === r
                  ? "bg-indigo-600 text-white"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-lg bg-zinc-800" />
      ) : error ? (
        <div className="flex h-64 items-center justify-center text-sm text-red-300">
          Could not load historical data: {error}
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-zinc-600">
          No historical data yet — run the backfill to populate history.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: "#71717a", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={["auto", "auto"]}
              tick={{ fill: "#71717a", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              width={56}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={1000} stroke="#3f3f46" strokeDasharray="4 4" />
            <Line
              type="monotone"
              dataKey="value"
              stroke={lineColor}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: lineColor }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
