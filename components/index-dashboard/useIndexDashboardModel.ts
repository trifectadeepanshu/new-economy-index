import { useEffect, useMemo, useRef, useState } from "react";
import { useIndexData } from "@/hooks/useIndexData";
import { useCurrency } from "@/components/index-dashboard/CurrencyContext";
import type { IndexHistoryPayload, StockData } from "@/lib/index-api";
import { COMPANIES, INDEX_BASE_VALUE } from "@/lib/companies";
import { isMarketOpen } from "@/lib/market-hours";
import { formatNumber } from "@/components/index-dashboard/format";

type ValueFlash = "" | "pos" | "neg";
type StatTone = "positive" | "negative";

export type HeroStat = {
  label: string;
  value: string | number;
  tone?: StatTone;
};

const EMPTY_STOCKS: StockData[] = [];
const EMPTY_MARKET_STATS = {
  high52w: null,
  low52w: null,
  advancers: 0,
  decliners: 0,
};

function useCountUp(target: number | null) {
  const [displayed, setDisplayed] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const fromRef = useRef(INDEX_BASE_VALUE);

  useEffect(() => {
    if (target === null) return;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

    const from = fromRef.current;
    const firstRun = from === INDEX_BASE_VALUE;
    const duration = firstRun ? 1400 : 600;
    const easeExp = firstRun ? 4 : 2;
    const startedAt = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, easeExp);

      setDisplayed(from + (target - from) * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      setDisplayed(target);
      fromRef.current = target;
      rafRef.current = null;
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target]);

  return displayed;
}

function useSparkSeries() {
  const [series, setSeries] = useState<number[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/index/history?range=1Y", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<IndexHistoryPayload>;
      })
      .then((json) => {
        const values = (json.data ?? [])
          .map((point) => Number(point.value))
          .filter(Number.isFinite);

        setSeries(values);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setSeries([]);
        }
      });

    return () => controller.abort();
  }, []);

  return series;
}

function useMarketClock(marketOpen: boolean) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = marketOpen ? 10_000 : 60_000;
    const timer = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(timer);
  }, [marketOpen]);

  return new Date(now).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

function useValueFlash(indexValue: number | null) {
  const [flash, setFlash] = useState<ValueFlash>("");
  const previousRef = useRef<number | null>(null);

  useEffect(() => {
    if (indexValue === null) return;

    const previous = previousRef.current;
    previousRef.current = indexValue;

    if (previous === null || previous === indexValue) return;

    setFlash(indexValue > previous ? "pos" : "neg");
    const timer = setTimeout(() => setFlash(""), 700);
    return () => clearTimeout(timer);
  }, [indexValue]);

  return flash;
}

function buildHeroSeries(sparkSeries: number[], indexValue: number | null) {
  if (!sparkSeries.length) {
    return indexValue === null ? [] : [INDEX_BASE_VALUE, indexValue];
  }

  if (indexValue === null) return sparkSeries;

  const last = sparkSeries[sparkSeries.length - 1];
  return Math.abs(last - indexValue) < 0.01 ? sparkSeries : [...sparkSeries, indexValue];
}

export function useIndexDashboardModel() {
  const { currency, setCurrency } = useCurrency();
  const { data, isLoading, error, refresh } = useIndexData(currency);
  const sparkSeries = useSparkSeries();
  const marketOpen = isMarketOpen();
  const nowIST = useMarketClock(marketOpen);

  const indexValue = data?.indexValue ?? null;
  const stocks = data?.stocks ?? EMPTY_STOCKS;
  const displayedValue = useCountUp(indexValue);
  const valueFlash = useValueFlash(indexValue);
  const heroSeries = useMemo(
    () => buildHeroSeries(sparkSeries, indexValue),
    [indexValue, sparkSeries]
  );
  const marketStats = data?.marketStats ?? EMPTY_MARKET_STATS;
  const dataLoaded = stocks.length > 0;
  const sinceInception =
    indexValue === null
      ? null
      : ((indexValue - INDEX_BASE_VALUE) / INDEX_BASE_VALUE) * 100;

  const heroStats = useMemo<HeroStat[]>(
    () => [
      { label: "52W High", value: formatNumber(marketStats.high52w, 0) },
      { label: "52W Low", value: formatNumber(marketStats.low52w, 0) },
      { label: "Adv", value: dataLoaded ? marketStats.advancers : "—", tone: "positive" },
      { label: "Dec", value: dataLoaded ? marketStats.decliners : "—", tone: "negative" },
    ],
    [dataLoaded, marketStats]
  );

  return {
    stocks,
    isLoading,
    dataError: error,
    refreshData: refresh,
    isStale: Boolean(data?.isStale),
    staleConstituents: data?.staleConstituents ?? [],
    marketOpen,
    nowIST,
    indexValue,
    portfolioValue: data?.portfolioValue ?? null,
    displayedValue,
    valueFlash,
    changePct: data?.indexChangePct ?? null,
    dayChange: data?.indexChangePct ?? 0,
    numCompanies: data?.numCompanies ?? COMPANIES.length,
    totalMarketCap: data?.totalMarketCap ?? null,
    usdInr: data?.usdInr ?? null,
    trifectaWeightPct: data?.trifectaWeightPct ?? null,
    sectorComposition: data?.sectorComposition ?? [],
    // `currency` matches the fetched values (for formatting); `selectedCurrency`
    // is the toggle state (for immediate button feedback before the refetch).
    currency: data?.currency ?? currency,
    selectedCurrency: currency,
    setCurrency,
    dataLoaded,
    sinceInception,
    heroSeries,
    heroStats,
  };
}

export type IndexDashboardModel = ReturnType<typeof useIndexDashboardModel>;
