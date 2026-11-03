/**
 * Ogohlantirish kodlari -> odam tilidagi matn, jiddiylik va qator rangi.
 * Sof funksiyalar (React'siz): `node --test` bilan tekshiriladi.
 *
 * Matnlar bu yerda emas: ular `src/i18n/uz.ts` (restoUz.bulkImport.warnings) da, bu modul ularni parametr sifatida oladi.
 */
import type { RowTone, WarningCode, WarningSeverity } from './types';

/**
 * Jiddiylik:
 *  - error: yozib bo'lmaydi, odam tuzatishi kerak (narx yo'q);
 *  - warn: yozish mumkin, lekin tekshirish kerak;
 *  - info: oddiy ma'lumot (yangi bo'lim yaratiladi).
 */
export const WARNING_SEVERITY: Record<WarningCode, WarningSeverity> = {
  price_missing: 'error',
  name_exists: 'warn',
  duplicate_in_file: 'warn',
  price_small: 'warn',
  price_large: 'warn',
  low_confidence: 'warn',
  category_new: 'info',
};

export function isWarningCode(value: unknown): value is WarningCode {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(WARNING_SEVERITY, value);
}

export function warningSeverity(code: WarningCode): WarningSeverity {
  return WARNING_SEVERITY[code];
}

/** Kod -> matn. Noma'lum kod uchun bo'sh qator (xom kod hech qachon ko'rsatilmaydi). */
export function warningText(code: string, texts: Record<WarningCode, string>): string {
  return isWarningCode(code) ? texts[code] : '';
}

export function warningTexts(codes: string[], texts: Record<WarningCode, string>): string[] {
  const result: string[] = [];
  for (const code of codes) {
    const text = warningText(code, texts);
    if (text && !result.includes(text)) result.push(text);
  }
  return result;
}

/**
 * Qator rangi: belgisi olingan qator xira ("muted"); xato bo'lsa qizil; ogohlantirish bo'lsa sariq;
 * faqat ma'lumot (yangi bo'lim) yoki hech narsa bo'lmasa oddiy ("ok").
 */
export function rowTone(codes: WarningCode[], include: boolean): RowTone {
  if (!include) return 'muted';
  let tone: RowTone = 'ok';
  for (const code of codes) {
    const severity = WARNING_SEVERITY[code];
    if (severity === 'error') return 'error';
    if (severity === 'warn') tone = 'warn';
  }
  return tone;
}

/** Nechta qatorga e'tibor berish kerak (xato yoki ogohlantirish; faqat ma'lumot hisobga olinmaydi). */
export function countAttention(items: Array<{ include: boolean; warnings: WarningCode[] }>): number {
  let count = 0;
  for (const item of items) {
    const tone = rowTone(item.warnings, item.include);
    if (tone === 'warn' || tone === 'error') count += 1;
  }
  return count;
}
