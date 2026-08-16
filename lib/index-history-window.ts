import { format, parseISO, subDays, subMonths, subYears } from "date-fns";
import { INDEX_ANCHOR_DATE } from "@/lib/companies";
import { isHistoryRange, type HistoryRange } from "@/lib/index-api";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type HistoryWindow = {
  range: HistoryRange;
  fromDate: string;
  toDate: string;
  isCustom: boolean;
};

export type HistoryWindowResult =
  | { ok: true; window: HistoryWindow }
  | { ok: false; error: string };

export function isValidISODate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const parsed = parseISO(value);
  return !Number.isNaN(parsed.getTime()) && format(parsed, "yyyy-MM-dd") === value;
}

export function getPresetFromDate(range: HistoryRange, todayDate: string): string {
  const today = parseISO(todayDate);
  switch (range) {
    case "1W":
      return format(subDays(today, 7), "yyyy-MM-dd");
    case "1M":
      return format(subMonths(today, 1), "yyyy-MM-dd");
    case "1Y":
      return format(subYears(today, 1), "yyyy-MM-dd");
    case "ALL":
      return INDEX_ANCHOR_DATE;
  }
}

function clampDate(value: string, min: string, max: string): string {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/** Resolve preset and custom requests into one inclusive, ordered date window. */
export function resolveHistoryWindow({
  requestedRange,
  fromParam,
  toParam,
  todayDate,
}: {
  requestedRange: string;
  fromParam: string | null;
  toParam: string | null;
  todayDate: string;
}): HistoryWindowResult {
  if (!isValidISODate(todayDate)) {
    return { ok: false, error: "Invalid server date." };
  }

  const hasCustomParams = fromParam !== null || toParam !== null;
  if (hasCustomParams) {
    if (
      !fromParam ||
      !toParam ||
      !isValidISODate(fromParam) ||
      !isValidISODate(toParam)
    ) {
      return {
        ok: false,
        error: "Custom ranges require valid from and to dates in YYYY-MM-DD format.",
      };
    }

    const orderedFrom = fromParam <= toParam ? fromParam : toParam;
    const orderedTo = fromParam <= toParam ? toParam : fromParam;
    return {
      ok: true,
      window: {
        range: "ALL",
        fromDate: clampDate(orderedFrom, INDEX_ANCHOR_DATE, todayDate),
        toDate: clampDate(orderedTo, INDEX_ANCHOR_DATE, todayDate),
        isCustom: true,
      },
    };
  }

  if (!isHistoryRange(requestedRange)) {
    return { ok: false, error: "Invalid range." };
  }

  return {
    ok: true,
    window: {
      range: requestedRange,
      fromDate: getPresetFromDate(requestedRange, todayDate),
      toDate: todayDate,
      isCustom: false,
    },
  };
}
