"use client";

import { useEffect, useState } from "react";
import type { IrrPricePoint } from "@/components/company-grid/returns";

type PricesResponse = { date: string; prices: Record<string, IrrPricePoint> };

type FetchResult = {
  fromDate: string;
  prices: Record<string, IrrPricePoint> | null;
  error: string | null;
};

/** Fetches each ticker's latest close on or before a fixed IRR start date. */
export function useIrrPrices(fromDate: string | null) {
  const [result, setResult] = useState<FetchResult | null>(null);

  useEffect(() => {
    if (!fromDate) return;

    const controller = new AbortController();

    fetch(`/api/index/prices-on-date?date=${fromDate}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<PricesResponse>;
      })
      .then((json) => setResult({ fromDate, prices: json.prices, error: null }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setResult({
          fromDate,
          prices: null,
          error: error instanceof Error ? error.message : "Failed to load IRR prices",
        });
      });

    return () => controller.abort();
  }, [fromDate]);

  if (!fromDate) return { prices: null, isLoading: false, error: null };

  const isCurrent = result?.fromDate === fromDate;
  return {
    prices: isCurrent ? result.prices : null,
    isLoading: !isCurrent,
    error: isCurrent ? result.error : null,
  };
}
