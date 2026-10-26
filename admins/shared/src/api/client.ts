/**
 * Resto Admin umumiy API client'i (TZ: 1.1, 3.3).
 * - CSRF token qo'shadi (cookie yoki session).
 * - 401 qaytganida avtomatik /admin/login/?next=... ga yo'naltiradi.
 * - RFC 7807 xatolik formatini parse qiladi.
 */

export interface ApiProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  errors?: Record<string, string[]>;
}

export class ApiError extends Error {
  status: number;
  problem?: ApiProblemDetails;

  constructor(status: number, message: string, problem?: ApiProblemDetails) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.problem = problem;
  }
}

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const csrf = getCsrfToken();
  if (csrf && !headers.has('X-CSRFToken')) {
    headers.set('X-CSRFToken', csrf);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
    credentials: 'same-origin',
  });

  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      const currentUrl = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/admin/login/?next=${currentUrl}`;
    }
    throw new ApiError(401, 'Tizimga kirish talab etiladi.');
  }

  if (!response.ok) {
    let problem: ApiProblemDetails | undefined;
    try {
      problem = await response.json();
    } catch {
      // not a json response
    }

    const message = problem?.detail || problem?.title || `So'rov muvaffaqiyatsiz tugadi (${response.status})`;
    throw new ApiError(response.status, message, problem);
  }

  // 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}
