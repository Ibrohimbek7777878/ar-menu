/**
 * Server javobini ichki shaklga keltirish (himoyali: server va mijoz parallel yozilgan, kutilmagan shakl sahifani qulatmasin).
 * SOF mantiq: faqat `./geometry.ts` ga tayanadi.
 */
import { clamp01 } from './geometry.ts';
import type { AiHotspotSuggestion, AiStatus, AiStopSuggestion, AiSuggestions, Tour, TourHotspot, TourStatus, TourStop, TourVariants } from './types.ts';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const num = (value: unknown, fallback = 0): number => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);
const str = (value: unknown): string => (typeof value === 'string' ? value : '');
const optionalId = (value: unknown): number | null => (typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null);

const STATUSES: readonly TourStatus[] = ['draft', 'processing', 'ready', 'published', 'failed'];
const AI_STATUSES: readonly AiStatus[] = ['idle', 'running', 'done', 'failed'];

export const isTourStatus = (value: unknown): value is TourStatus => typeof value === 'string' && (STATUSES as readonly string[]).includes(value);

function variantsOf(raw: unknown): TourVariants {
  if (!isRecord(raw)) return {};
  const out: TourVariants = {};
  for (const key of ['scrub', 'play', 'low', 'poster'] as const) {
    const value = raw[key];
    if (typeof value === 'string' && value.trim()) out[key] = value;
  }
  return out;
}

function stopsOf(raw: unknown): TourStop[] {
  if (!Array.isArray(raw)) return [];
  const stops: TourStop[] = [];
  raw.forEach((item, index) => {
    if (!isRecord(item)) return;
    const id = optionalId(item.id);
    const t = item.t;
    if (id === null || typeof t !== 'number' || !Number.isFinite(t) || t < 0) return;
    stops.push({ id, order: num(item.order, index), title: str(item.title), t });
  });
  return stops.sort((a, b) => a.t - b.t || a.order - b.order || a.id - b.id);
}

function hotspotsOf(raw: unknown): TourHotspot[] {
  if (!Array.isArray(raw)) return [];
  const list: TourHotspot[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const id = optionalId(item.id);
    const start = item.t_start;
    const end = item.t_end;
    if (id === null || typeof start !== 'number' || typeof end !== 'number' || !Number.isFinite(start) || !Number.isFinite(end)) continue;
    list.push({
      id,
      table_id: optionalId(item.table_id),
      table_number: item.table_number === null || item.table_number === undefined ? '' : String(item.table_number),
      label: str(item.label),
      t_start: start,
      t_end: end,
      x: clamp01(num(item.x, 0.5)),
      y: clamp01(num(item.y, 0.5)),
    });
  }
  return list.sort((a, b) => a.t_start - b.t_start || a.t_end - b.t_end || a.id - b.id);
}

const confidenceOf = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? clamp01(value) : null);

/**
 * AI takliflarini tozalaydi: yaroqsiz yozuvlar tashlanadi, vaqt [0, duration] ga, joy 0..1 ga siqiladi.
 * Hech narsa qolmasa (yoki null) — null: hech narsa chizilmaydi.
 */
export function normalizeSuggestions(raw: unknown, duration: number): AiSuggestions | null {
  if (!isRecord(raw)) return null;
  const limit = Number.isFinite(duration) && duration > 0 ? duration : Number.POSITIVE_INFINITY;
  const stops: AiStopSuggestion[] = [];
  if (Array.isArray(raw.stops)) {
    for (const item of raw.stops) {
      if (!isRecord(item) || typeof item.t !== 'number' || !Number.isFinite(item.t)) continue;
      stops.push({ t: Math.min(Math.max(0, item.t), limit), title: str(item.title).trim(), confidence: confidenceOf(item.confidence) });
    }
  }
  const hotspots: AiHotspotSuggestion[] = [];
  if (Array.isArray(raw.hotspots)) {
    for (const item of raw.hotspots) {
      if (!isRecord(item) || typeof item.t !== 'number' || !Number.isFinite(item.t)) continue;
      if (typeof item.x !== 'number' || typeof item.y !== 'number' || !Number.isFinite(item.x) || !Number.isFinite(item.y)) continue;
      hotspots.push({
        t: Math.min(Math.max(0, item.t), limit),
        x: clamp01(item.x),
        y: clamp01(item.y),
        label: str(item.label).trim(),
        confidence: confidenceOf(item.confidence),
      });
    }
  }
  if (stops.length === 0 && hotspots.length === 0) return null;
  stops.sort((a, b) => a.t - b.t);
  hotspots.sort((a, b) => a.t - b.t);
  return { stops, hotspots };
}

/** Bitta sayr: id yo'q yoki obyekt emas bo'lsa null */
export function normalizeTour(raw: unknown): Tour | null {
  if (!isRecord(raw)) return null;
  const id = optionalId(raw.id);
  if (id === null) return null;
  const status: TourStatus = isTourStatus(raw.status) ? raw.status : 'draft';
  const duration = Math.max(0, num(raw.duration_s));
  return {
    id,
    title: str(raw.title),
    hall_id: optionalId(raw.hall_id),
    status,
    status_label: str(raw.status_label),
    duration_s: duration,
    width: Math.max(0, num(raw.width)),
    height: Math.max(0, num(raw.height)),
    variants: variantsOf(raw.variants),
    error: str(raw.error),
    stops: stopsOf(raw.stops),
    hotspots: hotspotsOf(raw.hotspots),
    ai_status: (AI_STATUSES as readonly unknown[]).includes(raw.ai_status) ? (raw.ai_status as AiStatus) : 'idle',
    ai_suggestions: normalizeSuggestions(raw.ai_suggestions, duration),
    published: raw.published === true || status === 'published',
    created_at: str(raw.created_at),
    updated_at: str(raw.updated_at),
  };
}

/** `GET tours/` -> `{results: [...]}` (massivning o'zi ham qabul qilinadi); yaroqsiz yozuvlar tashlanadi, yangisi birinchi */
export function toursFromResponse(raw: unknown): Tour[] {
  const items = Array.isArray(raw) ? raw : isRecord(raw) && Array.isArray(raw.results) ? raw.results : [];
  const tours: Tour[] = [];
  for (const item of items) {
    const tour = normalizeTour(item);
    if (tour) tours.push(tour);
  }
  return tours.sort((a, b) => b.updated_at.localeCompare(a.updated_at) || b.id - a.id);
}

/** Video ko'rinadigan variant: tahrir uchun `play` (zaxira: `low`, `scrub`) */
export function playableSource(variants: TourVariants): string {
  return variants.play || variants.low || variants.scrub || '';
}

export const isEditable = (status: TourStatus): boolean => status === 'ready' || status === 'published';
