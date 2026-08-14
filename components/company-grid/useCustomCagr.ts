"use client";

import { useEffect, useState } from "react";

export type CagrPricePoint = { date: string; price: number };
type PricesResponse = { date: string; prices: Record<string, CagrPricePoint> };

type FetchResult = {
  fromDate: string;
  prices: Record<string, CagrPricePoint> | null;
  error: string | null;
};

/**
 * Fetches each ticker's price as of (on or before) `fromDate`, for computing
 * a custom-range CAGR. Returns null while inactive (fromDate === null) or
 * loading, so callers can fall back to the default since-base CAGR.
 */
export function useCustomCagrPrices(fromDate: string | null) {
  const [result, setResult] = useState<FetchResult | null>(null);

  useEffect(() => {
    if (!fromDate) return;

    const controller = new AbortController();

    fetch(`/api/index/prices-on-date?date=${fromDate}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<PricesResponse>;
      })
      .then((json) => setResult({ fromDate, prices: json.prices, error: null }))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setResult({
          fromDate,
          prices: null,
          error: err instanceof Error ? err.message : "Failed to load prices",
        });
      });

    return () => controller.abort();
  }, [fromDate]);

  if (!fromDate) return { prices: null, isLoading: false, error: null };

  // A result for a different (previous) fromDate is stale — mask it out
  // rather than flashing old data while the new date is still loading.
  const isCurrent = result?.fromDate === fromDate;
  return {
    prices: isCurrent ? result.prices : null,
    isLoading: !isCurrent,
    error: isCurrent ? result.error : null,
  };
}
