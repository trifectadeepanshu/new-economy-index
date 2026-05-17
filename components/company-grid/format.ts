export function formatPrice(price: number | null) {
  if (price === null) return "—";

  return `₹${price.toLocaleString("en-IN", {
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
