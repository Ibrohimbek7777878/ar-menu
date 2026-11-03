/**
 * Sanalar (ISO "YYYY-MM-DD") va kunlar lentasi. SOF mantiq: hech narsa import qilmaydi.
 *
 * Barcha hisob Toshkent vaqti (UTC+5) bo'yicha: O'zbekistonda yozgi/qishki vaqt yo'q, shuning uchun belgilangan siljish yetarli
 * (admins/shared/src/format/date.ts bilan bir xil). Brauzer vaqt zonasiga bog'liq emas: restoran Toshkentda, "bugun" ham Toshkentniki.
 * Hafta kuni raqami: 0 = Dushanba … 6 = Yakshanba (Python `date.weekday()` bilan bir xil; serverdagi `closed_weekdays` ham shunday deb qabul qilingan).
 */

const DAY_MS = 24 * 60 * 60 * 1000;
export const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;

/** Kunlar lentasida nechta kun ko'rsatiladi: bugun + keyingi 14 kun */
export const STRIP_DAYS = 15;
/** Qidiruv (ism/telefon/kod) paytida qancha orqaga va oldinga qaraladi (kun) */
export const SEARCH_DAYS_BACK = 60;
export const SEARCH_DAYS_AHEAD = 365;

const pad2 = (n: number): string => (n < 10 ? `0${n}` : String(n));

function toISO(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

/** Hozirgi Toshkent sanasi. `nowMs` testlar uchun. */
export function todayISO(nowMs: number = Date.now()): string {
  return toISO(new Date(nowMs + TASHKENT_OFFSET_MS));
}

/** Hozirgi Toshkent vaqti sutka boshidan daqiqada (0 … 1439). */
export function nowMinutes(nowMs: number = Date.now()): number {
  const local = new Date(nowMs + TASHKENT_OFFSET_MS);
  return local.getUTCHours() * 60 + local.getUTCMinutes();
}

/** "YYYY-MM-DD" -> {y, m, d}; haqiqiy kalendar sanasi bo'lmasa null ("2026-02-30" yaroqsiz). */
export function parseISODate(value: unknown): { y: number; m: number; d: number } | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return { y, m, d };
}

export const isISODate = (value: unknown): value is string => parseISODate(value) !== null;

function toUTC(iso: string): Date {
  const parts = parseISODate(iso);
  if (!parts) throw new RangeError(`Yaroqsiz sana: ${iso}`);
  return new Date(Date.UTC(parts.y, parts.m - 1, parts.d));
}

/** Sanaga kun qo'shadi (manfiy ham bo'ladi; oy va yil chegarasidan o'tadi). */
export function addDays(iso: string, days: number): string {
  return toISO(new Date(toUTC(iso).getTime() + days * DAY_MS));
}

/** Hafta kuni: 0 = Dushanba … 6 = Yakshanba. */
export function weekdayOf(iso: string): number {
  return (toUTC(iso).getUTCDay() + 6) % 7;
}

/** Ikki sana orasidagi kunlar (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((toUTC(b).getTime() - toUTC(a).getTime()) / DAY_MS);
}

/** ISO sanalar matn sifatida ham to'g'ri saralanadi, lekin aniqlik uchun alohida funksiya. */
export function compareISO(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function inRange(iso: string, from: string, to: string): boolean {
  return iso >= from && iso <= to;
}

export interface DayCell {
  iso: string;
  /** Oyning kuni (1 … 31) */
  day: number;
  /** Oy (0 … 11) */
  month: number;
  /** 0 = Dushanba … 6 = Yakshanba */
  weekday: number;
  /** Bugundan necha kun keyin (0 = bugun) */
  offset: number;
  isToday: boolean;
}

/** Kunlar lentasi: `today` dan boshlab `count` kun. */
export function buildDayStrip(today: string, count: number = STRIP_DAYS): DayCell[] {
  const size = Math.max(0, Math.floor(count));
  const cells: DayCell[] = [];
  for (let offset = 0; offset < size; offset += 1) {
    const iso = addDays(today, offset);
    const parts = parseISODate(iso)!;
    cells.push({ iso, day: parts.d, month: parts.m - 1, weekday: weekdayOf(iso), offset, isToday: offset === 0 });
  }
  return cells;
}

/** Lentaning birinchi va oxirgi kuni. */
export function stripBounds(today: string, count: number = STRIP_DAYS): { from: string; to: string } {
  return { from: today, to: addDays(today, Math.max(1, count) - 1) };
}

/** Qidiruv oynasi: bugundan SEARCH_DAYS_BACK kun orqaga, SEARCH_DAYS_AHEAD kun oldinga. */
export function searchBounds(today: string): { from: string; to: string } {
  return { from: addDays(today, -SEARCH_DAYS_BACK), to: addDays(today, SEARCH_DAYS_AHEAD) };
}
