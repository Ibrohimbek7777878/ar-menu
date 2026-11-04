/**
 * Yangi mijoz (restoran) egasiga yuboriladigan TAYYOR XABAR: SOF mantiq, hech narsa import qilmaydi (`Staff/access.ts` bilan bir xil usul:
 * tarjima funksiyasi tashqaridan beriladi). Parol xabarga faqat yaratilgan paytda tushadi (u serverda ochiq saqlanmaydi, keyin ko'rinmaydi).
 */

export type Translate = (key: string, params?: Record<string, string | number>) => string;

/** Tarjima berilmasa (testlar, o'zbekcha): kalit — o'zbekcha matnning o'zi, {nom} qiymat bilan to'ldiriladi. */
const uzbek: Translate = (key, params) => key.replace(/\{(\w+)\}/g, (match, name: string) => (params && Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match));

export interface OwnerAccess {
  /** Restoran nomi */
  name: string;
  loginUrl: string;
  username: string;
  password: string;
}

/**
 *   Salom! «{nom}» uchun boshqaruv paneli tayyor.
 *   Kirish: {havola}
 *   Login: {login}
 *   Parol: {parol}
 *   Kirgach parolni o'zingizga qulayiga almashtiring.
 */
export function buildOwnerMessage(access: OwnerAccess, tr: Translate = uzbek): string {
  const lines = [tr('Salom! «{name}» uchun boshqaruv paneli tayyor.', { name: access.name.trim() || tr('restoran') })];
  if (access.loginUrl) lines.push(tr('Kirish: {url}', { url: access.loginUrl }));
  lines.push(tr('Login: {login}', { login: access.username }));
  lines.push(tr('Parol: {password}', { password: access.password }));
  lines.push(tr("Kirgach parolni o'zingizga qulayiga almashtiring."));
  return lines.join('\n');
}
