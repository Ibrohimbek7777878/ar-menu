// Stollar ro'yxati (reja yo'q yoki koordinatalar bo'sh zallar uchun, shuningdek "Ro'yxat" ko'rinishi).
import React from 'react';
import { t } from '../../i18n';
import type { TableAvailability } from './availability';
import { hallName, tableStateLabel, tableTitle } from './labels';
import type { BookingHall, BookingTable } from './types';

interface TableCardsProps {
  hall: BookingHall;
  states: ReadonlyMap<number, TableAvailability>;
  selectedId: number | null;
  onPick: (table: BookingTable, el: Element) => void;
}

export const TableCards: React.FC<TableCardsProps> = ({ hall, states, selectedId, onPick }) => (
  <ul className="bk-cards" aria-label={hallName(hall.name)}>
    {hall.tables.map((tb) => {
      const info = states.get(tb.id);
      const state = info?.state ?? 'unknown';
      const free = state === 'free';
      const selected = tb.id === selectedId && free;
      return (
        <li key={tb.id}>
          <button
            type="button"
            className={`bk-card ${free ? 'is-free' : 'is-off'} ${selected ? 'is-on' : ''}`}
            aria-pressed={free ? selected : undefined}
            aria-disabled={!free || undefined}
            onClick={(e) => {
              if (free) onPick(tb, e.currentTarget);
            }}
          >
            <span className="bk-card-num tabular-nums" aria-hidden="true">{tb.number}</span>
            <span className="bk-card-main">
              <strong className="bk-card-title">{tableTitle(tb.number)}</strong>
              <span className="bk-card-sub">
                {t('{n} kishigacha', { n: tb.capacity })} · {hallName(hall.name)}
              </span>
            </span>
            <span className={`bk-pill bk-pill--${selected ? 'on' : state}`}>
              {selected ? t('Tanlangan') : free && info ? t('{n} ta vaqt', { n: info.freeCount }) : tableStateLabel(state)}
            </span>
          </button>
        </li>
      );
    })}
  </ul>
);
