"use client";

import { useId, useMemo, useState } from "react";
import { format, parseISO, subYears } from "date-fns";
import { INDEX_ANCHOR_DATE } from "@/lib/companies";
import type { BenchmarkKey } from "@/lib/index-api";
import { getISTDate } from "@/lib/market-hours";
import { ChartCanvas } from "@/components/index-chart/ChartCanvas";
import { ChartState, ChartToolbar, RangeControl } from "@/components/index-chart/ChartControls";
import {
  BENCHMARK_KEYS,
  BENCHMARK_META,
  RANGE_OPTIONS,
  type RangeKey,
} from "@/components/index-chart/constants";
import { getSeriesReturn } from "@/components/index-chart/data";
import { formatSignedPct, formatValue } from "@/components/index-chart/format";
import { useChartHistory, type CustomRange } from "@/components/index-chart/useChartHistory";
import { useIndexChartModel, type SeriesReturns } from "@/components/index-chart/useIndexChartModel";
import type { IndexChartProps } from "@/components/index-chart/types";

function oneYearAgoISO(toDate: string): string {
  return format(subYears(parseISO(toDate), 1), "yyyy-MM-dd");
}

function displayDate(date: string): string {
  return format(parseISO(date), "dd MMM yyyy");
}

function getRangeLabel(key: RangeKey): string {
  return RANGE_OPTIONS.find((option) => option.key === key)?.label ?? key;
}

function getReferenceSubtitle(rangeKey: RangeKey, customRange: CustomRange | null): string {
  if (rangeKey === "MAX") return "Base 1,000 · Jan 2021 → today";
  if (rangeKey === "CUSTOM") {
    if (customRange?.from && customRange.to) {
      return `${displayDate(customRange.from)} → ${displayDate(customRange.to)}`;
    }
    return "Pick a custom date range";
  }

  const label =
    rangeKey === "1W" ? "Last 1 week" : rangeKey === "1M" ? "Last 1 month" : "Last 1 year";
  return `${label} · ending today`;
}

/** A legend entry showing the series' return over the selected window. */
function SeriesCard({
  label,
  color,
  swatchDash,
  ret,
  on,
  toggleable,
  onToggle,
}: {
  label: string;
  color: string;
  swatchDash?: boolean;
  ret: number | null;
  on: boolean;
  toggleable: boolean;
  onToggle?: () => void;
}) {
  const tone = (ret ?? 0) >= 0 ? "is-positive" : "is-negative";
  const inner = (
    <>
      <span className="nei-series-card-head">
        <span
          className={`nei-series-swatch${swatchDash ? " is-dash" : ""}`}
          style={{ color, background: on ? color : "transparent", borderColor: color }}
        />
        <span className="nei-series-name">{label}</span>
      </span>
      <span className={`nei-series-return nei-mono ${on ? tone : "is-off"}`}>
        {ret !== null ? formatSignedPct(ret) : "—"}
      </span>
    </>
  );

  if (!toggleable) {
    return <div className="nei-series-card is-static is-on">{inner}</div>;
  }
  return (
    <button
      type="button"
      className={`nei-series-card${on ? " is-on" : ""}`}
      aria-pressed={on}
      onClick={onToggle}
    >
      {inner}
    </button>
  );
}

/** Compact command-bar chip: dot + name + return, toggling the series on/off. */
function SeriesChip({
  label,
  color,
  ret,
  on,
  hero,
  toggleable,
  onToggle,
}: {
  label: string;
  color: string;
  ret: number | null;
  on: boolean;
  hero?: boolean;
  toggleable: boolean;
  onToggle?: () => void;
}) {
  const tone = (ret ?? 0) >= 0 ? "is-positive" : "is-negative";
  const inner = (
    <>
      <span className="nei-chip-dot" style={{ background: color }} />
      <span className="nei-chip-name">{label}</span>
      <span className={`nei-chip-return nei-mono ${on ? tone : "is-off"}`}>
        {ret !== null ? formatSignedPct(ret) : "—"}
      </span>
    </>
  );

  if (!toggleable) {
    return <div className={`nei-chip is-on${hero ? " is-hero" : ""}`}>{inner}</div>;
  }
  return (
    <button
      type="button"
      className={`nei-chip${on ? " is-on" : ""}`}
      aria-pressed={on}
      onClick={onToggle}
    >
      {inner}
    </button>
  );
}

