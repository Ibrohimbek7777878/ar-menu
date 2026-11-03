// "Sizning bronlaringiz": shu qurilmada qilingan kelgusi bronlar (faqat kod, sana, stol — ism va telefon saqlanmaydi).
import React from 'react';
import { numberLocale, t } from '../../i18n';
import { formatDay } from './dates';
import { hallName, tableTitle } from './labels';
import { StatusCheck } from './StatusCheck';
import type { StoredBooking } from './types';

export const MyBookings: React.FC<{ items: readonly StoredBooking[] }> = ({ items }) => {
  const locale = numberLocale();
  if (!items.length) return null;
  return (
    <section className="bk-card-block" aria-labelledby="bk-mine-title">
      <h2 className="bk-block-title" id="bk-mine-title">{t('Sizning bronlaringiz')}</h2>
      <ul className="bk-mine">
        {items.map((b) => (
          <li className="bk-mine-row" key={b.code}>
            <div className="bk-mine-main">
              <strong className="bk-mine-code">{b.code}</strong>
              <span className="bk-mine-sub tabular-nums">
                {formatDay(b.date, locale).long} · {b.time}
                {b.tableNumber ? ` · ${tableTitle(b.tableNumber)}` : ''}
                {b.hall ? ` · ${hallName(b.hall)}` : ''}
              </span>
            </div>
            <StatusCheck code={b.code} compact />
          </li>
        ))}
      </ul>
    </section>
  );
};
