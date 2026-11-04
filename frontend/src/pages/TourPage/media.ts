// Video yuklash: poster darrov -> yengil variant (low) bilan boshlash -> silliq variant (scrub) to'liq yuklangach almashtirish.
// scrub xotiraga (blob) to'liq yuklab olinadi: har seek tarmoqsiz, xotiradan bajariladi (HTTP Range qo'llamaydigan serverda ham silliq),
// yuklanish foizi esa "Zal tayyorlanmoqda" chizig'ini to'ldiradi. Almashtirish paytida joriy kadr canvas'ga chiziladi (miltillashsiz).
// Tarmoq/DOM ichkaridan beriladi — soxta obyektlar bilan node:test'da sinaladi.
import type { VariantPlan } from './network.ts'
import type { VariantKey } from './types.ts'

export type MediaStatus = 'loading' | 'ready' | 'failed'
export type UpgradeState = 'idle' | 'loading' | 'swapping' | 'done' | 'failed'

/** `HTMLVideoElement` ning kerakli qismi */
export interface MediaVideo {
  src: string
  preload: string
  muted: boolean
  currentTime: number
  readonly currentSrc: string
  readonly duration: number
  readonly videoWidth: number
  readonly videoHeight: number
  load(): void
  removeAttribute(name: string): void
  addEventListener(type: string, listener: () => void): void
  removeEventListener(type: string, listener: () => void): void
}

export interface MediaEvents {
  onStatus(status: MediaStatus, variant: VariantKey | null): void
  /** progress: 0..1; -1 — noma'lum (hajm ma'lum emas) */
  onUpgrade(state: UpgradeState, progress: number): void
  onSlow(): void
  onMetadata(info: { duration: number; width: number; height: number }): void
}

export interface MediaHooks {
  /** Hozirgi sayr vaqti (almashgandan keyin shu joyga qaytiladi) */
  time(): number
  suspend(): void
  resume(): void
  /** Avtoyurish ketayotgan bo'lsa almashtirish kutadi */
  autoActive(): boolean
  /** Joriy kadrni to'xtatib qo'yish (canvas'ga chizish) yoki yashirish */
  freeze(on: boolean): void
}

export interface MediaDeps {
  video: MediaVideo
  urls: Record<VariantKey, string | null>
  plan: VariantPlan
  events: MediaEvents
  hooks: MediaHooks
  fetch?: typeof fetch
  createObjectURL?: (blob: Blob) => string
  revokeObjectURL?: (url: string) => void
  setTimeout?: (cb: () => void, ms: number) => number
  clearTimeout?: (id: number) => void
}

export interface MediaLoader {
  start(): void
  /** Ma'lumot tejash rejimida mehmon "yuqori sifat" desa */
  upgradeNow(): void
  /** Xatodan keyin boshidan */
  retry(): void
  destroy(): void
}

/** Birinchi kadr kelmasa shuncha ms dan keyin "internet sekin" deyiladi */
export const SLOW_AFTER_MS = 8000
const SWAP_LOAD_TIMEOUT_MS = 8000
const SWAP_SEEK_TIMEOUT_MS = 2500
const IDLE_POLL_MS = 400

