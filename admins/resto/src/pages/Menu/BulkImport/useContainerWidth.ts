import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

/**
 * Konteyner kengligi (px). Yon panel (240 px) tufayli ekran kengligi emas, aynan ish maydoni kengligi kerak:
 * keng bo'lsa jadval, tor bo'lsa kartochka ko'rinishi.
 */
export function useContainerWidth<T extends HTMLElement>(): [RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    setWidth(el.getBoundingClientRect().width);
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width;
      if (typeof next === 'number') setWidth(next);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}
