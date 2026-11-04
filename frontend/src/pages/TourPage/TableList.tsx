// Matnli stollar ro'yxati: klaviatura, ekran o'quvchi va sekin internet uchun (video bo'lmasa ham ishlaydi).
import React from 'react';
import { t } from '../../i18n';
import { moduleEnabled } from '../../utils/brand';
import { tm } from '../../utils/brandText';
import { tableTitle } from '../BookingPage/labels';
import { capacityText } from './labels';
import type { TableEntry } from './stops';

interface TableListProps {
  entries: readonly TableEntry[];
  /** Video ishlayotgan bo'lsa "Sayrda ko'rish" tugmasi chiqadi */
  onSeek?: (time: number) => void;
  onBook: (tableId: number) => void;
}

export const TableList: React.FC<TableListProps> = ({ entries, onSeek, onBook }) => {
  if (!entries.length) {
    return <p className="tr-empty" role="status">{tm(t("Bu sayrda hali stol belgilari yo'q"))}</p>;
  }
  return (
    <ul className="tr-list">
      {entries.map((entry) => {
        const cap = capacityText(entry.capacity);
        return (
          <li key={entry.tableId} className="tr-row">
            <span className="tr-row-num tabular-nums" aria-hidden="true">{entry.tableNumber}</span>
            <div className="tr-row-text">
              <strong>{tableTitle(entry.tableNumber)}</strong>
              {cap && <small>{cap}</small>}
            </div>
            <div className="tr-row-actions">
              {onSeek && (
                <button type="button" className="tr-btn tr-btn--light tr-btn--small" onClick={() => onSeek(entry.seekTime)}>
                  {t("Sayrda ko'rish")}
                </button>
              )}
              {moduleEnabled('booking') && (
                <button type="button" className="tr-btn tr-btn--primary tr-btn--small" onClick={() => onBook(entry.tableId)}>
                  {t('Bron qilish')}
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
};
