"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Currency, LiveIndexPayload } from "@/lib/index-api";
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
    currency: json.currency ?? "inr",
    usdInr: json.usdInr ?? null,
    trifectaWeightPct: json.trifectaWeightPct ?? null,
    staleConstituents: json.staleConstituents ?? [],
    marketStats: json.marketStats ?? {
      high52w: null,
      low52w: null,
      advancers: 0,
      decliners: 0,
    },
    sectorComposition: json.sectorComposition ?? [],
    tickerTape: json.tickerTape ?? json.stocks ?? [],
    stocks: json.stocks ?? [],
  };
}

async function fetchLiveIndex(currency: Currency, signal?: AbortSignal) {
  const response = await fetch(`${LIVE_ENDPOINT}?currency=${currency}`, { signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  return normalizeLiveData((await response.json()) as LiveIndexPayload);
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

export function useIndexData(currency: Currency) {
  const [state, setState] = useState<LiveIndexState>(INITIAL_STATE);
  const lastSuccessfulFetchRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const currencyRef = useRef(currency);
  currencyRef.current = currency;

  // Non-forced calls are throttled; forced calls (mount, currency switch,
  // visibility) always run and abort any in-flight request so the newest wins.
  const fetchData = useCallback(async ({ force = false }: { force?: boolean } = {}) => {
    if (!force && Date.now() - lastSuccessfulFetchRef.current < POLL_INTERVAL_MS) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const data = await fetchLiveIndex(currencyRef.current, controller.signal);
      if (controller.signal.aborted) return;
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

  // Refetch immediately when the display currency changes.
  useEffect(() => {
    void fetchData({ force: true });
  }, [currency, fetchData]);

  const refresh = useCallback(() => {
    void fetchData({ force: true });
  }, [fetchData]);

  return { ...state, refresh };
}
