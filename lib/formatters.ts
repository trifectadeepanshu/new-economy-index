import type { Currency } from "@/lib/index-api";

/**
 * Format a monetary value (market cap, revenue, PAT…) in the given currency;
 * value is already in that currency. Sign-aware: negatives (e.g. loss-making
 * PAT) get a leading "-" before the currency symbol, and the magnitude buckets
 * key off the absolute value so large losses don't fall through to the raw
 * number (e.g. -$5.0B, not $-5,000,000,000).
 */
export function formatMarketCap(value: number | null, currency: Currency = "inr") {
  if (value === null) return "—";

  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);

  if (currency === "usd") {
    if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
    if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
    if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
    return `${sign}$${Math.round(abs).toLocaleString("en-US")}`;
  }

  const crore = abs / 1e7;
  if (crore >= 100_000) return `${sign}₹${(crore / 100_000).toFixed(1)} L Cr`;
  return `${sign}₹${Math.round(crore).toLocaleString("en-IN")} Cr`;
}
