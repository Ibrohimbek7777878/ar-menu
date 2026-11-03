import { useEffect } from 'react';

/**
 * Saqlanmagan o'zgarish bor paytda sahifadan chiqib ketishdan oldin tasdiq so'raydi.
 * Ilova `BrowserRouter` ishlatadi (u `useBlocker` ni qo'llab-quvvatlamaydi), shuning uchun:
 *  - brauzer yorlig'ini yopish / yangilash / tashqi manzil — `beforeunload`;
 *  - yon menyudagi havolalar — hujjat darajasidagi bosish ushlagichi (ilovaning o'z marshrutlash ushlagichidan oldin ishlaydi).
 * Tasdiqlansa `onLeave` chaqiriladi (masalan, qoralama zaxirasini tozalash).
 */
export function useLeaveGuard(active: boolean, message: string, onLeave?: () => void): void {
  useEffect(() => {
    if (!active) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const url = new URL(anchor.href, window.location.href);
      const samePage = url.origin === window.location.origin && url.pathname === window.location.pathname && url.search === window.location.search;
      if (samePage) return;
      if (window.confirm(message)) {
        onLeave?.();
      } else {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [active, message, onLeave]);
}
