// Brend atamalari (stol/zal, mehmon, restoran) tarjima bilan: `brand.ts` sof qism, bu yerda esa joriy til (`t`) ulanadi.
//   termT('table')       — atama: maxsus bo'lsa egasi yozgan matn (tarjima QILINMAYDI), aks holda t('Stol') (ru: Стол, en: Table)
//   tm(t('Stol #{num}', { num }))  — tayyor tarjima qilingan matndagi standart atama o'zagini almashtiradi (maxsus atama bo'lmasa matn o'zgarmaydi)
//   heroT('title')       — bosh sahifa sarlavhasi/matni joriy tilda: standart (shablon) matn ru/en da tarjimasi bilan, egasi yozgani o'zbekcha; yo'q bo'lsa ''
// Shablon atamalari (Kafe, To'yxona, Zal/Stol) ham standart hisoblanadi va tarjima qilinadi; egasi yozgan boshqa atama — tarjimasiz.
// Kalit `t()` ichida LITERAL qoladi (tm uni o'rab oladi), shuning uchun tarjima to'liqligi testi (tests/i18n.test.ts) avvalgidek tekshiradi.
import type { BrandTermKey } from '../core/auth/types'
import { getLang, t } from '../i18n'
import { applyTerms, getBrand, heroTextFor, term, type HeroField } from './brand'

/** Atama (sarlavha, yorliq): maxsus yoki tarjima qilingan standart. */
export function termT(key: BrandTermKey): string {
  return term(key, t)
}

/** Tayyor matndagi atama o'zagini brend atamasiga almashtiradi (yoki o'zgarishsiz qaytaradi). */
export function tm(text: string): string {
  return applyTerms(text, t)
}

/** Bosh sahifa sarlavhasi / matni joriy tilda (`brand.hero` + server `hero_i18n`); bo'sh qaytsa sahifa o'zining standart matnini chizadi. */
export function heroT(field: HeroField): string {
  return heroTextFor(getBrand(), field, getLang())
}
