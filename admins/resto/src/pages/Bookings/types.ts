/** Bron sahifasi turlari (B1 API shartnomasi: `/api/restaurant/admin/v1/reservations/` va `/settings/` ichidagi `booking`). */

export interface ReservationTable {
  id: number;
  number: string;
  /** Zal nomi (server satr yoki {id, name} qaytarishi mumkin: ikkalasi ham qabul qilinadi) */
  hall: string;
}

export interface Reservation {
  id: number;
  public_code: string;
  table: ReservationTable | null;
  customer_name: string;
  customer_phone: string;
  guests_count: number;
  /** YYYY-MM-DD */
  reservation_date: string;
  /** HH:MM */
  reservation_time: string;
  duration_minutes: number;
  /** Tadbir turi kaliti ("none" = tadbirsiz) */
  event_type: string;
  /** Tadbir turi nomi (server hozirgi sozlamadan yozadi; bo'sh bo'lishi mumkin) */
  event_label: string;
  notes: string;
  /** Xom holat kodi: ko'rsatishda status.ts orqali nomga aylanadi */
  status: string;
  /** Server bergan holat nomi (bo'lsa; noma'lum holat uchun zaxira) */
  status_display: string;
  source: string;
  created_at: string;
}

export interface ReservationsQuery {
  from: string;
  to: string;
  status?: string;
  q?: string;
  table?: number;
}

export interface CreateReservationPayload {
  table_id: number;
  date: string;
  time: string;
  guests: number;
  name: string;
  phone: string;
  event_type: string;
  notes: string;
  status?: string;
}

export interface UpdateReservationPayload {
  status?: string;
  table_id?: number;
  date?: string;
  time?: string;
  guests?: number;
  name?: string;
  phone?: string;
  event_type?: string;
  notes?: string;
}

/** Qo'lda bron uchun stol tanlash ro'yxati (`/tables/` javobidan) */
export interface TableOption {
  id: number;
  number: string;
  hall: string;
  capacity: number;
}

export interface TranslatedName {
  key: string;
  label: string;
  label_ru?: string;
  label_en?: string;
}

/** Vaqt oralig'i guruhi (masalan "Tushlik": 12:30, 13:00 …) */
export interface SlotGroup extends TranslatedName {
  times: string[];
}

export type EventType = TranslatedName;

export interface BookingConfig {
  enabled: boolean;
  slots: SlotGroup[];
  event_types: EventType[];
  duration_minutes: number;
  max_days_ahead: number;
  min_notice_minutes: number;
  auto_confirm: boolean;
  /** 0 = Dushanba … 6 = Yakshanba */
  closed_weekdays: number[];
}
