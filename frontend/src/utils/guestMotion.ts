// Mehmon sayti animatsiya darajasi (restoran sozlamasi `guest_motion`, admin: /ra/settings -> "Animatsiyalar").
//   full  — hozirgi va yangi animatsiyalar (standart; server bu holatda kalit yubormaydi)
//   light — faqat bir martalik effektlar, cheksiz animatsiyalarsiz
//   off   — animatsiyasiz
// Zaif qurilmada (ma'lumot tejash, xotira <= 2 GB, yadrolar <= 4) `full` o'zi `light` ga tushadi: arzon Android'da
// batareya va FPS uchun. `<html data-motion>` qiymati styles/motion.css da ishlatiladi.
export type GuestMotion = 'full' | 'light' | 'off'

const MODES: readonly string[] = ['full', 'light', 'off']

/** Noma'lum qiymat (eskirgan server, buzilgan JSON) -> 'full'. */
export function parseGuestMotion(value: unknown): GuestMotion {
  return typeof value === 'string' && MODES.includes(value) ? (value as GuestMotion) : 'full'
}

type NavigatorHints = {
  hardwareConcurrency?: number
  deviceMemory?: number
  connection?: { saveData?: boolean }
}

/** Brauzer aytgan belgilar bo'yicha zaif qurilma. Belgi yo'q bo'lsa (Safari, Firefox) zaif deb hisoblanmaydi. */
export function isWeakDevice(nav: NavigatorHints | undefined = typeof navigator === 'undefined' ? undefined : navigator): boolean {
  if (!nav) return false
  if (nav.connection?.saveData === true) return true
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory > 0 && nav.deviceMemory <= 2) return true
  if (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency > 0 && nav.hardwareConcurrency <= 4) return true
  return false
}

/** Sozlama + qurilma -> amaldagi daraja: faqat `full` zaif qurilmada `light` ga tushadi. */
export function resolveGuestMotion(setting: GuestMotion, weakDevice: boolean): GuestMotion {
  return setting === 'full' && weakDevice ? 'light' : setting
}

/** `<html data-motion>`: faqat yangi dizaynda; klassik dizaynda atribut olib tashlanadi (o'zgarmaydi). */
export function applyGuestMotion(design: 'new' | 'classic'): GuestMotion | null {
  const mode =
    design === 'new' && typeof window !== 'undefined'
      ? resolveGuestMotion(parseGuestMotion(window.__GULISTON_SESSION__?.motion), isWeakDevice())
      : null
  if (typeof document !== 'undefined') {
    if (mode) document.documentElement.dataset.motion = mode
    else delete document.documentElement.dataset.motion
  }
  return mode
}
