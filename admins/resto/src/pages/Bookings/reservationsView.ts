/**
 * Bronlar ro'yxati mantiqi: serverdan kelganini tuzatib o'qish, saralash, filtr, hisoblar (kunlar lentasidagi sonlar,
 * bugungi statistika) va to'qnashuvni oldindan aniqlash. SOF mantiq: `node --test` bilan sinaladi.
 *
 * To'qnashuvni aniqlash FAQAT maslahat (ogohlantirish): yuklangan ro'yxat eskirgan yoki to'liq bo'lmasligi mumkin, oxirgi so'z
 * serverniki (409 `slot_taken`). Bron [vaqt, vaqt + davomiylik) oralig'ida stolni egallaydi; faqat faol holatlar egallaydi.
 */
import type { Reservation, ReservationTable } from './types.ts';
import { isActiveStatus, matchesFilter, STATUS_FILTERS } from './status.ts';
import type { StatusFilter } from './status.ts';
import { normalizeTime, parseTime } from './time.ts';

export const DEFAULT_DURATION_MINUTES = 120;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const text = (value: unknown): string => (typeof value === 'string' ? value : typeof value === 'number' ? String(value) : '');

function positiveInt(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.round(n) : fallback;
}

function readTable(raw: unknown): ReservationTable | null {
  if (!isRecord(raw)) return null;
  const id = typeof raw.id === 'number' ? raw.id : Number(raw.id);
  if (!Number.isFinite(id)) return null;
  const hall = isRecord(raw.hall) ? text(raw.hall.name) : text(raw.hall) || text(raw.hall_name);
  return { id, number: text(raw.number), hall };
}

/** Bitta bronni tuzatib o'qiydi; id bo'lmasa null (bunday yozuvni ko'rsatib bo'lmaydi). */
export function normalizeReservation(raw: unknown): Reservation | null {
  if (!isRecord(raw)) return null;
  const id = typeof raw.id === 'number' ? raw.id : Number(raw.id);
  if (!Number.isInteger(id)) return null;
  return {
    id,
    public_code: text(raw.public_code),
    table: readTable(raw.table),
    customer_name: text(raw.customer_name),
    customer_phone: text(raw.customer_phone),
    guests_count: positiveInt(raw.guests_count, 1),
    reservation_date: text(raw.reservation_date),
    reservation_time: normalizeTime(raw.reservation_time) ?? text(raw.reservation_time),
    duration_minutes: positiveInt(raw.duration_minutes, DEFAULT_DURATION_MINUTES),
    event_type: text(raw.event_type) || 'none',
    event_label: text(raw.event_label),
    notes: text(raw.notes),
    status: text(raw.status),
    status_display: text(raw.status_display),
    source: text(raw.source),
    created_at: text(raw.created_at),
  };
}

/** Javob `{count, results}` yoki oddiy massiv bo'lishi mumkin; yaroqsiz yozuvlar tashlanadi. */
export function reservationsFromResponse(raw: unknown): Reservation[] {
  const list = Array.isArray(raw) ? raw : isRecord(raw) && Array.isArray(raw.results) ? raw.results : [];
  const rows: Reservation[] = [];
  for (const item of list) {
    const row = normalizeReservation(item);
    if (row) rows.push(row);
  }
  return rows;
}

/** Sana, keyin vaqt, keyin id bo'yicha o'sish tartibida (asl ro'yxat o'zgarmaydi). */
export function sortReservations(rows: readonly Reservation[]): Reservation[] {
  return [...rows].sort((a, b) => {
    if (a.reservation_date !== b.reservation_date) return a.reservation_date < b.reservation_date ? -1 : 1;
    const ta = parseTime(a.reservation_time) ?? 0;
    const tb = parseTime(b.reservation_time) ?? 0;
    return ta !== tb ? ta - tb : a.id - b.id;
  });
}

export const filterByDate = (rows: readonly Reservation[], date: string): Reservation[] => rows.filter((row) => row.reservation_date === date);

export const filterByStatus = (rows: readonly Reservation[], filter: StatusFilter): Reservation[] => rows.filter((row) => matchesFilter(row.status, filter));