function mimeOf(url: string, header: string | null): string {
  if (header && /^video\//i.test(header)) return header
  return /\.webm(\?|$)/i.test(url) ? 'video/webm' : 'video/mp4'
}

export function createMediaLoader(deps: MediaDeps): MediaLoader {
  const { video, urls, plan, events, hooks } = deps
  const doFetch: typeof fetch = (input, init) => (deps.fetch ?? globalThis.fetch)(input, init)
  const makeUrl = deps.createObjectURL ?? ((blob: Blob) => URL.createObjectURL(blob))
  const dropUrl = deps.revokeObjectURL ?? ((url: string) => URL.revokeObjectURL(url))
  const later = deps.setTimeout ?? ((cb: () => void, ms: number) => window.setTimeout(cb, ms))
  const cancelLater = deps.clearTimeout ?? ((id: number) => window.clearTimeout(id))

  let destroyed = false
  let generation = 0
  let current: VariantKey | null = null
  let blobUrl: string | null = null
  let slowTimer: number | null = null
  let abort: AbortController | null = null
  let upgrading = false
  let detach: Array<() => void> = []

  const clearListeners = () => {
    for (const off of detach) off()
    detach = []
  }
  const listen = (type: string, fn: () => void) => {
    video.addEventListener(type, fn)
    detach.push(() => video.removeEventListener(type, fn))
  }
  const clearSlow = () => {
    if (slowTimer !== null) cancelLater(slowTimer)
    slowTimer = null
  }

  /** Hodisani kutish: 'ok' | 'error' | 'timeout' */
  function once(type: string, timeoutMs: number): Promise<'ok' | 'error' | 'timeout'> {
    return new Promise((resolve) => {
      let timer: number | null = null
      const finish = (value: 'ok' | 'error' | 'timeout') => {
        video.removeEventListener(type, onOk)
        video.removeEventListener('error', onErr)
        if (timer !== null) cancelLater(timer)
        resolve(value)
      }
      const onOk = () => finish('ok')
      const onErr = () => finish('error')
      video.addEventListener(type, onOk)
      video.addEventListener('error', onErr)
      timer = later(() => finish('timeout'), timeoutMs)
    })
  }

  function reportMeta() {
    const duration = Number.isFinite(video.duration) ? video.duration : 0
    events.onMetadata({ duration, width: video.videoWidth || 0, height: video.videoHeight || 0 })
  }

  function tryLoad(index: number, gen: number) {
    if (destroyed || gen !== generation) return
    const key = plan.order[index]
    const url = key ? urls[key] : null
    if (!key || !url) {
      if (index + 1 < plan.order.length) tryLoad(index + 1, gen)
      else events.onStatus('failed', null)
      return
    }
    clearListeners()
    clearSlow()
    current = key
    video.muted = true
    video.preload = 'auto'
    listen('loadedmetadata', reportMeta)
    listen('loadeddata', () => {
      if (destroyed || gen !== generation) return
      clearSlow()
      reportMeta()
      events.onStatus('ready', key)
      if (plan.upgrade && !upgrading) void beginUpgrade(plan.upgrade, gen)
    })
    listen('error', () => {
      if (destroyed || gen !== generation) return
      clearSlow()
      if (index + 1 < plan.order.length) tryLoad(index + 1, gen)
      else events.onStatus('failed', null)
    })
    slowTimer = later(() => {
      if (!destroyed && gen === generation) events.onSlow()
    }, SLOW_AFTER_MS)
    video.src = url
    video.load()
  }

  async function download(url: string, gen: number): Promise<Blob | null> {
    abort = new AbortController()
    const { signal } = abort
    try {
      const res = await doFetch(url, { signal, credentials: 'same-origin' })
      if (!res.ok) return null
      const total = Number(res.headers.get('content-length')) || 0
      const type = mimeOf(url, res.headers.get('content-type'))
      const reader = res.body?.getReader()
      if (!reader) {
        events.onUpgrade('loading', -1)
        return await res.blob()
      }
      const chunks: Uint8Array<ArrayBuffer>[] = []
      let received = 0
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        if (destroyed || gen !== generation) return null
        chunks.push(value as Uint8Array<ArrayBuffer>)
        received += value.byteLength
        events.onUpgrade('loading', total > 0 ? Math.min(1, received / total) : -1)
      }
      return new Blob(chunks, { type })
    } catch {
      return null
    }
  }

  async function waitIdle(gen: number) {
    while (!destroyed && gen === generation && hooks.autoActive()) {
      await new Promise<void>((resolve) => later(resolve, IDLE_POLL_MS))
    }
  }

  async function beginUpgrade(key: VariantKey, gen: number) {
    const url = urls[key]
    if (!url || upgrading || key === current) return
    upgrading = true
    events.onUpgrade('loading', 0)
    const blob = await download(url, gen)
    abort = null
    if (destroyed || gen !== generation) {
      upgrading = false
      return
    }
    if (!blob || blob.size === 0) {
      upgrading = false
      events.onUpgrade('failed', 0)
      return
    }
    await waitIdle(gen)
    if (destroyed || gen !== generation) {
      upgrading = false
      return
    }
    const next = makeUrl(blob)
    events.onUpgrade('swapping', 1)
    const ok = await swap(next, gen)
    if (ok) {
      if (blobUrl) dropUrl(blobUrl)
      blobUrl = next
      current = key
      events.onStatus('ready', key)
      events.onUpgrade('done', 1)
    } else {
      dropUrl(next)
      if (!destroyed) events.onUpgrade('failed', 0)
    }
    upgrading = false
  }

  /** Manbani almashtirish: kadr muzlatiladi, yangi manba yuklanadi, o'sha vaqtga qaytiladi. Xatoda eski manba tiklanadi. */
  async function swap(next: string, gen: number): Promise<boolean> {
    const previous = video.currentSrc || video.src
    const at = hooks.time()
    hooks.suspend()
    hooks.freeze(true)
    let ok = false
    try {
      clearListeners() // loadeddata/error tinglovchilari endi `once` orqali
      video.src = next
      video.load()
      ok = (await once('loadeddata', SWAP_LOAD_TIMEOUT_MS)) === 'ok'
      if (ok && !destroyed && gen === generation) {
        video.currentTime = at
        await once('seeked', SWAP_SEEK_TIMEOUT_MS) // kechiksa ham davom etamiz: seeker keyingi kadrda qayta so'raydi
      } else if (!ok && !destroyed && gen === generation) {
        video.src = previous
        video.load()
        await once('loadeddata', SWAP_LOAD_TIMEOUT_MS)
        video.currentTime = at
        await once('seeked', SWAP_SEEK_TIMEOUT_MS)
      }
    } finally {
      hooks.freeze(false)
      if (!destroyed) hooks.resume()
    }
    return ok
  }

  return {
    start() {
      generation += 1
      upgrading = false
      tryLoad(0, generation)
    },
    upgradeNow() {
      const key = plan.upgradeOnDemand ?? plan.upgrade
      if (key && !destroyed && !upgrading && current !== null && key !== current) void beginUpgrade(key, generation)
    },
    retry() {
      abort?.abort()
      generation += 1
      upgrading = false
      tryLoad(0, generation)
    },
    destroy() {
      destroyed = true
      generation += 1
      abort?.abort()
      clearSlow()
      clearListeners()
      if (blobUrl) dropUrl(blobUrl)
      blobUrl = null
      try {
        video.removeAttribute('src')
        video.load()
      } catch {
        /* video allaqachon bo'shatilgan */
      }
    },
  }
}
