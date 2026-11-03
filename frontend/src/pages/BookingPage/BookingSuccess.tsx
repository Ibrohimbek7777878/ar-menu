// Muvaffaqiyat ekrani: bron kodi (nusxa olish), sana/vaqt/stol/mehmonlar, holatni tekshirish, menyuga o'tish.
import React, { useEffect, useRef, useState } from 'react';
import { numberLocale, t } from '../../i18n';
import { Icon } from '../../components/ui/Icon/Icon';
import { pop, rippleRings } from '../../motion/fx';
import { copyText } from './clipboard';
import { addMinutes, formatDay } from './dates';
import { bookingStatusLabel, hallName, tableTitle } from './labels';
import { StatusCheck } from './StatusCheck';
import type { BookingResult } from './types';

interface BookingSuccessProps {
  result: BookingResult;
  onMenu: () => void;
  onAgain: () => void;
}

export const BookingSuccess: React.FC<BookingSuccessProps> = ({ result, onMenu, onAgain }) => {
  const badgeRef = useRef<HTMLDivElement>(null);
  const codeRef = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);
  const locale = numberLocale();

  useEffect(() => {
    window.scrollTo(0, 0);
    const id = window.setTimeout(() => {
      rippleRings(badgeRef.current, 3);
      pop(codeRef.current);
    }, 250);
    return () => {
      window.clearTimeout(id);
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  const copy = async () => {
    const ok = await copyText(result.public_code);
    setCopied(ok);
    if (ok) {
      pop(codeRef.current);
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2000);
    }
  };

  const confirmed = result.status === 'confirmed';
  const end = result.duration_minutes > 0 ? addMinutes(result.time, result.duration_minutes) : '';

  return (
    <section className="bk-success bk-enter" aria-labelledby="bk-success-title">
      <div className="bk-success-badge" ref={badgeRef} aria-hidden="true">
        <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path className="bk-check-path" pathLength={1} d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </div>
      <h1 className="bk-title" id="bk-success-title">{confirmed ? t('Bron tasdiqlandi') : t('Bron qabul qilindi')}</h1>
      <p className="bk-lead">
        {confirmed
          ? t("Sizni kutamiz! Kodni saqlab qo'ying — kelganingizda ko'rsating.")
          : t("Restoran bronni tasdiqlaydi. Kodni saqlab qo'ying — holatni shu kod bilan tekshirasiz.")}
      </p>

      <div className="bk-code-card">
        <span className="bk-code-kicker">{t('Bron kodi')}</span>
        <strong className="bk-code" ref={codeRef} aria-label={t('Bron kodi: {code}', { code: result.public_code.split('').join(' ') })}>{result.public_code}</strong>
        <button type="button" className="bk-copy" onClick={copy}>
          {copied ? (
            <Icon name="check" size={16} />
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect width="13" height="13" x="9" y="9" rx="2" />
              <path d="M5 15V6a2 2 0 0 1 2-2h9" />
            </svg>
          )}
          <span>{copied ? t('Nusxalandi') : t('Nusxa olish')}</span>
        </button>
        <span className="bk-sr" role="status" aria-live="polite">{copied ? t('Nusxalandi') : ''}</span>
      </div>

      <dl className="bk-facts">
        <div>
          <dt>{t('Sana')}</dt>
          <dd>{formatDay(result.date, locale).long}</dd>
        </div>
        <div>
          <dt>{t('Vaqt')}</dt>
          <dd className="tabular-nums">{end ? `${result.time} – ${end}` : result.time}</dd>
        </div>
        <div>
          <dt>{t('Stol')}</dt>
          <dd>{result.tableNumber ? tableTitle(result.tableNumber) : '—'}{result.hall ? ` · ${hallName(result.hall)}` : ''}</dd>
        </div>
        <div>
          <dt>{t('Mehmonlar soni')}</dt>
          <dd>{t('{n} kishi', { n: result.guests })}</dd>
        </div>
        <div>
          <dt>{t('Holat')}</dt>
          <dd><span className={`bk-pill bk-pill--${confirmed ? 'free' : 'on'}`}>{bookingStatusLabel(result.status)}</span></dd>
        </div>
      </dl>

      <StatusCheck code={result.public_code} />

      <div className="bk-actions">
        <button type="button" className="bk-btn bk-btn--primary" onClick={onMenu}>
          <span>{t("Menyuga o'tish")}</span>
          <Icon name="arrow" size={18} strokeWidth={2.5} />
        </button>
        <button type="button" className="bk-btn" onClick={onAgain}>{t('Yana bron qilish')}</button>
      </div>
    </section>
  );
};
