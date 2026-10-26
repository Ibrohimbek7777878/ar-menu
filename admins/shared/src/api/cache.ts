/**
 * Stale-While-Revalidate In-Memory Client Cache (~60 lines, no external dependencies).
 * TZ: 3.2, 1.1
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();

export interface CacheOptions {
  ttlMs?: number; // fresh duration in milliseconds (default 30 seconds)
}

export async function fetchWithSWR<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<{ data: T; isStale: boolean }> {
  const { ttlMs = 30000 } = options;
  const now = Date.now();
  const cached = memoryCache.get(key) as CacheEntry<T> | undefined;

  if (cached) {
    const isStale = now - cached.timestamp > ttlMs;
    if (isStale) {
      // Revalidate in background without blocking
      fetcher()
        .then((fresh) => {
          memoryCache.set(key, { data: fresh, timestamp: Date.now() });
        })
        .catch(() => {
          // Keep using cached on network error
        });
    }
    return { data: cached.data, isStale };
  }

  // Not in cache, fetch immediately
  const fresh = await fetcher();
  memoryCache.set(key, { data: fresh, timestamp: Date.now() });
  return { data: fresh, isStale: false };
}

export function invalidateCache(prefix?: string): void {
  if (!prefix) {
    memoryCache.clear();
    return;
  }
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }
}

export function getCached<T>(key: string): T | undefined {
  const entry = memoryCache.get(key) as CacheEntry<T> | undefined;
  return entry?.data;
}
