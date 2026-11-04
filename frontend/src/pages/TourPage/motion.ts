// Sayrdagi harakat hisob-kitoblari (sof): sudrash -> vaqt, ushlab turib yurish, silliq yaqinlashish, inersiya.
// Sozlanuvchi konstantalar bitta joyda (MOTION): yo'nalish va sezgirlikni shu yerdan o'zgartirasiz.

export const MOTION = {
  /** Sahnaning to'liq kengligi/balandligi bo'ylab sudralganda videoning necha soniyasi suriladi */
  DRAG_SPAN_SECONDS: 10,
  /** Yo'nalish: -1 = chapga/yuqoriga sudralsa video OLDINGA ketadi (tasma tortilgandek). +1 qilsangiz teskari bo'ladi. */
  DRAG_DIR_X: -1,
  DRAG_DIR_Y: -1,
  /** Shu masofadan oz siljish bosish hisoblanadi (belgi/tugmaga tegish sudrash emas) */
  DRAG_SLOP_PX: 8,
  /** Silliqlash vaqt doimiylari (ms): kichik = barmoqqa yopishgan, katta = yumshoq */
  TAU_DRAG_MS: 70,
  TAU_HOLD_MS: 90,
  TAU_STEP_MS: 130,
  TAU_JUMP_MS: 170,
  TAU_FLING_MS: 240,
  /** Nuqtaga sakraganda eng katta tezlik (soniya/soniya) */
  JUMP_MAX_SPEED: 24,
  /** Tugmani ushlab yurish tezligi: BASE dan boshlanib, RAMP/s bilan MAX gacha oshadi (soniya/soniya) */
  HOLD_BASE: 1.6,
  HOLD_MAX: 5,
  HOLD_RAMP_PER_SEC: 3,
  /** Ushlab turish shuncha ms dan keyin uzluksiz yurishga o'tadi (undan oldin — bir qadam) */
  HOLD_AFTER_MS: 220,
  /** Bosish (tap) / klaviatura bir qadami (soniya) */
  TAP_STEP_SECONDS: 0.9,
  /** Qo'yib yuborilgandan keyingi inersiya: tezlik * shu soniya */
  FLING_SECONDS: 0.3,
  /** Inersiya shundan sekin bo'lsa yo'q */
  FLING_MIN_SPEED: 0.6,
  /** Tezlikni o'lchash oynasi (ms) */
  VELOCITY_WINDOW_MS: 90,
  /** G'ildirak: piksel -> soniya */
  WHEEL_SECONDS_PER_PX: 0.012,
  /** Video oxiriga shuncha soniya yetmay to'xtaymiz (aniq oxirga o'tish ba'zi brauzerlarda qora kadr beradi) */
  END_EPS: 0.05,
  /** Joriy vaqt maqsadga shuncha yaqin bo'lsa harakat tugagan */
  SETTLE_EPS: 0.004,
} as const

export interface Size2 {
  width: number
  height: number
}

/** Vaqtni [0, davomiylik - END_EPS] ga keltiradi. Davomiylik noma'lum (0) bo'lsa faqat 0 dan pastga tushmaydi. */
export function clampTime(time: number, duration: number): number {
  if (!Number.isFinite(time)) return 0
  if (!(duration > 0)) return Math.max(0, time)
  return Math.min(Math.max(0, time), Math.max(0, duration - MOTION.END_EPS))
}

/** Sudrashdagi siljish (px) -> video soniyalari. Musbat = oldinga. Sahna o'lchami nol bo'lsa 0. */
export function dragDeltaSeconds(dx: number, dy: number, stage: Size2): number {
  if (!(stage.width > 0) || !(stage.height > 0)) return 0
  const raw = (MOTION.DRAG_DIR_X * dx) / stage.width + (MOTION.DRAG_DIR_Y * dy) / stage.height
  return Number.isFinite(raw) ? raw * MOTION.DRAG_SPAN_SECONDS + 0 : 0 // `+ 0`: -0 ni 0 ga keltiradi
}

/** Sudrash boshlandimi (slop dan oshdimi) */
export function pastSlop(dx: number, dy: number): boolean {
  return Math.hypot(dx, dy) > MOTION.DRAG_SLOP_PX
}

/** Joriy qiymatni maqsad tomon `tauMs` doimiyli eksponensial silliqlash bilan suradi; tezlik `maxSpeed` (birlik/soniya) dan oshmaydi. */
export function stepToward(current: number, target: number, dtSec: number, tauMs: number, maxSpeed = Number.POSITIVE_INFINITY): number {
  if (!(dtSec > 0)) return current
  const diff = target - current
  if (diff === 0) return current
  const alpha = tauMs > 0 ? 1 - Math.exp(-(dtSec * 1000) / tauMs) : 1
  let move = diff * alpha
  const limit = maxSpeed * dtSec
  if (Math.abs(move) > limit) move = Math.sign(move) * limit
  // Maqsadni oshib o'tmaslik
  if (Math.abs(move) > Math.abs(diff)) move = diff
  const next = current + move
  return Math.abs(target - next) < MOTION.SETTLE_EPS * 0.25 ? target : next
}

/** Tugma `heldMs` dan beri bosib turilgan bo'lsa yurish tezligi (soniya/soniya). */
export function holdSpeed(heldMs: number): number {
  if (!(heldMs > MOTION.HOLD_AFTER_MS)) return 0
  const secs = (heldMs - MOTION.HOLD_AFTER_MS) / 1000
  return Math.min(MOTION.HOLD_MAX, MOTION.HOLD_BASE + MOTION.HOLD_RAMP_PER_SEC * secs)
}

export interface Sample {
  /** ms */
  at: number
  /** video soniyasi (maqsad) */
  value: number
}

/** Oxirgi `windowMs` ichidagi namunalardan tezlik (video soniya / real soniya); namuna yetmasa 0. */
export function estimateVelocity(samples: readonly Sample[], nowMs: number, windowMs: number = MOTION.VELOCITY_WINDOW_MS): number {
  const recent = samples.filter((s) => nowMs - s.at <= windowMs)
  if (recent.length < 2) return 0
  const first = recent[0]
  const last = recent[recent.length - 1]
  const span = last.at - first.at
  return span > 0 ? ((last.value - first.value) / span) * 1000 : 0
}

/** Qo'yib yuborilgandan keyingi inersiya maqsadi. Sekin harakat — inersiyasiz. */
export function flingTarget(target: number, velocity: number, duration: number): number {
  if (!(Math.abs(velocity) >= MOTION.FLING_MIN_SPEED)) return clampTime(target, duration)
  return clampTime(target + velocity * MOTION.FLING_SECONDS, duration)
}

/** G'ildirak aylantirilganda vaqt siljishi (deltaY > 0 — pastga = oldinga). */
export function wheelDeltaSeconds(deltaY: number): number {
  return Number.isFinite(deltaY) ? deltaY * MOTION.WHEEL_SECONDS_PER_PX : 0
}
