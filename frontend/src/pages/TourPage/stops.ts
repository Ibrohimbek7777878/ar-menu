// Sayr nuqtalari (boblar) va vaqt oralig'idagi belgilar bilan ishlash (sof).
import type { TourHotspot, TourStop } from './types.ts'

/** Nuqtaga shuncha soniya qolganda "yetib keldi" hisoblanadi (va undan keyin ham shuncha vaqt "shu nuqtada") */
export const AT_STOP_TOLERANCE = 0.4

/** Nuqtalar vaqt bo'yicha o'sish tartibida deb faraz qilinadi (parse.ts shunday beradi). */

/** Joriy nuqta: vaqti <= time + tolerance bo'lgan oxirgi nuqta (nuqta oralig'ida bo'lsak — o'sha bob). Birinchi nuqtadan oldin: -1. */
export function currentStopIndex(stops: readonly TourStop[], time: number, tolerance = AT_STOP_TOLERANCE): number {
  let found = -1
  for (let i = 0; i < stops.length; i++) {
    if (stops[i].time <= time + tolerance) found = i
    else break
  }
  return found
}

/** Vaqtga eng yaqin nuqta indeksi (teng masofada — oldingisi); nuqta yo'q bo'lsa -1. */
export function nearestStopIndex(stops: readonly TourStop[], time: number): number {
  let best = -1
  let bestDist = Number.POSITIVE_INFINITY
  for (let i = 0; i < stops.length; i++) {
    const dist = Math.abs(stops[i].time - time)
    if (dist < bestDist) {
      best = i
      bestDist = dist
    }
  }
  return best
}

/** Orqadagi eng yaqin nuqta (nuqtada turgan bo'lsak — undan oldingisi); yo'q bo'lsa null. */
export function prevStop(stops: readonly TourStop[], time: number, tolerance = AT_STOP_TOLERANCE): TourStop | null {
  for (let i = stops.length - 1; i >= 0; i--) if (stops[i].time < time - tolerance) return stops[i]
  return null
}

/** Oldindagi eng yaqin nuqta (nuqtada turgan bo'lsak — undan keyingisi); yo'q bo'lsa null. */
export function nextStop(stops: readonly TourStop[], time: number, tolerance = AT_STOP_TOLERANCE): TourStop | null {
  for (const stop of stops) if (stop.time > time + tolerance) return stop
  return null
}

/** Klaviatura raqami (1..9) -> nuqta; yo'q bo'lsa null. */
export function stopByDigit(stops: readonly TourStop[], digit: number): TourStop | null {
  return Number.isInteger(digit) && digit >= 1 && digit <= stops.length ? stops[digit - 1] : null
}

// ─── Belgilar (stol) ───────────────────────────────────────────────────────────

/** Berilgan vaqtda ko'rinadigan belgilar (tStart <= time <= tEnd). Tartib barqaror: boshlanish vaqti, keyin id. */
export function visibleHotspots(hotspots: readonly TourHotspot[], time: number): TourHotspot[] {
  return hotspots.filter((h) => h.tStart <= time && time <= h.tEnd).sort((a, b) => a.tStart - b.tStart || a.id - b.id)
}

/** Ko'rinadigan belgilar to'plamining qisqa belgisi: render faqat o'zgarganda kerak bo'lishini tekshirish uchun. */
export function hotspotSignature(list: readonly TourHotspot[]): string {
  return list.map((h) => h.id).join(',')
}

/**
 * Hozir belgi ko'rinmasa: eng yaqin belgi oynasi qaysi tomonda. Ko'rinib turgan belgi bor yoki belgilar yo'q bo'lsa null.
 * Masofa teng bo'lsa — oldinga (sayr oldinga qarab yuradi).
 */
export function nearestHotspotDirection(hotspots: readonly TourHotspot[], time: number): 'forward' | 'back' | null {
  if (!hotspots.length) return null
  let ahead = Number.POSITIVE_INFINITY
  let behind = Number.POSITIVE_INFINITY
  for (const h of hotspots) {
    if (h.tStart <= time && time <= h.tEnd) return null
    if (h.tStart > time) ahead = Math.min(ahead, h.tStart - time)
    else behind = Math.min(behind, time - h.tEnd)
  }
  if (ahead === Number.POSITIVE_INFINITY && behind === Number.POSITIVE_INFINITY) return null
  return ahead <= behind ? 'forward' : 'back'
}

export interface TableEntry {
  tableId: number
  tableNumber: string
  capacity: number
  /** Sayrda shu stolni ko'rsatish uchun vaqt (birinchi oynaning o'rtasi) */
  seekTime: number
}

/** Stol raqamlarini tabiiy tartibda solishtirish: "2" < "10" < "VIP-1". */
export function compareTableNumbers(a: string, b: string): number {
  const na = /^\d+$/.test(a) ? Number(a) : null
  const nb = /^\d+$/.test(b) ? Number(b) : null
  if (na !== null && nb !== null) return na - nb || a.localeCompare(b)
  if (na !== null) return -1
  if (nb !== null) return 1
  return a.localeCompare(b, undefined, { numeric: true })
}

/** Belgilardagi bron qilinadigan stollar (har stol bir marta; bir nechta oyna bo'lsa eng birinchisi). Stol ulanmagan belgilar tashlanadi. */
export function tableEntries(hotspots: readonly TourHotspot[]): TableEntry[] {
  const byTable = new Map<number, TableEntry>()
  for (const h of [...hotspots].sort((a, b) => a.tStart - b.tStart || a.id - b.id)) {
    if (h.tableId === null || byTable.has(h.tableId)) continue
    byTable.set(h.tableId, { tableId: h.tableId, tableNumber: h.tableNumber, capacity: h.capacity, seekTime: (h.tStart + h.tEnd) / 2 })
  }
  return [...byTable.values()].sort((a, b) => compareTableNumbers(a.tableNumber, b.tableNumber) || a.tableId - b.tableId)
}
