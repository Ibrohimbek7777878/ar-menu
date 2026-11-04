// Silliq surish uchun "bitta seek" qoidasi: oldingi seek tugamaguncha yangisi yuborilmaydi, faqat eng oxirgi so'ralgan vaqt eslab qolinadi
// va `seeked` dan keyin qo'llanadi. Aks holda zaif qurilmada har kadrdagi `currentTime` yangilanishi seekni qayta-qayta bekor qilib,
// video umuman siljimay qoladi ("seek dovoni"). Qotib qolgan seek (tarmoq uzilishi) `STALL_MS` dan keyin almashtiriladi.

export const SEEK_EPSILON = 0.02
export const SEEK_STALL_MS = 1800

/** `HTMLVideoElement` ning kerakli qismi (soxta obyekt bilan sinash uchun) */
export interface SeekableVideo {
  currentTime: number
  readonly seeking: boolean
  addEventListener(type: 'seeked', listener: () => void): void
  removeEventListener(type: 'seeked', listener: () => void): void
}

export interface Seeker {
  /** Vaqtni so'rash (har kadrda chaqirilishi mumkin: bir xil qiymat bo'lsa hech narsa qilmaydi) */
  request(time: number): void
  /** Hali bajarilmagan so'rov yoki ketayotgan seek bormi (harakat tugadimi degan savol uchun) */
  busy(): boolean
  /** Kutilayotgan so'rovni bekor qilish */
  cancel(): void
  destroy(): void
}

export function createSeeker(video: SeekableVideo, now: () => number = () => Date.now(), epsilon = SEEK_EPSILON): Seeker {
  let wanted: number | null = null
  let issuedAt = 0

  const flush = () => {
    if (wanted === null) return
    if (video.seeking && now() - issuedAt < SEEK_STALL_MS) return // `seeked` dan keyin qayta chaqiriladi
    const goal = wanted
    if (Math.abs(video.currentTime - goal) <= epsilon && !video.seeking) {
      wanted = null
      return
    }
    wanted = null
    issuedAt = now()
    video.currentTime = goal
  }

  const onSeeked = () => flush()
  video.addEventListener('seeked', onSeeked)

  return {
    request(time) {
      if (!Number.isFinite(time)) return
      wanted = time
      flush()
    },
    busy: () => wanted !== null || video.seeking,
    cancel() {
      wanted = null
    },
    destroy() {
      wanted = null
      video.removeEventListener('seeked', onSeeked)
    },
  }
}
