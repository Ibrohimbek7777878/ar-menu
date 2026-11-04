// Sayr API mijozi: bitta keshlangan so'rov (kirish tugmalari va /tour/ sahifasi birga ishlatadi), xatolarni UI turlariga aylantirish.
// Brauzer API'lari ichkaridan beriladi — node:test bilan soxta fetch yordamida sinaladi.
import { parseTour } from './parse.ts'
import type { TourData } from './types.ts'

export const TOUR_API = '/api/restaurant/guest/tour/'
/** Muvaffaqiyatli javob (sayr bor yoki yo'q) shuncha vaqt keshlanadi */
export const TOUR_TTL_MS = 5 * 60_000
/** Xato (tarmoq, 5xx, 429) shuncha vaqt "eslab qolinadi": sayr yo'q serverda har sahifada so'rov yog'ilmasin */
export const TOUR_FAIL_TTL_MS = 60_000

/** ready — sayr bor; disabled — sayr yo'q (enabled:false, 403, 404); error — vaqtincha yuklanmadi (qayta urinish mumkin) */
export type TourResult = { kind: 'ready'; tour: TourData } | { kind: 'disabled' } | { kind: 'error' }

export interface TourClientDeps {
  fetch?: typeof fetch
  now?: () => number
}

export function createTourClient(deps: TourClientDeps = {}) {
  const now = deps.now ?? (() => Date.now())
  const doFetch: typeof fetch = (input, init) => (deps.fetch ?? globalThis.fetch)(input, init)
  let cache: { at: number; ttl: number; promise: Promise<TourResult> } | null = null

  async function request(): Promise<TourResult> {
    let status: number
    let body: unknown = null
    try {
      const res = await doFetch(TOUR_API, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      status = res.status
      try {
        body = await res.json()
      } catch {
        body = null // HTML (SPA zaxira sahifasi), bo'sh javob
      }
    } catch {
      return { kind: 'error' }
    }
    if (status === 403 || status === 404) return { kind: 'disabled' }
    if (status < 200 || status >= 300) return { kind: 'error' }
    const tour = parseTour(body)
    if (tour) return { kind: 'ready', tour }
    // 200, lekin JSON emas (SPA zaxirasi) — xato; JSON bo'lib `enabled:false` — sayr yo'q
    return body !== null && typeof body === 'object' ? { kind: 'disabled' } : { kind: 'error' }
  }

  /** Sayr ma'lumoti. `force` — keshni chetlab qayta so'rash ("qayta urinish"). */
  function load(opts: { force?: boolean } = {}): Promise<TourResult> {
    const t0 = now()
    if (!opts.force && cache && t0 - cache.at < cache.ttl) return cache.promise
    const promise = request()
    const entry = { at: t0, ttl: TOUR_TTL_MS, promise }
    cache = entry
    promise.then((result) => {
      if (cache === entry && result.kind === 'error') entry.ttl = TOUR_FAIL_TTL_MS
    })
    return promise
  }

  function clear(): void {
    cache = null
  }

  return { load, clear }
}

export type TourClient = ReturnType<typeof createTourClient>

/** Ilova bo'yicha yagona nusxa */
export const tourClient: TourClient = createTourClient()
