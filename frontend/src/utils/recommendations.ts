// Taom oynasidagi tavsiyalar: "Shunga o'xshash" (shu bo'lim) va "Qo'shimcha" (mos keladigan boshqa bo'lim).
// Hisob telefonda, allaqachon yuklangan menyudan olinadi: serverga qo'shimcha so'rov yo'q.
// Bo'lim turini egasi admin paneldan tanlaydi, bo'sh bo'lsa nomidan aniqlanadi (backend: categories/kinds.py).
import type { DishKind, Product } from '../types/dish'

// `tr` core.ts dan (i18n/index.ts Vite-ga xos `import.meta.glob` ishlatadi, uni `node --test` import qila olmaydi)
import { tr } from '../i18n/core.ts'

/** Asosiy taom -> salatlar, salat -> shirinliklar, shirinlik -> ichimliklar, ichimlik -> shirinliklar. */
export const COMPLEMENT_KINDS: Record<DishKind, readonly DishKind[]> = {
  main: ['salad'],
  salad: ['dessert'],
  dessert: ['drink'],
  drink: ['dessert'],
  other: [],
}

/** Sarlavhalar o'zbekcha kalit sifatida belgilangan; ko'rsatishda `t(COMPLEMENT_TITLES[kind])` chaqiriladi (DishSheet). */
export const COMPLEMENT_TITLES: Record<DishKind, string> = {
  main: tr("Qo'shimcha: salatlar"),
  salad: tr("Qo'shimcha: shirinliklar"),
  dessert: tr("Qo'shimcha: ichimliklar"),
  drink: tr("Qo'shimcha: shirinliklar"),
  other: tr("Qo'shimcha"),
}

/** Tavsiya (Hit) belgilangan taomlar oldinga; qolganlari menyudagi tartibida (saralash barqaror). */
const popularFirst = (a: Product, b: Product) => Number(Boolean(b.is_popular)) - Number(Boolean(a.is_popular))

export function similarDishes(current: Product, all: readonly Product[], limit = 8): Product[] {
  if (current.category_id == null) return []
  return all
    .filter((p) => p.id !== current.id && p.category_id === current.category_id)
    .sort(popularFirst)
    .slice(0, limit)
}

export function complementDishes(current: Product, all: readonly Product[], limit = 8): Product[] {
  const kinds = COMPLEMENT_KINDS[current.category_kind ?? 'other'] ?? []
  if (kinds.length === 0) return []
  return all
    .filter((p) => p.id !== current.id && p.category_kind !== undefined && kinds.includes(p.category_kind))
    .sort(popularFirst)
    .slice(0, limit)
}
