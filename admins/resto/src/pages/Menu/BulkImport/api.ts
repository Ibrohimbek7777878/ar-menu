/**
 * Ommaviy qo'shish: server chaqiruvlari. Hammasi `/api/restaurant/admin/v1/menu/` ostida
 * (docs/01_PRODUCT_RESTAURANT_3D_AR/TZ_OMMAVIY_MENYU_KIRITISH_2026-11-03.md, "API" bo'limi).
 * CSRF/sessiya va 401 yo'naltirish `apiClient` (@admins/shared) da.
 */
import { apiClient } from '@admins/shared';
import { cleanQuery, queryKey, usableResults } from './images';
import type {
  CommitRequest,
  CommitResponse,
  ImagePickResponse,
  ImageSearchResponse,
  ImageSearchResult,
  ParseResponse,
  PhotoUploadResponse,
  UndoResponse,
} from './types';

const BASE = '/api/restaurant/admin/v1/menu';

/** O'qish: server ichida jadval 20 s, AI 25 s gacha ketishi mumkin. */
const PARSE_TIMEOUT_MS = 75_000;
const COMMIT_TIMEOUT_MS = 90_000;
const SHORT_TIMEOUT_MS = 30_000;

/** Tashqi to'xtatish signali yoki vaqt tugashi bilan bekor bo'ladigan so'rov signali. */
function timedSignal(timeoutMs: number, outer?: AbortSignal): { signal: AbortSignal; done: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const forward = () => controller.abort();
  if (outer) {
    if (outer.aborted) controller.abort();
    else outer.addEventListener('abort', forward, { once: true });
  }
  return {
    signal: controller.signal,
    done: () => {
      clearTimeout(timer);
      outer?.removeEventListener('abort', forward);
    },
  };
}

async function request<T>(path: string, init: RequestInit, timeoutMs: number, outer?: AbortSignal): Promise<T> {
  const { signal, done } = timedSignal(timeoutMs, outer);
  try {
    return await apiClient<T>(`${BASE}${path}`, { ...init, signal });
  } finally {
    done();
  }
}

/** 1) POST import/parse/ — multipart: `file` YOKI `text` (ikkalasi emas). */
export function parseImport(input: { file: File } | { text: string }, signal?: AbortSignal): Promise<ParseResponse> {
  const body = new FormData();
  if ('file' in input) body.append('file', input.file, input.file.name);
  else body.append('text', input.text);
  return request<ParseResponse>('/import/parse/', { method: 'POST', body }, PARSE_TIMEOUT_MS, signal);
}

/** 2) POST import/commit/ — JSON; `submission_id` bo'yicha qayta yuborish takror yaratmaydi. */
export function commitImport(payload: CommitRequest, signal?: AbortSignal): Promise<CommitResponse> {
  return request<CommitResponse>(
    '/import/commit/',
    { method: 'POST', body: JSON.stringify(payload) },
    COMMIT_TIMEOUT_MS,
    signal,
  );
}

/** 3) POST import/undo/ — shu partiyada yaratilgan taomlarni arxivlaydi (o'chirmaydi). */
export function undoImport(batchId: string): Promise<UndoResponse> {
  return request<UndoResponse>(
    '/import/undo/',
    { method: 'POST', body: JSON.stringify({ batch_id: batchId }) },
    SHORT_TIMEOUT_MS,
  );
}

/** 4) POST import/photo/ — multipart `image` (mijozda 1600 px gacha kichraytirilgan). */
export function uploadImportPhoto(file: File): Promise<PhotoUploadResponse> {
  const body = new FormData();
  body.append('image', file, file.name);
  return request<PhotoUploadResponse>('/import/photo/', { method: 'POST', body }, PARSE_TIMEOUT_MS);
}

// ---------- Internetdan rasm topish ----------

const SEARCH_TTL_MS = 10 * 60 * 1000;
const SEARCH_CACHE_MAX = 40;
const searchCache = new Map<string, { at: number; data: ImageSearchResponse }>();

/** 5) GET image-search/?q=… — bir xil so'z qayta so'ralmasin (soatiga 60 so'rov chegarasi bor): 10 daqiqa mijozda saqlanadi. */
export async function searchImages(query: string, signal?: AbortSignal): Promise<ImageSearchResponse> {
  const q = cleanQuery(query);
  const key = queryKey(q);
  const cached = searchCache.get(key);
  if (cached && Date.now() - cached.at < SEARCH_TTL_MS) return cached.data;

  const data = await request<ImageSearchResponse>(
    `/image-search/?q=${encodeURIComponent(q)}`,
    { method: 'GET' },
    SHORT_TIMEOUT_MS,
    signal,
  );
  const normalized: ImageSearchResponse = { query_used: data.query_used, results: usableResults(data.results) };
  searchCache.delete(key);
  searchCache.set(key, { at: Date.now(), data: normalized });
  while (searchCache.size > SEARCH_CACHE_MAX) {
    const oldest = searchCache.keys().next().value;
    if (oldest === undefined) break;
    searchCache.delete(oldest);
  }
  return normalized;
}

/** 6) POST image-search/pick/ — server rasmni o'zi yuklab oladi va vaqtincha saqlaydi. */
export function pickImage(result: ImageSearchResult): Promise<ImagePickResponse> {
  const body = {
    id: result.id,
    full: result.full,
    title: result.title ?? '',
    creator: result.creator ?? '',
    license: result.license,
    license_url: result.license_url ?? '',
    source_url: result.source_url ?? '',
  };
  return request<ImagePickResponse>(
    '/image-search/pick/',
    { method: 'POST', body: JSON.stringify(body) },
    SHORT_TIMEOUT_MS,
  );
}
