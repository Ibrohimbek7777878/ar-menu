// Stol kartochkasi (belgiga bosilganda pastdan chiqadi): "03-stol · 8 kishigacha · Asosiy zal" + [Bron qilish] [Yopish].
import React from 'react';
import { t } from '../../i18n';
import { moduleEnabled } from '../../utils/brand';
import { capacityText, spotTitle } from './labels';
import { TourSheet } from './TourSheet';
import type { TourHotspot } from './types';

interface TableCardProps {
  spot: TourHotspot;
  /** Zal nomi (serverda zal nomi alohida berilmaydi: sayr sarlavhasi) */
  hall: string;
  onBook: (tableId: number) => void;
  onClose: () => void;
}

export const TableCard: React.FC<TableCardProps> = ({ spot, hall, onBook, onClose }) => {
  const sub = [capacityText(spot.capacity), hall].filter(Boolean).join(' · ');
  return (
    <TourSheet title={spotTitle(spot)} subtitle={sub || undefined} onClose={onClose}>
      <div className="tr-card-actions">
        {spot.tableId !== null && moduleEnabled('booking') && (
          <button type="button" className="tr-btn tr-btn--primary" onClick={() => onBook(spot.tableId as number)}>
            {t('Bron qilish')}
          </button>
        )}
        <button type="button" className="tr-btn tr-btn--light" onClick={onClose}>{t('Yopish')}</button>
      </div>
    </TourSheet>
  );
};
