// Qaysi video varianti bilan boshlash va keyin nimaga almashtirish (sof). Sekin tarmoq / "ma'lumot tejash" -> yengil `low` da qolinadi.
import type { TourVideo, VariantKey } from './types.ts'

export interface ConnectionInfo {
  saveData?: boolean
  /** 'slow-2g' | '2g' | '3g' | '4g' */
  effectiveType?: string
  /** Mbit/s (taxminiy) */
  downlink?: number
  /** `prefers-reduced-data: reduce` */
  reducedData?: boolean
}

/** downlink shundan kichik bo'lsa (Mbit/s) tarmoq sekin hisoblanadi */
export const SLOW_DOWNLINK_MBPS = 1.2

const SLOW_TYPES: readonly string[] = ['slow-2g', '2g', '3g']

export type SaverReason = 'save-data' | 'slow-network' | null

/** Ma'lumot tejash qarori: nima uchun (yoki null — oddiy tarmoq). `saveData` ustun. */
export function saverReason(conn: ConnectionInfo): SaverReason {
  if (conn.saveData === true || conn.reducedData === true) return 'save-data'
  if (typeof conn.effectiveType === 'string' && SLOW_TYPES.includes(conn.effectiveType)) return 'slow-network'
  if (typeof conn.downlink === 'number' && conn.downlink > 0 && conn.downlink < SLOW_DOWNLINK_MBPS) return 'slow-network'
  return null
}

export interface VariantPlan {
  /** Boshlang'ich variant */
  start: VariantKey
  /** Keyin almashtiriladigan (silliq) variant; null — almashtirilmaydi */
  upgrade: VariantKey | null
  /** Boshlang'ich variant ochilmasa tartib bilan sinab ko'riladiganlar (start birinchi) */
  order: VariantKey[]
  /** Tejash holati (null — oddiy). Tejash bo'lsa `upgrade` faqat mehmon so'raganda ishlatiladi. */
  saver: SaverReason
  /** Tejashda mehmon so'rasa almashtiriladigan variant */
  upgradeOnDemand: VariantKey | null
}

/** Mavjud variantlardan reja; hech qaysi video yo'q bo'lsa null (faqat surat + ro'yxat). */
export function planVariants(video: TourVideo, conn: ConnectionInfo): VariantPlan | null {
  const have = (key: VariantKey) => (video[key] ? key : null)
  const low = have('low')
  const play = have('play')
  const scrub = have('scrub')
  const smallFirst: VariantKey[] = ([low, play, scrub] as Array<VariantKey | null>).filter((k): k is VariantKey => k !== null)
  if (!smallFirst.length) return null
  const saver = saverReason(conn)
  const start = smallFirst[0]
  // Yuqori sifat: silliq yurish uchun scrub, yo'q bo'lsa play (low dan sifatliroq)
  const best = scrub ?? play
  const upgradeTarget = best && best !== start ? best : null
  return {
    start,
    upgrade: saver ? null : upgradeTarget,
    order: smallFirst,
    saver,
    upgradeOnDemand: saver ? upgradeTarget : null,
  }
}

interface NavigatorLike {
  connection?: { saveData?: boolean; effectiveType?: string; downlink?: number }
}

/** Brauzerdan tarmoq ma'lumoti (Network Information API bo'lmasa — bo'sh = oddiy tarmoq). */
export function readConnection(nav: NavigatorLike | undefined = typeof navigator === 'undefined' ? undefined : (navigator as NavigatorLike), win?: { matchMedia?: (q: string) => { matches: boolean } }): ConnectionInfo {
  const c = nav?.connection
  let reducedData = false
  try {
    reducedData = Boolean(win?.matchMedia?.('(prefers-reduced-data: reduce)').matches)
  } catch {
    reducedData = false
  }
  return { saveData: c?.saveData === true, effectiveType: c?.effectiveType, downlink: c?.downlink, reducedData }
}
