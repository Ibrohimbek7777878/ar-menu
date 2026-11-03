// Mehmon sayti ranglar palitrasi (restoran sozlamasi `guest_palette`; dizayn/tartib `guest_design` dan ALOHIDA).
//   classic — standart: yashil + krem + serif sarlavha (eski dizayn tili; server kalit yubormaydi)
//   orange  — muqobil: olovrang apelsin (avvalgi yangi palitra; o'chirilmagan, sozlama bilan qaytadi — AGENTS 4-qoida)
// Server `<html data-palette>` ni o'zi yozadi (birinchi kadrdan to'g'ri bo'lishi uchun), sessiyada esa faqat 'orange' keladi.
// Bu yerda atribut yana bir bor (Vite/dev rejimida ham) qo'yiladi; ranglarning o'zi styles/palette.css va index.css da.
export type GuestPalette = 'classic' | 'orange'

/** Noma'lum qiymat (eskirgan server, buzilgan JSON) -> 'classic' (standart palitra). */
export function parseGuestPalette(value: unknown): GuestPalette {
  return value === 'orange' ? 'orange' : 'classic'
}

/** Sessiyadagi palitra (sessiya yo'q bo'lsa — standart). */
export function getGuestPalette(): GuestPalette {
  return typeof window === 'undefined' ? 'classic' : parseGuestPalette(window.__GULISTON_SESSION__?.palette)
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
}

/** Boshlang'ich (kun/tun almashtirgichsiz) Telegram foni apelsinda avvaldan #FAF7F2 edi — o'zgarmaydi. */
export const BOOT_BACKGROUND_ORANGE = '#FAF7F2'

/** DOM'dagi amaldagi palitra (applyGuestPalette qo'ygan); DOM yo'q bo'lsa sessiyadan. */
export function currentPalette(): GuestPalette {
  if (typeof document !== 'undefined') {
    const v = document.documentElement?.dataset?.palette
    if (v === 'orange' || v === 'classic') return v
  }
  return getGuestPalette()
}
