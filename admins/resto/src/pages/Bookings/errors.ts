/**
 * Server xatosini sahifaga qulay shaklga keltirish. SOF mantiq: hech narsa import qilmaydi (`ApiError` sinfi ham: faqat shakli tekshiriladi).
 *
 * Shartnoma (B1): 400 `{error, field}` — noto'g'ri kiritish (field maydonni ko'rsatadi, sozlamalarda `booking.slots[1].times[0]`);
 * 409 `{code: 'slot_taken'}` — stol shu vaqtda band; 403 — ruxsat yo'q. `apiClient` xabarni o'zi oladi, `field` va `code` esa faqat
 * xom javobda (`error.problem`) turadi.
 */

export interface ApiFailure {
  /** HTTP holati; 0 = javob kelmadi (internet yo'q) */
  status: number;
  /** Server xabari (o'zbekcha) yoki bo'sh: u holda sahifa o'zining standart xabarini ko'rsatadi */
  message: string;
  /** Server ko'rsatgan maydon yo'li (bo'lmasa bo'sh) */
  field: string;
  /** Server kodi (`slot_taken` …) yoki bo'sh */
  code: string;
  /** Stol shu vaqtda band (409 yoki `slot_taken`) */
  slotTaken: boolean;
  forbidden: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const str = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/** "So'rov muvaffaqiyatsiz tugadi (409)" kabi umumiy matnni server xabari deb ko'rsatmaslik uchun */
const GENERIC_MESSAGE = /\(\d{3}\)\s*$|^Failed to fetch$|^NetworkError|^Load failed$/i;

export function readFailure(error: unknown): ApiFailure {
  const status = isRecord(error) && typeof error.status === 'number' ? error.status : 0;
  const problem = isRecord(error) && isRecord(error.problem) ? error.problem : null;
  const code = str(problem?.code);
  const field = str(problem?.field);
  const own = problem ? str(problem.error) || str(problem.detail) || str(problem.title) : '';
  const raw = error instanceof Error ? error.message.trim() : '';
  const message = own || (raw && !GENERIC_MESSAGE.test(raw) ? raw : '');
  return {
    status,
    message,
    field,
    code,
    slotTaken: status === 409 || code === 'slot_taken',
    forbidden: status === 403,
  };
}

export type ReservationField = 'table' | 'date' | 'time' | 'guests' | 'name' | 'phone' | 'event_type' | 'notes' | 'status' | 'general';

const FIELD_BY_SERVER: Record<string, ReservationField> = {
  table: 'table',
  table_id: 'table',
  date: 'date',
  reservation_date: 'date',
  time: 'time',
  reservation_time: 'time',
  guests: 'guests',
  guests_count: 'guests',
  name: 'name',
  customer_name: 'name',
  phone: 'phone',
  customer_phone: 'phone',
  event_type: 'event_type',
  notes: 'notes',
  status: 'status',
};

/** Server maydon nomini forma maydoniga bog'laydi; noma'lum nom — umumiy xato. */
export function reservationFieldOf(field: string): ReservationField {
  return FIELD_BY_SERVER[field.trim().toLowerCase()] ?? 'general';
}
