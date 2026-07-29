import { useEffect, useState } from "react";
import type { IndexHistoryPayload } from "@/lib/index-api";
import {
  RANGE_KEY_TO_API,
  type RangeKey,
} from "@/components/index-chart/constants";
import type { HistoryState } from "@/components/index-chart/types";

const INITIAL_HISTORY_STATE: HistoryState = {
  signature: null,
  historyData: [],
  sectorData: [],
  portfolioData: [],
  benchmarks: [],
  error: null,
};

export type CustomRange = { from: string; to: string };

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

/** Build the history query + a stable signature for a preset or custom window. */
function buildRequest(rangeKey: RangeKey, custom: CustomRange | null) {
  const base = "includeSectors=1&benchmarks=1&portfolio=1";
  if (rangeKey === "CUSTOM" && custom) {
    const qs = `from=${custom.from}&to=${custom.to}&${base}`;
    return { url: `/api/index/history?${qs}`, signature: `CUSTOM:${custom.from}:${custom.to}` };
  }
  const apiRange = RANGE_KEY_TO_API[rangeKey === "CUSTOM" ? "1Y" : rangeKey];
  return { url: `/api/index/history?range=${apiRange}&${base}`, signature: apiRange };
}

export function useChartHistory(rangeKey: RangeKey, custom: CustomRange | null) {
  const [state, setState] = useState<HistoryState>(INITIAL_HISTORY_STATE);

  // A CUSTOM selection without both dates yet shouldn't fire a request.
  const pendingCustom = rangeKey === "CUSTOM" && (!custom?.from || !custom?.to);
  const { url, signature } = buildRequest(rangeKey, custom);

  useEffect(() => {
    if (pendingCustom) return;

    const controller = new AbortController();
    let ignore = false;

    fetch(url, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<IndexHistoryPayload>;
      })
      .then((json) => {
        if (ignore) return;
        setState({
          signature,
          historyData: json.data ?? [],
          sectorData: json.sectorData ?? [],
          portfolioData: json.portfolioData ?? [],
          benchmarks: json.benchmarks ?? [],
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (ignore || isAbortError(error)) return;
        setState({
          signature,
          historyData: [],
          sectorData: [],
          portfolioData: [],
          benchmarks: [],
          error: error instanceof Error ? error.message : "Failed to load chart data",
        });
      });

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [url, signature, pendingCustom]);

  return { ...state, loading: !pendingCustom && state.signature !== signature };
}