/** Har bir filtr chipi uchun son ("all" = hammasi). */
export function countByFilter(rows: readonly Reservation[]): Record<StatusFilter, number> {
  const counts = Object.fromEntries(STATUS_FILTERS.map((filter) => [filter, 0])) as Record<StatusFilter, number>;
  for (const filter of STATUS_FILTERS) counts[filter] = filter === 'all' ? rows.length : rows.filter((row) => matchesFilter(row.status, filter)).length;
  return counts;
}

/** "Bor" bron: bekor qilingan va kelmagan hisobga olinmaydi. */
export const countsAsBooked = (status: string): boolean => status !== 'cancelled' && status !== 'no_show';

export interface DaySummary {
  /** Bekor qilinmagan va kelmagan bronlar */
  total: number;
  /** Tasdiq kutayotganlar (diqqat belgisi uchun) */
  pending: number;
}

/** Kun bo'yicha sonlar (kunlar lentasidagi belgi uchun). */
export function summarizeByDate(rows: readonly Reservation[]): Map<string, DaySummary> {
  const map = new Map<string, DaySummary>();
  for (const row of rows) {
    if (!countsAsBooked(row.status)) continue;
    const entry = map.get(row.reservation_date) ?? { total: 0, pending: 0 };
    entry.total += 1;
    if (row.status === 'pending') entry.pending += 1;
    map.set(row.reservation_date, entry);
  }
  return map;
}

export interface TodayStats {
  total: number;
  pending: number;
  confirmed: number;
}

/** Bugungi kun statistikasi: jami (bekorsiz va kelmaganlarsiz), kutilmoqda, tasdiqlangan. */
export function todayStats(rows: readonly Reservation[], today: string): TodayStats {
  const stats: TodayStats = { total: 0, pending: 0, confirmed: 0 };
  for (const row of rows) {
    if (row.reservation_date !== today || !countsAsBooked(row.status)) continue;
    stats.total += 1;
    if (row.status === 'pending') stats.pending += 1;
    if (row.status === 'confirmed') stats.confirmed += 1;
  }
  return stats;
}

/** Sana bo'yicha guruhlash (qidiruv bir necha kunni qaytarganda sana sarlavhalari uchun). Saralangan ro'yxat kutiladi. */
export function groupByDate(rows: readonly Reservation[]): { date: string; rows: Reservation[] }[] {
  const groups: { date: string; rows: Reservation[] }[] = [];
  for (const row of rows) {
    const last = groups[groups.length - 1];
    if (last && last.date === row.reservation_date) last.rows.push(row);
    else groups.push({ date: row.reservation_date, rows: [row] });
  }
  return groups;
}

export interface ConflictQuery {
  tableId: number;
  date: string;
  time: string;
  /** Yangi/tahrirlanayotgan bronning davomiyligi (daqiqa) */
  duration: number;
  /** Tahrirda: bron o'zi bilan to'qnashmasin */
  excludeId?: number;
}

/** Shu stolning shu kunidagi, vaqti kesishadigan faol bronlar. */
export function findConflicts(rows: readonly Reservation[], query: ConflictQuery): Reservation[] {
  const start = parseTime(query.time);
  if (start === null || !Number.isFinite(query.tableId)) return [];
  const end = start + Math.max(1, query.duration);
  return rows.filter((row) => {
    if (row.id === query.excludeId || row.table?.id !== query.tableId || row.reservation_date !== query.date || !isActiveStatus(row.status)) return false;
    const otherStart = parseTime(row.reservation_time);
    if (otherStart === null) return false;
    const otherEnd = otherStart + Math.max(1, row.duration_minutes);
    return start < otherEnd && otherStart < end;
  });
}

/** Telefon qo'ng'irog'i havolasi: faqat raqamlar va boshidagi "+" qoladi. Raqam bo'lmasa null. */
export function phoneHref(phone: string): string | null {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 5) return null;
  return `tel:${trimmed.startsWith('+') ? '+' : ''}${digits}`;
}
