/**
 * Qo'lda bron qo'shish / bronni tahrirlash formasining holati, tekshiruvi va serverga yuboriladigan ma'lumot. SOF mantiq.
 *
 * Forma matnlarni satr sifatida saqlaydi (yozish paytida bo'sh qoldirish mumkin), tekshiruv natijasi esa KOD (matn emas):
 * kodni sahifa `t()` bilan matnga aylantiradi. Tekshiruv server qoidalariga (tables_restaurant/reservations.py) mos, lekin oxirgi
 * so'z baribir serverniki.
 */
import type { CreateReservationPayload, Reservation, UpdateReservationPayload } from './types.ts';
import { isISODate } from './dates.ts';
import { findConflicts } from './reservationsView.ts';
import { parseTime, normalizeTime } from './time.ts';

export const NAME_MIN = 2;
export const NAME_MAX = 120;
export const PHONE_MIN_DIGITS = 9;
export const PHONE_MAX_DIGITS = 15;
export const NOTES_MAX = 500;
export const GUESTS_MAX = 500;
/** Bugungi bron uchun: boshlanish vaqtidan shuncha daqiqa kech bo'lsa ham "o'tib ketgan" deb hisoblanmaydi (server bilan bir xil) */
export const PAST_GRACE_MINUTES = 15;

export interface ReservationForm {
  table_id: string;
  date: string;
  time: string;
  guests: string;
  name: string;
  phone: string;
  event_type: string;
  notes: string;
  /** Faqat yangi bronda: yaratilishi bilan "tasdiqlangan" bo'lsinmi */
  confirmNow: boolean;
}

export type FormField = 'table' | 'date' | 'time' | 'guests' | 'name' | 'phone' | 'event_type' | 'notes';

export type FormErrorCode =
  | 'table_required'
  | 'date_invalid'
  | 'date_past'
  | 'time_invalid'
  | 'guests_range'
  | 'name_short'
  | 'name_long'
  | 'phone_invalid'
  | 'notes_long';

export type FormErrors = Partial<Record<FormField, FormErrorCode>>;

export function emptyForm(options: { date: string; eventType?: string; time?: string; confirmNow?: boolean }): ReservationForm {
  return {
    table_id: '',
    date: options.date,
    time: options.time ?? '',
    guests: '2',
    name: '',
    phone: '',
    event_type: options.eventType ?? 'none',
    notes: '',
    confirmNow: options.confirmNow ?? true,
  };
}

export function formFromReservation(row: Reservation): ReservationForm {
  return {
    table_id: row.table ? String(row.table.id) : '',
    date: row.reservation_date,
    time: row.reservation_time,
    guests: String(row.guests_count),
    name: row.customer_name,
    phone: row.customer_phone,
    event_type: row.event_type || 'none',
    notes: row.notes,
    confirmNow: false,
  };
}

const digitsOf = (value: string): string => value.replace(/\D/g, '');

export interface ValidateContext {
  mode: 'create' | 'edit';
  /** Bugungi sana (Toshkent) */
  today: string;
  /** Tahrirda: asl bron (sana o'zgarmagan bo'lsa o'tgan sana xato emas) */
  original?: Reservation | null;
}

/** Forma xatolari (bo'sh obyekt = hammasi joyida). */
export function validateForm(form: ReservationForm, context: ValidateContext): FormErrors {
  const errors: FormErrors = {};
  const original = context.original ?? null;

  if (!form.table_id.trim() && (context.mode === 'create' || original?.table)) errors.table = 'table_required';

  if (!isISODate(form.date)) errors.date = 'date_invalid';
  else if (form.date < context.today && (context.mode === 'create' || form.date !== original?.reservation_date)) errors.date = 'date_past';

  if (parseTime(form.time) === null) errors.time = 'time_invalid';

  const guests = Number(form.guests);
  if (!/^\d+$/.test(form.guests.trim()) || guests < 1 || guests > GUESTS_MAX) errors.guests = 'guests_range';

  const name = form.name.trim().replace(/\s+/g, ' ');
  if (name.length < NAME_MIN) errors.name = 'name_short';
  else if (name.length > NAME_MAX) errors.name = 'name_long';

  const phoneDigits = digitsOf(form.phone);
  if (phoneDigits.length < PHONE_MIN_DIGITS || phoneDigits.length > PHONE_MAX_DIGITS) errors.phone = 'phone_invalid';

  if (form.notes.trim().length > NOTES_MAX) errors.notes = 'notes_long';
  return errors;
}

export const hasErrors = (errors: FormErrors): boolean => Object.keys(errors).length > 0;

