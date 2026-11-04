// A qatlami: funksiyaga mos mikro-animatsiyalar. three.js YO'Q: Web Animations API + kichik 2D canvas.
// Faqat ko'rinish: tugmalarning o'z mantig'i (savatga qo'shish, buyurtma yuborish, chaqiruv) bu yerda o'zgarmaydi, har bir
// funksiya xato bo'lsa ham jim o'tadi va hech qachon ilova ishini to'smaydi. Faqat `transform` va `opacity` (GPU).
// Hammasi `fxEnabled()` dan o'tadi: klassik dizayn, `data-motion="off"` va `prefers-reduced-motion` da hech narsa qilmaydi.
import { brandPalette, fxEnabled, motionLevel } from './env'

type Frames = Keyframe[]

function play(el: Element | null, frames: Frames, options: KeyframeAnimationOptions): Animation | null {
  try {
    if (!el || !fxEnabled() || typeof (el as HTMLElement).animate !== 'function') return null
    return (el as HTMLElement).animate(frames, options)
  } catch {
    return null
  }
}

/** Raqam/belgi "pop": savat soni o'zgarganda. */
export const pop = (el: Element | null) =>
  play(el, [{ transform: 'scale(1)' }, { transform: 'scale(1.4)' }, { transform: 'scale(1)' }], {
    duration: 340,
    easing: 'cubic-bezier(0.3, 1.6, 0.5, 1)',
  })

/** Qo'ng'iroq silkinishi (ofitsiantni chaqirish): tepadan osilgandek so'nib boradi. */
export const ringBell = (el: Element | null) => {
  if (el instanceof HTMLElement) el.style.transformOrigin = '50% 14%'
  return play(
    el,
    [0, -24, 20, -14, 9, -4, 0].map((deg) => ({ transform: `rotate(${deg}deg)` })),
    { duration: 900, easing: 'ease-out' },
  )
}

/** Xato/rad etish: gorizontal silkinish. */
export const shake = (el: Element | null) =>
  play(
    el,
    [0, -7, 6, -5, 4, -2, 0].map((x) => ({ transform: `translateX(${x}px)` })),
    { duration: 420, easing: 'ease-out' },
  )

/** 360° tugmasi: ikonka 3D aylanadi (model ochilishidan oldin). */
export const spin3d = (el: Element | null) =>
  play(
    el,
    [{ transform: 'perspective(220px) rotateY(0deg)' }, { transform: 'perspective(220px) rotateY(360deg)' }],
    { duration: 700, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  )

/** Tanlangan variant belgisi (zal / olib ketish / yetkazish): sakrab joyiga tushadi. */
export const bounceIcon = (el: Element | null) =>
  play(
    el,
    [
      { transform: 'translateY(0) scale(1)' },
      { transform: 'translateY(-6px) scale(1.18)', offset: 0.4 },
      { transform: 'translateY(0) scale(0.94)', offset: 0.7 },
      { transform: 'translateY(0) scale(1)' },
    ],
    { duration: 420, easing: 'ease-out' },
  )

/** "Xavfli amal tayyor" urg'usi (bekor qilishning 1-bosqichi): qizil puls. */
export const dangerPulse = (el: Element | null) =>
  play(
    el,
    [
      { boxShadow: '0 0 0 0 rgb(220 38 38 / 0.45)' },
      { boxShadow: '0 0 0 12px rgb(220 38 38 / 0)' },
    ],
    { duration: 700, easing: 'ease-out' },
  )

/** Yumshoq puls halqasi (video sayrdagi stol belgisi: "bosing" ishorasi). `full` darajada cheksiz, `light` da bir marta, `off`/reduced-motion da yo'q. */
export const pulseLoop = (el: Element | null) =>
  play(el, [{ transform: 'scale(1)', opacity: 0.55 }, { transform: 'scale(1.9)', opacity: 0 }], {
    duration: 1700,
    iterations: motionLevel() === 'full' ? Infinity : 1,
    easing: 'cubic-bezier(0.2, 0.6, 0.3, 1)',
  })

/** Bosilgan joydan kengayuvchi to'lqin halqalar (ofitsiant chaqiruvi yuborildi). */
export function rippleRings(anchor: Element | null, count = 3): void {
  try {
    if (!anchor || !fxEnabled()) return
    const rect = anchor.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height, 48)
    for (let i = 0; i < count; i++) {
      const ring = document.createElement('div')
      ring.setAttribute('aria-hidden', 'true')
      Object.assign(ring.style, {
        position: 'fixed',
        left: `${rect.left + rect.width / 2 - size / 2}px`,
        top: `${rect.top + rect.height / 2 - size / 2}px`,
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        border: '2px solid var(--brand-primary)',
        pointerEvents: 'none',
        zIndex: '9998',
        willChange: 'transform, opacity',
      })
      document.body.appendChild(ring)
      const a = ring.animate(
        [
          { transform: 'scale(0.4)', opacity: 0.7 },
          { transform: 'scale(2.4)', opacity: 0 },
        ],
        { duration: 1000, delay: i * 180, easing: 'cubic-bezier(0.2, 0.6, 0.3, 1)', fill: 'backwards' },
      )
      a.onfinish = a.oncancel = () => ring.remove()
    }
  } catch {
    // bezak animatsiya
  }
}

