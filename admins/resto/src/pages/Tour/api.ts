import { apiClient } from '@admins/shared';
import { fetchTables } from '../Tables/api';
import { normalizeTour, toursFromResponse } from './tourModel';
import type { HallOption, HotspotPayload, StopPayload, TableOption, Tour } from './types';
import { uploadVideo } from './upload';
import type { UploadOptions } from './upload';
import {
  TOURS_URL,
  tourAiSuggestUrl,
  tourAiSuggestionsUrl,
  tourHotspotsUrl,
  tourPublishUrl,
  tourStopsUrl,
  tourUnpublishUrl,
  tourUrl,
  tourVideoUrl,
} from './urls';

const post = { method: 'POST' } as const;

/** Server Tour qaytarishi shart; boshqa shakl — aniq xato (jim qolib, bo'sh ekran ko'rsatmaslik uchun) */
function mustTour(raw: unknown): Tour {
  const tour = normalizeTour(raw);
  if (!tour) throw new Error('Server sayr ma\'lumotini qaytarmadi');
  return tour;
}

export async function fetchTours(): Promise<Tour[]> {
  return toursFromResponse(await apiClient<unknown>(TOURS_URL));
}

export async function fetchTour(id: number): Promise<Tour> {
  return mustTour(await apiClient<unknown>(tourUrl(id)));
}

export async function createTour(payload: { title: string; hall_id?: number | null }): Promise<Tour> {
  const body: { title: string; hall_id?: number } = { title: payload.title };
  if (typeof payload.hall_id === 'number') body.hall_id = payload.hall_id;
  return mustTour(await apiClient<unknown>(TOURS_URL, { ...post, body: JSON.stringify(body) }));
}

/** Nom va zalni o'zgartirish (`hall_id: null` — zalga biriktirilmagan) */
export async function updateTour(id: number, patch: { title?: string; hall_id?: number | null }): Promise<Tour> {
  return mustTour(await apiClient<unknown>(tourUrl(id), { method: 'PATCH', body: JSON.stringify(patch) }));
}

/** DELETE = arxivlash (serverda yashiriladi, o'chirilmaydi) */
export async function archiveTour(id: number): Promise<void> {
  await apiClient<unknown>(tourUrl(id), { method: 'DELETE' });
}

/** Video yuklash (foiz bilan). Muvaffaqiyatda `processing` holatidagi sayr. */
export async function uploadTourVideo(id: number, file: File, options: UploadOptions): Promise<Tour> {
  return mustTour(await uploadVideo(tourVideoUrl(id), file, options));
}

/** To'liq almashtirish: `PUT stops` -> yangilangan sayr */
export async function putStops(id: number, stops: StopPayload[]): Promise<Tour> {
  return mustTour(await apiClient<unknown>(tourStopsUrl(id), { method: 'PUT', body: JSON.stringify({ stops }) }));
}

export async function putHotspots(id: number, hotspots: HotspotPayload[]): Promise<Tour> {
  return mustTour(await apiClient<unknown>(tourHotspotsUrl(id), { method: 'PUT', body: JSON.stringify({ hotspots }) }));
}

export async function publishTour(id: number): Promise<Tour> {
  return mustTour(await apiClient<unknown>(tourPublishUrl(id), post));
}

export async function unpublishTour(id: number): Promise<Tour> {
  return mustTour(await apiClient<unknown>(tourUnpublishUrl(id), post));
}

/** AI taklifini boshlash: 202 `{ai_status: 'running'}`; natijani `fetchTour` bilan kutamiz */
export async function startAiSuggest(id: number): Promise<void> {
  await apiClient<unknown>(tourAiSuggestUrl(id), post);
}

/** Barcha AI takliflarini rad etish */
export async function clearAiSuggestions(id: number): Promise<void> {
  await apiClient<unknown>(tourAiSuggestionsUrl(id), { method: 'DELETE' });
}

export interface TableData {
  tables: TableOption[];
  halls: HallOption[];
}

/** Stollar va zallar (arxivlangan va nofaol stollarsiz): mavjud `/tables/` endpointi */
export async function fetchTableData(): Promise<TableData> {
  const raw = await fetchTables();
  const tables = (raw.items ?? [])
    .filter((table) => !table.is_deleted && table.is_active !== false)
    .map((table) => ({
      id: table.id,
      number: String(table.number),
      hall: table.hall_name ?? '',
      hallId: typeof table.hall_id === 'number' ? table.hall_id : null,
      capacity: typeof table.capacity === 'number' ? table.capacity : 0,
    }));
  const halls = (raw.halls ?? []).filter((hall) => hall.is_active !== false).map((hall) => ({ id: hall.id, name: hall.name }));
  return { tables, halls };
}
