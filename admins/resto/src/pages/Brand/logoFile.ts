/**
 * Logotip/favicon fayli: yuklashdan OLDINGI sof tekshiruv va kichraytirish qoidalari — `node --test` bilan sinaladi.
 * Haqiqiy kichraytirish (canvas) — `logoResize.ts`; o'lcham hisobi `Menu/BulkImport/imageResize.ts` dagi `fitWithin` dan.
 *
 * Nega alohida: `downscaleImage` (BulkImport) rasmni 1600 px JPEG qiladi va shaffoflikni oq bilan to'ldiradi — taom surati uchun
 * to'g'ri, logotip uchun emas (shaffof fonli PNG logotip oq kvadrat bo'lib qolardi). Bu yerda logotip 512 px gacha, PNG/JPEG.
 */
import type { ImageKind } from './types.ts';

/** Uzun tomon (px): logotip 512, favicon 256 */
export const MAX_SIDE: Record<ImageKind, number> = { logo: 512, favicon: 256 };

/** Tanlangan asl fayl hajmi (bayt): brauzer xotirasini ortiqcha yuklamaslik uchun */
export const MAX_SOURCE_BYTES = 15 * 1024 * 1024;

export type FileProblem = 'empty' | 'not_image' | 'svg' | 'too_big';

export interface FileLike {
  name: string;
  type: string;
  size: number;
}

const EXTENSION_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  jfif: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  bmp: 'image/bmp',
  avif: 'image/avif',
  heic: 'image/heic',
  heif: 'image/heif',
  svg: 'image/svg+xml',
};

/** Fayl turi: brauzer bergan tur, bo'sh bo'lsa (Windows'da HEIC) kengaytmadan */
export function detectType(file: Pick<FileLike, 'name' | 'type'>): string {
  const declared = String(file.type ?? '').trim().toLowerCase();
  if (declared) return declared;
  const match = /\.([A-Za-z0-9]+)$/.exec(String(file.name ?? ''));
  return match ? (EXTENSION_TYPES[match[1].toLowerCase()] ?? '') : '';
}

/** Yuklashga yaroqsizmi? SVG rad etiladi (ichida skript bo'lishi mumkin), rasm bo'lmagan fayl ham. */
export function checkImageFile(file: FileLike): FileProblem | null {
  if (!file || file.size <= 0) return 'empty';
  const type = detectType(file);
  if (type === 'image/svg+xml') return 'svg';
  if (!type.startsWith('image/')) return 'not_image';
  if (file.size > MAX_SOURCE_BYTES) return 'too_big';
  return null;
}

export interface OutputFormat {
  mime: 'image/png' | 'image/jpeg';
  ext: 'png' | 'jpg';
  /** JPEG sifati (PNG uchun yo'q) */
  quality?: number;
}

/** Surat (JPEG/HEIC) -> JPEG; boshqasi (PNG, WebP, GIF ...) -> PNG, shaffoflik saqlansin */
export function outputFormat(file: Pick<FileLike, 'name' | 'type'>): OutputFormat {
  const type = detectType(file);
  if (type === 'image/jpeg' || type === 'image/heic' || type === 'image/heif') return { mime: 'image/jpeg', ext: 'jpg', quality: 0.9 };
  return { mime: 'image/png', ext: 'png' };
}

/** "Logo Final.PNG" -> "logo-final.png" (faqat lotin harf, raqam va chiziqcha); nomi bo'lmasa kind nomi */
export function outputFileName(name: string, format: OutputFormat, kind: ImageKind): string {
  const base = String(name ?? '')
    .replace(/\.[A-Za-z0-9]+$/, '')
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/[^A-Za-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 40);
  return `${base || kind}.${format.ext}`;
}
