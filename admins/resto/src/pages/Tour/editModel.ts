/**
 * Muharrir modeli: nuqtalar va belgilar qoralamasi, o'zgarishlar farqi, tekshiruv, ulanmagan stollar, AI takliflarini qabul qilish.
 * SOF mantiq (React'siz): ro'yxatlar O'ZGARMAS — har amal yangi ro'yxat qaytaradi.
 */
import { clamp01, round4 } from './geometry.ts';
import { EPS, defaultRange, validateRange } from './ranges.ts';
import type { RangeProblem } from './ranges.ts';
import { round } from './time.ts';
import type {
  AiHotspotSuggestion,
  AiStopSuggestion,
  AiSuggestions,
  DraftHotspot,
  DraftStop,
  HotspotPayload,
  StopPayload,
  TableOption,
  TourHotspot,
  TourStop,
} from './types.ts';

export const TITLE_MAX = 100;
export const LABEL_MAX = 60;

let counter = 0;
/** Yangi (serverda hali yo'q) element uchun barqaror kalit */
export const newKey = (prefix: 's' | 'h'): string => `${prefix}n${(counter += 1)}`;

// ─── Serverdan qoralamaga ───
export const draftStopsFromTour = (stops: readonly TourStop[]): DraftStop[] => stops.map((s) => ({ key: `s${s.id}`, id: s.id, title: s.title, t: s.t }));

export const draftHotspotsFromTour = (hotspots: readonly TourHotspot[]): DraftHotspot[] =>
  hotspots.map((h) => ({ key: `h${h.id}`, id: h.id, table_id: h.table_id, label: h.label, t_start: h.t_start, t_end: h.t_end, x: h.x, y: h.y }));

// ─── Tartiblash ───
export const sortStops = (list: readonly DraftStop[]): DraftStop[] => [...list].sort((a, b) => a.t - b.t);
export const sortHotspots = (list: readonly DraftHotspot[]): DraftHotspot[] => [...list].sort((a, b) => a.t_start - b.t_start || a.t_end - b.t_end);

// ─── Nuqtalar ───
export function addStop(list: readonly DraftStop[], title: string, t: number): { list: DraftStop[]; key: string } {
  const key = newKey('s');
  return { list: sortStops([...list, { key, id: null, title: title.trim(), t: round(t, 1) }]), key };
}

export function updateStop(list: readonly DraftStop[], key: string, patch: Partial<Pick<DraftStop, 'title' | 't'>>): DraftStop[] {
  return sortStops(list.map((s) => (s.key === key ? { ...s, ...patch } : s)));
}

export const removeStop = (list: readonly DraftStop[], key: string): DraftStop[] => list.filter((s) => s.key !== key);

/** `now` vaqtidagi nuqta (oxirgi boshlangan) indeksi; hali birinchisiga yetmagan bo'lsa -1 */
export function stopIndexAt(stops: readonly { t: number }[], now: number): number {
  let index = -1;
  stops.forEach((s, i) => {
    if (s.t <= now + EPS) index = i;
  });
  return index;
}

// ─── Belgilar ───
export function addHotspot(list: readonly DraftHotspot[], init: { x: number; y: number; now: number; duration: number }): { list: DraftHotspot[]; key: string } {
  const key = newKey('h');
  const range = defaultRange(init.now, init.duration);
  const hotspot: DraftHotspot = { key, id: null, table_id: null, label: '', ...range, x: round4(clamp01(init.x)), y: round4(clamp01(init.y)) };
  return { list: sortHotspots([...list, hotspot]), key };
}

export function updateHotspot(list: readonly DraftHotspot[], key: string, patch: Partial<Omit<DraftHotspot, 'key' | 'id'>>): DraftHotspot[] {
  return sortHotspots(list.map((h) => (h.key === key ? { ...h, ...patch } : h)));
}

export const removeHotspot = (list: readonly DraftHotspot[], key: string): DraftHotspot[] => list.filter((h) => h.key !== key);

/** Saqlashdan keyin tanlovni saqlab qolish uchun: shu belgining serverdagi nusxasini topadi (stol, vaqt, joy mos) */
export function findSameHotspot(list: readonly DraftHotspot[], target: DraftHotspot): DraftHotspot | null {
  const same = (a: DraftHotspot, b: DraftHotspot) =>
    a.table_id === b.table_id && round(a.t_start, 2) === round(b.t_start, 2) && round(a.t_end, 2) === round(b.t_end, 2) && round4(a.x) === round4(b.x) && round4(a.y) === round4(b.y);
  return list.find((h) => same(h, target)) ?? null;
}

// ─── Server yuki va qiyoslash ───
const cleanText = (value: string): string => value.trim();

export function stopsPayload(list: readonly DraftStop[]): StopPayload[] {
  return sortStops(list).map((s) => ({ title: cleanText(s.title), t: round(s.t, 2) }));
}

