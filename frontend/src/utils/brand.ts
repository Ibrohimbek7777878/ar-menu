// Mehmon ilovasining BRENDI (restoran / kafe / to'yxona o'z nomi, logosi, matnlari, aloqasi, bo'limlari va atamalarini tugmalar orqali
// /ra/ -> Brend bo'limida sozlaydi). Server brendni `window.__GULISTON_SESSION__.brand` ichida beradi (core/auth/types.ts: `Brand`).
//
// Qoidalar:
//   - Brend YO'Q (kalit yo'q yoki obyekt emas) bo'lsa hozirgi ko'rinish AYNAN saqlanadi: har bir qiymat standartga tushadi.
//   - Har bir maydon alohida tekshiriladi: noto'g'ri tur / uzun / xavfli qiymat -> standart (sahifa hech qachon buzilmaydi).
//   - Bu fayl SOF (brauzer va React'siz): `node --test` bilan tekshiriladi. `t()` kerak bo'lgan qismlar `brandText.ts` da.
//   - Ranglarni frontend HISOBLAMAYDI: palitra `custom` bo'lsa server `<style id="brand-vars">` ni o'zi yozadi (kun va tun).
import type { BrandModuleKey, BrandTermKey } from '../core/auth/types.ts'
import { tr, type Lang } from '../i18n/core.ts'

export type BrandPalette = 'classic' | 'orange' | 'custom'
export type BrandFont = 'serif' | 'sans' | 'rounded'

export interface ResolvedBrand {
  /** Server brend yuborganmi (yo'q bo'lsa hamma narsa standart) */
  present: boolean
  name: string
  tagline: string
  logoUrl: string | null
  faviconUrl: string | null
  palette: BrandPalette | null
  primaryColor: string | null
  font: BrandFont | null
  hero: { title: string; subtitle: string; ctaText: string }
  /** Standart (biznes turi shabloni) bosh sahifa matnining ru/en tarjimasi; faqat server bergan maydonlar (egasi yozgan matn bu yerda YO'Q) */
  heroI18n: Record<'ru' | 'en', { title: string; subtitle: string }>
  contact: { phone: string; phone2: string; address: string; instagram: string; telegram: string; website: string; hoursText: string }
  modules: Record<BrandModuleKey, boolean>
  terms: Record<BrandTermKey, string>
}

export const MODULE_KEYS: readonly BrandModuleKey[] = ['menu', 'ar360', 'booking', 'tour', 'orders', 'waiter_call']
export const TERM_KEYS: readonly BrandTermKey[] = ['table', 'guest', 'venue']
const PALETTES: readonly string[] = ['classic', 'orange', 'custom']
const FONTS: readonly string[] = ['serif', 'sans', 'rounded']

/** Standart atamalar (o'zbekcha; tarjima `t()` orqali — `tr` belgisi tarjima to'liqligi testiga kalitni ko'rsatadi). */
export const DEFAULT_TERMS: Readonly<Record<BrandTermKey, string>> = {
  table: tr('Stol'),
  guest: tr('Mehmon'),
  venue: tr('Restoran'),
}

/**
 * Biznes turi shablonlarining atamalari (server: backend/shops/brand.py `BUSINESS_PRESETS`): restoran — Stol/Mehmon/Restoran, kafe — Kafe,
 * to'yxona — Zal/Stol va To'yxona. Mehmon sessiyasida `business_type` YO'Q, shuning uchun shablon atamasi egasi yozgan matndan faqat
 * MATN bo'yicha ajratiladi: ro'yxatdagi (harf registrisiz) so'z = standart -> ru/en da tarjima qilinadi (Kafe -> Кафе / Cafe);
 * ro'yxatda yo'q har qanday matn (masalan, "Zal", "Mijoz") = egasi yozgan -> TARJIMA QILINMAYDI.
 */
export const PRESET_TERMS: Readonly<Record<BrandTermKey, readonly string[]>> = {
  table: [DEFAULT_TERMS.table, tr('Zal/Stol')],
  guest: [DEFAULT_TERMS.guest],
  venue: [DEFAULT_TERMS.venue, tr('Kafe'), tr("To'yxona")],
}

const MAX = { name: 80, tagline: 160, heroTitle: 160, heroSubtitle: 400, cta: 40, short: 120, address: 300, hours: 400, term: 40, url: 500 }

