import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchTableData, fetchTour, fetchTours } from './api';
import type { TableData } from './api';
import { readFailure } from '../Bookings/errors';
import type { ApiFailure } from '../Bookings/errors';
import { usePoll } from './usePoll';
import type { Tour } from './types';

/** Qayta ishlash va AI kutilayotganda tekshirish oralig'i */
export const POLL_MS = 2000;
/** Shundan uzoq davom etsa kutish to'xtatiladi (ishchi to'xtab qolgan bo'lishi mumkin): foydalanuvchiga "qayta tekshirish" taklif qilinadi */
export const POLL_GIVE_UP_MS = 15 * 60 * 1000;

/** Sayrlar ro'yxati; qayta ishlanayotgan sayr bo'lsa holat o'zi yangilanadi. */
export function useTours() {
  const [tours, setTours] = useState<Tour[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<ApiFailure | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFailure(null);
    try {
      setTours(await fetchTours());
    } catch (err: unknown) {
      setFailure(readFailure(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const refreshQuietly = useCallback(async () => {
    setTours(await fetchTours());
  }, []);
  const anyProcessing = tours?.some((tour) => tour.status === 'processing') ?? false;
  usePoll(refreshQuietly, anyProcessing, 3000);

  return { tours, loading, failure, reload: load };
}

/** Stollar va zallar (bir marta). Xato bo'lsa bo'sh ro'yxat + `failure` (muharrir qo'lda ishlashda davom etadi). */
export function useTableData() {
  const [data, setData] = useState<TableData | null>(null);
  const [failure, setFailure] = useState<ApiFailure | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchTableData()
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setData({ tables: [], halls: [] });
          setFailure(readFailure(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(() => ({ data, loaded: data !== null, tables: data?.tables ?? [], halls: data?.halls ?? [], failure }), [data, failure]);
}

/**
 * Bitta sayr. `processing` yoki AI `running` davomida har 2 s yangilanadi (15 daqiqadan keyin to'xtaydi: `gaveUp`).
 * `apply` — o'zimiz o'zgartirgan (saqlash, e'lon) javobni qo'yadi va ortda qolgan eski so'rov natijasini bekor qiladi.
 */
export function useTour(id: number) {
  const [tour, setTour] = useState<Tour | null>(null);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [pollErrors, setPollErrors] = useState(0);
  const [gaveUp, setGaveUp] = useState(false);
  const versionRef = useRef(0);
  const sinceRef = useRef<number | null>(null);

  const apply = useCallback((next: Tour) => {
    versionRef.current += 1;
    setTour(next);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setFailure(null);
    try {
      apply(await fetchTour(id));
    } catch (err: unknown) {
      setFailure(readFailure(err));
    } finally {
      setLoading(false);
    }
  }, [id, apply]);

  useEffect(() => {
    void load();
  }, [load]);

  const waiting = tour !== null && (tour.status === 'processing' || tour.ai_status === 'running');

  // Kutish boshlandi/tugadi: vaqt sanog'i va "taslim bo'lish" qayta o'rnatiladi
  useEffect(() => {
    sinceRef.current = waiting ? Date.now() : null;
    setGaveUp(false);
    setPollErrors(0);
  }, [waiting]);

  const refresh = useCallback(async () => {
    const started = versionRef.current;
    try {
      const next = await fetchTour(id);
      setPollErrors(0);
      // O'zimiz yangi javob qo'ygan bo'lsak, so'rov boshlangandagi eski natija uni bosib ketmasin
      if (versionRef.current === started) setTour(next);
    } catch (err: unknown) {
      setPollErrors((n) => n + 1);
      throw err;
    }
    if (sinceRef.current !== null && Date.now() - sinceRef.current > POLL_GIVE_UP_MS) setGaveUp(true);
  }, [id]);

  usePoll(refresh, waiting && !gaveUp, POLL_MS);

  /** Taslim bo'lingan kutishni qayta boshlash */
  const resume = useCallback(() => {
    sinceRef.current = Date.now();
    setGaveUp(false);
  }, []);

  return { tour, loading, failure, reload: load, apply, pollErrors, gaveUp, resume };
}
