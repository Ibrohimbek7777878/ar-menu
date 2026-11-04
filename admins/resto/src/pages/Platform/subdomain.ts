/**
 * Subdomen va ega logini: SOF mantiq (React ham, DOM ham yo'q) — `node --test` bilan sinaladi.
 *
 * Mijoz tomonidagi tekshiruv — tez va tushunarli izoh uchun. Haqiqiy qaror serverda (`check-subdomain/` va yaratish):
 * band so'zlar ro'yxati va band nomlar o'sha yerda.
 */

export const SUBDOMAIN_MIN = 3;
export const SUBDOMAIN_MAX = 40;

/**
 * Oldindan rad etiladigan band so'zlar (BR1 shartnomasi: www, app, admin, api, static, media, platform, mail, ...).
 * To'liq ro'yxat serverda; bu — jonli tekshiruvni kutmasdan darrov izoh berish uchun.
 */
export const RESERVED_SUBDOMAINS: ReadonlySet<string> = new Set(['www', 'app', 'admin', 'api', 'static', 'media', 'platform', 'mail', 'ftp', 'smtp', 'cdn', 'ns1', 'ns2']);

export type SubdomainProblem = 'empty' | 'too_short' | 'too_long' | 'edge_hyphen' | 'reserved';

/** Mijoz subdomeni yozilayotganda: kichik harf, bo'shliq/pastki chiziq -> chiziqcha, harf-raqam-chiziqchadan boshqasi tashlanadi */
export function cleanSubdomainInput(input: string): string {
  return String(input ?? '')
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, SUBDOMAIN_MAX);
}

export function validateSubdomain(value: string): SubdomainProblem | null {
  if (!value) return 'empty';
  if (value.length < SUBDOMAIN_MIN) return 'too_short';
  if (value.length > SUBDOMAIN_MAX) return 'too_long';
  if (value.startsWith('-') || value.endsWith('-')) return 'edge_hyphen';
  if (RESERVED_SUBDOMAINS.has(value)) return 'reserved';
  return null;
}

// Kirill -> lotin (rus va o'zbek kirilli)
const CYRILLIC: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p',
  р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh', ъ: '', ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya',
  ў: 'o', қ: 'q', ғ: 'g', ҳ: 'h',
};

/** "Gulistan Oshxonasi" -> "gulistan oshxonasi": kichik harf, kirill lotinga, o' va g' belgisiz, boshqa belgilar bo'shliq */
function wordsOf(name: string): string[] {
  const lower = String(name ?? '').toLowerCase();
  const withoutApostrophes = lower.replace(/([og])[ʻʼ'‘’`´]/g, '$1');
  const latin = Array.from(withoutApostrophes)
    .map((char) => (Object.hasOwn(CYRILLIC, char) ? CYRILLIC[char] : char))
    .join('')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '');
  return latin.split(/[^a-z0-9]+/).filter(Boolean);
}

/** Nomdan subdomen taklifi ("Guliston Restoran" -> "guliston-restoran"). Mos taklif chiqmasa bo'sh qator. */
export function suggestSubdomain(name: string): string {
  const slug = wordsOf(name).join('-').slice(0, SUBDOMAIN_MAX).replace(/^-+|-+$/g, '');
  return slug.length >= SUBDOMAIN_MIN ? slug : '';
}

export const OWNER_LOGIN_MIN = 3;
export const OWNER_LOGIN_MAX = 30;

/** Nomdan ega logini taklifi ("Guliston Restoran" -> "guliston_restoran"). Mos taklif chiqmasa bo'sh qator. */
export function suggestOwnerLogin(name: string): string {
  const login = wordsOf(name).join('_').slice(0, OWNER_LOGIN_MAX).replace(/^_+|_+$/g, '');
  return login.length >= OWNER_LOGIN_MIN ? login : '';
}

export type OwnerLoginProblem = 'empty' | 'too_short' | 'too_long' | 'bad_chars';

export function validateOwnerLogin(value: string): OwnerLoginProblem | null {
  const login = String(value ?? '');
  if (!login) return 'empty';
  if (login.length < OWNER_LOGIN_MIN) return 'too_short';
  if (login.length > OWNER_LOGIN_MAX) return 'too_long';
  if (!/^[A-Za-z0-9._-]+$/.test(login)) return 'bad_chars';
  return null;
}

/** Platforma domeni: hostdan port va bosh "www." / "app." olib tashlanadi ("app.menu.uz:8000" -> "menu.uz") */
export function platformDomainOf(host: string): string {
  const bare = String(host ?? '').trim().toLowerCase().replace(/:\d+$/, '');
  return bare.replace(/^(?:www|app)\./, '');
}

/** "guliston" + "menu.uz" -> "guliston.menu.uz" (subdomen bo'sh bo'lsa "mijoz") */
export function tenantHost(subdomain: string, domain: string): string {
  return `${subdomain || 'mijoz'}.${domain}`;
}
