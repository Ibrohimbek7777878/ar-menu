import { useEffect, useRef } from 'react';

/**
 * `active` bo'lsa har `intervalMs` da `callback` ni chaqiradi (oldingisi tugagach: so'rovlar to'planib qolmaydi).
 * Yorliq yashirin paytda so'rov yuborilmaydi; qaytganda darrov tekshiradi. Xato ichida yutiladi (keyingi urinish davom etadi).
 */
export function usePoll(callback: () => Promise<void> | void, active: boolean, intervalMs: number): void {
  const latest = useRef(callback);
  useEffect(() => {
    latest.current = callback;
  });

  useEffect(() => {
    if (!active) return undefined;
    let cancelled = false;
    let running = false;
    let timer: number | undefined;

    const tick = async () => {
      if (cancelled || running) return;
      running = true;
      if (!document.hidden) {
        try {
          await latest.current();
        } catch {
          /* tarmoq uzilishi: keyingi urinishda qayta */
        }
      }
      running = false;
      if (!cancelled) timer = window.setTimeout(() => void tick(), intervalMs);
    };

    timer = window.setTimeout(() => void tick(), intervalMs);
    const onVisible = () => {
      if (document.hidden || cancelled || running) return;
      window.clearTimeout(timer);
      void tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [active, intervalMs]);
}
