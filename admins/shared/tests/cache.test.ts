import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchWithSWR, invalidateCache, getCached } from '../src/api/cache.ts';

test('fetchWithSWR fetches and caches data', async () => {
  invalidateCache();
  let calls = 0;
  const fetcher = async () => {
    calls++;
    return { count: calls };
  };

  const res1 = await fetchWithSWR('test-key', fetcher, { ttlMs: 1000 });
  assert.equal(res1.data.count, 1);
  assert.equal(res1.isStale, false);

  // Ikkinchi chaqiruv keshdan oladi, fetcher qayta chaqirilmaydi
  const res2 = await fetchWithSWR('test-key', fetcher, { ttlMs: 1000 });
  assert.equal(res2.data.count, 1);
  assert.equal(res2.isStale, false);
  assert.equal(calls, 1);

  // getCached tekshiruvi
  const cached = getCached<{ count: number }>('test-key');
  assert.equal(cached?.count, 1);

  // Keshni tozalash
  invalidateCache('test-');
  assert.equal(getCached('test-key'), undefined);
});
