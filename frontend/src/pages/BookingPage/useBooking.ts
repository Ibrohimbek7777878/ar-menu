// Bron sahifasi uchun React ilgaklari: sozlama (bir marta, keshlangan), kirish nuqtalari uchun "bron yoqiqmi", availability (AbortController + kesh).
import { useCallback, useEffect, useRef, useState } from 'react';
import { BookingApiError, bookingClient, isAbortError } from './client';
import type { Availability, BookingConfig } from './types';
import { moduleEnabled } from '../../utils/brand';

export type ConfigState =
  | { status: 'loading' }
  | { status: 'ready'; config: BookingConfig }
  | { status: 'error' };

/** Sozlama: kirish nuqtalari va bron sahifasi bitta keshlangan so'rovdan foydalanadi. `reload` — qayta urinish (keshni chetlab). */
export function useBookingConfig(): { state: ConfigState; reload: () => void } {
  const [state, setState] = useState<ConfigState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const force = useRef(false);

  useEffect(() => {
    let alive = true;
    bookingClient
      .loadConfig({ force: force.current })
      .then((config) => alive && setState({ status: 'ready', config }))
      .catch(() => alive && setState({ status: 'error' }));
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

/** Kirish nuqtalari: faqat bron yoqiq va sozlama muvaffaqiyatli yuklangan bo'lsa true (aks holda tugma umuman chizilmaydi). */
export function useBookingEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    // Brend: bo'lim `booking` o'chirilgan bo'lsa sozlama so'ralmaydi va kirish tugmalari umuman chizilmaydi
    if (!moduleEnabled('booking')) return undefined;
    let alive = true;
    bookingClient
      .loadConfig()
      .then((config) => alive && setEnabled(config.enabled))
      .catch(() => alive && setEnabled(false));
    return () => {
      alive = false;
    };
  }, []);
  return enabled;
}

export type AvailabilityError = 'rate_limited' | 'failed';

export interface AvailabilityHook {
  /** Faqat so'ralgan sana uchun javob (boshqa sana eskirgan hisoblanadi: null) */
  data: Availability | null;
  loading: boolean;
  error: AvailabilityError | null;
  /** Keshni chetlab qayta so'rash (409 dan keyin, "qayta urinish") */
  refresh: () => void;
  /** Kesh eskirgan bo'lsagina qayta so'raydi (vaqt tanlanganda chaqiriladi) */
  ensureFresh: () => void;
}

interface AvailState {
  /** Oxirgi tugagan so'rov kaliti (muvaffaqiyat yoki xato): `loading` = joriy kalit hali tugamagan */
  settled: string | null;
  data: Availability | null;
  dataDate: string | null;
  error: AvailabilityError | null;
}

const GUESTS_DEBOUNCE_MS = 200;

/**
 * Sana + mehmon soni bo'yicha availability. Sana o'zgarsa darhol, faqat mehmon soni o'zgarsa 200 ms kutib so'raydi;
 * oldingi so'rov AbortController bilan bekor qilinadi, keshdagi yangi javob (20 s) tarmoqsiz ishlatiladi.
 * Holat faqat so'rov tugagach yoziladi (effekt ichida sinxron setState yo'q): `loading` va `error` joriy kalitdan hisoblanadi.
 */
export function useAvailability(date: string | null, guests: number, active: boolean): AvailabilityHook {
  const [state, setState] = useState<AvailState>({ settled: null, data: null, dataDate: null, error: null });
  const [forceTick, setForceTick] = useState(0);
  const [freshTick, setFreshTick] = useState(0);
  const handledForce = useRef(0);
  const lastDate = useRef<string | null>(null);
  const key = `${date}|${guests}|${forceTick}`;

  useEffect(() => {
    if (!active || !date) return;
    const forced = handledForce.current !== forceTick;
    handledForce.current = forceTick;
    const cached = !forced && bookingClient.peekAvailability(date, guests) !== null;
    const delay = cached || forced || lastDate.current !== date ? 0 : GUESTS_DEBOUNCE_MS;
    const ctl = new AbortController();
    const timer = window.setTimeout(() => {
      bookingClient
        .loadAvailability(date, guests, { signal: ctl.signal, force: forced })
        .then((data) => {
          if (ctl.signal.aborted) return;
          lastDate.current = date;
          setState({ settled: key, data, dataDate: date, error: null });
        })
        .catch((err: unknown) => {
          if (ctl.signal.aborted || isAbortError(err)) return;
          lastDate.current = date;
          const rate = err instanceof BookingApiError && err.status === 429;
          setState((s) => ({ ...s, settled: key, error: rate ? 'rate_limited' : 'failed' }));
        });
    }, delay);
    return () => {
      window.clearTimeout(timer);
      ctl.abort();
    };
  }, [date, guests, active, forceTick, freshTick, key]);

  const refresh = useCallback(() => setForceTick((n) => n + 1), []);
  const ensureFresh = useCallback(() => setFreshTick((n) => n + 1), []);

  const settled = state.settled === key;
  return {
    data: state.dataDate === date ? state.data : null,
    loading: active && date !== null && !settled,
    error: settled ? state.error : null,
    refresh,
    ensureFresh,
  };
}
