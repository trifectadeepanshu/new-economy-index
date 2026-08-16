export type AsyncCacheStatus = "hit" | "miss" | "coalesced" | "stale";

type CacheEntry<Value> = {
  value: Value;
  freshUntil: number;
  staleUntil: number;
};

export function createAsyncTtlCache<Value>({
  freshForMs,
  staleForMs,
  maxEntries = 100,
  now = Date.now,
  markStale,
}: {
  freshForMs: number;
  staleForMs: number;
  maxEntries?: number;
  now?: () => number;
  markStale?: (value: Value) => Value;
}) {
  const entries = new Map<string, CacheEntry<Value>>();
  const inFlight = new Map<string, Promise<Value>>();

  function staleValue(entry: CacheEntry<Value>) {
    return markStale ? markStale(entry.value) : entry.value;
  }

  function store(key: string, value: Value) {
    const loadedAt = now();
    if (!entries.has(key) && entries.size >= maxEntries) {
      const oldestKey = entries.keys().next().value;
      if (oldestKey !== undefined) entries.delete(oldestKey);
    }
    entries.delete(key);
    entries.set(key, {
      value,
      freshUntil: loadedAt + freshForMs,
      staleUntil: loadedAt + staleForMs,
    });
  }

  async function get(
    key: string,
    loader: () => Promise<Value>
  ): Promise<{ value: Value; status: AsyncCacheStatus }> {
    const requestedAt = now();
    const cached = entries.get(key);

    if (cached && requestedAt < cached.freshUntil) {
      entries.delete(key);
      entries.set(key, cached);
      return { value: cached.value, status: "hit" };
    }

    const pending = inFlight.get(key);
    if (pending) {
      try {
        return { value: await pending, status: "coalesced" };
      } catch (error) {
        if (cached && requestedAt < cached.staleUntil) {
          return { value: staleValue(cached), status: "stale" };
        }
        throw error;
      }
    }

    const request = loader().then((value) => {
      store(key, value);
      return value;
    });
    inFlight.set(key, request);

    try {
      return { value: await request, status: "miss" };
    } catch (error) {
      if (cached && requestedAt < cached.staleUntil) {
        return { value: staleValue(cached), status: "stale" };
      }
      throw error;
    } finally {
      if (inFlight.get(key) === request) inFlight.delete(key);
    }
  }

  return { get };
}
