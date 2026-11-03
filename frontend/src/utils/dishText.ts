// Taom va bo'lim nomlari/tavsiflari (ma'lumot, kod emas): restoran egasi /ra/ dan rus va ingliz tarjimasini kiritadi.
// Tarjima bo'sh bo'lsa o'zbekcha ko'rinadi — menyu hech qachon bo'sh qolmaydi.
import type { Lang } from '../i18n/core'

interface Named {
  name: string
  name_ru?: string
  name_en?: string
}

interface Described {
  description?: string
  desc_ru?: string
  desc_en?: string
}

function pick(lang: Lang, base: string, ru?: string, en?: string): string {
  const chosen = lang === 'ru' ? ru : lang === 'en' ? en : ''
  return chosen && chosen.trim() ? chosen : base
}

export function dishName(product: Named, lang: Lang): string {
  return pick(lang, product.name, product.name_ru, product.name_en)
}

export function dishDescription(product: Described, lang: Lang): string {
  return pick(lang, product.description ?? '', product.desc_ru, product.desc_en)
}

export function categoryName(category: Named, lang: Lang): string {
  return pick(lang, category.name, category.name_ru, category.name_en)
}

// Server tayyor o'lchov matnini o'zbekcha yuboradi ("350 g", "620 kkal", "~15 daq"): birlik so'zi tilga o'giriladi.
const UNITS: Record<Exclude<Lang, 'uz'>, Record<string, string>> = {
  ru: { kkal: 'ккал', daq: 'мин', g: 'г', kg: 'кг', ml: 'мл', l: 'л', dona: 'шт', porsiya: 'порц.' },
  en: { kkal: 'kcal', daq: 'min', g: 'g', kg: 'kg', ml: 'ml', l: 'l', dona: 'pcs', porsiya: 'serving' },
}

export function localizeMeasure(text: string | undefined, lang: Lang): string {
  if (!text) return ''
  if (lang === 'uz') return text
  const map = UNITS[lang]
  return text.replace(/(\d)\s*(kkal|daq|kg|ml|dona|porsiya|g|l)\b/g, (_whole, digit: string, unit: string) => `${digit} ${map[unit] ?? unit}`)
}
