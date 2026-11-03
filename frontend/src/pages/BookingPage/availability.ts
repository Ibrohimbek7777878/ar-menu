// availability -> stol/vaqt holati, tilga mos yorliqlar, zal rejasi geometriyasi: sof mantiq.
import type { Lang } from '../../i18n/core.ts'
import type { BookingHall, BookingTable, LabeledItem, SlotGroup, SlotState, TableSlots } from './types.ts'

const SLOT_STATES: readonly string[] = ['free', 'taken', 'past', 'closed', 'too_small']

/** Server noma'lum holat yuborsa — xavfsiz tomon: tanlab bo'lmaydi (`taken`). */
export function normalizeSlotState(value: unknown): SlotState {
  return typeof value === 'string' && SLOT_STATES.includes(value) ? (value as SlotState) : 'taken'
}

/** Tilga mos yorliq: ru/en tarjimasi bo'lsa shu, bo'sh bo'lsa asl (o'zbekcha) `label`. */
export function pickLabel(item: Pick<LabeledItem, 'label' | 'label_ru' | 'label_en'>, lang: Lang): string {
  const translated = lang === 'ru' ? item.label_ru : lang === 'en' ? item.label_en : undefined
  const text = typeof translated === 'string' ? translated.trim() : ''
  return text || item.label
}

// ── Stol holati (1-qadam: sana + mehmon soni bo'yicha) ──────────────────────────────────────────────
export type TableState = 'free' | 'busy' | 'past' | 'closed' | 'too_small'

export interface TableAvailability {
  state: TableState
  /** Bo'sh vaqt oraliqlari soni */
  freeCount: number
}

/**
 * Bitta stol: kamida bitta bo'sh vaqti bor -> `free`. Aks holda sababi: hammasi `too_small` -> stol kichik; bironta `taken` -> band;
 * aks holda `past` (o'tib ketgan) yoki `closed`. Kun yopiq yoki stol javobda yo'q -> `closed`.
 */
export function tableAvailability(slots: Record<string, SlotState> | undefined, dayClosed: boolean): TableAvailability {
  if (dayClosed || !slots) return { state: 'closed', freeCount: 0 }
  const states = Object.values(slots)
  if (!states.length) return { state: 'closed', freeCount: 0 }
  const freeCount = states.filter((s) => s === 'free').length
  if (freeCount > 0) return { state: 'free', freeCount }
  if (states.every((s) => s === 'too_small')) return { state: 'too_small', freeCount: 0 }
  if (states.includes('taken')) return { state: 'busy', freeCount: 0 }
  if (states.includes('past')) return { state: 'past', freeCount: 0 }
  if (states.includes('too_small')) return { state: 'too_small', freeCount: 0 }
  return { state: 'closed', freeCount: 0 }
}

export function slotsOfTable(tables: readonly TableSlots[] | undefined, tableId: number): Record<string, SlotState> | undefined {
  return tables?.find((t) => t.id === tableId)?.slots
}

/** Barcha stollar: id -> holat. `tables` yo'q (hali yuklanmagan) bo'lsa bo'sh xarita. */
export function tableStates(
  halls: readonly BookingHall[],
  tables: readonly TableSlots[] | undefined,
  dayClosed: boolean,
): Map<number, TableAvailability> {
  const map = new Map<number, TableAvailability>()
  if (!tables) return map
  for (const hall of halls) {
    for (const tbl of hall.tables) map.set(tbl.id, tableAvailability(slotsOfTable(tables, tbl.id), dayClosed))
  }
  return map
}

// ── Vaqt oraliqlari (2-qadam) ──────────────────────────────────────────────────────────────────────
/** `unknown` — availability hali yuklanmagan (tanlab bo'lmaydi, lekin "band" ham emas). */
export type TimeCellState = SlotState | 'unknown'

export interface TimeCell {
  time: string
  state: TimeCellState
  selectable: boolean
}

export interface TimeGroupView {
  key: string
  group: SlotGroup
  cells: TimeCell[]
  freeCount: number
}

