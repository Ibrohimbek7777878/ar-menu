// Mehmon sayti fasl rangi (restoran sozlamasi `guest_season`, admin: /ra/settings -> "Fasl rangi").
// Server tayyor fasl nomini beradi (`auto` ni oyga qarab o'zi hisoblaydi): `window.__GULISTON_SESSION__.season`.
// Bu yerda faqat tekshirib `<html data-season>` ga qo'yamiz; ranglarning o'zi styles/seasons.css da.
import { getGuestPalette } from './guestPalette.ts'

export type GuestSeason = 'kuz' | 'qish' | 'bahor' | 'yoz'

const SEASONS: readonly string[] = ['kuz', 'qish', 'bahor', 'yoz']

/** Noma'lum qiymat (eskirgan server, buzilgan JSON) -> null: fasl qo'yilmaydi, ranglar o'zgarmaydi. */
export function parseGuestSeason(value: unknown): GuestSeason | null {
  return typeof value === 'string' && SEASONS.includes(value) ? (value as GuestSeason) : null
}

/** `<html data-season>`. Egasi qarori: imkoniyatlar dizayn tartibiga (`guest_design`) bog'liq emas; fasl yo'q/noto'g'ri bo'lsa atribut olib tashlanadi. */
export function applyGuestSeason(): GuestSeason | null {
  // Brend rangi (`custom` palitra) fasl rangidan USTUN: ikkalasi bir vaqtda brend tokenlarini yozmasligi uchun fasl qo'yilmaydi
  const season = typeof window !== 'undefined' && getGuestPalette() !== 'custom' ? parseGuestSeason(window.__GULISTON_SESSION__?.season) : null
  if (typeof document !== 'undefined') {
    if (season) document.documentElement.dataset.season = season
    else delete document.documentElement.dataset.season
  }
  return season
}
