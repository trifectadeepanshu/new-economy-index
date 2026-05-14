"use client";

import { useEffect, useRef, useState } from "react";
import { isMarketOpen } from "@/lib/market-hours";

const POLL_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

export interface StockData {
  ticker: string;
  name: string;
  sector: string;
  price: number | null;
  changePct: number | null;
  marketCap: number | null;
}

export interface LiveIndexData {
  indexValue: number;
  indexChangePct: number | null;
  numCompanies: number;
  lastUpdated: Date;
  stocks: StockData[];
}

export function useIndexData() {
  const [data, setData] = useState<LiveIndexData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/index/live", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData({ ...json, lastUpdated: new Date() });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const schedulePolling = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (isMarketOpen()) {
      timerRef.current = setInterval(fetchData, POLL_INTERVAL_MS);
    }
  };

  useEffect(() => {
    fetchData();
    schedulePolling();

    // Re-evaluate market open state every minute so polling starts/stops correctly
    const marketCheck = setInterval(() => {
      schedulePolling();
    }, 60000);

    // Refetch immediately when tab becomes visible
    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchData();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      clearInterval(marketCheck);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return { data, isLoading, error };
}
