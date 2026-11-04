/**
 * Server/tarmoq xatosini turga ajratish. SOF mantiq (matnlar `labels.ts` da).
 * Server o'z xabarini (`error`) bergan bo'lsa u ustun; tur faqat xabar bo'lmaganda ishlatiladi.
 */

export type FailureKind = 'network' | 'forbidden' | 'too_big' | 'bad_type' | 'busy' | 'conflict' | 'not_found' | 'server';

export function failureKind(status: number): FailureKind {
  if (!Number.isFinite(status) || status <= 0) return 'network';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status === 413) return 'too_big';
  if (status === 415) return 'bad_type';
  if (status === 429) return 'busy';
  return 'server';
}

/** `hotspots[2].t_end` / `stops[0].title` kabi yo'ldan indeks (xato qaysi qatorda ekanini ko'rsatish uchun) */
export function indexFromField(field: string, list: 'hotspots' | 'stops'): number | null {
  const match = new RegExp(`${list}\\[(\\d{1,4})\\]`).exec(String(field ?? ''));
  return match ? Number(match[1]) : null;
}
