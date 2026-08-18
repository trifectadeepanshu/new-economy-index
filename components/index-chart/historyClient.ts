import type { IndexHistoryPayload } from "@/lib/index-api";
import {
  RANGE_KEY_TO_API,
  type RangeKey,
} from "@/components/index-chart/constants";

export type CustomRange = { from: string; to: string };

const historyRequests = new Map<string, Promise<IndexHistoryPayload>>();

/** Build the history query + a stable signature for a preset or custom window. */
export function buildHistoryRequest(rangeKey: RangeKey, custom: CustomRange | null) {
  const params = new URLSearchParams({
    includeSectors: "1",
    benchmarks: "1",
    portfolio: "1",
  });
  if (rangeKey === "CUSTOM" && custom) {
    params.set("from", custom.from);
    params.set("to", custom.to);
    return {
      url: `/api/index/history?${params.toString()}`,
      signature: `CUSTOM:${custom.from}:${custom.to}`,
    };
  }

  const apiRange = RANGE_KEY_TO_API[rangeKey === "CUSTOM" ? "1Y" : rangeKey];
  params.set("range", apiRange);
  return { url: `/api/index/history?${params.toString()}`, signature: apiRange };
}

/** Share identical history requests across the hero, chart, and sector views. */
export function getIndexHistory(url: string): Promise<IndexHistoryPayload> {
  const cached = historyRequests.get(url);
  if (cached) return cached;

  const request = fetch(url)
    .then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return (await response.json()) as IndexHistoryPayload;
    })
    .catch((error: unknown) => {
      historyRequests.delete(url);
      throw error;
    });

  historyRequests.set(url, request);
  return request;
}
