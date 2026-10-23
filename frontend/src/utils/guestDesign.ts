// Mehmon sahifalari dizayni: yangi yoki eski (klassik). Eski dizayn o'chirilmagan — admin sozlamasi `guest_design = classic`
// bo'lsa qaytadi (AGENTS.md 4-qoida). Server tanlovi `window.__GULISTON_SESSION__.design` orqali keladi.
export type GuestDesign = 'new' | 'classic'

export function getGuestDesign(): GuestDesign {
  if (typeof window === 'undefined') return 'new'
  return window.__GULISTON_SESSION__?.design === 'classic' ? 'classic' : 'new'
}

/** <html data-design="..."> — yangi dizaynning uslublari faqat `[data-design="new"]` ostida ishlaydi. */
export function applyGuestDesign(): GuestDesign {
  const design = getGuestDesign()
  if (typeof document !== 'undefined') document.documentElement.dataset.design = design
  return design
}
