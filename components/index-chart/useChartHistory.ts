import { useEffect, useState } from "react";
import type { HistoryRange, IndexHistoryPayload } from "@/lib/index-api";
import type { HistoryState } from "@/components/index-chart/types";
import { useCurrency } from "@/components/index-dashboard/CurrencyContext";

const INITIAL_HISTORY_STATE: HistoryState = {
  range: null,
  historyData: [],
  sectorData: [],
  error: null,
};

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

export function useChartHistory(range: HistoryRange) {
  const { currency } = useCurrency();
  const [state, setState] = useState<HistoryState>(INITIAL_HISTORY_STATE);

  useEffect(() => {
    const controller = new AbortController();
    let ignore = false;

    fetch(`/api/index/history?range=${range}&includeSectors=1&currency=${currency}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<IndexHistoryPayload>;
      })
      .then((json) => {
        if (ignore) return;

        setState({
          range,
          historyData: json.data ?? [],
          sectorData: json.sectorData ?? [],
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (ignore || isAbortError(error)) return;

        setState({
          range,
          historyData: [],
          sectorData: [],
          error: error instanceof Error ? error.message : "Failed to load chart data",
        });
      });

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [range, currency]);

  return { ...state, loading: state.range !== range };
}
