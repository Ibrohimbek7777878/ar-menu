// Sayr uchun React ilgaklari: ma'lumot (bir marta, keshlangan), kirish tugmalari uchun "sayr bormi", sahna o'lchami.
import { useCallback, useEffect, useRef, useState } from 'react';
import { moduleEnabled } from '../../utils/brand';
import { tourClient } from './client';
import type { Size, TourData } from './types';

export type TourState =
  | { status: 'loading' }
  | { status: 'ready'; tour: TourData }
  | { status: 'disabled' }
  | { status: 'error' };

/** Sayr ma'lumoti: kirish tugmalari va /tour/ sahifasi bitta keshlangan so'rovdan foydalanadi. `reload` — qayta urinish (keshni chetlab). */
export function useTour(): { state: TourState; reload: () => void } {
  const [state, setState] = useState<TourState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const force = useRef(false);

  useEffect(() => {
    let alive = true;
    tourClient.load({ force: force.current }).then((result) => {
      if (!alive) return;
      setState(result.kind === 'ready' ? { status: 'ready', tour: result.tour } : { status: result.kind });
    });
    force.current = false;
    return () => {
      alive = false;
    };
  }, [attempt]);

  const reload = useCallback(() => {
    force.current = true;
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  return { state, reload };
}

/** Kirish nuqtalari: bo'lim yoqiq VA server sayrni berayotgan bo'lsa true (aks holda tugma umuman chizilmaydi). */
export function useTourEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    // Brend: bo'lim `tour` o'chirilgan bo'lsa so'rov ham yuborilmaydi
    if (!moduleEnabled('tour')) return undefined;
    let alive = true;
    tourClient.load().then((result) => alive && setEnabled(result.kind === 'ready'));
    return () => {
      alive = false;
    };
  }, []);
  return enabled;
}

/** Elementning hozirgi o'lchami (ResizeObserver). O'lchanmaguncha 0x0. */
export function useElementSize<T extends HTMLElement>(ref: React.RefObject<T | null>): Size {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const read = () => {
      const rect = el.getBoundingClientRect();
      const width = Math.round(rect.width);
      const height = Math.round(rect.height);
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    };
    if (typeof ResizeObserver === 'undefined') {
      // Eski WebView: oynani o'lchash hodisasi bilan (birinchi o'lchash keyingi taktda)
      const id = window.setTimeout(read, 0);
      window.addEventListener('resize', read);
      return () => {
        window.clearTimeout(id);
        window.removeEventListener('resize', read);
      };
    }
    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}
