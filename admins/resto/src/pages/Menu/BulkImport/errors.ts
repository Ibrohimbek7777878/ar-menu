/**
 * Server xatolarini odam tilidagi xabarga aylantirish.
 *
 * `apiClient` (@admins/shared) xatoda `ApiError` tashlaydi: `status` va xom JSON tanasi `problem` da.
 * Bu loyiha serveri `{error, code}` (yoki `{error, rows:[…]}`) qaytaradi, `apiClient` esa faqat `detail/title` ni o'qiydi,
 * shuning uchun xabarni shu yerda `problem.error` dan olamiz. `ApiError` sinfini import qilmaymiz (duck typing) —
 * shunda modul `node --test` ostida ishlaydi.
 */
import type { ApiFailure, RowError } from './types';

export type FailureKind =
  | 'network'
  | 'aborted'
  | 'too_large'
  | 'unsupported'
  | 'nothing'
  | 'rate_limited'
  | 'ai_unavailable'
  | 'forbidden'
  | 'not_found'
  | 'invalid'
  | 'server'
  | 'other';

export type FailureTexts = Record<FailureKind, string>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function toRowError(value: unknown): RowError | null {
  if (!isRecord(value)) return null;
  const rowId = value.row_id;
  if (typeof rowId !== 'string' && typeof rowId !== 'number') return null;
  const message = firstString(value.message, value.error);
  const field = typeof value.field === 'string' && value.field ? value.field : undefined;
  return { row_id: String(rowId), field, message };
}

const CODE_BY_STATUS: Record<number, string> = {
  413: 'file_too_large',
  415: 'unsupported_type',
  422: 'nothing_recognized',
  429: 'rate_limited',
  503: 'ai_unavailable',
};

export function extractFailure(error: unknown): ApiFailure {
  const aborted = isRecord(error) && error.name === 'AbortError';
  if (aborted) {
    return { status: 0, code: 'aborted', message: '', rows: [], aborted: true };
  }

  const status = isRecord(error) && typeof error.status === 'number' ? error.status : 0;
  const body = isRecord(error) && isRecord(error.problem) ? error.problem : {};
  const rawRows = Array.isArray(body.rows) ? body.rows : [];
  const rows = rawRows.map(toRowError).filter((row): row is RowError => row !== null);
  const code = firstString(body.code) || CODE_BY_STATUS[status] || (status === 0 ? 'network' : '');
  return {
    status,
    code,
    message: firstString(body.error, body.detail),
    rows,
    aborted: false,
  };
}

export function failureKind(failure: ApiFailure): FailureKind {
  if (failure.aborted) return 'aborted';
  if (failure.status === 0) return 'network';
  if (failure.code === 'file_too_large' || failure.status === 413) return 'too_large';
  if (failure.code === 'unsupported_type' || failure.status === 415) return 'unsupported';
  if (failure.code === 'nothing_recognized' || failure.status === 422) return 'nothing';
  if (failure.code === 'rate_limited' || failure.status === 429) return 'rate_limited';
  if (failure.code === 'ai_unavailable' || failure.status === 503) return 'ai_unavailable';
  if (failure.status === 401 || failure.status === 403) return 'forbidden';
  if (failure.status === 404) return 'not_found';
  if (failure.status === 400) return 'invalid';
  if (failure.status >= 500) return 'server';
  return 'other';
}

/** Server o'zi aniq maslahat bergan holatlar (415 "Excel'da Boshqacha saqlang…", 422 "nima qilish kerak"). */
const PREFER_SERVER_MESSAGE: FailureKind[] = ['unsupported', 'nothing', 'invalid'];

export function failureMessage(failure: ApiFailure, texts: FailureTexts): string {
  const kind = failureKind(failure);
  if (failure.message && PREFER_SERVER_MESSAGE.includes(kind)) return failure.message;
  return texts[kind];
}

/** Server o'qish/yozishdan oldin qatorlarni tekshirib qaytargan xatomi (`400 rows[]`). */
export function hasRowErrors(failure: ApiFailure): boolean {
  return failure.status === 400 && failure.rows.length > 0;
}
