"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LiveIndexPayload } from "@/lib/index-api";
import { isMarketOpen } from "@/lib/market-hours";

const LIVE_ENDPOINT = "/api/index/live";
const POLL_INTERVAL_MS = 30 * 1000;
const MARKET_CHECK_INTERVAL_MS = 15 * 1000;
const FX_REFRESH_INTERVAL_MS = 15 * 60 * 1000;

export type LiveIndexData = Omit<LiveIndexPayload, "lastUpdated"> & {
  lastUpdated: Date;
};

type LiveIndexState = {
  data: LiveIndexData | null;
  isLoading: boolean;
  error: string | null;
};

const INITIAL_STATE: LiveIndexState = {
  data: null,
  isLoading: true,
  error: null,
};

function parseTimestamp(value: string | null | undefined) {
  if (typeof value !== "string") return new Date();

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function normalizeLiveData(json: LiveIndexPayload): LiveIndexData {
  return {
    indexValue: json.indexValue ?? null,
    indexChangePct: json.indexChangePct ?? null,
    portfolioValue: json.portfolioValue ?? null,
    numCompanies: json.numCompanies,
    lastUpdated: parseTimestamp(json.lastUpdated),
    isStale: Boolean(json.isStale),
    totalMarketCap: json.totalMarketCap ?? null,
    usdInr: json.usdInr ?? null,
    stocks: json.stocks ?? [],
  };
}

async function fetchLiveIndex(signal?: AbortSignal) {
  const response = await fetch(LIVE_ENDPOINT, { signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  return normalizeLiveData((await response.json()) as LiveIndexPayload);
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

export function useIndexData() {
  const [state, setState] = useState<LiveIndexState>(INITIAL_STATE);
  const lastSuccessfulFetchRef = useRef(0);
  const inFlightRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async ({ force = false }: { force?: boolean } = {}) => {
    if (inFlightRef.current) return;
    if (!force && Date.now() - lastSuccessfulFetchRef.current < POLL_INTERVAL_MS) return;

    inFlightRef.current = true;
    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const data = await fetchLiveIndex(controller.signal);
      lastSuccessfulFetchRef.current = Date.now();
      setState({ data, isLoading: false, error: null });
    } catch (error) {
      if (!isAbortError(error)) {
        setState((current) => ({
          ...current,
          isLoading: false,
          error: getErrorMessage(error),
        }));
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      inFlightRef.current = false;
    }
  }, []);

  const refreshIfDue = useCallback(() => {
    if (!isMarketOpen()) return;
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    void fetchData({ force: true });

    const marketCheck = window.setInterval(refreshIfDue, MARKET_CHECK_INTERVAL_MS);
    // Always refresh at least every 15 minutes so the live USD/INR rate (and the
    // USD-converted values) stay current even when the equity market is closed.
    const fxRefresh = window.setInterval(() => void fetchData({ force: true }), FX_REFRESH_INTERVAL_MS);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void fetchData({ force: true });
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(marketCheck);
      window.clearInterval(fxRefresh);
      document.removeEventListener("visibilitychange", handleVisibility);
      abortRef.current?.abort();
    };
  }, [fetchData, refreshIfDue]);

  const refresh = useCallback(() => {
    void fetchData({ force: true });
  }, [fetchData]);

  return { ...state, refresh };
}
