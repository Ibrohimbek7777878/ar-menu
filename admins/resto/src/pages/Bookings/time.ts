/**
 * Vaqt ("SS:DD") bilan ishlash. SOF mantiq: hech narsa import qilmaydi, `node --test` bilan sinaladi.
 *
 * Qoidalar:
 *  - vaqt sutka ichida: 00:00 … 23:59. "24:00" vaqt EMAS (faqat generatorda tugash chegarasi sifatida qabul qilinadi);
 *  - server "19:30:00" qaytarishi mumkin: ko'rsatishda soniyalar tashlanadi;
 *  - tunga o'tib ketadigan oraliq (20:00 → 02:00) qo'llab-quvvatlanmaydi: bron bitta sana ichida (generator xato qaytaradi).
 */

export const MINUTES_PER_DAY = 24 * 60;

export const MIN_STEP = 5;
export const MAX_STEP = 720;
/** Bitta generatsiyada eng ko'pi bilan nechta vaqt (15 daqiqalik qadam bilan butun sutka = 96) */
export const MAX_GENERATED = 96;
/** Generatorda taklif qilinadigan qadamlar (daqiqa) */
export const STEP_OPTIONS = [15, 20, 30, 45, 60, 90, 120] as const;

/** "H:MM" / "HH:MM" / "HH:MM:SS" -> sutka boshidan daqiqa; yaroqsiz bo'lsa null. "24:00" yaroqsiz. */
export function parseTime(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

const pad2 = (n: number): string => (n < 10 ? `0${n}` : String(n));

/** Daqiqa (0 … 1439) -> "SS:DD". Sutkadan oshgan qiymat sutka ichiga o'raladi (1500 -> "01:00"). */
export function formatTime(minutes: number): string {
  const wrapped = ((Math.round(minutes) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return `${pad2(Math.floor(wrapped / 60))}:${pad2(wrapped % 60)}`;
}

/** Yaroqli vaqtni "SS:DD" ko'rinishiga keltiradi ("9:05" -> "09:05", "19:30:00" -> "19:30"); yaroqsiz bo'lsa null. */
export function normalizeTime(value: unknown): string | null {
  const minutes = parseTime(value);
  return minutes === null ? null : formatTime(minutes);
}

/** Ko'rsatish uchun: yaroqli bo'lsa "SS:DD", aks holda asl matn (sahifa yiqilmasin, lekin bo'sh ham qolmasin). */
export function shortTime(value: unknown): string {
  return normalizeTime(value) ?? (typeof value === 'string' ? value : '');
}

/** Yaroqsizlarini tashlaydi, takrorlarini olib tashlaydi, o'sish tartibida saralaydi. */
export function sortUniqueTimes(times: readonly unknown[]): string[] {
  const seen = new Set<number>();
  for (const value of times) {
    const minutes = parseTime(value);
    if (minutes !== null) seen.add(minutes);
  }
  return [...seen].sort((a, b) => a - b).map(formatTime);
}

/** Mavjud ro'yxatga yangilarini qo'shadi (tartiblangan, takrorsiz). `added` — haqiqatan qo'shilganlar soni. */
export function mergeTimes(existing: readonly string[], incoming: readonly string[]): { times: string[]; added: number } {
  const before = sortUniqueTimes(existing);
  const times = sortUniqueTimes([...before, ...incoming]);
  return { times, added: times.length - before.length };
}

/** Bron oralig'i: "19:30–21:30". Davomiylik sutka chegarasidan oshsa tugash vaqti keyingi kunga o'raladi ("23:00–01:00"). */
export function timeRangeLabel(start: unknown, durationMinutes: number): string {
  const from = parseTime(start);
  if (from === null) return shortTime(start);
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) return formatTime(from);
  return `${formatTime(from)}–${formatTime(from + durationMinutes)}`;
}

export type GenerateError = 'invalid_start' | 'invalid_end' | 'invalid_step' | 'end_before_start' | 'too_many';

export type GenerateResult = { ok: true; times: string[] } | { ok: false; error: GenerateError };

/**
 * "Har N daqiqada" generatori: boshlanish dan tugashgacha (tugash ham kiradi) qadam bilan.
 *  - tugash "24:00" bo'lishi mumkin: sutka oxirigacha (23:59 dan keyingi vaqt yaratilmaydi);
 *  - tugash < boshlanish — xato (tunga o'tish yo'q); tugash = boshlanish — bitta vaqt;
 *  - qadam butun son, MIN_STEP … MAX_STEP; natija MAX_GENERATED dan oshsa xato (tasodifan yuzlab vaqt yaratilmasin).
 */
export function generateTimes(start: unknown, end: unknown, stepMinutes: unknown): GenerateResult {
  const from = parseTime(start);
  if (from === null) return { ok: false, error: 'invalid_start' };
  const to = typeof end === 'string' && end.trim() === '24:00' ? MINUTES_PER_DAY : parseTime(end);
  if (to === null) return { ok: false, error: 'invalid_end' };
  const step = typeof stepMinutes === 'number' ? stepMinutes : Number(stepMinutes);
  if (!Number.isInteger(step) || step < MIN_STEP || step > MAX_STEP) return { ok: false, error: 'invalid_step' };
  if (to < from) return { ok: false, error: 'end_before_start' };

  const times: string[] = [];
  for (let current = from; current <= to && current < MINUTES_PER_DAY; current += step) {
    times.push(formatTime(current));
    if (times.length > MAX_GENERATED) return { ok: false, error: 'too_many' };
  }
  return { ok: true, times };
}
