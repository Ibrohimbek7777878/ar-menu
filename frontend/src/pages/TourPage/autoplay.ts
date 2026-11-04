// Avtoyurish holat mashinasi (sof): oddiy tezlikda ijro, har nuqtada to'xtab turish, mehmon aralashsa to'xtash.
//   idle      — avtoyurish yo'q
//   playing   — video oddiy tezlikda o'ynayapti; `passed` — oxirgi o'tilgan/turilgan nuqta indeksi (qayta to'xtamaslik uchun)
//   holding   — nuqtada `until` (ms) gacha turibdi (video pauzada)
//   finished  — oxiriga yetdi (qayta boshlansa boshidan)
import { MOTION } from './motion.ts'
import type { TourStop } from './types.ts'

export const AUTO_DWELL_MS = 1500
/** Nuqtaga shuncha soniya yetmasdan "yetib keldi" hisoblanadi (kadr oralig'i xatosi) */
const REACH_EPS = 0.03

export type AutoState =
  | { mode: 'idle' }
  | { mode: 'playing'; passed: number }
  | { mode: 'holding'; stopIndex: number; until: number }
  | { mode: 'finished' }

export type AutoEvent =
  | { type: 'start'; time: number }
  | { type: 'tick'; time: number; now: number }
  | { type: 'interrupt' }
  | { type: 'ended' }

export interface AutoContext {
  stops: readonly TourStop[]
  /** 0 — noma'lum (faqat video `ended` hodisasi tugatadi) */
  duration: number
}

export interface AutoResult {
  state: AutoState
  /** O'tishdan keyin video o'ynashi kerakmi */
  play: boolean
  /** Videoni shu soniyaga aniq qo'yish (nuqtada to'xtaganda yoki qayta boshlaganda); null — tegmaslik */
  snapTo: number | null
}

export const IDLE: AutoState = { mode: 'idle' }

/** Oxirgi indeks: vaqti <= time + eps bo'lgan nuqta; yo'q bo'lsa -1. */
function lastReached(stops: readonly TourStop[], time: number): number {
  let found = -1
  for (let i = 0; i < stops.length; i++) {
    if (stops[i].time <= time + REACH_EPS) found = i
    else break
  }
  return found
}

const result = (state: AutoState, snapTo: number | null = null): AutoResult => ({ state, play: state.mode === 'playing', snapTo })

export function autoPlaying(state: AutoState): boolean {
  return state.mode === 'playing' || state.mode === 'holding'
}

export function autoReduce(state: AutoState, event: AutoEvent, ctx: AutoContext): AutoResult {
  const { stops, duration } = ctx
  const atEnd = (time: number) => duration > 0 && time >= duration - MOTION.END_EPS - 0.05

  switch (event.type) {
    case 'start': {
      if (state.mode === 'finished' || atEnd(event.time)) {
        // Oxiriga yetgan bo'lsa — boshidan; boshidagi nuqtada to'xtab turmaymiz
        return result({ mode: 'playing', passed: lastReached(stops, 0) }, 0)
      }
      return result({ mode: 'playing', passed: lastReached(stops, event.time) })
    }
    case 'interrupt':
      return result(IDLE)
    case 'ended':
      return state.mode === 'idle' ? result(state) : result({ mode: 'finished' })
    case 'tick': {
      if (state.mode === 'holding') {
        if (event.now >= state.until) return result({ mode: 'playing', passed: state.stopIndex })
        return result(state)
      }
      if (state.mode !== 'playing') return result(state)
      if (atEnd(event.time)) return result({ mode: 'finished' })
      const next = state.passed + 1
      if (next < stops.length && event.time >= stops[next].time - REACH_EPS) {
        return result({ mode: 'holding', stopIndex: next, until: event.now + AUTO_DWELL_MS }, stops[next].time)
      }
      return result(state)
    }
    default:
      return result(state)
  }
}
