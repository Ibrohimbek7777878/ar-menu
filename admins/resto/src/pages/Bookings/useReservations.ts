import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { tr } from '@admins/shared';
import { createReservation, fetchReservations, updateReservation } from './api';
import { buildDayStrip, inRange, searchBounds, stripBounds, todayISO } from './dates';
import { readFailure } from './errors';
import { countByFilter, filterByDate, filterByStatus, sortReservations, summarizeByDate, todayStats } from './reservationsView';
import type { StatusFilter } from './status';
import type { CreateReservationPayload, Reservation, UpdateReservationPayload } from './types';

/** Ro'yxat o'zi yangilanish davri: boshqa xodim yoki mehmon qo'shgan bron ko'rinib qolsin */
const POLL_MS = 30_000;
const SEARCH_DEBOUNCE_MS = 350;

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

const replaceRow = (rows: Reservation[], next: Reservation): Reservation[] => rows.map((row) => (row.id === next.id ? next : row));

/**
 * Bronlar ro'yxati holati.
 *  - "oyna": bugun + keyingi 14 kun bitta so'rov bilan (kunlar lentasidagi sonlar, bugungi statistika va tanlangan kun ro'yxati shundan);
 *  - "qo'shimcha" so'rov: qidiruv yozilganda (barcha kunlar bo'yicha) yoki lentadan tashqari sana tanlanganda.
 * Holat chiplari va saralash brauzerda (yuklangan ro'yxat ustida): bosganda darrov ishlaydi.
 */