/** Faqat stoli tanlangan belgilar (tekshiruv o'tgach ishlatiladi) */
export function hotspotsPayload(list: readonly DraftHotspot[]): HotspotPayload[] {
  const payload: HotspotPayload[] = [];
  for (const h of sortHotspots(list)) {
    if (h.table_id === null) continue;
    const item: HotspotPayload = { table_id: h.table_id, t_start: round(h.t_start, 2), t_end: round(h.t_end, 2), x: round4(h.x), y: round4(h.y) };
    const label = cleanText(h.label);
    if (label) item.label = label;
    payload.push(item);
  }
  return payload;
}

export interface ListDiff {
  added: number;
  removed: number;
  changed: number;
}

export const NO_DIFF: ListDiff = { added: 0, removed: 0, changed: 0 };
export const isDirtyDiff = (diff: ListDiff): boolean => diff.added + diff.removed + diff.changed > 0;
export const sumDiff = (...diffs: ListDiff[]): number => diffs.reduce((total, d) => total + d.added + d.removed + d.changed, 0);

function diffById<T extends { id: number | null }>(base: readonly T[], draft: readonly T[], same: (a: T, b: T) => boolean): ListDiff {
  const byId = new Map<number, T>();
  for (const item of base) if (item.id !== null) byId.set(item.id, item);
  const seen = new Set<number>();
  let added = 0;
  let changed = 0;
  for (const item of draft) {
    const original = item.id === null ? undefined : byId.get(item.id);
    if (!original || item.id === null || seen.has(item.id)) {
      added += 1;
      continue;
    }
    seen.add(item.id);
    if (!same(original, item)) changed += 1;
  }
  return { added, removed: byId.size - seen.size, changed };
}

/** Serverdagi (base) va qoralama nuqtalar farqi */
export const diffStops = (base: readonly DraftStop[], draft: readonly DraftStop[]): ListDiff =>
  diffById(base, draft, (a, b) => cleanText(a.title) === cleanText(b.title) && round(a.t, 2) === round(b.t, 2));

export const diffHotspots = (base: readonly DraftHotspot[], draft: readonly DraftHotspot[]): ListDiff =>
  diffById(
    base,
    draft,
    (a, b) =>
      a.table_id === b.table_id &&
      cleanText(a.label) === cleanText(b.label) &&
      round(a.t_start, 2) === round(b.t_start, 2) &&
      round(a.t_end, 2) === round(b.t_end, 2) &&
      round4(a.x) === round4(b.x) &&
      round4(a.y) === round4(b.y),
  );

/** Qoralamani tiklash tekshiruvi uchun serverdagi holat izi (til almashganda qoralama faqat server o'zgarmagan bo'lsa tiklanadi) */
export function baseSignature(stops: readonly DraftStop[], hotspots: readonly DraftHotspot[]): string {
  return JSON.stringify([stopsPayload(stops), hotspots.map((h) => [h.id, h.table_id, round(h.t_start, 2), round(h.t_end, 2), round4(h.x), round4(h.y), cleanText(h.label)])]);
}

// ─── Tekshiruv ───
export type StopIssueCode = 'title_empty' | 'title_long' | 'time_invalid' | 'time_beyond';
export type HotspotIssueCode = 'table_missing' | 'label_long' | 'position_invalid' | RangeProblem;

export type DraftIssue = { kind: 'stop'; key: string; code: StopIssueCode } | { kind: 'hotspot'; key: string; code: HotspotIssueCode };

export function stopIssue(stop: DraftStop, duration: number): StopIssueCode | null {
  const title = cleanText(stop.title);
  if (!title) return 'title_empty';
  if (title.length > TITLE_MAX) return 'title_long';
  if (!Number.isFinite(stop.t) || stop.t < 0) return 'time_invalid';
  if (Number.isFinite(duration) && duration > 0 && stop.t > duration + EPS) return 'time_beyond';
  return null;
}

export function hotspotIssue(hotspot: DraftHotspot, duration: number): HotspotIssueCode | null {
  if (hotspot.table_id === null) return 'table_missing';
  if (![hotspot.x, hotspot.y].every((v) => Number.isFinite(v) && v >= 0 && v <= 1)) return 'position_invalid';
  if (cleanText(hotspot.label).length > LABEL_MAX) return 'label_long';
  return validateRange(hotspot.t_start, hotspot.t_end, duration);
}

export function validateDraft(stops: readonly DraftStop[], hotspots: readonly DraftHotspot[], duration: number): DraftIssue[] {
  const issues: DraftIssue[] = [];
  for (const stop of stops) {
    const code = stopIssue(stop, duration);
    if (code) issues.push({ kind: 'stop', key: stop.key, code });
  }
  for (const hotspot of hotspots) {
    const code = hotspotIssue(hotspot, duration);
    if (code) issues.push({ kind: 'hotspot', key: hotspot.key, code });
  }
  return issues;
}

