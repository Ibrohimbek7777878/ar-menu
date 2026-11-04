// Video sayr (mehmon) — server shartnomasi turlari. Server: GET /api/restaurant/guest/tour/
// Barcha maydonlar parse.ts da "ishonchsiz kirish" sifatida tekshiriladi: server noto'g'ri/eskirgan javob bersa ham sahifa qulamaydi.

/** Video variantlari: scrub — har 6-kadr kalit (silliq oldinga-orqaga), play — oddiy ijro, low — yengil (480 px). */
export type VariantKey = 'scrub' | 'play' | 'low'

export interface TourVideo {
  scrub: string | null
  play: string | null
  low: string | null
  poster: string | null
}

export interface TourStop {
  id: number
  title: string
  /** Soniya (videodagi vaqt) */
  time: number
}

export interface TourHotspot {
  id: number
  /** Bron qilinadigan stol; null — faqat yorliq (bron tugmasi yo'q) */
  tableId: number | null
  tableNumber: string
  capacity: number
  label: string
  /** Belgi ko'rinadigan vaqt oralig'i (soniya, ikkala chegara ham kiradi) */
  tStart: number
  tEnd: number
  /** Video kadridagi joy, 0..1 (chap-yuqori burchakdan) */
  x: number
  y: number
}

export interface TourData {
  title: string
  /** Soniya; 0 — noma'lum (video metama'lumotidan olinadi) */
  duration: number
  /** Piksel; 0 — noma'lum */
  width: number
  height: number
  video: TourVideo
  stops: TourStop[]
  hotspots: TourHotspot[]
}

export interface Size {
  width: number
  height: number
}

export interface Rect {
  left: number
  top: number
  width: number
  height: number
}
