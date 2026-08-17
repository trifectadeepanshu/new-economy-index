import { differenceInCalendarDays, format, parseISO, subYears } from "date-fns";
import type { IrrRangeMode } from "@/components/company-grid/types";
import type { Currency } from "@/lib/index-api";

export type IrrPricePoint = { date: string; price: number };

const PERIOD_YEARS: Record<IrrRangeMode, number> = {
  "1y": 1,
  "3y": 3,
  "5y": 5,
};

export function getIrrStartDate(mode: IrrRangeMode, toDate: string): string {
  return format(subYears(parseISO(toDate), PERIOD_YEARS[mode]), "yyyy-MM-dd");
}

export function getTimeSinceBaseReturn(ratio: number | null): number | null {
  if (ratio === null || !Number.isFinite(ratio) || ratio <= 0) return null;
  return (ratio - 1) * 100;
}

export function computeIrr({
  currentPrice,
  startPoint,
  toDate,
  currency,
  usdInr,
}: {
  currentPrice: number | null;
  startPoint: IrrPricePoint | undefined;
  toDate: string;
  currency: Currency;
  usdInr: number | null;
}): number | null {
  if (
    currentPrice === null ||
    !Number.isFinite(currentPrice) ||
    currentPrice <= 0 ||
    !startPoint ||
    !Number.isFinite(startPoint.price) ||
    startPoint.price <= 0
  ) {
    return null;
  }

  let startPrice = startPoint.price;
  if (currency === "usd") {
    if (usdInr === null || !Number.isFinite(usdInr) || usdInr <= 0) return null;
    startPrice /= usdInr;
  }

  const days = differenceInCalendarDays(parseISO(toDate), parseISO(startPoint.date));
  if (days <= 0) return null;

  const annualized = (Math.pow(currentPrice / startPrice, 365.25 / days) - 1) * 100;
  return Number.isFinite(annualized) ? annualized : null;
}
