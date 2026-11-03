/**
 * Yuklanadigan faylni brauzerda oldindan tekshirish (server baribir qayta tekshiradi).
 * Sof funksiyalar: `node --test` bilan tekshiriladi.
 */

export const MAX_FILES = 10;
/** Hujjatlar (Excel, Word, PDF, matn) serverga o'zi yuboriladi: 10 MB gacha. */
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
/** Rasm yuborishdan oldin brauzerda kichraytiriladi, shuning uchun telefon suratining asl hajmi kattaroq bo'lishi mumkin. */
export const MAX_IMAGE_SOURCE_BYTES = 40 * 1024 * 1024;
/** Joylangan matn uzunligi chegarasi (belgi). */
export const MAX_TEXT_CHARS = 100_000;

/** `<input type="file" accept>` uchun: telefonda galereya ham ochiladi. */
export const FILE_ACCEPT = '.xlsx,.csv,.txt,.docx,.pdf,image/*';

export type LegacyKind = 'excel' | 'word' | 'samsung' | 'apple' | 'other';

export type FileVerdict =
  | { ok: true; kind: 'document' | 'image' }
  | { ok: false; reason: 'empty' | 'too_large' | 'unsupported' }
  | { ok: false; reason: 'legacy'; legacy: LegacyKind };

const DOCUMENT_EXTENSIONS = ['xlsx', 'csv', 'txt', 'docx', 'pdf'];
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'heic', 'heif', 'avif'];

const LEGACY_BY_EXTENSION: Record<string, LegacyKind> = {
  xls: 'excel',
  ods: 'excel',
  doc: 'word',
  rtf: 'word',
  odt: 'word',
  sdocx: 'samsung',
  memo: 'samsung',
  snb: 'samsung',
  pages: 'apple',
  numbers: 'apple',
};

export function fileExtension(name: string): string {
  const match = /\.([A-Za-z0-9]+)$/.exec(String(name ?? '').trim());
  return match ? match[1].toLowerCase() : '';
}

export function classifyFile(file: { name: string; size: number; type?: string }): FileVerdict {
  if (!file.size) return { ok: false, reason: 'empty' };
  const ext = fileExtension(file.name);
  const mime = (file.type ?? '').toLowerCase();

  if (Object.prototype.hasOwnProperty.call(LEGACY_BY_EXTENSION, ext)) {
    return { ok: false, reason: 'legacy', legacy: LEGACY_BY_EXTENSION[ext] };
  }

  const isImage = mime.startsWith('image/') || IMAGE_EXTENSIONS.includes(ext);
  if (isImage) {
    return file.size > MAX_IMAGE_SOURCE_BYTES ? { ok: false, reason: 'too_large' } : { ok: true, kind: 'image' };
  }
  if (DOCUMENT_EXTENSIONS.includes(ext)) {
    return file.size > MAX_DOCUMENT_BYTES ? { ok: false, reason: 'too_large' } : { ok: true, kind: 'document' };
  }
  return { ok: false, reason: 'unsupported' };
}

/** "12,3 MB" kabi qisqa hajm (xabarlar uchun). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}
