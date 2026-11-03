import { ApiError, apiClient } from '@admins/shared';
import type {
  BookingConfig,
  CreateReservationPayload,
  Reservation,
  ReservationsQuery,
  TableOption,
  UpdateReservationPayload,
} from './types';
import { normalizeReservation, reservationsFromResponse } from './reservationsView';
import { cleanForSave, normalizeBooking } from './settingsModel';
import { SETTINGS_URL, TABLES_URL, reservationUrl, reservationsUrl, RESERVATIONS_URL } from './urls';

/** Bronlar ro'yxati: `GET reservations/?from&to&status&q&table` -> `{count, results}` */
export async function fetchReservations(query: ReservationsQuery): Promise<Reservation[]> {
  const raw = await apiClient<unknown>(reservationsUrl(query));
  return reservationsFromResponse(raw);
}

/** Qo'lda bron: 201 -> yaratilgan bron. 409 `slot_taken`, 400 `{error, field}`. */
export async function createReservation(payload: CreateReservationPayload): Promise<Reservation | null> {
  const raw = await apiClient<unknown>(RESERVATIONS_URL, { method: 'POST', body: JSON.stringify(payload) });
  return normalizeReservation(raw);
}

/** Holat o'zgartirish va tahrirlash: faqat o'zgargan maydonlar yuboriladi. */
export async function updateReservation(id: number, patch: UpdateReservationPayload): Promise<Reservation | null> {
  const raw = await apiClient<unknown>(reservationUrl(id), { method: 'PATCH', body: JSON.stringify(patch) });
  return normalizeReservation(raw);
}

interface TablesPayload {
  items?: {
    id: number;
    number: string;
    hall_name?: string;
    capacity?: number;
    is_active?: boolean;
    is_deleted?: boolean;
  }[];
}

/** Qo'lda bron uchun stollar (arxivlangan va nofaol stollarsiz). */
export async function fetchTableOptions(): Promise<TableOption[]> {
  const raw = await apiClient<TablesPayload>(TABLES_URL);
  return (raw.items ?? [])
    .filter((table) => !table.is_deleted && table.is_active !== false)
    .map((table) => ({
      id: table.id,
      number: String(table.number),
      hall: table.hall_name ?? '',
      capacity: typeof table.capacity === 'number' ? table.capacity : 0,
    }));
}

interface SettingsPayload {
  booking?: unknown;
}

/** Bron sozlamalari: `GET settings/` ichidagi `booking` (yo'q bo'lsa standart to'plam). */
export async function fetchBookingSettings(): Promise<BookingConfig> {
  try {
    const raw = await apiClient<SettingsPayload>(SETTINGS_URL);
    return normalizeBooking(raw.booking);
  } catch (err: unknown) {
    // `settings_admin` ruxsati yo'q (masalan qabul stoli xodimi): faqat O'QISH uchun alohida endpoint (`reservations` ruxsati)
    if (err instanceof ApiError && err.status === 403) {
      return normalizeBooking(await apiClient<unknown>(`${RESERVATIONS_URL}config/`));
    }
    throw err;
  }
}

/** Saqlash: `PATCH settings/ {booking}` — to'liq almashtirish. Javobdagi `booking` qaytariladi (server tuzatgan bo'lishi mumkin). */
export async function saveBookingSettings(config: BookingConfig): Promise<BookingConfig> {
  const body = cleanForSave(config);
  const raw = await apiClient<SettingsPayload>(SETTINGS_URL, { method: 'PATCH', body: JSON.stringify({ booking: body }) });
  return raw && typeof raw === 'object' && 'booking' in raw ? normalizeBooking(raw.booking) : normalizeBooking(body);
}
