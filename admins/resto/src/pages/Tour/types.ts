/**
 * "Sayr" bo'limi turlari. Server shartnomasi: `/api/restaurant/admin/v1/tours/` (VT1).
 * Ichki nomlar (stop/hotspot/variant) faqat kodda; foydalanuvchi matnida "nuqta" va "belgi".
 */

export type TourStatus = 'draft' | 'processing' | 'ready' | 'published' | 'failed';
export type AiStatus = 'idle' | 'running' | 'done' | 'failed';

export interface TourVariants {
  scrub?: string;
  play?: string;
  low?: string;
  poster?: string;
}

/** Serverdagi nuqta (bob) */
export interface TourStop {
  id: number;
  order: number;
  title: string;
  /** soniya */
  t: number;
}

/** Serverdagi stol belgisi: x, y — video kadrining ko'rinadigan maydoniga nisbatan 0..1 */
export interface TourHotspot {
  id: number;
  table_id: number | null;
  table_number: string;
  label: string;
  t_start: number;
  t_end: number;
  x: number;
  y: number;
}

export interface AiStopSuggestion {
  t: number;
  title: string;
  /** 0..1 yoki null (server bermagan) */
  confidence: number | null;
}

export interface AiHotspotSuggestion {
  t: number;
  x: number;
  y: number;
  label: string;
  confidence: number | null;
}

export interface AiSuggestions {
  stops: AiStopSuggestion[];
  hotspots: AiHotspotSuggestion[];
}

export interface Tour {
  id: number;
  title: string;
  hall_id: number | null;
  status: TourStatus;
  status_label: string;
  /** soniya; video yo'q bo'lsa 0 */
  duration_s: number;
  width: number;
  height: number;
  variants: TourVariants;
  error: string;
  stops: TourStop[];
  hotspots: TourHotspot[];
  ai_status: AiStatus;
  ai_suggestions: AiSuggestions | null;
  published: boolean;
  created_at: string;
  updated_at: string;
}

/** Stol tanlash ro'yxati (`/tables/` javobidan) */
export interface TableOption {
  id: number;
  number: string;
  hall: string;
  hallId: number | null;
  capacity: number;
}

export interface HallOption {
  id: number;
  name: string;
}

/** Muharrirdagi nuqta: `key` — React uchun barqaror kalit, `id` — serverda bor bo'lsa */
export interface DraftStop {
  key: string;
  id: number | null;
  title: string;
  t: number;
}

export interface DraftHotspot {
  key: string;
  id: number | null;
  /** null = stol hali tanlanmagan (saqlashdan oldin tanlanishi shart) */
  table_id: number | null;
  label: string;
  t_start: number;
  t_end: number;
  x: number;
  y: number;
}

export interface StopPayload {
  title: string;
  t: number;
}

export interface HotspotPayload {
  table_id: number;
  label?: string;
  t_start: number;
  t_end: number;
  x: number;
  y: number;
}
