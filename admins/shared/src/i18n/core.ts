// Tarjima tizimining sof (brauzersiz) qismi: node:test shu fayl bilan tekshiradi. Asosiy fayl: ./engine.ts
// G'oya mehmon ilovasiniki bilan BIR XIL (frontend/src/i18n/core.ts): o'zbekcha matnning o'zi kalit, ko'plik `|` bilan, qiymatlar `{n}`.
// Parite tests/i18n.test.ts da: mehmon funksiyalari bilan bir xil javob berishi tekshiriladi.

export type Dict = Record<string, string>

export type Lang = 'uz' | 'ru' | 'en'
export const LANGS: readonly Lang[] = ['uz', 'ru', 'en']
export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && (LANGS as readonly string[]).includes(value)
}

/** Ko'plik shakli indeksi: rus 0/1/2 (1 блюдо, 2 блюда, 5 блюд), ingliz 0/1, o'zbek doim 0. */
export function pluralIndex(lang: Lang, n: number): number {
  const abs = Math.abs(Math.trunc(n))
  if (lang === 'ru') {
    const m10 = abs % 10
    const m100 = abs % 100
    if (m10 === 1 && m100 !== 11) return 0
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 1
    return 2
  }
  if (lang === 'en') return abs === 1 ? 0 : 1
  return 0
}

export function translate(lang: Lang, dictionary: Dict, key: string, params?: Record<string, string | number>): string {
  // hasOwn: "constructor" kabi kalitlar Object.prototype'dan funksiya qaytarib yubormasin
  let text = Object.hasOwn(dictionary, key) ? dictionary[key] : key
  if (params && typeof params.n === 'number' && text.includes('|')) {
    const forms = text.split('|')
    text = forms[Math.min(pluralIndex(lang, params.n), forms.length - 1)]
  }
  if (params) text = text.replace(/\{(\w+)\}/g, (whole, name: string) => (name in params ? String(params[name]) : whole))
  return text
}

/** Tarjima uchun belgilash: modul darajasidagi ro'yxatlarda matn shu bilan yoziladi, ko'rsatishda `t(qiymat)` chaqiriladi. */
export const tr = (key: string): string => key
