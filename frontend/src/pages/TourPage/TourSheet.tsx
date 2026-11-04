// Pastdan chiqadigan varaq (dialog): stol kartochkasi va stollar ro'yxati uchun umumiy qobiq.
// Klaviatura: Escape yopadi, Tab varaq ichida aylanadi, ochilganda fokus varaqqa tushadi; orqa fon bosilsa yopiladi.
import React, { useEffect, useRef } from 'react';
import { t } from '../../i18n';
import { TourIcon } from './TourIcon';

interface TourSheetProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}

const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const TourSheet: React.FC<TourSheetProps> = ({ title, subtitle, onClose, children }) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Ochilganda fokus varaqning o'ziga (ekran o'quvchi sarlavhani o'qiydi)
  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const panel = panelRef.current;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return (
    <div className="tr-sheet-root">
      <div className="tr-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="tr-sheet" role="dialog" aria-modal="true" aria-labelledby="tr-sheet-title" tabIndex={-1} ref={panelRef}>
        <div className="tr-grabber" aria-hidden="true" />
        <div className="tr-sheet-head">
          <div className="tr-sheet-titles">
            <h2 className="tr-sheet-title" id="tr-sheet-title">{title}</h2>
            {subtitle && <p className="tr-sheet-sub">{subtitle}</p>}
          </div>
          <button type="button" className="tr-icon-btn tr-icon-btn--light" onClick={onClose} aria-label={t('Yopish')}>
            <TourIcon name="close" size={20} />
          </button>
        </div>
        <div className="tr-sheet-body">{children}</div>
      </div>
    </div>
  );
};
