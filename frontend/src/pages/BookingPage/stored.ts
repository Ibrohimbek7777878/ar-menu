// Mehmon qurilmasida eslab qolinadigan bron kodlari ("Sizning bronlaringiz"). Faqat kod va ko'rsatish uchun sana/stol:
// ism va telefon saqlanmaydi (umumiy qurilma, maxfiylik). Saqlash imkoni bo'lmasa (maxfiy rejim) sahifa baribir ishlaydi.
import { addDays, isTime, isYmd } from './dates.ts'
import type { BookingResult, StoredBooking } from './types.ts'

export const STORAGE_KEY = 'guliston.bookings'
export const MAX_STORED = 5
/** O'tib ketgan bronni shuncha kun ko'rsatamiz (holatini tekshirish uchun) */
const KEEP_PAST_DAYS = 1

function isStored(value: unknown): value is StoredBooking {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.code === 'string' && v.code.length > 0 && v.code.length <= 40 &&
    isYmd(v.date) && isTime(v.time) &&
    typeof v.tableNumber === 'string' && typeof v.hall === 'string' &&
    typeof v.guests === 'number' && typeof v.savedAt === 'number'
  )
}

/** Eskirgan/buzilgan yozuvlar tashlanadi; kelgusi bronlar oldin (sana, vaqt bo'yicha o'sish), keyin o'tganlar. */
export function pruneBookings(list: readonly StoredBooking[], todayYmd: string): StoredBooking[] {
  const oldest = addDays(todayYmd, -KEEP_PAST_DAYS)
  return list
    .filter((b) => b.date >= oldest)
    .sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)))
    .slice(0, MAX_STORED)
}

export function parseStored(raw: string | null, todayYmd: string): StoredBooking[] {
  if (!raw) return []
  try {
    const data: unknown = JSON.parse(raw)
    return Array.isArray(data) ? pruneBookings(data.filter(isStored), todayYmd) : []
  } catch {
    return []
  }
}

export function toStored(result: BookingResult, now: number): StoredBooking {
  return {
    code: result.public_code,
    date: result.date,
    time: result.time,
    tableNumber: result.tableNumber,
    hall: result.hall,
    guests: result.guests,
    savedAt: now,
  }
}

/** Yangi bronni ro'yxatga qo'shish (bir xil kod takrorlanmaydi). */
export function addStored(list: readonly StoredBooking[], entry: StoredBooking, todayYmd: string): StoredBooking[] {
  return pruneBookings([entry, ...list.filter((b) => b.code !== entry.code)], todayYmd)
}

export function readStored(todayYmd: string): StoredBooking[] {
  try {
    return parseStored(localStorage.getItem(STORAGE_KEY), todayYmd)
  } catch {
    return []
  }
}

export function saveStored(list: readonly StoredBooking[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    /* maxfiy rejim / joy yo'q: bron serverda saqlangan, faqat eslab qolinmaydi */
  }
}
