import type { Currency, LiveIndexPayload } from "@/lib/index-api";
import { getLiveIndexPayload } from "@/lib/live-index";
import { createAsyncTtlCache, type AsyncCacheStatus } from "@/lib/async-ttl-cache";

export const LIVE_CACHE_TTL_SECONDS = 15;
export const LIVE_CACHE_STALE_SECONDS = 24 * 60 * 60;

export type LivePayloadCacheStatus = AsyncCacheStatus;

type LivePayloadLoader = (currency: Currency) => Promise<LiveIndexPayload>;

export function createLivePayloadCache({
  loader,
  now = Date.now,
  freshForMs = LIVE_CACHE_TTL_SECONDS * 1000,
  staleForMs = LIVE_CACHE_STALE_SECONDS * 1000,
}: {
  loader: LivePayloadLoader;
  now?: () => number;
  freshForMs?: number;
  staleForMs?: number;
}) {
  const cache = createAsyncTtlCache<LiveIndexPayload>({
    now,
    freshForMs,
    staleForMs,
    maxEntries: 2,
    markStale: (payload) => ({ ...payload, isStale: true }),
  });

  async function get(currency: Currency) {
    const { value, status } = await cache.get(currency, () => loader(currency));
    return { payload: value, status };
  }

  return { get };
}

const sharedLivePayloadCache = createLivePayloadCache({ loader: getLiveIndexPayload });

export const getSharedLiveIndexPayload = sharedLivePayloadCache.get;
