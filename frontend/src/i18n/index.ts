// Mehmon ilovasi tillari: O'zbekcha (asos) / Русский / English.
//
// Qoida: kodda har bir matn `t("O'zbekcha matn")` ko'rinishida yoziladi — O'ZBEKCHA MATNNING O'ZI kalit.
//   - uz uchun alohida lug'at yo'q: kalit o'zi ko'rsatiladi (yuklash ham, "kalit topilmadi" xatosi ham yo'q);
//   - ru va en lug'atlari `i18n/ru/*.ts` va `i18n/en/*.ts` (har fayl `{ "O'zbekcha": "Tarjima" }`), faqat tanlanganda yuklanadi;
//   - tarjimasi yo'q matn o'zbekcha ko'rinadi (sayt hech qachon bo'sh yoki buzuq matn ko'rsatmaydi);
//   - qiymat kiritish: `t('Savatda {n} ta taom', { n })`, ko'plik (rus/ingliz): `'{n} блюдо|{n} блюда|{n} блюд'` ('|' bilan, `n` bo'yicha tanlanadi).
// Matn LITERAL bo'lishi shart (o'zgaruvchi emas): `tests/i18n.test.ts` barcha `t('...')` chaqiruvlarini skanerlab, tarjimasi
// yo'q kalitni topadi.
// Tanlangan til: saqlangan tanlov -> Telegram/brauzer tili -> restoranning birinchi yoqilgan tili (admin: /ra/settings -> Tillar).

import { LANGS, isLang, langFromTag, parseEnabledLangs, translate, type Dict, type Lang } from './core'
export { LANGS, isLang, langFromTag, parseEnabledLangs, pluralIndex, translate, tr } from './core'
export type { Lang } from './core'

/** Til nomlari har doim o'z tilida (foydalanuvchi tilni nomidan taniydi). */
export const LANG_NAMES: Record<Lang, string> = { uz: "O'zbekcha", ru: 'Русский', en: 'English' }
const NUMBER_LOCALE: Record<Lang, string> = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-US' }
const STORAGE_KEY = 'guliston.lang'

// Har til alohida bo'lak: faqat tanlanganda yuklanadi (o'zbekcha tanlovda ru/en umuman yuklanmaydi)
const loaders: Record<Exclude<Lang, 'uz'>, () => Promise<{ default: Dict }>> = {
  ru: () => import('./ru/index'),
  en: () => import('./en/index'),
}

let current: Lang = 'uz'
let dict: Dict = {}
let enabled: readonly Lang[] = LANGS
const listeners = new Set<() => void>()

/** Matnni joriy tilga o'giradi. Kalit — o'zbekcha matn. */
export function t(key: string, params?: Record<string, string | number>): string {
  return translate(current, dict, key, params)
}

export function getLang(): Lang {
  return current
}

export function getEnabledLangs(): readonly Lang[] {
  return enabled
}

export function numberLocale(): string {
  return NUMBER_LOCALE[current]
}

/** Son: o'zbek/rus/ingliz guruhlash (150 000). */
export function fmtNum(n: number): string {
  return new Intl.NumberFormat(NUMBER_LOCALE[current]).format(n)
}

/** Narx: "150 000 so'm" / "150 000 сум" / "150,000 UZS". */
export function fmtMoney(n: number): string {
  return `${fmtNum(n)} ${t("so'm")}`
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

async function loadDict(lang: Lang): Promise<Dict> {
  if (lang === 'uz') return {}
  return (await loaders[lang]()).default
}

function readStored(): Lang | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return isLang(value) ? value : null
  } catch {
    return null
  }
}

/** Birinchi tashrif: Telegram foydalanuvchi tili, so'ng brauzer tillari. Yoqilgan tillardan birortasiga to'g'ri kelmasa null. */
function detectLang(allowed: readonly Lang[]): Lang | null {
  const tg = (window.Telegram?.WebApp?.initDataUnsafe?.user as { language_code?: string } | undefined)?.language_code
  const tags = [tg, ...(navigator.languages ?? [navigator.language])]
  for (const tag of tags) {
    const lang = langFromTag(tag)
    if (lang && allowed.includes(lang)) return lang
  }
  return null
}

function commit(lang: Lang, next: Dict): void {
  current = lang
  dict = next
  if (typeof document !== 'undefined') document.documentElement.lang = lang
  listeners.forEach((l) => l())
}

/**
 * Ilova ishga tushganda bir marta: yoqilgan tillarni belgilaydi va boshlang'ich tilni tanlaydi
 * (tarjima lug'ati yuklanmaguncha sahifa chizilmaydi: o'zbekcha yonib o'chib qolmasligi uchun).
 */
export async function initLang(enabledSetting: unknown): Promise<Lang> {
  enabled = parseEnabledLangs(enabledSetting)
  const stored = readStored()
  const lang = stored && enabled.includes(stored) ? stored : (detectLang(enabled) ?? enabled[0])
  try {
    commit(lang, await loadDict(lang))
  } catch {
    commit('uz', {}) // lug'at yuklanmasa (tarmoq uzilishi) sayt o'zbekcha ishlayveradi
  }
  return current
}

/** Tilni almashtirish: lug'at yuklangach hamma narsa qayta chiziladi; tanlov eslab qolinadi. */
export async function setLang(lang: Lang): Promise<void> {
  if (!enabled.includes(lang) || lang === current) return
  let next: Dict
  try {
    next = await loadDict(lang)
  } catch {
    return // yuklanmadi: joriy til o'zgarmaydi
  }
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    /* maxfiy rejim: eslab qolinmaydi, ish to'xtamaydi */
  }
  commit(lang, next)
}