function emptyBrand(): ResolvedBrand {
  return {
    present: false,
    name: '',
    tagline: '',
    logoUrl: null,
    faviconUrl: null,
    palette: null,
    primaryColor: null,
    font: null,
    hero: { title: '', subtitle: '', ctaText: '' },
    heroI18n: { ru: { title: '', subtitle: '' }, en: { title: '', subtitle: '' } },
    contact: { phone: '', phone2: '', address: '', instagram: '', telegram: '', website: '', hoursText: '' },
    modules: { menu: true, ar360: true, booking: true, tour: true, orders: true, waiter_call: true },
    terms: { ...DEFAULT_TERMS },
  }
}

/** Standart (brendsiz) holat — o'zgarmas, har chaqiruvda bitta obyekt. */
export const DEFAULT_BRAND: ResolvedBrand = Object.freeze(emptyBrand()) as ResolvedBrand

// ─── Maydonlarni tozalash (sof funksiyalar) ───────────────────────────────────

const isControl = (code: number) => code < 32 || code === 127

/** Matn: faqat satr; boshqaruv belgilari olib tashlanadi (`\n` ruxsat — ish vaqti ko'p qatorli bo'lishi mumkin), uzunlik cheklanadi. */
export function cleanText(value: unknown, max: number, multiline = false): string {
  if (typeof value !== 'string') return ''
  const unified = value.replace(/\r\n?/g, '\n')
  let text = ''
  for (const ch of unified) {
    const code = ch.charCodeAt(0)
    text += isControl(code) && !(multiline && code === 10) ? ' ' : ch
  }
  if (multiline) text = text.split('\n').map((line) => line.replace(/[ \t]+/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n')
  else text = text.replace(/\s+/g, ' ')
  return text.trim().slice(0, max).trim()
}

/** Rasm manzili: faqat saytning o'z yo'li (`/media/...`) yoki http(s). `javascript:`, `data:`, `//host` va probelli qiymat rad etiladi. */
export function safeImageUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const url = value.trim()
  if (!url || url.length > MAX.url || /[\s"'<>\\`]/.test(url) || Array.from(url).some((ch) => isControl(ch.charCodeAt(0)))) return null
  if (url.startsWith('/') && !url.startsWith('//')) return url
  if (/^https?:\/\/[^/]/i.test(url)) {
    try {
      const parsed = new URL(url)
      if ((parsed.protocol === 'http:' || parsed.protocol === 'https:') && !parsed.username && !parsed.password) return url
    } catch {
      return null
    }
  }
  return null
}

export function cleanColor(value: unknown): string | null {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value.trim()) ? value.trim().toUpperCase() : null
}

function cleanTerm(value: unknown, key: BrandTermKey): string {
  const text = cleanText(value, MAX.term)
  if (!text) return DEFAULT_TERMS[key]
  // Standart so'z (restoran shabloni yoki kafe/to'yxona shabloni atamasi; har qanday harf registrida) -> asl yozuvi: tarjima saqlanadi
  return PRESET_TERMS[key].find((preset) => preset.toLowerCase() === text.toLowerCase()) ?? text
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

/** Server brendi (ishonchsiz kirish) -> to'liq, tekshirilgan, standartlar bilan to'ldirilgan brend. */
export function parseBrand(raw: unknown): ResolvedBrand {
  if (!isObject(raw)) return DEFAULT_BRAND
  const b = emptyBrand()
  b.present = true
  b.name = cleanText(raw.name, MAX.name)
  b.tagline = cleanText(raw.tagline, MAX.tagline)
  b.logoUrl = safeImageUrl(raw.logo_url)
  b.faviconUrl = safeImageUrl(raw.favicon_url)
  b.palette = typeof raw.palette === 'string' && PALETTES.includes(raw.palette) ? (raw.palette as BrandPalette) : null
  b.primaryColor = cleanColor(raw.primary_color)
  b.font = typeof raw.font === 'string' && FONTS.includes(raw.font) ? (raw.font as BrandFont) : null
  if (isObject(raw.hero)) {
    b.hero = { title: cleanText(raw.hero.title, MAX.heroTitle), subtitle: cleanText(raw.hero.subtitle, MAX.heroSubtitle), ctaText: cleanText(raw.hero.cta_text, MAX.cta) }
  }
  if (isObject(raw.hero_i18n)) {
    for (const lang of ['ru', 'en'] as const) {
      const texts = raw.hero_i18n[lang]
      if (isObject(texts)) b.heroI18n[lang] = { title: cleanText(texts.title, MAX.heroTitle), subtitle: cleanText(texts.subtitle, MAX.heroSubtitle) }
    }
  }
  if (isObject(raw.contact)) {
    const c = raw.contact
    b.contact = {
      phone: cleanText(c.phone, MAX.short),
      phone2: cleanText(c.phone2, MAX.short),
      address: cleanText(c.address, MAX.address),
      instagram: cleanText(c.instagram, MAX.short),
      telegram: cleanText(c.telegram, MAX.short),
      website: cleanText(c.website, MAX.short),
      hoursText: cleanText(c.hours_text, MAX.hours, true),
    }
  }
  if (isObject(raw.modules)) {
    // Faqat aniq `false` bo'limni yashiradi; boshqa har qanday qiymat (yo'q, 0, "false", null) — standart (yoqiq)
    for (const key of MODULE_KEYS) if (raw.modules[key] === false) b.modules[key] = false
  }
  if (isObject(raw.terms)) {
    for (const key of TERM_KEYS) b.terms[key] = cleanTerm(raw.terms[key], key)
  }
  return b
}

// ─── Joriy brend (sessiyadan) ─────────────────────────────────────────────────

let cachedRaw: unknown
let cached: ResolvedBrand = DEFAULT_BRAND

function rawBrand(): unknown {
  return typeof window === 'undefined' ? undefined : window.__GULISTON_SESSION__?.brand
}

/** Sessiyadagi brend (tekshirilgan, standartlar bilan to'ldirilgan). Sessiya o'zgarmas: natija keshlanadi, havola barqaror. */
export function getBrand(): ResolvedBrand {
  const raw = rawBrand()
  if (raw !== cachedRaw) {
    cachedRaw = raw
    cached = parseBrand(raw)
  }
  return cached
}

/** React uchun: sessiya sahifa ochilgandan keyin o'zgarmaydi, shuning uchun oddiy chaqiruv (obuna kerak emas). */
export function useBrand(): ResolvedBrand {
  return getBrand()
}

/** Brend nomi; brend nomi yo'q bo'lsa `fallback` (sahifa o'z nomini bersa — o'sha, aks holda 'Guliston'). */
export function brandName(fallback = 'Guliston'): string {
  return getBrand().name || fallback
}

/**
 * Bo'lim yoqilganmi. Bog'liqlik: menyu o'chiq bo'lsa 360° va buyurtmalar ham mavjud emas (ular menyuga tayanadi).
 * `tour` (video sayr) kaliti tayyor; sayr bo'limi keyin qo'shiladi.
 */
export function moduleEnabled(key: BrandModuleKey): boolean {
  const { modules } = getBrand()
  if ((key === 'ar360' || key === 'orders') && !modules.menu) return false
  return modules[key]
}

/** Sof variant (sinash va server bilan solishtirish uchun): berilgan brend bo'yicha. */
export function moduleEnabledIn(brand: ResolvedBrand, key: BrandModuleKey): boolean {
  if ((key === 'ar360' || key === 'orders') && !brand.modules.menu) return false
  return brand.modules[key]
}

// ─── Atamalar ─────────────────────────────────────────────────────────────────

/** Atama brend tomonidan o'zgartirilganmi (standartdan farq qilsa true). */
export function isCustomTerm(key: BrandTermKey): boolean {
  return getBrand().terms[key] !== DEFAULT_TERMS[key]
}

/** Atama biznes turi shablonining standart atamasimi (Restoran / Kafe / To'yxona, Stol / Zal/Stol, Mehmon) — ya'ni tarjima qilinadimi. */
export function isPresetTerm(key: BrandTermKey, value: string = getBrand().terms[key]): boolean {
  return PRESET_TERMS[key].includes(value)
}

/**
 * Atama matni: egasi yozgan matn (shablon atamasi emas) — TARJIMA QILINMAYDI; standart (shablon) atama bo'lsa `translate(o'zbekcha)`
 * (ru/en tarjimasi saqlanadi: Kafe -> Кафе / Cafe). `translate` — `t` (brandText.ts), sof testlarda ixtiyoriy.
 */
export function term(key: BrandTermKey, translate: (text: string) => string = (text) => text): string {
  const value = getBrand().terms[key]
  return isPresetTerm(key, value) ? translate(value) : value
}

const escapeRe = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function matchCase(found: string, custom: string): string {
  const upper = found[0] !== found[0].toLowerCase()
  const acronym = custom.length > 1 && custom[1] !== custom[1].toLowerCase()
  if (upper) return custom[0].toUpperCase() + custom.slice(1)
  return acronym ? custom : custom[0].toLowerCase() + custom.slice(1)
}

/**
 * Tayyor (tarjima qilingan) matndagi standart atama o'zagini maxsus atamaga almashtiradi: "Stol #5" -> "Zal #5", "Stolni tanlang" -> "Zalni tanlang".
 * O'zbekcha qo'shimchalar (-ni, -ga, -lar, -ingiz) o'zakka qo'shiladi, shuning uchun o'zakni almashtirish to'g'ri ishlaydi; rus/ingliz
 * matnda ham standart so'z (Стол / Table) almashadi (maxsus atama tarjima qilinmaydi). Maxsus atama yo'q bo'lsa matn O'ZGARMAYDI.
 * `translate` — standart so'zning shu tildagi tarjimasi (`t`), ya'ni matnda aynan shu so'z turgan bo'ladi.
 */
export function applyTerms(text: string, translate: (text: string) => string = (value) => value): string {
  const { terms } = getBrand()
  const pairs: { from: string; to: string }[] = []
  for (const key of TERM_KEYS) {
    if (terms[key] === DEFAULT_TERMS[key]) continue
    const from = translate(DEFAULT_TERMS[key])
    // Shablon atamasi (Kafe, Zal/Stol ...) matn tilida tarjima qilinadi; egasi yozgan atama o'z holicha
    const to = isPresetTerm(key, terms[key]) ? translate(terms[key]) : terms[key]
    if (from && from.toLowerCase() !== to.toLowerCase()) pairs.push({ from, to })
  }
  if (!pairs.length || !text) return text
  // So'z boshi: oldidan harf/raqam yo'q (lookbehind ishlatilmaydi — eski iOS Safari uni bilmaydi)
  const re = new RegExp(`(^|[^\\p{L}\\p{N}])(${pairs.map((p) => escapeRe(p.from)).join('|')})`, 'giu')
  return text.replace(re, (whole, before: string, found: string) => {
    const pair = pairs.find((p) => found.toLowerCase().startsWith(p.from.toLowerCase()))
    return pair ? before + matchCase(found, pair.to) : whole
  })
}

// ─── Bosh sahifa matni (hero) ─────────────────────────────────────────────────

export type HeroField = 'title' | 'subtitle'

/**
 * Bosh sahifa sarlavhasi / matni berilgan tilda. Egasi o'zi yozgan matn TARJIMA QILINMAYDI (o'zbekcha qoladi); tarjima faqat server
 * `hero_i18n` bergan maydon uchun (ya'ni matn biznes turi shablonining standarti) va faqat ru/en da olinadi. Matn yo'q bo'lsa '' (sahifa
 * o'zining tarjima qilingan standartini ko'rsatadi).
 */
export function heroTextFor(brand: ResolvedBrand, field: HeroField, lang: Lang): string {
  const own = brand.hero[field]
  if (!own) return ''
  if (lang === 'uz') return own
  return brand.heroI18n[lang][field] || own
}

// ─── Aloqa ma'lumotlari ───────────────────────────────────────────────────────

export type ContactKind = 'phone' | 'phone2' | 'address' | 'instagram' | 'telegram' | 'website' | 'hours'

export interface ContactItem {
  kind: ContactKind
  /** Ko'rinadigan matn */
  text: string
  /** Havola (tel: / https://); manzil va ish vaqti uchun null */
  href: string | null
}

/** Telefon -> `tel:` havolasi (faqat raqam va bosh `+`); 7-15 raqam bo'lmasa null. */
export function telHref(value: string): string | null {
  const digits = value.replace(/\D/g, '')
  if (digits.length < 7 || digits.length > 15) return null
  const plus = value.trim().startsWith('+') || (digits.length === 12 && digits.startsWith('998'))
  return `tel:${plus ? '+' : ''}${digits}`
}

function httpUrl(value: string): URL | null {
  try {
    const url = new URL(value)
    if ((url.protocol !== 'http:' && url.protocol !== 'https:') || url.username || url.password) return null
    return url
  } catch {
    return null
  }
}

/** Ijtimoiy tarmoq: "@nom", "nom", "domen/nom" yoki to'liq http(s) havola -> {matn, https havola}; noto'g'ri bo'lsa null. */
export function socialLink(value: string, host: string, handleRe: RegExp, aliases: readonly string[]): { text: string; href: string } | null {
  const raw = value.trim()
  if (!raw) return null
  if (/^https?:\/\//i.test(raw)) {
    const url = httpUrl(raw)
    if (!url) return null
    const path = url.pathname.replace(/^\/+|\/+$/g, '')
    return { text: path ? `@${path.split('/')[0]}` : url.hostname, href: url.href }
  }
  const bare = raw.replace(/^@/, '')
  const aliasMatch = aliases.find((a) => bare.toLowerCase().startsWith(`${a}/`))
  if (aliasMatch) {
    const url = httpUrl(`https://${bare}`)
    if (!url) return null
    const path = url.pathname.replace(/^\/+|\/+$/g, '')
    return { text: path ? `@${path.split('/')[0]}` : url.hostname, href: url.href }
  }
  if (handleRe.test(bare)) return { text: `@${bare}`, href: `https://${host}/${bare}` }
  return null
}

/** Veb-sayt: sxemasiz yozilsa https qo'shiladi; faqat http(s) va nuqtali domen. */
export function websiteLink(value: string): { text: string; href: string } | null {
  const raw = value.trim()
  if (!raw) return null
  const url = httpUrl(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`)
  if (!url || !url.hostname.includes('.')) return null
  const text = (url.hostname + url.pathname).replace(/\/+$/, '').replace(/^www\./i, '')
  return { text, href: url.href }
}

/**
 * Aloqa bloki uchun faqat TO'LDIRILGAN va yaroqli maydonlar (tartib: telefon, manzil, ish vaqti, Instagram, Telegram, sayt).
 * Yaroqsiz havola (masalan, `javascript:`) ko'rsatilmaydi; to'ldirilgan, lekin havolaga aylanmaydigan telefon oddiy matn bo'ladi.
 */
export function contactItems(contact: ResolvedBrand['contact']): ContactItem[] {
  const items: ContactItem[] = []
  for (const kind of ['phone', 'phone2'] as const) {
    const text = contact[kind]
    if (text) items.push({ kind, text, href: telHref(text) })
  }
  if (contact.address) items.push({ kind: 'address', text: contact.address, href: null })
  if (contact.hoursText) items.push({ kind: 'hours', text: contact.hoursText, href: null })
  const insta = socialLink(contact.instagram, 'instagram.com', /^[A-Za-z0-9._]{1,30}$/, ['instagram.com', 'www.instagram.com'])
  if (insta) items.push({ kind: 'instagram', ...insta })
  const tg = socialLink(contact.telegram, 't.me', /^[A-Za-z0-9_]{3,32}$/, ['t.me', 'telegram.me', 'www.t.me'])
  if (tg) items.push({ kind: 'telegram', ...tg })
  const site = websiteLink(contact.website)
  if (site) items.push({ kind: 'website', ...site })
  return items
}

// ─── DOM: sarlavha, favicon, shrift ───────────────────────────────────────────

/**
 * Ilova ishga tushganda bir marta: `<title>` (brend nomi bor bo'lsa), favicon (`favicon_url` bor bo'lsa) va `<html data-font>`
 * (server shablon yozgan bo'lsa ham — Vite/dev rejimida ham to'g'ri bo'lishi uchun; brend shrift bermasa atribut O'ZGARMAYDI).
 * Brend yo'q bo'lsa hech narsaga tegmaydi.
 */
export function applyBrand(): ResolvedBrand {
  const brand = getBrand()
  if (typeof document === 'undefined' || !brand.present) return brand
  const root = document.documentElement
  if (brand.font) root.dataset.font = brand.font
  if (brand.name) document.title = brand.name
  if (brand.faviconUrl) {
    const links = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'))
    if (links.length) {
      for (const link of links) {
        link.href = brand.faviconUrl
        link.removeAttribute('type')
      }
    } else {
      const link = document.createElement('link')
      link.rel = 'icon'
      link.href = brand.faviconUrl
      document.head.appendChild(link)
    }
  }
  return brand
}
