// Sayrdan chiqib (bron sahifasiga o'tib) qaytganda mehmon qolgan joyidan davom etadi. Brauzer xotirasi ixtiyoriy:
// maxfiy rejim / bloklangan bo'lsa jim o'tadi. Faqat shu qurilmada, shu seans uchun (sessionStorage).

export const RESUME_KEY = 'guliston.tour.resume'
/** Shundan eski yozuv e'tiborga olinmaydi (ms) */
export const RESUME_MAX_AGE_MS = 30 * 60_000

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function defaultStorage(): StorageLike | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage
  } catch {
    return null
  }
}

/** Joriy joyni eslab qolish. Boshiga yaqin (<1 s) bo'lsa — yozuv o'chiriladi (davom ettiradigan narsa yo'q). */
export function saveResume(time: number, duration: number, storage: StorageLike | null = defaultStorage(), now = Date.now()): void {
  try {
    if (!storage) return
    if (!Number.isFinite(time) || time < 1) {
      storage.removeItem(RESUME_KEY)
      return
    }
    storage.setItem(RESUME_KEY, JSON.stringify({ t: Math.round(time * 100) / 100, d: Math.round(duration * 10) / 10, at: now }))
  } catch {
    /* xotira yopiq: eslab qolinmaydi, ish to'xtamaydi */
  }
}

/** Eslab qolingan joy yoki null. Boshqa sayr (davomiylik farq qiladi), eskirgan, oxirga yaqin yozuv rad etiladi. */
export function readResume(duration: number, storage: StorageLike | null = defaultStorage(), now = Date.now()): number | null {
  try {
    if (!storage) return null
    const raw = storage.getItem(RESUME_KEY)
    if (!raw) return null
    const data: unknown = JSON.parse(raw)
    if (typeof data !== 'object' || data === null) return null
    const { t: time, d, at } = data as { t?: unknown; d?: unknown; at?: unknown }
    if (typeof time !== 'number' || typeof d !== 'number' || typeof at !== 'number') return null
    if (!Number.isFinite(time) || time < 1 || now - at > RESUME_MAX_AGE_MS || now < at) return null
    if (duration > 0) {
      if (Math.abs(d - duration) > 1.5) return null // boshqa video
      if (time > duration - 1) return null // deyarli oxirida: boshidan boshlash qulayroq
    }
    return time
  } catch {
    return null
  }
}
