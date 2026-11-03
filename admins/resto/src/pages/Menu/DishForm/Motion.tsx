import React, { useEffect, useRef } from 'react';

/**
 * Kichik harakatlar (aylanuvchi belgi, miltillovchi joy). `/ra/` da `spin` / `pulse` CSS kadrlari aniqlanmagan, yangi CSS
 * qo'shilmaydi: shuning uchun Web Animations API ishlatiladi. "Harakatni kamaytirish" yoqilgan qurilmada harakat yo'q.
 */

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

/** `active` bo'lsa elementni sekin miltillatadi (kutish holati). */
export function usePulse(ref: React.RefObject<HTMLElement | null>, active: boolean): void {
  useEffect(() => {
    const el = ref.current;
    if (!active || !el || typeof el.animate !== 'function' || reducedMotion()) return undefined;
    const animation = el.animate([{ opacity: 1 }, { opacity: 0.5 }, { opacity: 1 }], {
      duration: 1500,
      iterations: Infinity,
      easing: 'ease-in-out',
    });
    return () => animation.cancel();
  }, [ref, active]);
}

/** Aylanuvchi belgi. Rangi matn rangidan olinadi (`currentColor`). */
export const Spinner: React.FC<{ size?: number }> = ({ size = 16 }) => {
  const ref = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof el.animate !== 'function' || reducedMotion()) return undefined;
    const animation = el.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], {
      duration: 800,
      iterations: Infinity,
    });
    return () => animation.cancel();
  }, []);
  return (
    <span
      ref={ref}
      aria-hidden="true"
      style={{
        display: 'inline-block',
        flexShrink: 0,
        width: size,
        height: size,
        border: '2px solid currentColor',
        borderRightColor: 'transparent',
        borderRadius: '50%',
      }}
    />
  );
};
