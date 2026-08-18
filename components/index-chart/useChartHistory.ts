import { useEffect, useState } from "react";
import { type RangeKey } from "@/components/index-chart/constants";
import {
  buildHistoryRequest,
  getIndexHistory,
  type CustomRange,
} from "@/components/index-chart/historyClient";
import type { HistoryState } from "@/components/index-chart/types";

export { buildHistoryRequest } from "@/components/index-chart/historyClient";
export type { CustomRange } from "@/components/index-chart/historyClient";

const INITIAL_HISTORY_STATE: HistoryState = {
  signature: null,
  historyData: [],
  sectorData: [],
  portfolioData: [],
  benchmarks: [],
  error: null,
};

export function useChartHistory(rangeKey: RangeKey, custom: CustomRange | null) {
  const [state, setState] = useState<HistoryState>(INITIAL_HISTORY_STATE);

  // A CUSTOM selection without both dates yet shouldn't fire a request.
  const pendingCustom = rangeKey === "CUSTOM" && (!custom?.from || !custom?.to);
  const { url, signature } = buildHistoryRequest(rangeKey, custom);

  useEffect(() => {
    if (pendingCustom) return;

    let ignore = false;

    getIndexHistory(url)
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
        if (ignore) return;
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
    };
  }, [url, signature, pendingCustom]);

  return { ...state, loading: !pendingCustom && state.signature !== signature };
}
