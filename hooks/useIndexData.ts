"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Currency, LiveIndexPayload } from "@/lib/index-api";
import { isMarketOpen } from "@/lib/market-hours";

const LIVE_ENDPOINT = "/api/index/live";
const POLL_INTERVAL_MS = 30 * 1000;
const FX_REFRESH_INTERVAL_MS = 15 * 60 * 1000;
const MAX_BACKOFF_MS = 5 * 60 * 1000;
const HIDDEN_RECHECK_MS = 60 * 1000;
const POLL_JITTER_RATIO = 0.2;

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

function convertMoney(
  value: number | null,
  fromCurrency: Currency,
  toCurrency: Currency,
  usdInr: number | null
) {
  if (value === null || fromCurrency === toCurrency) return value;
  if (!usdInr || usdInr <= 0) return value;
  return fromCurrency === "inr" && toCurrency === "usd" ? value / usdInr : value * usdInr;
}

function toDisplayCurrency(data: LiveIndexData, currency: Currency): LiveIndexData {
  if (data.currency === currency) return data;
  if (!data.usdInr || data.usdInr <= 0) return data;

  const convert = (value: number | null) =>
    convertMoney(value, data.currency, currency, data.usdInr);

  return {
    ...data,
    currency,
    totalMarketCap: convert(data.totalMarketCap),
    tickerTape: data.tickerTape.map((row) => ({
      ...row,
      price: convert(row.price),
    })),
    sectorComposition: data.sectorComposition.map((sector) => ({
      ...sector,
      marketCap: convert(sector.marketCap),
    })),
    stocks: data.stocks.map((stock) => ({
      ...stock,
      price: convert(stock.price),
      marketCap: convert(stock.marketCap),
      basePrice: convert(stock.basePrice),
    })),
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

export function getNextPollDelay({
  marketOpen,
  failureCount,
  random = Math.random,
}: {
  marketOpen: boolean;
  failureCount: number;
  random?: () => number;
}) {
  const base = marketOpen
    ? Math.min(POLL_INTERVAL_MS * 2 ** Math.max(0, failureCount), MAX_BACKOFF_MS)
    : FX_REFRESH_INTERVAL_MS;
  const jitter = (random() * 2 - 1) * POLL_JITTER_RATIO;
  return Math.round(base * (1 + jitter));
}

export function useIndexData(currency: Currency, initialLiveData?: LiveIndexPayload | null) {
  const [state, setState] = useState<LiveIndexState>(() =>
    initialLiveData
      ? { data: normalizeLiveData(initialLiveData), isLoading: false, error: null }
      : INITIAL_STATE
  );
  const lastSuccessfulFetchRef = useRef(initialLiveData ? Date.now() : 0);
  const consecutiveFailuresRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  // Successful requests throttle ordinary polling for 30 seconds. Explicit
  // refreshes abort any in-flight request so the newest wins. Display-currency
  // changes are converted locally from the same live snapshot to keep the
  // unitless index level stable while toggling INR/USD.
  const fetchData = useCallback(async ({ force = false }: { force?: boolean } = {}) => {
    if (!force && Date.now() - lastSuccessfulFetchRef.current < POLL_INTERVAL_MS) return true;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const data = await fetchLiveIndex("inr", controller.signal);
      if (controller.signal.aborted) return;
      lastSuccessfulFetchRef.current = Date.now();
      consecutiveFailuresRef.current = 0;
      setState({ data, isLoading: false, error: null });
      return true;
    } catch (error) {
      if (!isAbortError(error)) {
        consecutiveFailuresRef.current += 1;
        setState((current) => ({
          ...current,
          isLoading: false,
          error: getErrorMessage(error),
        }));
      }
      return false;
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, []);

  useEffect(() => {
    let stopped = false;
    let pollTimer: number | null = null;

    const scheduleNextPoll = () => {
      if (stopped) return;
      const delay = document.visibilityState === "hidden"
        ? HIDDEN_RECHECK_MS
        : getNextPollDelay({
            marketOpen: isMarketOpen(),
            failureCount: consecutiveFailuresRef.current,
          });

      pollTimer = window.setTimeout(async () => {
        if (!stopped && document.visibilityState === "visible") {
          await fetchData({ force: !isMarketOpen() });
        }
        scheduleNextPoll();
      }, delay);
    };

    if (!initialLiveData) void fetchData({ force: true });
    scheduleNextPoll();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") void fetchData();
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stopped = true;
      if (pollTimer !== null) window.clearTimeout(pollTimer);
      document.removeEventListener("visibilitychange", handleVisibility);
      abortRef.current?.abort();
    };
  }, [fetchData, initialLiveData]);

  const refresh = useCallback(() => {
    void fetchData({ force: true });
  }, [fetchData]);

  const displayData = useMemo(
    () => (state.data ? toDisplayCurrency(state.data, currency) : null),
    [currency, state.data]
  );

  return { ...state, data: displayData, refresh };
}
