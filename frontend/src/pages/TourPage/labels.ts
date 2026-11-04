// Sayr ekranining ko'rinadigan matnlari (tilga bog'liq). Matnlar faqat literal t() chaqiruvlarida.
import { t } from '../../i18n';
import { tableTitle } from '../BookingPage/labels';
import type { TourHotspot, TourStop } from './types';

/** "8 kishigacha" (sig'im noma'lum bo'lsa bo'sh). */
export function capacityText(capacity: number): string {
  return capacity > 0 ? t('{n} kishigacha', { n: capacity }) : '';
}

/** Belgi sarlavhasi: stol ulangan bo'lsa "03-stol", aks holda belgi yorlig'i. */
export function spotTitle(spot: Pick<TourHotspot, 'tableId' | 'tableNumber' | 'label'>): string {
  if (spot.tableNumber && (spot.tableId !== null || !spot.label)) return tableTitle(spot.tableNumber);
  return spot.label || t('Stol');
}

/** Belgi uchun ekran o'quvchi matni: "03-stol, 8 kishigacha". */
export function spotAria(spot: TourHotspot): string {
  const cap = capacityText(spot.capacity);
  return cap ? `${spotTitle(spot)}, ${cap}` : spotTitle(spot);
}

export function stopTitle(stop: TourStop, index: number): string {
  return stop.title || t('Nuqta {n}', { n: index + 1 });
}
