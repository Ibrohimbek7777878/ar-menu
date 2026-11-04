// Sayr "harakatlantirgichi": video vaqtini boshqaradi. Barcha kirish usullari (sudrash, tugma ushlab turish, qadam, nuqtaga sakrash,
// g'ildirak, avtoyurish) bitta joyda: `target` (maqsad vaqt) o'zgaradi, rAF har kadrda `time` ni unga silliq yaqinlashtiradi va
// `seeker` orqali videoga bitta-bitta seek yuboradi. Avtoyurishda video o'zi o'ynaydi va `time` undan o'qiladi.
// Brauzer API'lari (rAF, soat, video) ichkaridan beriladi — soxta obyektlar bilan node:test'da sinaladi.
import { autoPlaying, autoReduce, IDLE, type AutoContext, type AutoState } from './autoplay.ts'
import { clampTime, holdSpeed, MOTION, stepToward } from './motion.ts'
import { createSeeker, type SeekableVideo } from './seeker.ts'
import type { TourStop } from './types.ts'

export interface PlayerVideo extends SeekableVideo {
  readonly paused: boolean
  playbackRate: number
  play(): Promise<void> | void
  pause(): void
  addEventListener(type: 'seeked' | 'ended', listener: () => void): void
  removeEventListener(type: 'seeked' | 'ended', listener: () => void): void
}

export interface FrameInfo {
  /** Hozirgi (ko'rsatilayotgan) vaqt, soniya */
  time: number
  auto: AutoState['mode']
}

export interface PlayerDeps {
  video: PlayerVideo
  stops: () => readonly TourStop[]
  /** Samarali davomiylik (video metama'lumoti yoki server); 0 — noma'lum */
  duration: () => number
  onFrame: (info: FrameInfo) => void
  raf?: (cb: () => void) => number
  caf?: (id: number) => void
  now?: () => number
  /** false bo'lsa (harakatni kamaytirish) silliqlash yo'q: vaqt maqsadga darrov o'tadi */
  smooth?: () => boolean
  hidden?: () => boolean
}

export interface Player {
  time(): number
  autoMode(): AutoState['mode']
  dragStart(): void
  dragTo(deltaSeconds: number): void
  dragEnd(velocity: number): void
  holdStart(dir: 1 | -1): void
  holdEnd(): void
  step(deltaSeconds: number): void
  nudge(deltaSeconds: number): void
  jumpTo(time: number): void
  /** Darrov o'rnatish (silliqlashsiz): boshlang'ich joy, manba almashgandan keyin */
  seekTo(time: number): void
  toggleAuto(): void
  interrupt(): void
  /** Manba almashtirilayotganda: harakat va seeklar to'xtaydi */
  suspend(): void
  resume(): void
  /** Sahifa ko'rinadigan bo'lganda yoki tashqaridan o'zgarish bo'lganda kadr aylanishini qayta ishga tushirish */
  wake(): void
  destroy(): void
}

const BUSY_GRACE_MS = 2500