export function useReservations() {
  const [today, setToday] = useState(() => todayISO());
  const [selectedDate, setSelectedDate] = useState(today);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const debouncedQuery = useDebounced(query.trim(), SEARCH_DEBOUNCE_MS);

  const strip = useMemo(() => buildDayStrip(today), [today]);
  const bounds = useMemo(() => stripBounds(today), [today]);
  const searching = debouncedQuery !== '';
  const needExtra = searching || !inRange(selectedDate, bounds.from, bounds.to);
  const extraFrom = searching ? searchBounds(today).from : selectedDate;
  const extraTo = searching ? searchBounds(today).to : selectedDate;

  const [windowRows, setWindowRows] = useState<Reservation[]>([]);
  const [windowLoading, setWindowLoading] = useState(true);
  const [windowError, setWindowError] = useState<string | null>(null);
  // Qo'shimcha ro'yxat qaysi so'rov (sana oralig'i + qidiruv) uchun yuklanganini eslab qoladi: so'rov o'zgarganda eskisi bir lahza ham ko'rinmaydi
  const extraKey = `${extraFrom}|${extraTo}|${debouncedQuery}`;
  const [extra, setExtra] = useState<{ key: string; rows: Reservation[] }>({ key: '', rows: [] });
  const [extraLoading, setExtraLoading] = useState(false);
  const [extraError, setExtraError] = useState<string | null>(null);

  // Eskirgan javob yangisini bosib ketmasin (tez-tez sana almashtirilganda)
  const windowSeq = useRef(0);
  const extraSeq = useRef(0);

  const loadWindow = useCallback(
    async (background: boolean) => {
      const seq = (windowSeq.current += 1);
      if (!background) setWindowLoading(true);
      try {
        const rows = await fetchReservations({ from: bounds.from, to: bounds.to });
        if (seq !== windowSeq.current) return;
        setWindowRows(rows);
        setWindowError(null);
      } catch (err: unknown) {
        // Orqa fondagi yangilash xatosi mavjud ro'yxatni buzmaydi; ko'rinadigan xato faqat foydalanuvchi so'rovida
        if (seq !== windowSeq.current || background) return;
        setWindowError(readFailure(err).message || tr("Bronlarni yuklab bo'lmadi"));
      } finally {
        // Yuklanish belgisi oxirgi so'rov tugaganda o'chadi (orqa fondagisi bo'lsa ham: aks holda skelet qotib qolishi mumkin)
        if (seq === windowSeq.current) setWindowLoading(false);
      }
    },
    [bounds.from, bounds.to],
  );

  const loadExtra = useCallback(
    async (background: boolean) => {
      const seq = (extraSeq.current += 1);
      if (!background) setExtraLoading(true);
      try {
        const rows = await fetchReservations({ from: extraFrom, to: extraTo, q: debouncedQuery || undefined });
        if (seq !== extraSeq.current) return;
        setExtra({ key: extraKey, rows });
        setExtraError(null);
      } catch (err: unknown) {
        if (seq !== extraSeq.current || background) return;
        setExtraError(readFailure(err).message || tr("Bronlarni yuklab bo'lmadi"));
      } finally {
        if (seq === extraSeq.current) setExtraLoading(false);
      }
    },
    [extraFrom, extraTo, debouncedQuery, extraKey],
  );

  useEffect(() => {
    void loadWindow(false);
  }, [loadWindow]);

  useEffect(() => {
    extraSeq.current += 1; // bekor qilingan/eskirgan so'rovlar natijasi tashlanadi
    setExtraError(null);
    if (!needExtra) {
      setExtraLoading(false);
      return;
    }
    void loadExtra(false);
  }, [needExtra, loadExtra]);

  // Avtomatik yangilash: ko'rinib turgan sahifada har 30 soniyada; sahifa qayta ko'rinsa darrov. Yarim tunda "bugun" almashadi.
  const todayRef = useRef(today);
  todayRef.current = today;
  useEffect(() => {
    const tick = () => {
      if (document.hidden) return;
      const now = todayISO();
      if (now !== todayRef.current) {
        const previous = todayRef.current;
        todayRef.current = now;
        setToday(now);
        setSelectedDate((selected) => (selected === previous ? now : selected));
        return; // `today` o'zgargani uchun oyna o'zi qayta yuklanadi
      }
      void loadWindow(true);
      if (needExtra) void loadExtra(true);
    };
    const timer = window.setInterval(tick, POLL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [loadWindow, loadExtra, needExtra]);

  const refresh = useCallback(() => {
    void loadWindow(false);
    if (needExtra) void loadExtra(false);
  }, [loadWindow, loadExtra, needExtra]);

  const refreshQuietly = useCallback(() => {
    void loadWindow(true);
    if (needExtra) void loadExtra(true);
  }, [loadWindow, loadExtra, needExtra]);

  const applyRow = useCallback((row: Reservation) => {
    setWindowRows((rows) => replaceRow(rows, row));
    setExtra((current) => ({ ...current, rows: replaceRow(current.rows, row) }));
  }, []);

  /** Holatni o'zgartiradi. Xatoni chaqiruvchi ushlaydi (xabarni o'zi ko'rsatadi). */
  const changeStatus = useCallback(
    async (row: Reservation, to: string): Promise<void> => {
      const updated = await updateReservation(row.id, { status: to });
      applyRow(updated ?? { ...row, status: to });
      refreshQuietly();
    },
    [applyRow, refreshQuietly],
  );

  const edit = useCallback(
    async (row: Reservation, patch: UpdateReservationPayload): Promise<void> => {
      const updated = await updateReservation(row.id, patch);
      if (updated) applyRow(updated);
      refreshQuietly();
    },
    [applyRow, refreshQuietly],
  );

  const create = useCallback(
    async (payload: CreateReservationPayload): Promise<void> => {
      await createReservation(payload);
      // Yangi bron qaysi kunga bo'lsa, ro'yxat o'sha kunni ko'rsatadi (qo'shilganini darrov ko'rish uchun)
      setQuery('');
      setSelectedDate(payload.date);
      refreshQuietly();
    },
    [refreshQuietly],
  );

  const extraReady = extra.key === extraKey;
  const visible = useMemo(
    () => sortReservations(needExtra ? (extraReady ? extra.rows : []) : filterByDate(windowRows, selectedDate)),
    [needExtra, extraReady, extra.rows, windowRows, selectedDate],
  );
  const counts = useMemo(() => countByFilter(visible), [visible]);
  const rows = useMemo(() => filterByStatus(visible, statusFilter), [visible, statusFilter]);
  const daySummary = useMemo(() => summarizeByDate(windowRows), [windowRows]);
  const stats = useMemo(() => todayStats(windowRows, today), [windowRows, today]);

  return {
    today,
    strip,
    selectedDate,
    setSelectedDate,
    query,
    setQuery,
    /** Qidiruv ishlayapti: ro'yxat barcha kunlar bo'yicha */
    searching,
    statusFilter,
    setStatusFilter,
    rows,
    counts,
    daySummary,
    stats,
    statsReady: !windowLoading && windowError === null,
    loading: needExtra ? extraLoading || !extraReady : windowLoading,
    error: needExtra ? extraError : windowError,
    refresh,
    changeStatus,
    edit,
    create,
  };
}
