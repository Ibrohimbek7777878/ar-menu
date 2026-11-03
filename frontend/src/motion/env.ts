// Animatsiya qatlami uchun umumiy qoidalar: BARCHA effektlar shu yerdagi shartlardan o'tadi.
//   fxEnabled()    — A qatlami (CSS/WAAPI/canvas): yangi dizayn, `data-motion` != off, tizimda "harakatni kamaytirish" yo'q
//   threeEnabled() — B qatlami (three.js): fxEnabled + daraja `full` (zaif qurilmada utils/guestMotion.ts o'zi `light` ga tushiradi) + WebGL bor
// Daraja admin sozlamasi `guest_motion` (full | light | off) dan keladi: kodni o'zgartirmasdan o'chiriladi (AGENTS 4-qoida).
import type { GuestMotion } from '../utils/guestMotion'

export function motionLevel(): GuestMotion {
  if (typeof document === 'undefined') return 'off'
  const root = document.documentElement
  if (root.dataset.design !== 'new') return 'off'
  const level = root.dataset.motion
  return level === 'light' || level === 'off' ? level : 'full'
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
}

export function fxEnabled(): boolean {
  return motionLevel() !== 'off' && !prefersReducedMotion()
}

let webgl: boolean | undefined
/** WebGL borligi (bir marta tekshiriladi; kontekst darrov bo'shatiladi). */
export function webglSupported(): boolean {
  if (webgl !== undefined) return webgl
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    webgl = Boolean(gl)
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {
    webgl = false
  }
  return webgl
}

export function threeEnabled(): boolean {
  return fxEnabled() && motionLevel() === 'full' && webglSupported()
}

/** Brend ranglarini CSS tokenlaridan o'qiydi: yangi rang qo'shilmaydi (bitta dizayn tili). */
export function brandPalette(): string[] {
  const css = typeof document === 'undefined' ? null : getComputedStyle(document.documentElement)
  const read = (name: string, fallback: string) => css?.getPropertyValue(name).trim() || fallback
  return [
    read('--brand-primary', '#EA580C'),
    read('--brand-warm', '#FB923C'),
    read('--brand-accent', '#E11D48'),
    read('--status-success', '#16A34A'),
    '#FFFFFF',
  ]
}
