/**
 * Belgi vaqt oralig'i: tekshiruv, standart qiymat, siljitish, "hozir ko'rinadimi", vaqt chizig'ida qatorlarga joylash.
 * SOF mantiq: faqat `./time.ts` ga tayanadi.
 */
import { round } from './time.ts';

/** Kadr vaqti aniqligi: video `currentTime` chegara qiymatidan sal chetga chiqib qolishi mumkin */
export const EPS = 0.05;
/** Oraliqning eng kichik uzunligi (soniya) */
export const MIN_GAP = 0.1;
/** AI taklifi video ustida shu masofa (soniya) ichida ko'rinadi */
export const SUGGESTION_WINDOW = 1.5;
/** Yangi belgi: hozirgi vaqtdan oldin / keyin (soniya) */
export const DEFAULT_BEFORE = 1;
export const DEFAULT_AFTER = 2.5;

export interface TimeRange {
  t_start: number;
  t_end: number;
}

export type RangeProblem = 'invalid' | 'negative' | 'order' | 'beyond';

/**
 * Oraliqni tekshiradi: `t_start < t_end`, hammasi [0, duration] ichida.
 * Davomiylik noma'lum (0/NaN) bo'lsa yuqori chegara tekshirilmaydi. Muammo yo'q bo'lsa null.
 */
export function validateRange(start: number, end: number, duration: number): RangeProblem | null {
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 'invalid';
  if (start < 0 || end < 0) return 'negative';
  if (end <= start) return 'order';
  if (Number.isFinite(duration) && duration > 0 && end > duration + EPS) return 'beyond';
  return null;
}

/** Yangi belgi oralig'i: hozirgi −1 s ... hozirgi +2.5 s, [0, duration] ichida, kamida MIN_GAP */
export function defaultRange(now: number, duration: number): TimeRange {
  const safeNow = Number.isFinite(now) && now > 0 ? now : 0;
  const hasDuration = Number.isFinite(duration) && duration > 0;
  let end = round(safeNow + DEFAULT_AFTER, 1);
  if (hasDuration) end = Math.min(end, round(duration, 1));
  let start = round(safeNow - DEFAULT_BEFORE, 1);
  start = Math.max(0, Math.min(start, end - 0.5));
  if (end - start < MIN_GAP) end = round(start + MIN_GAP, 2);
  return { t_start: round(start, 2), t_end: round(end, 2) };
}

/** Oraliqning bir chegarasini delta bilan siljitadi; ikkinchi chegaradan MIN_GAP yaqin kelmaydi, [0, duration] ichida qoladi */
export function nudgeBound(range: TimeRange, which: 'start' | 'end', delta: number, duration: number): TimeRange {
  const hasDuration = Number.isFinite(duration) && duration > 0;
  if (which === 'start') {
    const next = round(range.t_start + delta, 2);
    return { t_start: Math.max(0, Math.min(next, round(range.t_end - MIN_GAP, 2))), t_end: range.t_end };
  }
  let next = round(range.t_end + delta, 2);
  if (hasDuration) next = Math.min(next, round(duration, 2));
  return { t_start: range.t_start, t_end: Math.max(next, round(range.t_start + MIN_GAP, 2)) };
}

/** Chegarani aniq vaqtga qo'yadi (masalan "hozirgisini boshlanish qil"): ikkinchi chegara o'zgarmaydi, tartib buzilmasligi uchun siqiladi */
export function setBound(range: TimeRange, which: 'start' | 'end', value: number, duration: number): TimeRange {
  const v = Number.isFinite(value) ? Math.max(0, round(value, 2)) : 0;
  if (which === 'start') return { t_start: Math.min(v, round(range.t_end - MIN_GAP, 2)), t_end: range.t_end };
  const capped = Number.isFinite(duration) && duration > 0 ? Math.min(v, round(duration, 2)) : v;
  return { t_start: range.t_start, t_end: Math.max(capped, round(range.t_start + MIN_GAP, 2)) };
}

/** Tayyor uzunlik chipi: boshlanishdan `length` soniya (davomiylikdan oshmaydi) */
export function withLength(range: TimeRange, length: number, duration: number): TimeRange {
  const hasDuration = Number.isFinite(duration) && duration > 0;
  let end = round(range.t_start + length, 2);
  if (hasDuration) end = Math.min(end, round(duration, 2));
  let start = range.t_start;
  if (end - start < MIN_GAP) start = Math.max(0, round(end - MIN_GAP, 2));
  return { t_start: start, t_end: end };
}

/** Belgi `now` vaqtida ko'rinadimi (chegaralar EPS aniqligida kiradi) */
export function isVisibleAt(range: TimeRange, now: number): boolean {
  return Number.isFinite(now) && now >= range.t_start - EPS && now <= range.t_end + EPS;
}

export function visibleAt<T extends TimeRange>(items: readonly T[], now: number): T[] {
  return items.filter((item) => isVisibleAt(item, now));
}

/** AI taklifi `now` ga yaqinmi (±window) */
export function isNearTime(point: number, now: number, window: number = SUGGESTION_WINDOW): boolean {
  return Number.isFinite(now) && Number.isFinite(point) && Math.abs(now - point) <= window + 1e-9;
}

export function suggestedAt<T extends { t: number }>(items: readonly T[], now: number, window: number = SUGGESTION_WINDOW): T[] {
  return items.filter((item) => isNearTime(item.t, now, window));
}

/**
 * Vaqt chizig'ida oraliqlarni qatorlarga joylaydi: kesishmaydiganlar bir qatorda, kesishganlar boshqa-boshqa qatorda.
 * Qaytadi: har oraliq uchun qator raqami (kirish tartibida). `maxRows` dan oshsa oxirgi qatordan boshlab aylanadi.
 */
export function layoutRows(ranges: readonly TimeRange[], maxRows = 6): number[] {
  const order = ranges.map((range, index) => ({ range, index })).sort((a, b) => a.range.t_start - b.range.t_start || a.range.t_end - b.range.t_end);
  const rowEnds: number[] = [];
  const rows = Array.from({ length: ranges.length }, () => 0);
  for (const { range, index } of order) {
    let row = rowEnds.findIndex((end) => end <= range.t_start);
    if (row === -1) {
      row = rowEnds.length;
      rowEnds.push(range.t_end);
    } else {
      rowEnds[row] = range.t_end;
    }
    rows[index] = Math.min(row, Math.max(1, maxRows) - 1);
  }
  return rows;
}