// ─── Stollar qamrovi ───
/** Sayr zalga biriktirilgan bo'lsa — faqat shu zal stollari; aks holda hammasi */
export const tourTables = (tables: readonly TableOption[], hallId: number | null): TableOption[] =>
  hallId === null ? [...tables] : tables.filter((table) => table.hallId === hallId);

export interface Coverage {
  total: number;
  linked: number;
  /** Belgisi yo'q stollar (raqam bo'yicha tartiblangan) */
  unlinked: TableOption[];
  /** Ro'yxatda yo'q stolga qo'yilgan belgilar (stol arxivlangan yoki boshqa zalniki) */
  orphans: number;
}

const compareNumbers = (a: string, b: string): number => a.localeCompare(b, undefined, { numeric: true });

export function coverage(tables: readonly TableOption[], hotspots: readonly { table_id: number | null }[]): Coverage {
  const used = new Set<number>();
  for (const h of hotspots) if (h.table_id !== null) used.add(h.table_id);
  const known = new Set(tables.map((table) => table.id));
  const unlinked = tables.filter((table) => !used.has(table.id)).sort((a, b) => compareNumbers(a.number, b.number));
  let orphans = 0;
  for (const h of hotspots) if (h.table_id !== null && !known.has(h.table_id)) orphans += 1;
  return { total: tables.length, linked: tables.length - unlinked.length, unlinked, orphans };
}

// ─── AI takliflari ───
export type KeyedStopSuggestion = AiStopSuggestion & { key: string };
export type KeyedHotspotSuggestion = AiHotspotSuggestion & { key: string };

export interface KeyedSuggestions {
  stops: KeyedStopSuggestion[];
  hotspots: KeyedHotspotSuggestion[];
}

export const stopSuggestionKey = (index: number): string => `stop:${index}`;
export const hotspotSuggestionKey = (index: number): string => `hotspot:${index}`;

/** Qaytarilmagan (rad etilmagan/qabul qilinmagan) takliflar, serverdagi tartib indeksi bo'yicha kalitlangan */
export function keyedSuggestions(suggestions: AiSuggestions | null, dismissed: ReadonlySet<string>): KeyedSuggestions {
  if (!suggestions) return { stops: [], hotspots: [] };
  return {
    stops: suggestions.stops.map((s, i) => ({ ...s, key: stopSuggestionKey(i) })).filter((s) => !dismissed.has(s.key)),
    hotspots: suggestions.hotspots.map((s, i) => ({ ...s, key: hotspotSuggestionKey(i) })).filter((s) => !dismissed.has(s.key)),
  };
}

export const countSuggestions = (s: KeyedSuggestions): number => s.stops.length + s.hotspots.length;

export const confidencePercent = (confidence: number | null): number | null => (confidence === null ? null : Math.round(clamp01(confidence) * 100));

/** Taklif nuqtani qabul qilish: ro'yxatga qo'shadi. Aynan shunday (nom + vaqt) nuqta bor bo'lsa — qo'shilmaydi (key null). */
export function acceptStopSuggestion(list: readonly DraftStop[], suggestion: AiStopSuggestion, duration: number, fallbackTitle: string): { list: DraftStop[]; key: string | null } {
  const limit = Number.isFinite(duration) && duration > 0 ? duration : Number.POSITIVE_INFINITY;
  const t = round(Math.min(Math.max(0, suggestion.t), limit), 1);
  const title = cleanText(suggestion.title) || cleanText(fallbackTitle);
  const duplicate = list.some((s) => Math.abs(s.t - t) <= EPS && cleanText(s.title).toLowerCase() === title.toLowerCase());
  if (duplicate) return { list: [...list], key: null };
  return addStop(list, title, t);
}

export type AcceptHotspotResult = { ok: true; list: DraftHotspot[]; key: string } | { ok: false; reason: 'table_required' };

/** Taklif belgini qabul qilish. AI stol raqamini bilmaydi: stol tanlanmagan bo'lsa qabul qilinmaydi. */
export function acceptHotspotSuggestion(list: readonly DraftHotspot[], suggestion: AiHotspotSuggestion, tableId: number | null, duration: number): AcceptHotspotResult {
  if (tableId === null || !Number.isInteger(tableId) || tableId <= 0) return { ok: false, reason: 'table_required' };
  const added = addHotspot(list, { x: suggestion.x, y: suggestion.y, now: suggestion.t, duration });
  const label = cleanText(suggestion.label).slice(0, LABEL_MAX);
  return { ok: true, list: updateHotspot(added.list, added.key, { table_id: tableId, label }), key: added.key };
}
