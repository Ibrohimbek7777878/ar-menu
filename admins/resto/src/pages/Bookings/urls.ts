/** Bron API manzillari. SOF mantiq (apiClient'siz): manzil qurish alohida sinaladi. */

export const RESERVATIONS_URL = '/api/restaurant/admin/v1/reservations/';
export const SETTINGS_URL = '/api/restaurant/admin/v1/settings/';
export const TABLES_URL = '/api/restaurant/admin/v1/tables/';

export interface ReservationsQueryLike {
  from: string;
  to: string;
  status?: string;
  q?: string;
  table?: number;
}

/** `GET reservations/?from=&to=&status=&q=&table=`: bo'sh qiymatlar yuborilmaydi, qidiruv matni kesiladi. */
export function reservationsUrl(query: ReservationsQueryLike): string {
  const params = new URLSearchParams();
  params.set('from', query.from);
  params.set('to', query.to);
  if (query.status && query.status !== 'all') params.set('status', query.status);
  const q = query.q?.trim();
  if (q) params.set('q', q);
  if (typeof query.table === 'number' && Number.isInteger(query.table) && query.table > 0) params.set('table', String(query.table));
  return `${RESERVATIONS_URL}?${params.toString()}`;
}

export const reservationUrl = (id: number): string => `${RESERVATIONS_URL}${encodeURIComponent(String(id))}/`;
