/** Format a USD amount as a compact market cap ($B / $M / $K). */
export function formatMarketCap(value: number | null) {
  if (value === null) return "—";

  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${Math.round(value).toLocaleString("en-US")}`;
}
