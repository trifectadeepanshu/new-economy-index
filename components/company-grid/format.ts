import type { Currency } from "@/lib/index-api";
export { formatMarketCap } from "@/lib/formatters";

export function formatPrice(price: number | null, currency: Currency = "inr") {
  if (price === null) return "—";

  const symbol = currency === "usd" ? "$" : "₹";
  const locale = currency === "usd" ? "en-US" : "en-IN";
  return `${symbol}${price.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatSignedPercent(value: number | null, digits = 2) {
  if (value === null) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

export function displayCompanyName(name: string) {
  return name.replace(/\([^)]*\)/g, "").trim() || name;
}
