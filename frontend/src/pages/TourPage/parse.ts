// Mehmon sayri javobini tekshirish (sof funksiyalar, brauzersiz sinaladi). Noto'g'ri maydon -> standart/tashlab yuborish; hech qachon yiqilmaydi.
import { cleanText, safeImageUrl } from '../../utils/brand.ts'
import type { TourData, TourHotspot, TourStop, TourVideo } from './types.ts'

export const MAX_STOPS = 60
export const MAX_HOTSPOTS = 300
const MAX_TITLE = 80
const MAX_LABEL = 80
const MAX_NUMBER = 16

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

function num(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function int(value: unknown): number | null {
  const n = num(value)
  return n !== null && Number.isInteger(n) ? n : null
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

/** Media manzili: faqat saytning o'z yo'li (`/media/...`) yoki http(s) (brend rasmlari bilan bir xil qoida). */
export function safeMediaUrl(value: unknown): string | null {
  return safeImageUrl(value)
}

function parseVideo(raw: unknown): TourVideo {
  const v = isObject(raw) ? raw : {}
  return { scrub: safeMediaUrl(v.scrub), play: safeMediaUrl(v.play), low: safeMediaUrl(v.low), poster: safeMediaUrl(v.poster) }
}

function parseStops(raw: unknown, duration: number): TourStop[] {
  if (!Array.isArray(raw)) return []
  const out: TourStop[] = []
  for (const item of raw) {
    if (!isObject(item)) continue
    const time = num(item.t ?? item.time)
    const id = int(item.id)
    if (time === null || time < 0 || id === null) continue
    out.push({ id, title: cleanText(item.title, MAX_TITLE), time: duration > 0 ? Math.min(time, duration) : time })
    if (out.length >= MAX_STOPS) break
  }
  return out.sort((a, b) => a.time - b.time || a.id - b.id)
}

function parseHotspots(raw: unknown): TourHotspot[] {
  if (!Array.isArray(raw)) return []
  const out: TourHotspot[] = []
  for (const item of raw) {
    if (!isObject(item)) continue
    const id = int(item.id)
    const a = num(item.t_start)
    const b = num(item.t_end)
    const x = num(item.x)
    const y = num(item.y)
    if (id === null || a === null || b === null || x === null || y === null || a < 0 || b < 0) continue
    const capacity = int(item.capacity)
    out.push({
      id,
      tableId: int(item.table_id),
      tableNumber: cleanText(item.table_number === undefined || item.table_number === null ? '' : String(item.table_number), MAX_NUMBER),
      capacity: capacity !== null && capacity > 0 ? capacity : 0,
      label: cleanText(item.label, MAX_LABEL),
      // Teskari berilgan oraliq (t_start > t_end) — belgi yo'qolib qolmasin, tartibga solinadi
      tStart: Math.min(a, b),
      tEnd: Math.max(a, b),
      x: clamp01(x),
      y: clamp01(y),
    })
    if (out.length >= MAX_HOTSPOTS) break
  }
  return out.sort((p, q) => p.tStart - q.tStart || p.id - q.id)
}

/** Ko'rsatishga arziydigan narsa bormi: video varianti yoki surat. Hech narsa yo'q bo'lsa sayr "yo'q" hisoblanadi. */
export function hasContent(video: TourVideo): boolean {
  return Boolean(video.scrub || video.play || video.low || video.poster)
}

/** Server javobi -> sayr. `enabled !== true` yoki ko'rsatadigan narsa yo'q -> null (sayr yo'q). */
export function parseTour(raw: unknown): TourData | null {
  if (!isObject(raw) || raw.enabled !== true) return null
  const video = parseVideo(raw.video)
  if (!hasContent(video)) return null
  const rawDuration = num(raw.duration)
  const duration = rawDuration !== null && rawDuration > 0 ? rawDuration : 0
  const width = int(raw.width)
  const height = int(raw.height)
  return {
    title: cleanText(raw.title, MAX_TITLE),
    duration,
    width: width !== null && width > 0 ? width : 0,
    height: height !== null && height > 0 ? height : 0,
    video,
    stops: parseStops(raw.stops, duration),
    hotspots: parseHotspots(raw.hotspots),
  }
}
