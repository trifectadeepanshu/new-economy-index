import type { StockData } from "@/lib/index-api";

function getSparkSeries(row: StockData) {
  let seed = 0;
  for (let index = 0; index < row.ticker.length; index += 1) {
    seed = (seed * 33 + row.ticker.charCodeAt(index)) % 997;
  }

  const directionalDrift = ((row.changePct ?? 0) / 100) * 3.5;
  const baseDrift = (((row.ratio ?? 1) - 1) / 100) * 2;
  let value = 100 + (seed % 11) - 5;

  return Array.from({ length: 30 }, (_, index) => {
    const wave =
      Math.sin(seed * 0.07 + index * 0.66) * 0.75 +
      Math.cos(seed * 0.03 + index * 0.31) * 0.42;
    value += wave + directionalDrift + baseDrift;
    return value;
  });
}

export function RowSparkline({ row }: { row: StockData }) {
  const series = getSparkSeries(row);
  const width = 118;
  const height = 34;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const path = series
    .map((value, index) => {
      const x = (index / (series.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const isUp = series[series.length - 1] >= series[0];

  return (
    <svg
      aria-hidden="true"
      className="nei-constituent-spark"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      <path
        d={path}
        fill="none"
        stroke={isUp ? "var(--nei-pos)" : "var(--nei-neg)"}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
