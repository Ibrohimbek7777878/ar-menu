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
  // Unmount bo'lgandan keyin setState qilinmasligi uchun
  const mountedRef = useRef(true);
  // loadData barqaror bo'lishi uchun (har data o'zgarganda qayta yaratilmasin)
  const hasDataRef = useRef(data !== null);

  const loadData = useCallback(async (silent = false, force = false) => {
    if (!silent && !hasDataRef.current) setLoading(true);
    try {
      const res = await fetchWithSWR(CACHE_KEY, fetchDashboardSummary, {
        ttlMs: 10000,
        force,
        // Eskirgan kesh ko'rsatilgach, fonda kelgan yangi qiymat ekranga chiqadi
        onUpdate: (fresh) => {
          if (!mountedRef.current) return;
          hasDataRef.current = true;
          setData(fresh);
          setError(null);
        },
      });
      if (!mountedRef.current) return;
      hasDataRef.current = true;
      setData(res.data);
      setError(null);
    } catch (err) {
      // Xatoda eski qiymat (data) o'zgarmaydi
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (!silent && mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
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
      mountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadData]);

  return {
    data,
    loading,
    error,
    // "Yangilash" keshni chetlab o'tib, darrov yangi ma'lumot oladi
    refresh: () => loadData(false, true),
  };
}
