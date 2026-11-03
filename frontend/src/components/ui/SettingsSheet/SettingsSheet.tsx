import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigation } from '../../../context/NavigationContext';
import { LANG_NAMES, getEnabledLangs, setLang, t, type Lang } from '../../../i18n';
import { useLang } from '../../../i18n/useLang';
import { setThemePref, themeSwitchEnabled, type ThemePref } from '../../../utils/guestTheme';
import { useThemePref } from '../../../utils/useTheme';
import './SettingsSheet.css';

const THEME_OPTIONS: { value: ThemePref; label: string }[] = [
  { value: 'day', label: 'Kun' },
  { value: 'night', label: 'Tun' },
  { value: 'auto', label: 'Avto' },
];

const EXIT_MS = 200;

/** Til va kun/tun sozlamalari: pastdan ochiladigan oyna. Ochilishi: `useNavigation().setIsSettingsOpen(true)`. */
export const SettingsSheet: React.FC = () => {
  const { isSettingsOpen, setIsSettingsOpen } = useNavigation();
  const lang = useLang();
  const themePref = useThemePref();
  const [closing, setClosing] = useState(false);
  const [busy, setBusy] = useState<Lang | null>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  const close = () => {
    setClosing(true);
    window.setTimeout(() => {
      setClosing(false);
      setIsSettingsOpen(false);
    }, EXIT_MS);
  };

  useEffect(() => {
    if (!isSettingsOpen) return;
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSettingsOpen]);

  if (!isSettingsOpen) return null;

  const langs = getEnabledLangs();
  const pick = async (next: Lang) => {
    if (next === lang || busy) return;
    setBusy(next);
    await setLang(next);
    setBusy(null);
  };

  return createPortal(
    <div className={`st-root ${closing ? 'is-closing' : ''}`}>
      <div className="st-backdrop" onClick={close} />
      <div className="st-sheet" role="dialog" aria-modal="true" aria-label={t('Sozlamalar')}>
        <div className="st-grabber" aria-hidden="true" />
        <div className="st-head">
          <h2 className="st-title">{t('Sozlamalar')}</h2>
          <button type="button" className="st-close" ref={closeBtn} onClick={close} aria-label={t('Yopish')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {langs.length > 1 && (
          <section className="st-section">
            <h3 className="st-label">{t('Til')}</h3>
            <div className="st-seg" role="radiogroup" aria-label={t('Til')}>
              {langs.map((code) => (
                <button
                  key={code}
                  type="button"
                  role="radio"
                  aria-checked={code === lang}
                  className={`st-opt ${code === lang ? 'is-on' : ''}`}
                  disabled={busy !== null}
                  onClick={() => pick(code)}
                >
                  {LANG_NAMES[code]}
                </button>
              ))}
            </div>
          </section>
        )}

        {themeSwitchEnabled() && (
          <section className="st-section">
            <h3 className="st-label">{t("Ko'rinish")}</h3>
            <div className="st-seg" role="radiogroup" aria-label={t("Ko'rinish")}>
              {THEME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={opt.value === themePref}
                  className={`st-opt ${opt.value === themePref ? 'is-on' : ''}`}
                  onClick={() => setThemePref(opt.value)}
                >
                  {opt.value === 'day' ? '☀ ' : opt.value === 'night' ? '☾ ' : '◐ '}
                  {t(opt.label)}
                </button>
              ))}
            </div>
            <p className="st-hint">{t('"Avto" telefoningiz mavzusiga ergashadi.')}</p>
          </section>
        )}
      </div>
    </div>,
    document.body,
  );
};
