import { format, parseISO } from "date-fns";
import { INDEX_BASE_VALUE } from "@/lib/companies";

/** `shortDay` → day-level ticks ("dd MMM") for short spans, else month ("MMM 'yy"). */
export function formatLabel(date: string, shortDay: boolean) {
  return format(parseISO(date), shortDay ? "dd MMM" : "MMM ''yy");
}

export function formatValue(value: number) {
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatSignedPct(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function formatPctFromBase(value: number) {
  return formatSignedPct(((value - INDEX_BASE_VALUE) / INDEX_BASE_VALUE) * 100);
}
