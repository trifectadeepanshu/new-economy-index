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

/**
 * Truncates to the last complete sentence within maxChars, falling back to
 * the last complete word if no sentence break falls in a reasonable spot.
 * Never cuts mid-word and never adds an ellipsis — a hard visual clip (CSS
 * max-height, line-clamp) can only cut wherever the text happens to wrap,
 * which reads as broken; trimming the text itself always ends cleanly.
 */
export function truncateToSentence(text: string, maxChars: number) {
  if (text.length <= maxChars) return text;

  const slice = text.slice(0, maxChars);
  const sentenceEnd = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("! "),
    slice.lastIndexOf("? ")
  );
  // Only trust the sentence break if it doesn't throw away most of the
  // budget (e.g. a short first sentence followed by a much longer one).
  if (sentenceEnd > maxChars * 0.4) {
    return slice.slice(0, sentenceEnd + 1);
  }

  const wordEnd = slice.lastIndexOf(" ");
  return wordEnd > 0 ? slice.slice(0, wordEnd).trimEnd() : slice;
}
