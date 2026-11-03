/**
 * Taom saqlanganda rasm serverga qanday yuboriladi. Sof funksiyalar: `node --test` bilan tekshiriladi.
 *
 *  - internetdan tanlangan rasm: faqat `image_token` (server o'zi yuklab olgan);
 *  - egasining surati: server rasmni o'qishda saqlagan bo'lsa `image_token` (qayta yuklash yo'q), bo'lmasa fayl o'zi;
 *  - hozirgi (saqlangan) rasm yoki rasm yo'q: hech narsa yuborilmaydi.
 * Token bilan yuborilganda fayl ZAXIRA sifatida qoladi: token muddati (2 soat) tugagan bo'lsa fayl bilan qayta uriniladi.
 */
import type { DishImage } from './types';

export interface ImagePayload {
  token: string | null;
  file: File | null;
  /** Token yaroqsiz chiqsa yuboriladigan fayl. */
  fallbackFile: File | null;
}

export function imagePayload(image: DishImage): ImagePayload {
  if (image.kind === 'internet') return { token: image.token, file: null, fallbackFile: null };
  if (image.kind === 'file') {
    return image.token
      ? { token: image.token, file: null, fallbackFile: image.file }
      : { token: null, file: image.file, fallbackFile: null };
  }
  return { token: null, file: null, fallbackFile: null };
}

/** Egasi yangi rasm tanlagan (saqlanganda yuboriladi). */
export function hasNewImage(image: DishImage): boolean {
  return image.kind === 'file' || image.kind === 'internet';
}

/** Ko'rsatiladigan rasm bor (hozirgi yoki yangi). */
export function hasAnyImage(image: DishImage): boolean {
  return image.kind !== 'none';
}
