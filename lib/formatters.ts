import type { Currency } from "@/lib/index-api";

/** Format a market cap in the given currency (value is already in that currency). */
export function formatMarketCap(value: number | null, currency: Currency = "inr") {
  if (value === null) return "—";

  if (currency === "usd") {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    return `$${Math.round(value).toLocaleString("en-US")}`;
  }

  const crore = value / 1e7;
  if (crore >= 100_000) return `₹${(crore / 100_000).toFixed(1)} L Cr`;
  return `₹${Math.round(crore).toLocaleString("en-IN")} Cr`;
}
