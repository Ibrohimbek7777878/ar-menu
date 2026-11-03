/**
 * Internetdan rasm topish: sof yordamchilar (litsenziya yorlig'i, muallif qatori, xavfsiz havola, qidiruv so'zi, tanlov obyekti).
 * `node --test` bilan tekshiriladi.
 */
import type { ImageChoice, ImagePickResponse, ImageSearchResult, PhotoUploadResponse } from './types';

export const SEARCH_QUERY_MAX = 100;

export interface LicenseTexts {
  publicDomain: string;
  unknownAuthor: string;
}

/** Faqat http(s) havolalar o'tadi (javascript:, data: va h.k. rad etiladi). Aks holda bo'sh qator. */
export function safeHttpUrl(value: unknown): string {
  if (typeof value !== 'string') return '';
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : '';
  } catch {
    return '';
  }
}

/** `by` -> "CC BY", `by-sa` -> "CC BY-SA", `cc0` -> "CC0", `pdm` -> "Ochiq mulk". */
export function licenseLabel(code: string, texts: Pick<LicenseTexts, 'publicDomain'>): string {
  const key = String(code ?? '').trim().toLowerCase();
  if (key === 'cc0') return 'CC0';
  if (key === 'pdm') return texts.publicDomain;
  if (key === 'by' || key === 'by-sa') return `CC ${key.toUpperCase()}`;
  return key ? key.toUpperCase() : '';
}

/** "Boonlong1 · CC BY": muallif noma'lum bo'lsa shunday deyiladi. */
export function creditLine(creator: string | undefined, license: string, texts: LicenseTexts): string {
  const author = String(creator ?? '').trim() || texts.unknownAuthor;
  const label = licenseLabel(license, texts);
  return label ? `${author} · ${label}` : author;
}

/** Qidiruv so'zi: ortiqcha bo'shliqlar olinadi, uzunligi cheklanadi. Bo'sh -> ''. */
export function cleanQuery(value: string): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, SEARCH_QUERY_MAX);
}

/** Qidiruv keshi kaliti (harf registri farq qilmaydi). */
export function queryKey(value: string): string {
  return cleanQuery(value).toLowerCase();
}

/** Ko'rsatish mumkin bo'lgan natijalar: kichik ko'rinishi to'g'ri http(s) havola bo'lganlar. */
export function usableResults(results: ImageSearchResult[] | undefined): ImageSearchResult[] {
  if (!Array.isArray(results)) return [];
  return results.filter((item) => item && typeof item.id === 'string' && safeHttpUrl(item.thumb) !== '');
}

export function choiceFromPhoto(response: PhotoUploadResponse): ImageChoice {
  return {
    token: response.image_token,
    previewUrl: typeof response.preview_url === 'string' ? response.preview_url : '',
    fromInternet: false,
    credit: '',
    sourceUrl: '',
  };
}

export function choiceFromPick(
  response: ImagePickResponse,
  result: ImageSearchResult,
  texts: LicenseTexts,
): ImageChoice {
  return {
    token: response.image_token,
    previewUrl: typeof response.preview_url === 'string' ? response.preview_url : '',
    fromInternet: true,
    credit:
      typeof response.credit === 'string' && response.credit.trim()
        ? response.credit.trim()
        : creditLine(result.creator, result.license, texts),
    sourceUrl: safeHttpUrl(result.source_url),
  };
}