// ── Tugma holati: idle -> loading -> success | error ─────────────────────────────────────────────────
// Yozuv joyida qoladi (o'lcham o'zgarmaydi, sahifa sakramaydi), uning ustida aylana -> chiziladigan ✓ / ✕ chiqadi.
// Holat `data-fx-state` da, ko'rinishi styles/fx.css da. `disabled`, matn va onClick ilovaning o'zida qoladi.
export type FxState = 'idle' | 'loading' | 'success' | 'error'

const INDICATOR = `
<svg class="fx-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><circle cx="12" cy="12" r="9" stroke-opacity=".28"/><path d="M12 3a9 9 0 0 1 9 9"/></svg>
<svg class="fx-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path pathLength="1" d="M5 12.5l4.5 4.5L19 7.5"/></svg>
<svg class="fx-cross" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path pathLength="1" d="M6 6l12 12M18 6L6 18"/></svg>`

export function setButtonState(button: HTMLElement | null, state: FxState): void {
  try {
    if (!button) return
    if (state === 'idle') {
      delete button.dataset.fxState
      button.removeAttribute('aria-busy')
      return
    }
    if (!fxEnabled()) return
    if (!button.querySelector(':scope > .fx-ind')) {
      const indicator = document.createElement('span')
      indicator.className = 'fx-ind'
      indicator.setAttribute('aria-hidden', 'true')
      indicator.innerHTML = INDICATOR
      button.appendChild(indicator)
    }
    button.dataset.fxState = state
    if (state === 'loading') button.setAttribute('aria-busy', 'true')
    else button.removeAttribute('aria-busy')
    if (state === 'error') shake(button)
  } catch {
    // bezak animatsiya
  }
}

// ── 2D konfetti (yengil kutlov; three.js yuklanmaydigan holatlar uchun zaxira) ────────────────────────
type Origin = { x: number; y: number }

function originOf(target: Origin | Element | null): Origin {
  if (target && 'getBoundingClientRect' in target) {
    const r = target.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }
  return target ?? { x: window.innerWidth / 2, y: window.innerHeight * 0.7 }
}

export function confettiBurst(target: Origin | Element | null = null): void {
  try {
    if (!fxEnabled()) return
    const { x, y } = originOf(target)
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const canvas = document.createElement('canvas')
    canvas.setAttribute('aria-hidden', 'true')
    canvas.width = Math.round(window.innerWidth * dpr)
    canvas.height = Math.round(window.innerHeight * dpr)
    Object.assign(canvas.style, {
      position: 'fixed',
      inset: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: '9999',
    })
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    document.body.appendChild(canvas)

    const colors = brandPalette()
    const total = motionLevel() === 'full' ? 70 : 28
    const parts = Array.from({ length: total }, () => {
      const angle = (-90 + (Math.random() - 0.5) * 110) * (Math.PI / 180)
      const speed = 380 + Math.random() * 520
      return {
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        w: 6 + Math.random() * 6,
        h: 3 + Math.random() * 5,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 14,
        color: colors[Math.floor(Math.random() * colors.length)],
        round: Math.random() < 0.3,
      }
    })

    const LIFE = 1900
    const t0 = performance.now()
    let last = t0
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const age = now - t0
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
      ctx.globalAlpha = Math.max(0, Math.min(1, (LIFE - age) / 500))
      for (const p of parts) {
        p.vy += 1100 * dt
        p.vx *= 1 - 0.9 * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.rot += p.vr * dt
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        if (p.round) {
          ctx.beginPath()
          ctx.arc(0, 0, p.h, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        }
        ctx.restore()
      }
      if (age < LIFE) requestAnimationFrame(frame)
      else canvas.remove()
    }
    requestAnimationFrame(frame)
    window.setTimeout(() => canvas.remove(), LIFE + 1500) // fon varag'ida rAF to'xtasa ham qolib ketmasin
  } catch {
    // bezak animatsiya
  }
}
