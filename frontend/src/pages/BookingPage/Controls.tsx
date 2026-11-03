// Umumiy boshqaruv elementlari: sana lentasi va mehmonlar soni (1-qadam va bron oynasida bir xil ishlaydi).
import React, { useEffect, useRef } from 'react';
import { numberLocale, t } from '../../i18n';
import { fxEnabled } from '../../motion/env';
import { pop, rippleRings } from '../../motion/fx';
import { formatDay, type DayCell } from './dates';

const capitalize = (s: string): string => (s ? s.charAt(0).toLocaleUpperCase() + s.slice(1) : s);

interface DateStripProps {
  days: readonly DayCell[];
  value: string;
  onChange: (ymd: string) => void;
  /** Yopiq deb belgilangan kunlar (availability `closed: true` qaytargan) — lentadagi hafta kuni belgisiga qo'shimcha */
  extraClosed?: ReadonlySet<string>;
}

/** Sana lentasi: Bugun, Ertaga, keyingi kunlar. Tanlangani ajralib turadi; yopiq kun tanlanmaydi. Strelka tugmalari bilan ham yuriladi. */
export const DateStrip: React.FC<DateStripProps> = ({ days, value, onChange, extraClosed }) => {
  const listRef = useRef<HTMLDivElement>(null);
  const locale = numberLocale();

  // Tanlangan kun ko'rinish maydoniga keladi (faqat gorizontal: sahifa sakramaydi)
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[aria-checked="true"]');
    const box = listRef.current;
    if (!el || !box) return;
    const target = el.offsetLeft - (box.clientWidth - el.offsetWidth) / 2;
    box.scrollTo({ left: Math.max(0, target), behavior: fxEnabled() ? 'smooth' : 'auto' });
  }, [value]);

  const isClosed = (d: DayCell) => d.closed || Boolean(extraClosed?.has(d.ymd));
  const hasSelected = days.some((d) => d.ymd === value);

  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const at = days.findIndex((d) => d.ymd === value);
    for (let i = at + dir; i >= 0 && i < days.length; i += dir) {
      if (!isClosed(days[i])) {
        onChange(days[i].ymd);
        const btn = listRef.current?.querySelectorAll<HTMLElement>('[role="radio"]')[i];
        btn?.focus({ preventScroll: true });
        return;
      }
    }
  };

  return (
    <div className="bk-dates" ref={listRef} role="radiogroup" aria-label={t('Sana')} onKeyDown={onKey}>
      {days.map((d) => {
        const labels = formatDay(d.ymd, locale);
        const closed = isClosed(d);
        const selected = d.ymd === value;
        const name = d.offset === 0 ? t('Bugun') : d.offset === 1 ? t('Ertaga') : capitalize(labels.weekday);
        return (
          <button
            key={d.ymd}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-disabled={closed || undefined}
            aria-label={`${d.offset === 0 ? `${t('Bugun')}, ` : d.offset === 1 ? `${t('Ertaga')}, ` : ''}${labels.long}${closed ? `, ${t('yopiq')}` : ''}`}
            tabIndex={selected || (!hasSelected && d.offset === 0) ? 0 : -1}
            className={`bk-date ${selected ? 'is-on' : ''} ${closed ? 'is-closed' : ''}`}
            onClick={(e) => {
              if (closed) return;
              if (!selected) {
                onChange(d.ymd);
                rippleRings(e.currentTarget, 1);
              }
            }}
          >
            <span className="bk-date-name">{name}</span>
            <span className="bk-date-num tabular-nums">{labels.day}</span>
            <span className="bk-date-month">{capitalize(labels.month)}</span>
          </button>
        );
      })}
    </div>
  );
};

interface GuestStepperProps {
  value: number;
  min?: number;
  max: number;
  onChange: (n: number) => void;
  labelId?: string;
}

/** Mehmonlar: − 2 +. Tugmalar >= 44 px; chegarada tegishli tugma o'chadi. */
export const GuestStepper: React.FC<GuestStepperProps> = ({ value, min = 1, max, onChange, labelId }) => {
  const outRef = useRef<HTMLOutputElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    pop(outRef.current);
  }, [value]);
  return (
    <div className="bk-stepper" role="group" aria-labelledby={labelId}>
      <button type="button" className="bk-step" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={t('Kamaytirish')}>
        <span aria-hidden="true">−</span>
      </button>
      <output className="bk-stepper-val tabular-nums" ref={outRef} aria-live="polite">
        {t('{n} kishi', { n: value })}
      </output>
      <button type="button" className="bk-step" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={t("Ko'paytirish")}>
        <span aria-hidden="true">+</span>
      </button>
    </div>
  );
};
