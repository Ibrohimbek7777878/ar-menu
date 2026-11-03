/**
 * `access.ts` mantiqining brauzerga bog'langan qismlari: nusxa olish zaxirasi va tizim ulashishi.
 * Sinov uchun ahamiyatli mantiq `access.ts` da; bu yerda faqat DOM/navigator chaqiruvlari.
 */
import type { CopyEnv } from './access';

/** Eski usul: yashirin matn maydoni + `execCommand('copy')`. `navigator.clipboard` yo'q sahifalarda (http, eski telefon) ishlaydi. */
function legacyCopy(text: string): boolean {
  if (typeof document === 'undefined') return false;
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.setAttribute('aria-hidden', 'true');
  // 16px: iOS Safari fokusda sahifani kattalashtirib yubormasligi uchun; ekrandan tashqarida, ko'rinmaydi
  area.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0;font-size:16px;';
  document.body.appendChild(area);
  try {
    area.focus();
    area.select();
    area.setSelectionRange(0, text.length);
    return document.execCommand('copy');
  } finally {
    document.body.removeChild(area);
  }
}

export function browserCopyEnv(): CopyEnv {
  const clip = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
  return {
    writeText: clip && typeof clip.writeText === 'function' ? (text) => clip.writeText(text) : null,
    legacyCopy,
  };
}

export function canNativeShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

/** Tizim ulashish oynasini ochadi. Foydalanuvchi yopib qo'ysa (AbortError) — xato emas, `false`. */
export async function nativeShare(title: string, text: string): Promise<boolean> {
  try {
    await navigator.share({ title, text });
    return true;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return false;
    throw err;
  }
}

export function openExternal(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}
