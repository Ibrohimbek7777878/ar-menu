// Bron API mijozi: keshlash, AbortController, xatolarni UI turlariga aylantirish. Brauzer API'lari (fetch, cookie) ichkaridan
// beriladi — shuning uchun node:test bilan soxta fetch yordamida sinaladi.
import { parseAvailability, parseBookingResult, parseConfig, parseStatus, failureFromResponse } from './parse.ts'
import type { Availability, BookingConfig, BookingPayload, BookingStatusInfo, SubmitOutcome } from './types.ts'

export const BOOKING_API = '/api/restaurant/guest/booking'
/** Availability keshi: bir xil sana+mehmon so'rovi shu vaqt ichida qayta yuborilmaydi */
export const AVAIL_TTL_MS = 20_000
/** Sozlama keshi: kirish nuqtalari va bron sahifasi bitta so'rovdan foydalanadi */
export const CONFIG_TTL_MS = 5 * 60_000
/** Sozlama yuklanmasa shuncha vaqt qayta urinilmaydi (bron o'rnatilmagan serverda har sahifada so'rov yog'ilmasin) */
export const CONFIG_FAIL_TTL_MS = 60_000
const AVAIL_CACHE_MAX = 40

export class BookingApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'BookingApiError'
    this.status = status
  }
}

export function isAbortError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { name?: string }).name === 'AbortError'
}

type RandomSource = { randomUUID?: () => string; getRandomValues?: (array: Uint8Array<ArrayBuffer>) => unknown }

/** UUID v4: `crypto.randomUUID` (faqat xavfsiz kontekst) -> getRandomValues -> Math.random zaxirasi. */
export function newSubmissionId(source: RandomSource | undefined = typeof crypto === 'undefined' ? undefined : crypto): string {
  try {
    if (source?.randomUUID) return source.randomUUID()
    if (source?.getRandomValues) {
      const b = new Uint8Array(16)
      source.getRandomValues(b)
      b[6] = (b[6] & 0x0f) | 0x40
      b[8] = (b[8] & 0x3f) | 0x80
      const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
      return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
    }
  } catch {
    /* quyidagi zaxira */
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`
}

export interface ClientDeps {
  fetch?: typeof fetch
  now?: () => number
  /** CSRF token (cookie'dan); bo'sh bo'lsa sarlavha yuborilmaydi */
  csrf?: () => string
}

function cookieCsrf(): string {
  if (typeof document === 'undefined') return ''
  const m = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/)
  return m ? decodeURIComponent(m[1]) : ''
}

export function createBookingClient(deps: ClientDeps = {}) {
  const now = deps.now ?? (() => Date.now())
  const doFetch: typeof fetch = (input, init) => (deps.fetch ?? globalThis.fetch)(input, init)
  const csrf = deps.csrf ?? cookieCsrf

  let configCache: { at: number; promise: Promise<BookingConfig> } | null = null
  let configFailedAt = 0
  const availCache = new Map<string, { at: number; data: Availability }>()

  async function request(path: string, init: Omit<RequestInit, 'headers'> & { headers?: Record<string, string> } = {}): Promise<{ status: number; body: unknown }> {
    const res = await doFetch(`${BOOKING_API}${path}`, { credentials: 'same-origin', ...init, headers: { Accept: 'application/json', ...init.headers } })
    let body: unknown = null
    try {
      body = await res.json()
    } catch {
      body = null // HTML (SPA zaxira sahifasi), bo'sh javob
    }
    return { status: res.status, body }
  }

  /** Sozlama (enabled, zallar, vaqtlar). Muvaffaqiyatli javob 5 daqiqa keshlanadi; xato 1 daqiqa "eslab qolinadi". */
  function loadConfig(opts: { force?: boolean } = {}): Promise<BookingConfig> {
    const t = now()
    if (!opts.force) {
      if (configCache && t - configCache.at < CONFIG_TTL_MS) return configCache.promise
      if (configFailedAt && t - configFailedAt < CONFIG_FAIL_TTL_MS) return Promise.reject(new BookingApiError('config_unavailable', 0))
    }
    const promise = request('/config/').then(({ status, body }) => {
      const config = status >= 200 && status < 300 ? parseConfig(body) : null
      if (!config) throw new BookingApiError('bad_config', status)
      return config
    })
    const entry = { at: t, promise }
    configCache = entry
    promise.then(
      () => { configFailedAt = 0 },
      () => {
        if (configCache === entry) configCache = null
        configFailedAt = now()
      },
    )
    return promise
  }

  const availKey = (date: string, guests: number) => `${date}|${guests}`

  /** Keshdagi yangi javob (bo'lmasa null) — sinxron, ekranni tezroq to'ldirish uchun. */
  function peekAvailability(date: string, guests: number): Availability | null {
    const hit = availCache.get(availKey(date, guests))
    return hit && now() - hit.at < AVAIL_TTL_MS ? hit.data : null
  }

  async function loadAvailability(date: string, guests: number, opts: { signal?: AbortSignal; force?: boolean } = {}): Promise<Availability> {
    if (!opts.force) {
      const hit = peekAvailability(date, guests)
      if (hit) return hit
    }
    const query = `?date=${encodeURIComponent(date)}&guests=${encodeURIComponent(String(guests))}`
    const { status, body } = await request(`/availability/${query}`, { signal: opts.signal })
    if (status === 429) throw new BookingApiError('rate_limited', 429)
    const data = status >= 200 && status < 300 ? parseAvailability(body) : null
    if (!data) throw new BookingApiError('bad_availability', status)
    availCache.set(availKey(date, guests), { at: now(), data })
    while (availCache.size > AVAIL_CACHE_MAX) {
      const oldest = availCache.keys().next().value
      if (oldest === undefined) break
      availCache.delete(oldest)
    }
    return data
  }

  /** Bron yuborish. Tarmoq uzilsa `network` (bron yaratilgan-yaratilmaganini bilmaymiz: shu `submission_id` bilan qayta yuboriladi). */
  async function submit(payload: BookingPayload): Promise<SubmitOutcome> {
    const token = csrf()
    let res: { status: number; body: unknown }
    try {
      res = await request('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'X-CSRFToken': token } : {}) },
        body: JSON.stringify(payload),
      })
    } catch {
      return { ok: false, kind: 'network' }
    }
    if (res.status === 200 || res.status === 201) {
      const booking = parseBookingResult(res.body, { date: payload.date, time: payload.time, guests: payload.guests })
      if (booking) {
        availCache.clear() // bu sana endi boshqacha
        return { ok: true, booking }
      }
      return { ok: false, kind: 'server' }
    }
    return { ok: false, ...failureFromResponse(res.status, res.body) }
  }

  /** Bron holati: topilmadi -> null; tarmoq/server xatosi -> BookingApiError. */
  async function loadStatus(code: string, signal?: AbortSignal): Promise<BookingStatusInfo | null> {
    const { status, body } = await request(`/${encodeURIComponent(code)}/`, { signal })
    if (status === 404) return null
    if (status === 429) throw new BookingApiError('rate_limited', 429)
    const info = status >= 200 && status < 300 ? parseStatus(body, code) : null
    if (!info) throw new BookingApiError('bad_status', status)
    return info
  }

  function clearCaches(): void {
    configCache = null
    configFailedAt = 0
    availCache.clear()
  }

  return { loadConfig, loadAvailability, peekAvailability, submit, loadStatus, clearCaches }
}

export type BookingClient = ReturnType<typeof createBookingClient>

/** Ilova bo'yicha yagona nusxa */
export const bookingClient: BookingClient = createBookingClient()
