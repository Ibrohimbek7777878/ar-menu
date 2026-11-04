// Mehmon sayti ranglar palitrasi (restoran sozlamasi `guest_palette`; dizayn/tartib `guest_design` dan ALOHIDA).
//   classic — standart: yashil + krem + serif sarlavha (eski dizayn tili; server kalit yubormaydi)
//   orange  — muqobil: olovrang apelsin (avvalgi yangi palitra; o'chirilmagan, sozlama bilan qaytadi — AGENTS 4-qoida)
//   custom  — brend rangi (/ra/ -> Brend): BREND tokenlarini (kun va tun) server `<style id="brand-vars">` bilan yozadi (frontend rang HISOBLAMAYDI); neytral fon/matn tokenlari klassikniki
// Server `<html data-palette>` ni o'zi yozadi (birinchi kadrdan to'g'ri bo'lishi uchun). Sessiyada palitra ikki joyda kelishi mumkin:
// `brand.palette` (classic|orange|custom; ustun) va eski `palette` ('orange' bo'lganda). Brend yo'q bo'lsa avvalgidek.
// Bu yerda atribut yana bir bor (Vite/dev rejimida ham) qo'yiladi; ranglarning o'zi styles/palette.css va index.css da.
export type GuestPalette = 'classic' | 'orange' | 'custom'

/** Noma'lum qiymat (eskirgan server, buzilgan JSON) -> 'classic' (standart palitra). */
export function parseGuestPalette(value: unknown): GuestPalette {
  return value === 'orange' || value === 'custom' ? value : 'classic'
}

/** Sessiyadagi palitra (sessiya yo'q bo'lsa — standart): avval `brand.palette`, so'ng eski `palette` kaliti. */
export function getGuestPalette(): GuestPalette {
  if (typeof window === 'undefined') return 'classic'
  const session = window.__GULISTON_SESSION__
  const fromBrand = session?.brand?.palette
  if (fromBrand === 'classic' || fromBrand === 'orange' || fromBrand === 'custom') return fromBrand
  return parseGuestPalette(session?.palette)
}

/** `<html data-palette="classic|orange">`: ilova ishga tushganda birinchi bo'lib (mavzu/animatsiyadan oldin). */
export function applyGuestPalette(): GuestPalette {
  const palette = getGuestPalette()
  if (typeof document !== 'undefined') document.documentElement.dataset.palette = palette
  return palette
}

/** Telegram sarlavhasi va orqa fon rangi, brauzer `theme-color` — palitra va mavzuga mos (matn qiymatlari CSS tokenlari bilan bir xil). */
export const PALETTE_CHROME: Record<GuestPalette, Record<'light' | 'dark', { header: string; background: string }>> = {
  classic: {
    light: { header: '#FFFFFF', background: '#F7F3EA' },
    dark: { header: '#17201A', background: '#0F1511' },
  },
  orange: {
    light: { header: '#FFFFFF', background: '#FAF8F5' },
    dark: { header: '#1B1714', background: '#141110' },
  },
  // custom: neytral fonlar klassikniki (styles/palette.css 10-bo'lim, darkTheme.css 1-bo'lim); `chromeColors` ularni CSS tokenlaridan o'qiydi, bu — o'qib bo'lmasa zaxira
  custom: {
    light: { header: '#FFFFFF', background: '#F7F3EA' },
    dark: { header: '#17201A', background: '#0F1511' },
  },
}

const HEX6 = /^#[0-9a-fA-F]{6}$/

/**
 * Telegram sarlavhasi / orqa fon / `theme-color` rangi. `classic` va `orange` — jadvaldan; `custom` da joriy CSS tokenlaridan
 * (`--bg-surface` — sarlavha, `--bg-primary` — orqa fon; 6 xonali hex bo'lsa), aks holda zaxira. Hisoblash yo'q, faqat o'qish.
 */
export function chromeColors(palette: GuestPalette, theme: 'light' | 'dark'): { header: string; background: string } {
  const fallback = PALETTE_CHROME[palette][theme]
  if (palette !== 'custom' || typeof document === 'undefined' || typeof getComputedStyle !== 'function') return fallback
  try {
    const style = getComputedStyle(document.documentElement)
    const header = style.getPropertyValue('--bg-surface').trim()
    const background = style.getPropertyValue('--bg-primary').trim()
    return { header: HEX6.test(header) ? header : fallback.header, background: HEX6.test(background) ? background : fallback.background }
  } catch {
    return fallback
  }
}

/** Boshlang'ich (kun/tun almashtirgichsiz) Telegram foni apelsinda avvaldan #FAF7F2 edi — o'zgarmaydi. */
export const BOOT_BACKGROUND_ORANGE = '#FAF7F2'

/** DOM'dagi amaldagi palitra (applyGuestPalette qo'ygan); DOM yo'q bo'lsa sessiyadan. */
export function currentPalette(): GuestPalette {
  if (typeof document !== 'undefined') {
    const v = document.documentElement?.dataset?.palette
    if (v === 'orange' || v === 'classic' || v === 'custom') return v
  }
  return getGuestPalette()
}
