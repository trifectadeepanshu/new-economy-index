export function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function average(values: number[]) {
  return values.length > 0
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;
}

export function finiteNumbers(values: Array<number | null | undefined>) {
  return values.filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value)
  );
}

export function priceRatio(price: number | null, basePrice: number | null) {
  return price !== null && basePrice !== null && basePrice !== 0 ? price / basePrice : null;
}
