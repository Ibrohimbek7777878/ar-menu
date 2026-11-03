// Kun / Tun / Avto — mavzu mantiqining sof (brauzersiz) qismi: node:test shu fayl bilan tekshiradi.
// Mantiq mehmon saytiniki bilan BIR XIL (frontend/src/utils/guestTheme.ts), tanlov ham bir xil kalitda saqlanadi:
// ikkala sayt bir origin'da, shuning uchun mehmon menyusida tanlangan Tun admin panelda ham Tun bo'ladi.
// Parite tests/theme.test.ts da: mehmon funksiyalari bilan bir xil javob berishi tekshiriladi.
// `<html data-theme="light|dark">` qiymati palitra fayllarida (ui/palettes/*.css) ishlatiladi.

export type ThemePref = 'day' | 'night' | 'auto'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'guliston.theme'
export const THEME_PREFS: readonly ThemePref[] = ['day', 'night', 'auto']
/** Hech narsa tanlanmagan bo'lsa: "Kun" (mehmon saytining standarti ham shu). */
export const DEFAULT_THEME_PREF: ThemePref = 'day'

/** Brauzer paneli (theme-color) rangi: mehmon saytidagi TG_CHROME.header bilan bir xil. */
export const THEME_CHROME: Record<ResolvedTheme, string> = { light: '#FFFFFF', dark: '#1B1714' }

/** Noma'lum qiymat (buzilgan localStorage) -> null. */
export function parseThemePref(value: unknown): ThemePref | null {
  return typeof value === 'string' && (THEME_PREFS as readonly string[]).includes(value) ? (value as ThemePref) : null
}

/** Tanlov + tizim mavzusi -> amaldagi mavzu. */
export function resolveTheme(pref: ThemePref, systemDark: boolean): ResolvedTheme {
  if (pref === 'night') return 'dark'
  if (pref === 'auto') return systemDark ? 'dark' : 'light'
  return 'light'
}