export function createPlayer(deps: PlayerDeps): Player {
  const { video } = deps
  const raf = deps.raf ?? ((cb: () => void) => requestAnimationFrame(cb))
  const caf = deps.caf ?? ((id: number) => cancelAnimationFrame(id))
  const now = deps.now ?? (() => performance.now())
  const smooth = deps.smooth ?? (() => true)
  const hidden = deps.hidden ?? (() => typeof document !== 'undefined' && document.hidden)
  const seeker = createSeeker(video, now)

  let time = 0
  let target = 0
  let tau: number = MOTION.TAU_JUMP_MS
  let maxSpeed = Number.POSITIVE_INFINITY
  let dragging = false
  let dragBase = 0
  let holdDir: 0 | 1 | -1 = 0
  let holdSince = 0
  let auto: AutoState = IDLE
  let suspended = false
  let destroyed = false
  let rafId: number | null = null
  let last = 0
  let lastMoveAt = 0

  const ctx = (): AutoContext => ({ stops: deps.stops(), duration: deps.duration() })
  const emit = () => deps.onFrame({ time, auto: auto.mode })
  const limit = (value: number) => clampTime(value, deps.duration())

  const needsFrame = (): boolean =>
    autoPlaying(auto) ||
    dragging ||
    holdDir !== 0 ||
    Math.abs(target - time) > MOTION.SETTLE_EPS ||
    (seeker.busy() && now() - lastMoveAt < BUSY_GRACE_MS)

  const wake = () => {
    if (destroyed || suspended || rafId !== null) return
    last = now()
    rafId = raf(tick)
  }

  const setTarget = (value: number, tauMs: number, speedCap = Number.POSITIVE_INFINITY) => {
    target = limit(value)
    tau = tauMs
    maxSpeed = speedCap
    lastMoveAt = now()
    if (!smooth()) time = target
    wake()
  }

  const playVideo = () => {
    try {
      video.playbackRate = 1
      const p = video.play()
      if (p && typeof (p as Promise<void>).catch === 'function') (p as Promise<void>).catch(() => interrupt())
    } catch {
      interrupt()
    }
  }

  const applyAuto = (res: ReturnType<typeof autoReduce>) => {
    auto = res.state
    if (res.snapTo !== null) {
      video.currentTime = res.snapTo
      time = target = res.snapTo
    }
    if (res.play) {
      if (video.paused) playVideo()
    } else if (!video.paused) {
      video.pause()
    }
  }

  function interrupt() {
    if (autoPlaying(auto)) {
      applyAuto(autoReduce(auto, { type: 'interrupt' }, ctx()))
      time = target = limit(video.currentTime)
    } else if (auto.mode === 'finished') {
      auto = IDLE
    }
    emit()
  }

  function tick() {
    rafId = null
    if (destroyed || suspended) return
    const t0 = now()
    const dt = Math.min(Math.max((t0 - last) / 1000, 0), 0.1)
    last = t0
    if (hidden()) {
      // Fon varag'ida energiya tejash: avtoyurish to'xtaydi, kadr aylanishi to'xtaydi (ko'ringanda wake())
      if (autoPlaying(auto)) interrupt()
      return
    }
    if (autoPlaying(auto)) {
      const vt = video.currentTime
      time = target = vt
      applyAuto(autoReduce(auto, { type: 'tick', time: vt, now: t0 }, ctx()))
      lastMoveAt = t0
    } else {
      if (holdDir !== 0) {
        const speed = holdSpeed(t0 - holdSince)
        if (speed > 0) {
          target = limit(target + holdDir * speed * dt)
          tau = MOTION.TAU_HOLD_MS
          maxSpeed = Number.POSITIVE_INFINITY
        }
        lastMoveAt = t0
      }
      const before = time
      time = stepToward(time, target, dt, tau, maxSpeed)
      if (time !== before) lastMoveAt = t0
      seeker.request(time)
    }
    emit()
    if (needsFrame()) rafId = raf(tick)
  }

  const onEnded = () => {
    if (auto.mode === 'idle') return
    applyAuto(autoReduce(auto, { type: 'ended' }, ctx()))
    emit()
  }
  video.addEventListener('ended', onEnded)

  return {
    time: () => time,
    autoMode: () => auto.mode,
    dragStart() {
      interrupt()
      dragging = true
      dragBase = time
      target = time
      wake()
    },
    dragTo(deltaSeconds) {
      if (dragging) setTarget(dragBase + deltaSeconds, MOTION.TAU_DRAG_MS)
    },
    dragEnd(velocity) {
      if (!dragging) return
      dragging = false
      setTarget(clampTime(target, deps.duration()) + (Math.abs(velocity) >= MOTION.FLING_MIN_SPEED ? velocity * MOTION.FLING_SECONDS : 0), MOTION.TAU_FLING_MS)
    },
    holdStart(dir) {
      interrupt()
      holdDir = dir
      holdSince = now()
      setTarget(target + dir * MOTION.TAP_STEP_SECONDS, MOTION.TAU_STEP_MS)
    },
    holdEnd() {
      if (holdDir === 0) return
      holdDir = 0
      wake()
    },
    step(deltaSeconds) {
      interrupt()
      setTarget(target + deltaSeconds, MOTION.TAU_STEP_MS)
    },
    nudge(deltaSeconds) {
      interrupt()
      setTarget(target + deltaSeconds, MOTION.TAU_DRAG_MS)
    },
    jumpTo(value) {
      interrupt()
      setTarget(value, MOTION.TAU_JUMP_MS, MOTION.JUMP_MAX_SPEED)
    },
    seekTo(value) {
      interrupt()
      time = target = limit(value)
      lastMoveAt = now()
      seeker.request(time)
      emit()
      wake()
    },
    toggleAuto() {
      if (autoPlaying(auto)) {
        interrupt()
        return
      }
      seeker.cancel()
      dragging = false
      holdDir = 0
      // Kutilayotgan seek bekor qilindi: video aniq hozirgi joyda turishi uchun avval joyiga qo'yiladi
      if (Math.abs(video.currentTime - time) > 0.05) video.currentTime = time
      applyAuto(autoReduce(auto, { type: 'start', time }, ctx()))
      time = target = limit(video.currentTime)
      emit()
      wake()
    },
    interrupt,
    suspend() {
      interrupt()
      suspended = true
      dragging = false
      holdDir = 0
      seeker.cancel()
      if (rafId !== null) {
        caf(rafId)
        rafId = null
      }
    },
    resume() {
      suspended = false
      seeker.request(time)
      emit()
      wake()
    },
    wake,
    destroy() {
      destroyed = true
      if (rafId !== null) caf(rafId)
      rafId = null
      seeker.destroy()
      video.removeEventListener('ended', onEnded)
      try {
        if (!video.paused) video.pause()
      } catch {
        /* video allaqachon bo'shatilgan */
      }
    },
  }
}
