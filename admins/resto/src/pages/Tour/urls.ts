/** Sayr API manzillari (VT1 shartnomasi). SOF mantiq: manzil qurish alohida sinaladi. */

export const TOURS_URL = '/api/restaurant/admin/v1/tours/';
export const TABLES_URL = '/api/restaurant/admin/v1/tables/';
/** Mehmonlar shu manzilda ko'radi (yangi oynada ochiladi) */
export const GUEST_TOUR_PATH = '/tour/';

const safeId = (id: number): string => {
  if (!Number.isInteger(id) || id <= 0) throw new Error(`Noto'g'ri sayr raqami: ${id}`);
  return encodeURIComponent(String(id));
};

export const tourUrl = (id: number): string => `${TOURS_URL}${safeId(id)}/`;
export const tourVideoUrl = (id: number): string => `${tourUrl(id)}video/`;
export const tourStopsUrl = (id: number): string => `${tourUrl(id)}stops/`;
export const tourHotspotsUrl = (id: number): string => `${tourUrl(id)}hotspots/`;
export const tourPublishUrl = (id: number): string => `${tourUrl(id)}publish/`;
export const tourUnpublishUrl = (id: number): string => `${tourUrl(id)}unpublish/`;
export const tourAiSuggestUrl = (id: number): string => `${tourUrl(id)}ai-suggest/`;
export const tourAiSuggestionsUrl = (id: number): string => `${tourUrl(id)}ai-suggestions/`;

/** Sahifa ichidagi manzil: `/ra/tour?id=5` (tur ro'yxatga qaytganda parametr olib tashlanadi) */
export function tourIdFromSearch(search: string): number | null {
  const raw = new URLSearchParams(search).get('id');
  if (raw === null || !/^\d{1,9}$/.test(raw)) return null;
  const id = Number(raw);
  return id > 0 ? id : null;
}
