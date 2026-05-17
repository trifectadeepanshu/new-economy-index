export function formatMarketCap(value: number | null) {
  if (value === null) return "—";

  const crore = value / 1e7;
  if (crore >= 100_000) return `₹${(crore / 100_000).toFixed(1)} L Cr`;

  return `₹${Math.round(crore).toLocaleString("en-IN")} Cr`;
}
