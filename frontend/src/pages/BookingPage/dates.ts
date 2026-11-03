// Bron sanalari: sof mantiq (brauzersiz). Sana — "YYYY-MM-DD" matni; hisob-kitob UTC yarim tunida (yoz/qish vaqti siljitmaydi).

export const MAX_DAYS_AHEAD_LIMIT = 365

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

/** "2026-11-03" -> UTC Date; haqiqiy kalendar sanasi bo'lmasa (2026-02-30) null. */
export function parseYmd(value: unknown): Date | null {
  if (typeof value !== 'string') return null
  const m = YMD.exec(value)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  const date = new Date(Date.UTC(y, mo - 1, d))
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null
  return date
}

export function isYmd(value: unknown): value is string {
  return parseYmd(value) !== null
}

function ymdOfUtc(date: Date): string {
  return `${String(date.getUTCFullYear()).padStart(4, '0')}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`
}

/** Qurilmaning mahalliy "bugun"i (brauzer vaqt mintaqasi): server o'tgan vaqtlarni o'zi `past` deb belgilaydi. */
export function localYmd(now: Date = new Date()): string {
  return `${String(now.getFullYear()).padStart(4, '0')}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`
}

/** Restoran vaqt mintaqasi: loyihada hamma joyda Toshkent (moliya "bugun"i ham shunday). Sozlama shartnomada yo'q — keyinroq `config` dan olinishi mumkin. */
export const RESTAURANT_TZ = 'Asia/Tashkent'

/** Restoranning "bugun"i (mehmon xorijda bo'lsa ham Toshkent sanasi bo'yicha); mintaqa bilinmasa qurilma sanasi. */
export function restaurantYmd(now: Date = new Date(), timeZone: string = RESTAURANT_TZ): string {
  try {
    const ymd = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
    if (isYmd(ymd)) return ymd
  } catch {
    /* mintaqa ma'lumoti yo'q (juda eski brauzer): qurilma sanasi */
  }
  return localYmd(now)
}

/** Sanaga kun qo'shish (manfiy ham mumkin). Noto'g'ri sana -> o'zi qaytadi. */
export function addDays(ymd: string, days: number): string {
  const date = parseYmd(ymd)
  if (!date || !Number.isFinite(days)) return ymd
  date.setUTCDate(date.getUTCDate() + Math.trunc(days))
  return ymdOfUtc(date)
}

/** Ikki sana orasidagi kunlar (b - a). */
export function diffDays(a: string, b: string): number {
  const da = parseYmd(a)
  const db = parseYmd(b)
  if (!da || !db) return 0
  return Math.round((db.getTime() - da.getTime()) / 86_400_000)
}

/** JS tartibi: 0 = Yakshanba ... 6 = Shanba. */
export function jsWeekday(ymd: string): number {
  return parseYmd(ymd)?.getUTCDay() ?? 0
}

/** Server tartibi (`closed_weekdays`): 0 = Dushanba ... 6 = Yakshanba (Python `date.weekday()`). Shartnomada tartib yozilmagan —
 *  taxmin; to'g'ri tartib bo'lmasa server baribir `availability.closed = true` qaytaradi va kun yopiq deb ko'rsatiladi. */
export function serverWeekday(ymd: string): number {
  return (jsWeekday(ymd) + 6) % 7
}

export interface DayCell {
  ymd: string
  /** Bugundan necha kun keyin (0 = bugun) */
  offset: number
  /** JS tartibida (0 = Yakshanba) — Intl uchun emas, faqat ma'lumot */
  weekday: number
  closed: boolean
}

export function clampDaysAhead(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return 30
  return Math.min(MAX_DAYS_AHEAD_LIMIT, Math.max(0, Math.trunc(n)))
}

/** Sana lentasi: bugundan `max_days_ahead` kun keyingacha (ikkalasi ham kiradi); yopiq hafta kunlari `closed` bilan belgilanadi. */
export function buildDateStrip(todayYmd: string, maxDaysAhead: unknown, closedWeekdays: readonly number[] = []): DayCell[] {
  if (!isYmd(todayYmd)) return []
  const count = clampDaysAhead(maxDaysAhead)
  const closed = new Set(closedWeekdays.filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))
  const cells: DayCell[] = []
  for (let offset = 0; offset <= count; offset++) {
    const ymd = addDays(todayYmd, offset)
    cells.push({ ymd, offset, weekday: jsWeekday(ymd), closed: closed.has(serverWeekday(ymd)) })
  }
  return cells
}

/** Lentadagi birinchi ochiq kun (hammasi yopiq bo'lsa null). */
export function firstOpenDay(strip: readonly DayCell[]): string | null {
  return strip.find((c) => !c.closed)?.ymd ?? null
}

/** Sana lentasidagi katakka ko'rinadigan qismlar (tilga mos). `locale` — BCP-47 ("uz-UZ", "ru-RU", "en-US"). */
export interface DayLabels {
  weekday: string
  day: string
  month: string
  /** "chorshanba, 5-noyabr" */
  long: string
}

export function formatDay(ymd: string, locale: string): DayLabels {
  const date = parseYmd(ymd)
  if (!date) return { weekday: '', day: '', month: '', long: ymd }
  const fmt = (options: Intl.DateTimeFormatOptions): string => {
    try {
      return new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...options }).format(date)
    } catch {
      return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...options }).format(date)
    }
  }
  return {
    weekday: fmt({ weekday: 'short' }),
    day: String(date.getUTCDate()),
    month: fmt({ month: 'short' }),
    long: fmt({ weekday: 'long', day: 'numeric', month: 'long' }),
  }
}

/** "19:30" + 120 daqiqa -> "21:30" (yarim tundan o'tsa ham 24 soatlik aylanma). Noto'g'ri vaqt -> bo'sh matn. */
export function addMinutes(time: string, minutes: number): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time)
  if (!m || !Number.isFinite(minutes)) return ''
  const total = Number(m[1]) * 60 + Number(m[2]) + Math.trunc(minutes)
  const wrapped = ((total % 1440) + 1440) % 1440
  return `${pad2(Math.floor(wrapped / 60))}:${pad2(wrapped % 60)}`
}

/** "HH:MM" tekshiruvi (00:00 - 23:59). */
export function isTime(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const m = /^(\d{2}):(\d{2})$/.exec(value)
  return Boolean(m) && Number(m![1]) <= 23 && Number(m![2]) <= 59
}