const cleanName = (value: string): string => value.trim().replace(/\s+/g, ' ');

/** Yangi bron uchun `POST` tanasi (forma tekshiruvdan o'tgan deb hisoblanadi). */
export function createPayload(form: ReservationForm): CreateReservationPayload {
  const payload: CreateReservationPayload = {
    table_id: Number(form.table_id),
    date: form.date,
    time: normalizeTime(form.time) ?? form.time.trim(),
    guests: Number(form.guests),
    name: cleanName(form.name),
    phone: form.phone.trim(),
    event_type: form.event_type || 'none',
    notes: form.notes.trim(),
  };
  if (form.confirmNow) payload.status = 'confirmed';
  return payload;
}

/** Tahrir uchun `PATCH` tanasi: FAQAT o'zgargan maydonlar (bo'sh obyekt = o'zgarish yo'q). */
export function patchPayload(original: Reservation, form: ReservationForm): UpdateReservationPayload {
  const patch: UpdateReservationPayload = {};
  const tableId = form.table_id.trim() ? Number(form.table_id) : null;
  if (tableId !== null && tableId !== (original.table?.id ?? null)) patch.table_id = tableId;
  if (form.date !== original.reservation_date) patch.date = form.date;
  const time = normalizeTime(form.time) ?? form.time.trim();
  if (time !== (normalizeTime(original.reservation_time) ?? original.reservation_time)) patch.time = time;
  const guests = Number(form.guests);
  if (guests !== original.guests_count) patch.guests = guests;
  if (cleanName(form.name) !== cleanName(original.customer_name)) patch.name = cleanName(form.name);
  if (form.phone.trim() !== original.customer_phone.trim()) patch.phone = form.phone.trim();
  if ((form.event_type || 'none') !== (original.event_type || 'none')) patch.event_type = form.event_type || 'none';
  if (form.notes.trim() !== original.notes.trim()) patch.notes = form.notes.trim();
  return patch;
}

/** Formada saqlanmagan o'zgarish bormi (yopishdan oldin tasdiq so'rash uchun): boshlang'ich holat bilan solishtiriladi. */
export function isFormDirty(initial: ReservationForm, current: ReservationForm): boolean {
  const norm = (f: ReservationForm) =>
    JSON.stringify([f.table_id, f.date, normalizeTime(f.time) ?? f.time.trim(), f.guests.trim(), cleanName(f.name), f.phone.trim(), f.event_type, f.notes.trim(), f.confirmNow]);
  return norm(initial) !== norm(current);
}

/** Mehmonlar soni stol sig'imidan ortiqmi (maslahat ogohlantirishi; sig'im noma'lum bo'lsa false). */
export function exceedsCapacity(guests: string, capacity: number | null | undefined): boolean {
  const n = Number(guests);
  return Number.isInteger(n) && n > 0 && typeof capacity === 'number' && capacity > 0 && n > capacity;
}

export interface TakenQuery {
  tableId: number;
  date: string;
  times: readonly string[];
  duration: number;
  excludeId?: number;
}

/** Berilgan vaqtlardan qaysilari shu stol uchun band (yuklangan bronlarga ko'ra). */
export function takenTimes(rows: readonly Reservation[], query: TakenQuery): Set<string> {
  const taken = new Set<string>();
  for (const time of query.times) {
    if (findConflicts(rows, { tableId: query.tableId, date: query.date, time, duration: query.duration, excludeId: query.excludeId }).length > 0) {
      taken.add(time);
    }
  }
  return taken;
}

/** Tanlangan vaqtga eng yaqin bo'sh vaqt (teng uzoqlikda oldingisi); bo'sh vaqt yo'q bo'lsa null. */
export function nearestFreeTime(times: readonly string[], taken: ReadonlySet<string>, selected: string): string | null {
  const target = parseTime(selected);
  let best: { time: string; distance: number } | null = null;
  for (const time of times) {
    const minutes = parseTime(time);
    if (minutes === null || taken.has(time)) continue;
    const distance = target === null ? minutes : Math.abs(minutes - target);
    if (!best || distance < best.distance || (distance === best.distance && minutes < (parseTime(best.time) ?? Infinity))) best = { time, distance };
  }
  return best ? best.time : null;
}

/** Vaqt o'tib ketganmi: faqat bugun uchun, `PAST_GRACE_MINUTES` kechikish hisobga olinadi. */
export function isPastTime(date: string, time: string, today: string, nowMinutes: number): boolean {
  if (date !== today) return date < today;
  const minutes = parseTime(time);
  return minutes !== null && minutes < nowMinutes - PAST_GRACE_MINUTES;
}
