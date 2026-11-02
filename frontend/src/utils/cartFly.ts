// "Qo'shish" mukofoti: tugmadan savat belgisiga kichik nuqta uchib boradi, savat belgisi sakraydi, telefon qisqa tebranadi.
// Faqat ko'rinish: savatga qo'shish mantiqi (handleAdd -> onAddToCart) bu yerda o'zgarmaydi, xato bo'lsa ham jim o'tadi.
// Faqat `transform` va `opacity` (GPU) animatsiya qilinadi. `data-motion="off"`, klassik dizayn va
// `prefers-reduced-motion: reduce` da hech narsa qilmaydi.
const SIZE = 16

function visibleCartTarget(): HTMLElement | null {
  const all = Array.from(document.querySelectorAll<HTMLElement>('[data-cart-target]'))
  return all.find((el) => el.getClientRects().length > 0) ?? null
}

export function flyToCart(source: Element | null): void {
  try {
    if (!source || typeof document === 'undefined') return
    const root = document.documentElement
    if (root.dataset.design !== 'new' || root.dataset.motion === 'off') return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const target = visibleCartTarget()
    if (!target || typeof target.animate !== 'function') return

    navigator.vibrate?.(10)

    const from = source.getBoundingClientRect()
    const to = target.getBoundingClientRect()
    const x0 = from.left + from.width / 2 - SIZE / 2
    const y0 = from.top + from.height / 2 - SIZE / 2
    const x1 = to.left + to.width / 2 - SIZE / 2
    const y1 = to.top + to.height / 2 - SIZE / 2

    const dot = document.createElement('div')
    dot.setAttribute('aria-hidden', 'true')
    dot.dataset.cartFly = ''
    Object.assign(dot.style, {
      position: 'fixed',
      left: '0',
      top: '0',
      width: `${SIZE}px`,
      height: `${SIZE}px`,
      borderRadius: '50%',
      background: 'var(--brand-primary)',
      boxShadow: '0 2px 8px rgb(var(--brand-primary-rgb) / 0.45)',
      pointerEvents: 'none',
      zIndex: '9999',
      willChange: 'transform, opacity',
    })
    document.body.appendChild(dot)

    const flight = dot.animate(
      [
        { transform: `translate(${x0}px, ${y0}px) scale(1)`, opacity: 1 },
        { transform: `translate(${(x0 + x1) / 2}px, ${Math.min(y0, y1) - 60}px) scale(0.9)`, opacity: 1, offset: 0.5 },
        { transform: `translate(${x1}px, ${y1}px) scale(0.3)`, opacity: 0.2 },
      ],
      { duration: 520, easing: 'cubic-bezier(0.4, 0.1, 0.3, 1)' },
    )
    flight.onfinish = () => {
      dot.remove()
      target.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.22)' }, { transform: 'scale(1)' }], {
        duration: 300,
        easing: 'ease-out',
      })
    }
    flight.oncancel = () => dot.remove()
  } catch {
    // bezak animatsiya: hech qachon savatga qo'shishni to'sib qo'ymaydi
  }
}
