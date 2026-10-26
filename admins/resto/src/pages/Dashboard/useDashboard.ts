import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchDashboardSummary, DashboardSummary } from './api';
import { fetchWithSWR, getCached } from '@admins/shared';

const CACHE_KEY = 'resto:dashboard:summary';
const POLL_INTERVAL_MS = 15000;

export function useDashboard() {
  const [data, setData] = useState<DashboardSummary | null>(() => getCached<DashboardSummary>(CACHE_KEY) || null);
  const [loading, setLoading] = useState<boolean>(!data);
  const [error, setError] = useState<Error | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async (silent = false) => {
    if (!silent && !data) setLoading(true);
    try {
      const res = await fetchWithSWR(CACHE_KEY, fetchDashboardSummary, { ttlMs: 10000 });
      setData(res.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [data]);

  useEffect(() => {
    loadData();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (timerRef.current) clearInterval(timerRef.current);
      } else {
        loadData(true);
        startPolling();
      }
    };

    const startPolling = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        if (!document.hidden) {
          loadData(true);
        }
      }, POLL_INTERVAL_MS);
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadData]);

  return {
    data,
    loading,
    error,
    refresh: () => loadData(false),
  };
}
