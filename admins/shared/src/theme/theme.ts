// Kun / Tun / Avto — brauzer qismi: tanlovni eslab qoladi, `<html data-theme>` ni qo'yadi, tizim mavzusi o'zgarsa ("Avto") kuzatadi.
// Birinchi kadr uchun `backend/templates/admins/resto.html` dagi kichik skript xuddi shu mantiqni ilova yuklanishidan oldin bajaradi.
import {
  DEFAULT_THEME_PREF,
  THEME_CHROME,
  THEME_STORAGE_KEY,
  parseThemePref,
  resolveTheme,
  type ResolvedTheme,
  type ThemePref,
} from './core.ts'

let pref: ThemePref = DEFAULT_THEME_PREF
let resolved: ResolvedTheme = 'light'
let started = false
const listeners = new Set<() => void>()

function readStored(): ThemePref | null {
  try {
    return parseThemePref(localStorage.getItem(THEME_STORAGE_KEY))
  } catch {
    return null
  }
}

function systemIsDark(): boolean {
  try {
    return Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches)
  } catch {
    return false
  }
}

function paint(): void {
  resolved = resolveTheme(pref, systemIsDark())
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', resolved)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_CHROME[resolved])
  }
  listeners.forEach((l) => l())
}

/** Ilova ishga tushganda bir marta: saqlangan tanlov -> `<html data-theme>`; "Avto" bo'lsa tizim o'zgarishini kuzatadi. */
export function initTheme(): ResolvedTheme {
  pref = readStored() ?? DEFAULT_THEME_PREF
  paint()
  if (!started && typeof window !== 'undefined') {
    started = true
    try {
      window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
        if (pref === 'auto') paint()
      })
    } catch {
      /* eski brauzer: "Avto" faqat sahifa ochilganda hisoblanadi */
    }
  }
  return resolved
}

export function getThemePref(): ThemePref {
  return pref
}

export function getResolvedTheme(): ResolvedTheme {
  return resolved
}

export function setThemePref(next: ThemePref): void {
  pref = next
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next)
  } catch {
    /* maxfiy rejim: eslab qolinmaydi, ish to'xtamaydi */
  }
  paint()
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
