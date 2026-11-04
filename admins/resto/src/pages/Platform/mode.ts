/**
 * Platforma rejimi: SOF mantiq (hech narsa import qilmaydi) — `node --test` bilan sinaladi.
 *
 * Sessiya API javobida (`/api/restaurant/admin/v1/session/`) ikki yangi maydon bor: `is_platform_admin` (foydalanuvchi platforma
 * administratori) va `platform_host` (so'rov platforma hostiga, ya'ni mijoz subdomeniga emas, kelgan). "Mijozlar" bo'limi va
 * platforma rejimi (yon menyuda FAQAT shu bo'lim) ikkalasi `true` bo'lgandagina yoqiladi. Maydonlar `SessionData` turida e'lon
 * qilinmagan (admins/shared tegilmagan), shuning uchun sessiya `unknown` sifatida o'qiladi.
 */

export interface PlatformFlags {
  is_platform_admin: boolean;
  platform_host: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function platformFlags(session: unknown): PlatformFlags {
  const raw = isRecord(session) ? session : {};
  return { is_platform_admin: raw.is_platform_admin === true, platform_host: raw.platform_host === true };
}

/** Platforma rejimi: platforma administratori + platforma hosti. Faqat qat'iy `true` (matn "true", 1 va h.k. emas). */
export function isPlatformMode(session: unknown): boolean {
  const flags = platformFlags(session);
  return flags.is_platform_admin && flags.platform_host;
}

/** Platforma hostida ochiq yo'llar (marshrut `path` ning birinchi bo'lagi). Qolgan HAMMA yo'l restoran doirasida: u "asosiy restoran"ga yozadi. */
export const PLATFORM_ROUTE_PATHS: readonly string[] = ['clients'];

export type RouteAccess = 'allow' | 'redirect_clients';

/**
 * Marshrutga kirish qarori (yo'l o'chirilmaydi, faqat platforma rejimida yopiladi): platforma rejimida `PLATFORM_ROUTE_PATHS` dan
 * tashqari hamma marshrut ("" bosh sahifa ham) "Mijozlar"ga yo'naltiriladi; mijoz hostida yoki platforma administratori bo'lmaganda
 * hech narsa o'zgarmaydi (`allow`). Qaror marshrutning o'z yo'liga qarab olinadi (URL harfi/oxiridagi slesh ahamiyatsiz).
 */
export function platformRouteAccess(routePath: string, session: unknown): RouteAccess {
  if (!isPlatformMode(session)) return 'allow';
  const head = routePath.trim().replace(/^\/+/, '').split('/')[0].toLowerCase();
  return PLATFORM_ROUTE_PATHS.includes(head) ? 'allow' : 'redirect_clients';
}