export function IndexChart({ liveValue, stocks, variant = "default", heading }: IndexChartProps) {
  const areaGradientId = `nei-area-${useId().replace(/:/g, "")}`;
  const [rangeKey, setRangeKey] = useState<RangeKey>(() =>
    variant === "reference" ? "MAX" : "1Y"
  );
  const [customRange, setCustomRange] = useState<CustomRange | null>(null);
  const [visibleBenchmarks, setVisibleBenchmarks] = useState<Set<BenchmarkKey>>(
    () => new Set(BENCHMARK_KEYS)
  );
  const [showTrifecta, setShowTrifecta] = useState(true);

  // Not memoized: it's a cheap string read, and freezing it at mount pinned
  // the custom-range upper bound to yesterday for any tab left open past
  // midnight.
  const maxDate = getISTDate();
  const includeLivePoint =
    rangeKey !== "CUSTOM" || Boolean(customRange?.to && customRange.to >= maxDate);
  const { historyData, sectorData, portfolioData, benchmarks, loading, error } = useChartHistory(
    rangeKey,
    customRange
  );

  const isReference = variant === "reference";
  const model = useIndexChartModel({
    activeMode: "index",
    focusedSector: null,
    historyData,
    includeLivePoint,
    portfolioData,
    benchmarks,
    liveValue,
    sectorData,
    selectedSector: "Platforms",
    stocks,
  });

  const hasTrifecta = portfolioData.length > 0;
  const availableBenchmarks = benchmarks.map((b) => b.symbol);
  const chartData = model.currentData;

  // Compute every series' return from the drawn rows, so the header %, the
  // legend cards, and the line always agree. The Max view runs from the base
  // (Dec 2020, 1,000), so its return matches the hero's "since inception".
  const returns = useMemo<SeriesReturns>(() => {
    const out: SeriesReturns = {
      NE50: getSeriesReturn(chartData, "value"),
      TRIFECTA: getSeriesReturn(chartData, "TRIFECTA"),
    };
    for (const key of BENCHMARK_KEYS) out[key] = getSeriesReturn(chartData, key);
    return out;
  }, [chartData]);

  const rangeLabel =
    rangeKey === "CUSTOM"
      ? "Custom Range"
      : `${getRangeLabel(rangeKey)} Range`;
  const referenceSubtitle = getReferenceSubtitle(rangeKey, customRange);

  function handleRangeKeyChange(key: RangeKey) {
    if (key === "CUSTOM" && !customRange) {
      setCustomRange({ from: oneYearAgoISO(maxDate), to: maxDate });
    }
    setRangeKey(key);
  }

  function toggleBenchmark(key: BenchmarkKey) {
    setVisibleBenchmarks((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const changeTone = (returns.NE50 ?? 0) >= 0 ? "is-positive" : "is-negative";

  const chartBody = loading ? (
    <ChartState tone="loading" />
  ) : error ? (
    <ChartState tone="error">Could not load historical data.</ChartState>
  ) : model.currentData.length === 0 ? (
    <ChartState tone="empty">No historical data available for this range.</ChartState>
  ) : (
    <ChartCanvas
      activeMode="index"
      areaGradientId={areaGradientId}
      data={chartData}
      focusedSector={null}
      latestColor={model.latestColor}
      latestPoint={model.latestPoint}
      onSectorFocus={() => {}}
      selectedSector="Platforms"
      visibleBenchmarks={visibleBenchmarks}
      showTrifecta={showTrifecta && hasTrifecta}
      showBaseLine={rangeKey === "MAX"}
    />
  );

  if (isReference) {
    return (
      <div className="nei-reference-chart nei-cmd">
        <div className="nei-cmd-head">
          {heading && <h2 className="nei-heading nei-cmd-title">{heading}</h2>}
          <div className="nei-cmd-value">
            <div className="nei-cmd-value-row">
              <span className="nei-mono nei-cmd-number">
                {model.latestPoint ? formatValue(model.latestPoint.value) : "—"}
              </span>
              <strong className={`nei-mono nei-cmd-change ${changeTone}`}>
                {returns.NE50 !== null ? formatSignedPct(returns.NE50) : "—"}
              </strong>
            </div>
            <div className="nei-cmd-sub">{referenceSubtitle}</div>
          </div>
        </div>

        <div className="nei-cmd-bar">
          <div className="nei-cmd-series" role="group" aria-label="Series">
            <span className="nei-cmd-series-label">Series</span>
            <SeriesChip
              label="NEI Top 50"
              color={model.latestColor}
              ret={returns.NE50}
              on
              hero
              toggleable={false}
            />
            {/* Trifecta Capital shown first among toggles, then the benchmarks. */}
            {hasTrifecta && (
              <SeriesChip
                label="Trifecta Capital Portfolio"
                color="#E07A38"
                ret={returns.TRIFECTA}
                on={showTrifecta}
                toggleable
                onToggle={() => setShowTrifecta((v) => !v)}
              />
            )}
            {availableBenchmarks.map((key) => (
              <SeriesChip
                key={key}
                label={BENCHMARK_META[key].label}
                color={BENCHMARK_META[key].color}
                ret={returns[key] ?? null}
                on={visibleBenchmarks.has(key)}
                toggleable
                onToggle={() => toggleBenchmark(key)}
              />
            ))}
          </div>

          <RangeControl
            isReference
            rangeKey={rangeKey}
            onRangeKeyChange={handleRangeKeyChange}
            customRange={customRange}
            onCustomRangeChange={setCustomRange}
            minDate={INDEX_ANCHOR_DATE}
            maxDate={maxDate}
          />
        </div>

        {chartBody}
      </div>
    );
  }

  return (
    <div className="nei-chart-root">
      <ChartToolbar
        isReference={false}
        latestPoint={model.latestPoint}
        onRangeKeyChange={handleRangeKeyChange}
        rangeKey={rangeKey}
        rangeLabel={rangeLabel}
        rangeChangePct={returns.NE50}
        customRange={customRange}
        onCustomRangeChange={setCustomRange}
        minDate={INDEX_ANCHOR_DATE}
        maxDate={maxDate}
        title={model.title}
      />

      {chartBody}

      {(availableBenchmarks.length > 0 || hasTrifecta) && (
        <div className="nei-series-cards" role="group" aria-label="Series">
          <SeriesCard label="NEI Top 50" color={model.latestColor} ret={returns.NE50} on toggleable={false} />
          {availableBenchmarks.map((key) => (
            <SeriesCard
              key={key}
              label={BENCHMARK_META[key].label}
              color={BENCHMARK_META[key].color}
              swatchDash
              ret={returns[key] ?? null}
              on={visibleBenchmarks.has(key)}
              toggleable
              onToggle={() => toggleBenchmark(key)}
            />
          ))}
          {hasTrifecta && (
            <SeriesCard
              label="Trifecta Capital Portfolio"
              color="#E07A38"
              ret={returns.TRIFECTA}
              on={showTrifecta}
              toggleable
              onToggle={() => setShowTrifecta((v) => !v)}
            />
          )}
        </div>
      )}
    </div>
  );
}
