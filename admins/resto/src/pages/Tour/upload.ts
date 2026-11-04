/**
 * Video yuklash: `XMLHttpRequest` (yuklash foizi uchun: `fetch` buni bermaydi).
 * Javobni o'qish (`parseUploadResponse`) va xato sinfi brauzersiz sinaladi; so'rovning o'zi faqat brauzerda ishlaydi.
 */

export class UploadError extends Error {
  status: number;
  problem: Record<string, unknown> | null;

  constructor(status: number, message: string, problem: Record<string, unknown> | null) {
    super(message);
    this.name = 'UploadError';
    this.status = status;
    this.problem = problem;
  }
}

export type UploadResponse = { ok: true; body: unknown } | { ok: false; status: number; problem: Record<string, unknown> | null };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** Server javobi: 2xx -> `{ok, body}`; boshqasi -> `{error, code, field}` ni (bo'lsa) o'qiydi. JSON bo'lmasa ham qulamaydi. */
export function parseUploadResponse(status: number, text: string): UploadResponse {
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (status >= 200 && status < 300) return { ok: true, body };
  return { ok: false, status, problem: isRecord(body) ? body : null };
}

export interface UploadOptions {
  onProgress?: (loaded: number, total: number) => void;
  signal?: AbortSignal;
}

export const isUploadAborted = (error: unknown): boolean => error instanceof Error && error.name === 'AbortError';

function readCsrf(): string {
  const match = typeof document !== 'undefined' ? document.cookie.match(/csrftoken=([^;]+)/) : null;
  return match ? decodeURIComponent(match[1]) : '';
}

/** `POST url` multipart `video`. Muvaffaqiyatda javob JSON'i (xom), xatoda `UploadError`, bekor qilinsa `AbortError`. */
export function uploadVideo(url: string, file: File, options: UploadOptions = {}): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const { onProgress, signal } = options;
    if (signal?.aborted) {
      reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
      return;
    }
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.responseType = 'text';
    xhr.setRequestHeader('Accept', 'application/json');
    const csrf = readCsrf();
    if (csrf) xhr.setRequestHeader('X-CSRFToken', csrf);

    const onAbort = () => xhr.abort();
    signal?.addEventListener('abort', onAbort, { once: true });
    const cleanup = () => signal?.removeEventListener('abort', onAbort);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded, event.total);
    };
    xhr.onload = () => {
      cleanup();
      const parsed = parseUploadResponse(xhr.status, xhr.responseText);
      if (parsed.ok) {
        resolve(parsed.body);
        return;
      }
      if (parsed.status === 401 && typeof window !== 'undefined') {
        window.location.href = `/admin/login/?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      }
      const message = typeof parsed.problem?.error === 'string' ? parsed.problem.error : typeof parsed.problem?.detail === 'string' ? parsed.problem.detail : '';
      reject(new UploadError(parsed.status, message, parsed.problem));
    };
    xhr.onerror = () => {
      cleanup();
      reject(new UploadError(0, '', null));
    };
    xhr.ontimeout = xhr.onerror;
    xhr.onabort = () => {
      cleanup();
      reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
    };

    const form = new FormData();
    form.append('video', file, file.name);
    xhr.send(form);
  });
}
