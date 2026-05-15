"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isMarketOpen } from "@/lib/market-hours";

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes during market hours
const MARKET_CHECK_INTERVAL_MS = 60 * 1000;

export interface StockData {
  ticker: string;
  name: string;
  sector: string;
  price: number | null;
  changePct: number | null;
  basePrice: number | null;
  ratio: number | null;
}

export interface LiveIndexData {
  indexValue: number;
  indexChangePct: number | null;
  numCompanies: number;
  lastUpdated: Date;
  isStale: boolean;
  totalMarketCap: number | null;
  stocks: StockData[];
}

export function useIndexData() {
  const [data, setData] = useState<LiveIndexData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastFetchRef = useRef(0);
  const inFlightRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    lastFetchRef.current = Date.now();

    try {
      const res = await fetch("/api/index/live");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const serverTimestamp =
        typeof json.lastUpdated === "string" ? new Date(json.lastUpdated) : null;
      const lastUpdated =
        serverTimestamp && !Number.isNaN(serverTimestamp.getTime())
          ? serverTimestamp
          : new Date();

      setData({ ...json, lastUpdated });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      inFlightRef.current = false;
      setIsLoading(false);
    }
  }, []);

  const refreshIfDue = useCallback(() => {
    if (!isMarketOpen()) return;
    if (Date.now() - lastFetchRef.current >= POLL_INTERVAL_MS) {
      void fetchData();
    }
  }, [fetchData]);

  useEffect(() => {
    const initialFetch = window.setTimeout(() => {
      void fetchData();
    }, 0);

    // Check market state every minute, but only fetch on the 15-minute cadence.
    const marketCheck = window.setInterval(refreshIfDue, MARKET_CHECK_INTERVAL_MS);

    // Refetch immediately when tab becomes visible
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void fetchData();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearTimeout(initialFetch);
      window.clearInterval(marketCheck);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchData, refreshIfDue]);

  return { data, isLoading, error };
}
