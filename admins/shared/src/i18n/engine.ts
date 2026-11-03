// Admin panel tillari: O'zbekcha (asos) / Русский / English. Mehmon ilovasi tizimi (frontend/src/i18n/index.ts) bilan bir xil g'oya.
//
// Qoida: kodda har bir matn `t("O'zbekcha matn")` ko'rinishida yoziladi — O'ZBEKCHA MATNNING O'ZI kalit.
//   - uz uchun alohida lug'at yo'q: kalit o'zi ko'rsatiladi;
//   - ru va en lug'atlari `{ "O'zbekcha": "Tarjima" }` ko'rinishidagi fayllar; har til BITTA bo'lak bo'lib, faqat tanlanganda yuklanadi;
//   - lug'atlarni ilovalar `registerDictionaries` bilan ulaydi (shared o'zinikini pastda ulaydi, resto: `admins/resto/src/i18n/register.ts`);
//   - tarjimasi yo'q matn o'zbekcha ko'rinadi (panel hech qachon bo'sh yoki buzuq matn ko'rsatmaydi);
//   - qiymat: `t('Savatda {n} ta', { n })`, ko'plik: `'{n} блюдо|{n} блюда|{n} блюд'` ('|' bilan, `n` bo'yicha tanlanadi).
// Matn LITERAL bo'lishi shart (o'zgaruvchi emas): tests skaneri `t('...')` chaqiruvlarini topib, tarjimasi yo'q kalitni aniqlaydi.
// Tanlangan til: saqlangan tanlov (`guliston.lang`, mehmon sayti bilan bir xil kalit) -> o'zbekcha.
//   Mehmon saytidan farqli: brauzer tilidan taxmin QILINMAYDI. Xodimlar o'zbekcha ishlaydi, inglizcha brauzerli xodimga panel
//   o'zi inglizcha bo'lib qolmasin; til faqat odam tanlaganda o'zgaradi.
import { LANGS, isLang, translate, type Dict, type Lang } from './core.ts'
export { LANGS, isLang, pluralIndex, translate, tr } from './core.ts'
export type { Dict, Lang } from './core.ts'

/** Til nomlari har doim o'z tilida (foydalanuvchi tilni nomidan taniydi). */
export const LANG_NAMES: Record<Lang, string> = { uz: "O'zbekcha", ru: 'Русский', en: 'English' }
export const LANG_STORAGE_KEY = 'guliston.lang'
const NUMBER_LOCALE: Record<Lang, string> = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-US' }

export type DictLoader = () => Promise<{ default: Dict }>
export type DictSource = Partial<Record<Exclude<Lang, 'uz'>, DictLoader>>

const sources: DictSource[] = []
let current: Lang = 'uz'
let dict: Dict = {}
const listeners = new Set<() => void>()

/** Matnni joriy tilga o'giradi. Kalit — o'zbekcha matn. */
export function t(key: string, params?: Record<string, string | number>): string {
  return translate(current, dict, key, params)
}

export function getLang(): Lang {
  return current
}

export function numberLocale(): string {
  return NUMBER_LOCALE[current]
}

/** Son: o'zbek/rus/ingliz guruhlash (150 000). */
export function fmtNum(n: number): string {
  return new Intl.NumberFormat(NUMBER_LOCALE[current]).format(n)
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function commit(lang: Lang, next: Dict): void {
  current = lang
  dict = next
  if (typeof document !== 'undefined') document.documentElement.lang = lang
  listeners.forEach((l) => l())
}

async function loadDict(lang: Lang): Promise<Dict> {
  if (lang === 'uz') return {}
  const parts = await Promise.all(sources.map((s) => s[lang]?.()))
  return Object.assign({}, ...parts.map((p) => p?.default ?? {})) as Dict
}

function readStored(): Lang | null {
  try {
    const value = localStorage.getItem(LANG_STORAGE_KEY)
    return isLang(value) ? value : null
  } catch {
    return null
  }
}

/**
 * Lug'at manbasini ulaydi (ilova ishga tushishidan oldin). Til allaqachon yuklangan bo'lsa, yangi bo'lak qo'shib, qayta chizadi.
 */
export function registerDictionaries(source: DictSource): void {
  sources.push(source)
  if (current !== 'uz') {
    const lang = current
    void loadDict(lang)
      .then((next) => {
        if (current === lang) commit(lang, next)
      })
      .catch(() => {
        /* tarmoq uzilishi: mavjud tarjima qoladi */
      })
  }
}

/** Ilova ishga tushganda bir marta: saqlangan tilni yuklaydi (lug'at kelmaguncha sahifa chizilmaydi: o'zbekcha yonib o'chmasin). */
export async function initLang(): Promise<Lang> {
  const lang = readStored() ?? 'uz'
  try {
    commit(lang, await loadDict(lang))
  } catch {
    commit('uz', {}) // lug'at yuklanmasa (tarmoq uzilishi) panel o'zbekcha ishlayveradi
  }
  return current
}

/** Tilni almashtirish: lug'at yuklangach hamma narsa qayta chiziladi; tanlov eslab qolinadi. */
export async function setLang(lang: Lang): Promise<void> {
  if (!LANGS.includes(lang) || lang === current) return
  let next: Dict
  try {
    next = await loadDict(lang)
  } catch {
    return // yuklanmadi: joriy til o'zgarmaydi
  }
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang)
  } catch {
    /* maxfiy rejim: eslab qolinmaydi, ish to'xtamaydi */
  }
  commit(lang, next)
}

// Umumiy (shared) komponentlar matnlari: Modal, Toast, sana va h.k. Har ilova uchun bir xil, shuning uchun shu yerda ulanadi.
registerDictionaries({
  ru: () => import('./ru.ts'),
  en: () => import('./en.ts'),
})
