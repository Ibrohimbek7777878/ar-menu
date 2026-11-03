// Mehmon sayti kun/tun rejimi (restoran sozlamasi `guest_theme`, admin: /ra/settings -> "Kun va tun").
//   off   — qorong'i rejim umuman yo'q, almashtirgich ko'rinmaydi
//   day   — standart: yangi mehmon "Kun" ko'radi, xohlasa almashtiradi (server bu holatda kalit yubormaydi)
//   night — yangi mehmon "Tun" ko'radi
//   auto  — telefon (Telegram'da — Telegram) mavzusiga ergashadi
// Mehmonning o'z tanlovi (Kun / Tun / Avto) brauzerda eslab qolinadi va sozlamadan ustun turadi.
// `<html data-theme="light|dark">` qiymati styles/darkTheme.css da ishlatiladi. Egasi qarori: dizayn tartibiga (`guest_design`) bog'liq emas.
import { currentPalette, PALETTE_CHROME } from './guestPalette.ts'

export type ThemeSetting = 'off' | 'day' | 'night' | 'auto'
export type ThemePref = 'day' | 'night' | 'auto'
export type ResolvedTheme = 'light' | 'dark'

const SETTINGS: readonly string[] = ['off', 'day', 'night', 'auto']
const PREFS: readonly string[] = ['day', 'night', 'auto']
const STORAGE_KEY = 'guliston.theme'

/** Noma'lum qiymat (eskirgan server, buzilgan JSON) -> 'day'. */
export function parseThemeSetting(value: unknown): ThemeSetting {
  return typeof value === 'string' && SETTINGS.includes(value) ? (value as ThemeSetting) : 'day'
}

export function parseThemePref(value: unknown): ThemePref | null {
  return typeof value === 'string' && PREFS.includes(value) ? (value as ThemePref) : null
}

/** Tanlov + tizim mavzusi -> amaldagi mavzu. */
export function resolveTheme(pref: ThemePref, systemDark: boolean): ResolvedTheme {
  if (pref === 'night') return 'dark'
  if (pref === 'auto') return systemDark ? 'dark' : 'light'
  return 'light'
}

let setting: ThemeSetting = 'day'
let pref: ThemePref = 'day'
let resolved: ResolvedTheme = 'light'
const listeners = new Set<() => void>()

function readStored(): ThemePref | null {
  try {
    return parseThemePref(localStorage.getItem(STORAGE_KEY))
  } catch {
    return null
  }
}

function systemIsDark(): boolean {
  const tg = window.Telegram?.WebApp as { colorScheme?: string } | undefined
  if (tg?.colorScheme === 'dark' || tg?.colorScheme === 'light') return tg.colorScheme === 'dark'
  return Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches)
}

function paint(): void {
  const root = document.documentElement
  if (setting === 'off') {
    delete root.dataset.theme
    resolved = 'light'
  } else {
    resolved = resolveTheme(pref, systemIsDark())
    root.dataset.theme = resolved
  }
  // Telegram sarlavhasi / orqa foni va brauzer `theme-color`: palitraga (klassik yashil-krem yoki apelsin) mos
  const chrome = PALETTE_CHROME[currentPalette()][resolved]
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', chrome.header)
  if (setting !== 'off') {
    const tg = window.Telegram?.WebApp
    tg?.setHeaderColor?.(chrome.header)
    tg?.setBackgroundColor?.(chrome.background)
  }
  listeners.forEach((l) => l())
}

/** Ilova ishga tushganda: sozlama + saqlangan tanlov -> `<html data-theme>`; "Avto" bo'lsa tizim o'zgarishini kuzatadi. */
export function applyGuestTheme(): ResolvedTheme {
  setting = typeof window !== 'undefined' ? parseThemeSetting(window.__GULISTON_SESSION__?.theme) : 'off'
  pref = (setting === 'off' ? null : readStored()) ?? (setting === 'off' ? 'day' : (setting as ThemePref))
  if (typeof document === 'undefined') return 'light'
  paint()
  if (setting !== 'off') {
    window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
      if (pref === 'auto') paint()
    })
    const tg = window.Telegram?.WebApp as { onEvent?: (e: string, cb: () => void) => void } | undefined
    tg?.onEvent?.('themeChanged', () => {
      if (pref === 'auto') paint()
    })
  }
  return resolved
}

/** Almashtirgich ko'rinadimi (sozlama `off` bo'lsa yo'q). */
export function themeSwitchEnabled(): boolean {
  return setting !== 'off'
}

export function getThemePref(): ThemePref {
  return pref
}

export function getResolvedTheme(): ResolvedTheme {
  return resolved
}

export function setThemePref(next: ThemePref): void {
  if (setting === 'off') return
  pref = next
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    /* maxfiy rejim: eslab qolinmaydi */
  }
  paint()
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
