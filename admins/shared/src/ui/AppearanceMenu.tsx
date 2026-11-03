import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Check, Globe, Monitor, Moon, Sun } from 'lucide-react';
import { LANGS, LANG_NAMES, setLang, t, tr, type Lang } from '../i18n/engine.ts';
import { useLang } from '../i18n/useLang.ts';
import { setThemePref } from '../theme/theme.ts';
import { useThemePref } from '../theme/useTheme.ts';
import type { ThemePref } from '../theme/core.ts';
import './appearance.css';

const THEME_OPTIONS: { value: ThemePref; label: string; icon: typeof Sun }[] = [
  { value: 'day', label: tr('Kun'), icon: Sun },
  { value: 'night', label: tr('Tun'), icon: Moon },
  { value: 'auto', label: tr('Avto'), icon: Monitor },
];

export interface AppearanceMenuProps {
  /** Oyna tugmadan qaysi tomonga ochiladi: yuqoriga (sidebar pastida) yoki pastga (yuqori panelda). */
  placement?: 'up' | 'down';
  /** Oyna tugma bilan qaysi chetda tekislanadi. */
  align?: 'start' | 'end';
  className?: string;
}

/**
 * Til (O'zbekcha / Русский / English) va Kun / Tun / Avto tanlash: ixcham tugma + kichik oyna.
 * Mehmon saytidagi SettingsSheet bilan bir xil g'oya va bir xil saqlash kalitlari (`guliston.lang`, `guliston.theme`).
 * Klaviatura: Esc yopadi va fokusni tugmaga qaytaradi; oyna tashqarisini bosish ham yopadi; fokus tuzog'i yo'q (Tab bilan chiqib ketsa yopiladi).
 */
export const AppearanceMenu: React.FC<AppearanceMenuProps> = ({ placement = 'up', align = 'start', className = '' }) => {
  const lang = useLang();
  const themePref = useThemePref();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<Lang | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close(true);
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close(false);
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onPointer, true);
    // Birinchi tanlangan tugmaga fokus: klaviatura bilan darrov tanlash mumkin
    panelRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onPointer, true);
    };
  }, [open, close]);

  const chooseLang = async (next: Lang) => {
    if (next === lang || busy) return;
    setBusy(next);
    try {
      await setLang(next); // lug'at yuklangach daraxt qayta ulanadi (LangBoundary)
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      ref={rootRef}
      className={`ra-appearance ${className}`}
      data-placement={placement}
      data-align={align}
      onBlur={(e) => {
        // Fokus oyna va tugmadan butunlay chiqsa (Tab) — yopiladi
        if (open && e.relatedTarget && !rootRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className="ra-appearance-trigger"
        aria-label={t("Til va ko'rinish")}
        title={t("Til va ko'rinish")}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <Globe size={18} aria-hidden="true" />
      </button>
      {open && (
        <div ref={panelRef} id={panelId} role="dialog" aria-label={t("Til va ko'rinish")} className="ra-appearance-panel">
          <div className="ra-appearance-group-title" id={`${panelId}-lang`}>
            {t('Til')}
          </div>
          <div role="radiogroup" aria-labelledby={`${panelId}-lang`} className="ra-appearance-list">
            {LANGS.map((code) => (
              <button
                key={code}
                type="button"
                role="radio"
                aria-checked={lang === code}
                disabled={busy !== null}
                className="ra-appearance-option"
                onClick={() => void chooseLang(code)}
              >
                <span>{LANG_NAMES[code]}</span>
                {lang === code && <Check size={16} aria-hidden="true" />}
              </button>
            ))}
          </div>
          <div className="ra-appearance-group-title" id={`${panelId}-theme`}>
            {t("Ko'rinish")}
          </div>
          <div role="radiogroup" aria-labelledby={`${panelId}-theme`} className="ra-appearance-segment">
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={themePref === opt.value}
                className="ra-appearance-seg"
                onClick={() => setThemePref(opt.value)}
              >
                <opt.icon size={15} aria-hidden="true" />
                <span>{t(opt.label)}</span>
              </button>
            ))}
          </div>
          <p className="ra-appearance-hint">{t('"Avto" qurilmangiz mavzusiga ergashadi.')}</p>
        </div>
      )}
    </div>
  );
};
