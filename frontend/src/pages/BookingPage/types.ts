// Bron (mehmon tomoni) — server shartnomasi turlari. Server: GET/POST /api/restaurant/guest/booking/...
// Barcha maydonlar parse.ts da "ishonchsiz kirish" sifatida tekshiriladi: server noto'g'ri/eskirgan javob bersa ham sahifa qulamaydi.

/** Vaqt oralig'i holati (availability): bo'sh | band | o'tgan | yopiq | stol kichik. */
export type SlotState = 'free' | 'taken' | 'past' | 'closed' | 'too_small'

/** Tilga qarab yorliq tanlanadigan element (vaqt guruhi, tadbir turi). */
export interface LabeledItem {
  key: string
  label: string
  label_ru?: string
  label_en?: string
}

export interface SlotGroup extends LabeledItem {
  /** "HH:MM" vaqtlar, o'sish tartibida */
  times: string[]
}

export type EventType = LabeledItem

export interface BookingTable {
  id: number
  number: string
  capacity: number
  shape: string
  x: number
  y: number
  w: number
  h: number
}

export interface BookingHall {
  id: number
  name: string
  tables: BookingTable[]
}

export interface BookingConfig {
  enabled: boolean
  slots: SlotGroup[]
  event_types: EventType[]
  max_days_ahead: number
  duration_minutes: number
  min_notice_minutes: number
  /** Yopiq hafta kunlari. Hisoblash tartibi: 0 = Dushanba ... 6 = Yakshanba (Python `date.weekday()`), qarang dates.ts */
  closed_weekdays: number[]
  shopName: string
  halls: BookingHall[]
}

export interface TableSlots {
  id: number
  slots: Record<string, SlotState>
}

export interface Availability {
  date: string
  closed: boolean
  tables: TableSlots[]
}

export interface BookingPayload {
  table_id: number
  date: string
  time: string
  guests: number
  name: string
  phone: string
  event_type: string
  notes: string
  submission_id: string
}

export interface BookingResult {
  public_code: string
  status: string
  tableId: number | null
  tableNumber: string
  hall: string
  date: string
  time: string
  guests: number
  duration_minutes: number
}

/** Server rad etishi / tarmoq xatosi — UI uchun yagona shakl. */
export type SubmitFailure =
  | { kind: 'slot_taken' }
  | { kind: 'disabled' }
  | { kind: 'rate_limited' }
  | { kind: 'invalid'; field: string; message: string }
  | { kind: 'network' }
  | { kind: 'server' }

export type SubmitOutcome = { ok: true; booking: BookingResult } | ({ ok: false } & SubmitFailure)

/** Bron holati (GET .../<kod>/). Faqat bor maydonlar to'ldiriladi. */
export interface BookingStatusInfo {
  public_code: string
  status: string
  tableNumber?: string
  hall?: string
  date?: string
  time?: string
  guests?: number
}

/** Mehmon qurilmasida eslab qolinadigan bron. */
export interface StoredBooking {
  code: string
  date: string
  time: string
  tableNumber: string
  hall: string
  guests: number
  savedAt: number
}
