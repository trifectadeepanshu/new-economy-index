import { format, parseISO, isValid } from "date-fns";

export function findUnknownSearchParam(params: URLSearchParams, allowed: readonly string[]) {
  const allowedSet = new Set(allowed);
  return [...params.keys()].find((key) => !allowedSet.has(key)) ?? null;
}

export function findDuplicateSearchParam(params: URLSearchParams, allowed: readonly string[]) {
  return allowed.find((key) => params.getAll(key).length > 1) ?? null;
}

export function isIsoDate(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = parseISO(value);
  return isValid(parsed) && format(parsed, "yyyy-MM-dd") === value;
}

export function isTicker(value: string) {
  return /^[A-Z0-9][A-Z0-9.&-]{0,29}$/.test(value);
}
