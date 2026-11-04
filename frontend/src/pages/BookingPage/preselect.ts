// Bron sahifasini oldindan tanlangan stol bilan ochish (`/book/?table=<id>`, sayrdan kelganda `&from=tour`). Sof mantiq, brauzersiz sinaladi.
// Mavjud oqim o'zgarmaydi: parametr yo'q / noto'g'ri bo'lsa hamma narsa avvalgidek (stol tanlanmagan holda boshlanadi).
import type { TableState } from './availability.ts'
import type { BookingHall } from './types.ts'

export interface Preselect {
  /** Oldindan tanlangan stol (musbat butun son) yoki null */
  tableId: number | null
  /** Sayrdan kelgan (muvaffaqiyatdan keyin "Sayrga qaytish" ko'rsatiladi) */
  fromTour: boolean
}

/** `window.location.search` -> parametrlar. Noto'g'ri `table` (manfiy, kasr, matn, juda uzun) e'tiborsiz qoldiriladi. */
export function parsePreselect(search: string): Preselect {
  let params: URLSearchParams
  try {
    params = new URLSearchParams(search)
  } catch {
    return { tableId: null, fromTour: false }
  }
  const raw = (params.get('table') ?? '').trim()
  const tableId = /^\d{1,9}$/.test(raw) && Number(raw) > 0 ? Number(raw) : null
  return { tableId, fromTour: params.get('from') === 'tour' }
}

export type PreselectOutcome =
  /** Stol zal ro'yxatida yo'q (o'chirilgan / boshqa tenant / eskirgan havola) */
  | { kind: 'missing' }
  /** Holatlar hali yuklanmagan: kutish */
  | { kind: 'pending'; hallId: number }
  /** Stol bor, lekin tanlangan kunga bo'sh emas: zal ochiladi, bron oynasi ochilmaydi */
  | { kind: 'unavailable'; hallId: number; state: TableState }
  /** Bo'sh: bron oynasini ochish mumkin */
  | { kind: 'open'; hallId: number }

/**
 * Oldindan tanlangan stol bilan nima qilish kerak. `states` — joriy kun va mehmon soni uchun stol holatlari
 * (bo'sh xarita = hali yuklanmagan).
 */
export function resolvePreselect(
  tableId: number,
  halls: readonly BookingHall[],
  states: ReadonlyMap<number, { state: TableState }>,
): PreselectOutcome {
  const hall = halls.find((h) => h.tables.some((tb) => tb.id === tableId))
  if (!hall) return { kind: 'missing' }
  const current = states.get(tableId)
  if (!current) return { kind: 'pending', hallId: hall.id }
  return current.state === 'free' ? { kind: 'open', hallId: hall.id } : { kind: 'unavailable', hallId: hall.id, state: current.state }
}
