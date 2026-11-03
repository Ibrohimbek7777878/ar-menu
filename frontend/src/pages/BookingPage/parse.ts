// Server javoblarini tekshirish/normallashtirish: server nima yuborsa ham (HTML, null, kutilmagan shakl) UI qulamaydi.
import { clampDaysAhead, isTime } from './dates.ts'
import { normalizeSlotState } from './availability.ts'
import type {
  Availability,
  BookingConfig,
  BookingHall,
  BookingResult,
  BookingStatusInfo,
  BookingTable,
  EventType,
  SlotGroup,
  SlotState,
  SubmitFailure,
  TableSlots,
} from './types.ts'

type Obj = Record<string, unknown>

function isObj(value: unknown): value is Obj {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function str(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return fallback
}

function num(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN
  return Number.isFinite(n) ? n : fallback
}

function optStr(value: unknown): string | undefined {
  const s = typeof value === 'string' ? value.trim() : ''
  return s || undefined
}

function parseLabeled(raw: unknown, index: number): EventType | null {
  if (!isObj(raw)) return null
  const label = str(raw.label).trim()
  if (!label) return null
  return {
    key: str(raw.key).trim() || `item-${index}`,
    label,
    label_ru: optStr(raw.label_ru),
    label_en: optStr(raw.label_en),
  }
}

function parseSlotGroup(raw: unknown, index: number): SlotGroup | null {
  const base = parseLabeled(raw, index)
  if (!base || !isObj(raw) || !Array.isArray(raw.times)) return null
  const times = [...new Set(raw.times.filter(isTime))].sort()
  return times.length ? { ...base, times } : null
}

function parseTable(raw: unknown): BookingTable | null {
  if (!isObj(raw)) return null
  const id = num(raw.id, NaN)
  if (!Number.isInteger(id)) return null
  return {
    id,
    number: str(raw.number, String(id)),
    capacity: Math.max(1, Math.trunc(num(raw.capacity, 4))),
    shape: str(raw.shape, 'rect'),
    x: num(raw.x),
    y: num(raw.y),
    w: num(raw.w),
    h: num(raw.h),
  }
}

function parseHall(raw: unknown): BookingHall | null {
  if (!isObj(raw)) return null
  const id = num(raw.id, NaN)
  if (!Number.isInteger(id)) return null
  const tables = (Array.isArray(raw.tables) ? raw.tables : []).map(parseTable).filter((t): t is BookingTable => t !== null)
  return { id, name: str(raw.name), tables }
}

/** GET .../booking/config/ -> BookingConfig; shakl umuman noto'g'ri bo'lsa null. */
export function parseConfig(raw: unknown): BookingConfig | null {
  if (!isObj(raw) || typeof raw.enabled !== 'boolean') return null
  const slots = (Array.isArray(raw.slots) ? raw.slots : []).map(parseSlotGroup).filter((g): g is SlotGroup => g !== null)
  const eventTypes = (Array.isArray(raw.event_types) ? raw.event_types : []).map(parseLabeled).filter((e): e is EventType => e !== null)
  const halls = (Array.isArray(raw.halls) ? raw.halls : []).map(parseHall).filter((h): h is BookingHall => h !== null)
  const closed = (Array.isArray(raw.closed_weekdays) ? raw.closed_weekdays : [])
    .map((n) => num(n, NaN))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
  return {
    enabled: raw.enabled,
    slots,
    event_types: eventTypes,
    max_days_ahead: clampDaysAhead(raw.max_days_ahead ?? 30),
    duration_minutes: Math.max(0, Math.trunc(num(raw.duration_minutes, 120))),
    min_notice_minutes: Math.max(0, Math.trunc(num(raw.min_notice_minutes, 0))),
    closed_weekdays: [...new Set(closed)],
    shopName: isObj(raw.shop) ? str(raw.shop.name) : '',
    halls,
  }
}

/** GET .../booking/availability/ -> Availability; noto'g'ri shakl -> null. */
export function parseAvailability(raw: unknown): Availability | null {
  if (!isObj(raw) || typeof raw.date !== 'string' || !Array.isArray(raw.tables)) return null
  const tables: TableSlots[] = []
  for (const row of raw.tables) {
    if (!isObj(row)) continue
    const id = num(row.id, NaN)
    if (!Number.isInteger(id)) continue
    const slots: Record<string, SlotState> = {}
    if (isObj(row.slots)) for (const [time, state] of Object.entries(row.slots)) slots[time] = normalizeSlotState(state)
    tables.push({ id, slots })
  }
  return { date: raw.date, closed: raw.closed === true, tables }
}

function hallName(value: unknown): string {
  if (isObj(value)) return str(value.name)
  return str(value)
}

/** POST .../booking/ 201 javobi -> BookingResult; `public_code` yo'q bo'lsa null (bron qabul qilindi deb aytib bo'lmaydi). */
export function parseBookingResult(raw: unknown, fallback: { date: string; time: string; guests: number }): BookingResult | null {
  if (!isObj(raw)) return null
  const code = str(raw.public_code).trim()
  if (!code) return null
  const table = isObj(raw.table) ? raw.table : {}
  const tableId = num(table.id, NaN)
  return {
    public_code: code,
    status: str(raw.status, 'pending'),
    tableId: Number.isInteger(tableId) ? tableId : null,
    tableNumber: str(table.number),
    hall: hallName(table.hall),
    date: str(raw.date, fallback.date),
    time: str(raw.time, fallback.time),
    guests: Math.max(1, Math.trunc(num(raw.guests, fallback.guests))),
    duration_minutes: Math.max(0, Math.trunc(num(raw.duration_minutes, 0))),
  }
}

/** GET .../booking/<kod>/ -> holat; shakl: `{public_code,status,...}` yoki `{booking: {...}}`. */
export function parseStatus(raw: unknown, code: string): BookingStatusInfo | null {
  if (!isObj(raw)) return null
  const body = isObj(raw.booking) ? raw.booking : isObj(raw.reservation) ? raw.reservation : raw
  const status = str(body.status).trim()
  if (!status) return null
  const table = isObj(body.table) ? body.table : {}
  const guests = num(body.guests, NaN)
  return {
    public_code: str(body.public_code, code) || code,
    status,
    tableNumber: optStr(table.number) ?? optStr(str(body.table_number)),
    hall: optStr(hallName(table.hall)),
    date: optStr(body.date),
    time: optStr(body.time),
    guests: Number.isFinite(guests) ? Math.trunc(guests) : undefined,
  }
}

/** HTTP holati + tana -> UI uchun xato turi. */
export function failureFromResponse(status: number, body: unknown): SubmitFailure {
  const b = isObj(body) ? body : {}
  const code = str(b.code)
  if (status === 409) return { kind: 'slot_taken' }
  if (status === 429) return { kind: 'rate_limited' }
  if (status === 403 && code === 'booking_disabled') return { kind: 'disabled' }
  if (status === 400) return { kind: 'invalid', field: str(b.field), message: str(b.error) }
  return { kind: 'server' }
}