/** Vaqt guruhlari ko'rinishi. Javobda yo'q vaqt (admin hozirgina qo'shgan) -> `closed`. Bo'sh guruhlar tashlanadi. */
export function timeGroupsView(groups: readonly SlotGroup[], slots: Record<string, SlotState> | undefined): TimeGroupView[] {
  return groups
    .filter((g) => g.times.length > 0)
    .map((group) => {
      const cells: TimeCell[] = group.times.map((time) => {
        const state: TimeCellState = slots ? (slots[time] ?? 'closed') : 'unknown'
        return { time, state, selectable: state === 'free' }
      })
      return { key: group.key, group, cells, freeCount: cells.filter((c) => c.selectable).length }
    })
}

/** Tanlangan vaqt hali bo'shmi (availability yo'q bo'lsa -> noma'lum: null). */
export function isTimeFree(slots: Record<string, SlotState> | undefined, time: string | null): boolean | null {
  if (!slots || !time) return null
  return slots[time] === 'free'
}

// ── Zal rejasi geometriyasi ────────────────────────────────────────────────────────────────────────
export interface PlanBox {
  minX: number
  minY: number
  width: number
  height: number
}

export function isPlaced(tbl: BookingTable): boolean {
  return Number.isFinite(tbl.x) && Number.isFinite(tbl.y) && tbl.w > 0 && tbl.h > 0
}

/**
 * Zalda reja chizish mumkinmi: har bir stolning o'lchami (w, h > 0) bor va stollar bir nuqtaga yig'ilib qolmagan.
 * Aks holda (koordinata 0/yo'q) ro'yxat ko'rinishi ishlatiladi.
 */
export function hasUsablePlan(hall: Pick<BookingHall, 'tables'>): boolean {
  const list = hall.tables
  if (!list.length || !list.every(isPlaced)) return false
  if (list.length === 1) return true
  const spots = new Set(list.map((t) => `${t.x}|${t.y}`))
  return spots.size > 1
}

/** Barcha stollarni o'z ichiga olgan chegara + atrofiga bo'sh joy (`pad` — stollarning eng kichik tomoniga nisbatan). */
export function planBox(tables: readonly BookingTable[]): PlanBox | null {
  const placed = tables.filter(isPlaced)
  if (!placed.length) return null
  const minDim = Math.min(...placed.map((t) => Math.min(t.w, t.h)))
  const pad = Math.max(minDim * 0.35, 4)
  const minX = Math.min(...placed.map((t) => t.x)) - pad
  const minY = Math.min(...placed.map((t) => t.y)) - pad
  const maxX = Math.max(...placed.map((t) => t.x + t.w)) + pad
  const maxY = Math.max(...placed.map((t) => t.y + t.h)) + pad
  return { minX, minY, width: maxX - minX, height: maxY - minY }
}

/**
 * Reja kengligining pastki chegarasi (CSS px): eng kichik stol ham `targetPx` (>= 44) ga yetsin, shu bilan koordinatalar
 * katta (2000x1200) bo'lsa ham stollar bosib bo'ladigan bo'ladi — sig'masa reja yonga suriladi. Yuqori chegara `capPx`.
 */
export function planMinWidth(box: PlanBox, tables: readonly BookingTable[], targetPx = 44, capPx = 1600): number {
  const placed = tables.filter(isPlaced)
  if (!placed.length || box.width <= 0) return 0
  const minDim = Math.min(...placed.map((t) => Math.min(t.w, t.h)))
  return Math.round(Math.min(capPx, (box.width * targetPx) / minDim))
}

export type TableShape = 'round' | 'rect'

/** Server shakl nomlari erkin ("round", "circle", "oval", "rect", "square", "rectangle"...). */
export function tableShape(shape: string): TableShape {
  return /^(round|circle|oval|ellipse|circular)/i.test(shape.trim()) ? 'round' : 'rect'
}

/** Zalda nechta stol bor va nechtasi bo'sh (zal tablari uchun). */
export function hallFreeCount(hall: BookingHall, states: ReadonlyMap<number, TableAvailability>): number {
  return hall.tables.filter((t) => states.get(t.id)?.state === 'free').length
}
