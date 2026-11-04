/**
 * Brend sozlamalari mantig'i: SOF (React ham, DOM ham yo'q) — `node --test` bilan sinaladi.
 *  - server javobini xavfsiz shaklga keltirish (`normalizeBrand`): yetishmagan kalit standart bilan to'ldiriladi;
 *  - PATCH tanasi: FAQAT o'zgargan kalitlar (`buildPatch`), o'zgarishlar ro'yxati (nechta o'zgarish bor);
 *  - saqlashdan oldingi mijoz tekshiruvi (`validateBrand`) — faqat yordam, haqiqiy qaror serverda.
 */
import data from './brandData.json' with { type: 'json' };
import { darkenToReadable, normalizeHex } from './colors.ts';
import { BUSINESS_TYPES, CONTACT_KEYS, FONT_KEYS, HERO_KEYS, MODULE_KEYS, PALETTE_KEYS } from './types.ts';
import type { Brand, BrandContact, BrandHero, BrandPatch, BusinessType, FontKey, ModuleKey, PaletteKey } from './types.ts';

export interface PaletteColors {
  primary: string;
  accent: string;
}

/** Mehmon saytining tayyor palitralari (ma'lumot: brandData.json) */
export const PRESET_COLORS: Record<'classic' | 'orange', PaletteColors> = data.palettes;

/** Tayyor 8 ta rang (ma'lumot: brandData.json) */
export const SWATCHES: readonly { id: string; hex: string }[] = data.swatches;

/**
 * Maydon uzunligi chegaralari (belgi). SERVER bilan AYNAN bir xil (backend/shops/brand.py): server uzunlikni bo'shliqlar yig'ilgandan
 * keyin, kod nuqtalari bo'yicha sanaydi. Chegara o'zgarsa avval serverda o'zgaradi, so'ng shu yerda (test: brandModel.test.ts).
 */
export const LIMITS = {
  /** NAME_MAX. Server o'zgarmagan (yuborilmagan) uzun eski nomni tekshirmaydi — mijoz ham (`validateBrand(draft, saved)`) */
  name: 60,
  /** TAGLINE_MAX */
  tagline: 120,
  /** HERO_LIMITS: title / subtitle / cta_text */
  heroTitle: 80,
  heroSubtitle: 240,
  ctaText: 40,
  /** parse_phone: `_text(…, 20)` (phone va phone2; Shop.phone ustuni) */
  phone: 20,
  /** ADDRESS_MAX */
  address: 300,
  /** URL_MAX: Instagram/Telegram uchun KIRITILGAN matn ("@nom", "nom" yoki havola); saqlanadigan kanonik havola ancha qisqa */
  social: 200,
  /** WEBSITE_MAX: mehmon ilovasi havolani 120 belgida kesadi */
  website: 120,
  /** HOURS_TEXT_MAX */
  hours: 160,
} as const;

/** Ichma-ich maydon yo'li ("hero.title") -> uzunlik chegarasi */
export const FIELD_LIMITS: Record<string, number> = {
  name: LIMITS.name,
  tagline: LIMITS.tagline,
  'hero.title': LIMITS.heroTitle,
  'hero.subtitle': LIMITS.heroSubtitle,
  'hero.cta_text': LIMITS.ctaText,
  'contact.phone': LIMITS.phone,
  'contact.phone2': LIMITS.phone,
  'contact.address': LIMITS.address,
  'contact.instagram': LIMITS.social,
  'contact.telegram': LIMITS.social,
  'contact.website': LIMITS.website,
  'contact.hours_text': LIMITS.hours,
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const str = (value: unknown): string => (typeof value === 'string' ? value : '');
const oneOf = <T extends string>(value: unknown, list: readonly T[], fallback: T): T => (typeof value === 'string' && (list as readonly string[]).includes(value) ? (value as T) : fallback);
const length = (text: string): number => Array.from(text).length;
/** Server matnni shunday tozalaydi: ketma-ket bo'shliqlar bitta, chetlari olib tashlanadi (uzunlik shundan keyin sanaladi) */
const collapse = (text: string): string => text.split(/\s+/).filter(Boolean).join(' ');

/** Rasm manzili: faqat http(s) yoki saytning o'z yo'li ("/media/..."). `javascript:` va boshqalar rad etiladi. */
export function safeImageUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const url = value.trim();
  if (!url) return null;
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? url : null;
  } catch {
    return null;
  }
}

export function defaultBrand(): Brand {
  return {
    name: '',
    tagline: '',
    logo_url: null,
    favicon_url: null,
    palette: 'classic',
    primary_color: PRESET_COLORS.classic.primary,
    accent_color: PRESET_COLORS.classic.accent,
    adjusted: false,
    adjusted_from: null,
    font: 'serif',
    hero: { title: '', subtitle: '', cta_text: '' },
    contact: { phone: '', phone2: '', address: '', instagram: '', telegram: '', website: '', hours_text: '' },
    modules: { menu: true, ar360: true, booking: true, tour: true, orders: true, waiter_call: true },
    business_type: 'restaurant',
    terms: {},
  };
}

/** Server javobini (har qanday ko'rinishda kelishi mumkin) to'liq `Brand` ga keltiradi. */
export function normalizeBrand(raw: unknown): Brand {
  const base = defaultBrand();
  if (!isRecord(raw)) return base;

  const palette = oneOf<PaletteKey>(raw.palette, PALETTE_KEYS, base.palette);
  const presetColors = palette === 'custom' ? PRESET_COLORS.classic : PRESET_COLORS[palette];
  const hero = isRecord(raw.hero) ? raw.hero : {};
  const contact = isRecord(raw.contact) ? raw.contact : {};
  const modules = isRecord(raw.modules) ? raw.modules : {};
  const terms: Record<string, string> = {};
  if (isRecord(raw.terms)) for (const [key, value] of Object.entries(raw.terms)) if (typeof value === 'string') terms[key] = value;

  return {
    name: str(raw.name),
    tagline: str(raw.tagline),
    logo_url: safeImageUrl(raw.logo_url),
    favicon_url: safeImageUrl(raw.favicon_url),
    palette,
    primary_color: normalizeHex(raw.primary_color, false) ?? presetColors.primary,
    accent_color: normalizeHex(raw.accent_color, false) ?? presetColors.accent,
    adjusted: raw.adjusted === true,
    adjusted_from: normalizeHex(raw.adjusted_from, false),
    font: oneOf<FontKey>(raw.font, FONT_KEYS, base.font),
    hero: Object.fromEntries(HERO_KEYS.map((key) => [key, str(hero[key])])) as unknown as BrandHero,
    contact: Object.fromEntries(CONTACT_KEYS.map((key) => [key, str(contact[key])])) as unknown as BrandContact,
    modules: Object.fromEntries(MODULE_KEYS.map((key) => [key, typeof modules[key] === 'boolean' ? modules[key] : true])) as Record<ModuleKey, boolean>,
    business_type: oneOf<BusinessType>(raw.business_type, BUSINESS_TYPES, base.business_type),
    terms,
  };
}

/** Javob `{brand: {...}}` yoki to'g'ridan-to'g'ri brend bo'lishi mumkin; brend topilmasa `null` */
export function brandFromResponse(raw: unknown): Brand | null {
  if (!isRecord(raw)) return null;
  if (isRecord(raw.brand)) return normalizeBrand(raw.brand);
  if ('palette' in raw && 'modules' in raw) return normalizeBrand(raw);
  return null;
}

// ─── Farq (PATCH) ───

const same = (a: string, b: string): boolean => a.trim() === b.trim();

/** Rang taqqoslash: yaroqli bo'lsa kodlar normallashgan holda, aks holda yozilgan matn bilan */
const sameColor = (a: string, b: string): boolean => (normalizeHex(a, false) ?? a.trim().toUpperCase()) === (normalizeHex(b, false) ?? b.trim().toUpperCase());

export interface BrandDiff {
  /** Serverga yuboriladigan tana (`{brand: patch}`): faqat o'zgargan kalitlar */
  patch: BrandPatch;
  /** Foydalanuvchi ko'radigan o'zgarishlar yo'llari ("name", "hero.title", "modules.booking" ...) */
  paths: string[];
}

/**
 * `saved` (server) va `draft` (tahrir) farqi. Qoidalar:
 *  - matnlar kesib solishtiriladi (faqat bo'sh joy farqi o'zgarish emas);
 *  - rang kodlari FAQAT `custom` palitrada yuboriladi (tayyor palitrada rangni server palitradan oladi);
 *  - `custom` ga yangi o'tilganda ikki rang ham yuboriladi (server ularni bilsin), lekin bu bitta o'zgarish sanaladi;
 *  - rasmlar, atamalar, biznes turi va `adjusted*` bu yerda YO'Q: ular alohida so'rovlar bilan o'zgaradi.
 */
export function buildPatch(saved: Brand, draft: Brand): BrandDiff {
  const patch: Record<string, unknown> = {};
  const paths: string[] = [];

  if (!same(saved.name, draft.name)) {
    patch.name = draft.name.trim();
    paths.push('name');
  }
  if (!same(saved.tagline, draft.tagline)) {
    patch.tagline = draft.tagline.trim();
    paths.push('tagline');
  }
  if (saved.font !== draft.font) {
    patch.font = draft.font;
    paths.push('font');
  }

  const paletteChanged = saved.palette !== draft.palette;
  if (paletteChanged) {
    patch.palette = draft.palette;
    paths.push('palette');
  }
  if (draft.palette === 'custom') {
    for (const key of ['primary_color', 'accent_color'] as const) {
      const color = normalizeHex(draft[key], false);
      const colorChanged = !sameColor(saved[key], draft[key]);
      // Yozilayotgan (hali to'liq emas) rang o'zgarish sanaladi (tugma faol, xato ko'rinadi), lekin serverga YUBORILMAYDI
      if (color && (colorChanged || paletteChanged)) patch[key] = color;
      if (colorChanged) paths.push(key);
    }
  }

  const group = (name: 'hero' | 'contact', keys: readonly string[]) => {
    const a = saved[name] as unknown as Record<string, string>;
    const b = draft[name] as unknown as Record<string, string>;
    const changed: Record<string, string> = {};
    for (const key of keys) {
      if (!same(a[key], b[key])) {
        changed[key] = b[key].trim();
        paths.push(`${name}.${key}`);
      }
    }
    if (Object.keys(changed).length > 0) patch[name] = changed;
  };
  group('hero', HERO_KEYS);
  group('contact', CONTACT_KEYS);

  const changedModules: Record<string, boolean> = {};
  for (const key of MODULE_KEYS) {
    if (saved.modules[key] !== draft.modules[key]) {
      changedModules[key] = draft.modules[key];
      paths.push(`modules.${key}`);
    }
  }
  if (Object.keys(changedModules).length > 0) patch.modules = changedModules;

  return { patch, paths };
}

// ─── Tekshiruv ───

export type IssueCode = 'too_long' | 'bad_color' | 'bad_phone' | 'bad_website' | 'insecure_website';

export interface BrandIssue {
  /** "name", "hero.title", "primary_color" ... */
  path: string;
  code: IssueCode;
  /** `too_long` uchun chegara */
  max?: number;
}

/** Server (`_PHONE_RE`): ixtiyoriy '+', raqam bilan boshlanadi, keyin raqam/bo'shliq/qavs/defis; jami 20 belgigacha */
const PHONE = /^\+?\d[\d ()-]{3,19}$/;

function looksLikePhone(text: string): boolean {
  if (!PHONE.test(text)) return false;
  const digits = text.replace(/\D/g, '').length;
  return digits >= 7 && digits <= 15;
}

/** Server (`_URL_CHARS_RE`): faqat ASCII URL belgilari (kirill/IDN domen "xn--" ko'rinishida yoziladi); bo'shliq, qo'shtirnoq, <>[]{} yo'q */
const URL_CHARS = /^[A-Za-z0-9\-._~:/?#@!$&()*+,;=%]+$/;
/** Server (`_HOST_RE`): kamida bitta nuqta, har bo'lak 1-63 belgi (harf/raqam/defis, chetida defis yo'q), oxirgi bo'lak 2-24 harf */
const HOST = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;

/** Matn `http://` bilan boshlanadimi (server buni alohida xabar bilan rad etadi) */
export const isInsecureWebsite = (text: string): boolean => /^http:\/\//i.test(text.trim());

/**
 * Sayt manzili. SERVER (`backend/shops/brand.py: _website`) qoidalari bilan bir xil — ONGLI o'zgartirish: avval `http://` ham
 * qabul qilinardi, serverda esa 400 qaytardi. Endi faqat `https://...` yoki sxemasiz domen ("nom.uz", "www.nom.uz/menu") yaroqli
 * (server sxemasiz matnga o'zi `https://` qo'shadi). Rad etiladi: `http://` va boshqa sxemalar, port ("nom.uz:8080"), kirish ma'lumoti
 * ("user@nom.uz"), bo'shliq, ASCII bo'lmagan belgilar, nuqtasiz yoki 1 harfli domen oxiri ("localhost", "nom.u").
 */
export function looksLikeWebsite(text: string): boolean {
  const value = text.trim();
  if (!value || isInsecureWebsite(value)) return false;
  const candidate = value.includes('://') ? value : `https://${value}`;
  if (!URL_CHARS.test(candidate)) return false;
  const match = /^([A-Za-z][A-Za-z0-9+.-]*):\/\/([^/?#]*)/.exec(candidate);
  if (!match || match[1].toLowerCase() !== 'https') return false;
  return HOST.test(match[2].toLowerCase());          // '@' va ':' (kirish ma'lumoti, port) domen belgilari emas -> rad etiladi
}

/** Maydon yo'li ("name", "hero.title", "contact.phone") bo'yicha matn */
function readText(brand: Brand, path: string): string {
  const [head, tail] = path.split('.');
  const value = tail ? (brand[head as 'hero' | 'contact'] as unknown as Record<string, string>)[tail] : (brand as unknown as Record<string, string>)[head];
  return typeof value === 'string' ? value : '';
}

/**
 * Saqlashdan oldingi tekshiruv. `saved` berilsa, matn maydonlari FAQAT o'zgargan bo'lsa tekshiriladi: server ham faqat yuborilgan
 * (o'zgargan) maydonni tekshiradi (`buildPatch`), shuning uchun eski, hozirgi chegaradan uzun qiymat (masalan 32 belgili telefon)
 * boshqa maydonni saqlashga xalaqit bermasin.
 */
export function validateBrand(draft: Brand, saved?: Brand | null): BrandIssue[] {
  const issues: BrandIssue[] = [];
  const touched = (path: string): boolean => !saved || !same(readText(saved, path), readText(draft, path));
  for (const [path, max] of Object.entries(FIELD_LIMITS)) {
    if (touched(path) && length(collapse(readText(draft, path))) > max) issues.push({ path, code: 'too_long', max });
  }
  if (draft.palette === 'custom') {
    if (!normalizeHex(draft.primary_color, false)) issues.push({ path: 'primary_color', code: 'bad_color' });
    if (!normalizeHex(draft.accent_color, false)) issues.push({ path: 'accent_color', code: 'bad_color' });
  }
  for (const path of ['contact.phone', 'contact.phone2']) {
    const phone = collapse(readText(draft, path));
    if (touched(path) && phone && !looksLikePhone(phone)) issues.push({ path, code: 'bad_phone' });
  }
  const website = readText(draft, 'contact.website').trim();
  if (touched('contact.website') && website && !looksLikeWebsite(website)) {
    issues.push({ path: 'contact.website', code: isInsecureWebsite(website) ? 'insecure_website' : 'bad_website' });
  }
  return issues;
}

/** Server `field` yo'lidan "brand." prefiksini oladi ("brand.hero.title" -> "hero.title") */
export function stripBrandPrefix(field: string): string {
  return String(field ?? '').trim().replace(/^brand\./, '');
}

// ─── Tezkor amallar ───

/** Tahrirdagi nusxada yo'l bo'yicha matnni o'zgartiradi (o'zgarmas: yangi obyekt qaytaradi) */
export function setText(draft: Brand, path: string, value: string): Brand {
  const [head, tail] = path.split('.');
  if (!tail) return { ...draft, [head]: value };
  if (head === 'hero' || head === 'contact') return { ...draft, [head]: { ...draft[head], [tail]: value } };
  return draft;
}

export function setModule(draft: Brand, key: ModuleKey, on: boolean): Brand {
  return { ...draft, modules: { ...draft.modules, [key]: on } };
}

/**
 * "Shablonni qo'llash" serverda darrov saqlanadi va faqat biznes turi, atamalar va bo'limlarni o'zgartiradi.
 * Foydalanuvchining saqlanmagan boshqa tahrirlari (nom, rang, matnlar ...) yo'qolmasin: ular qoladi.
 */
export function mergePresetResult(draft: Brand, applied: Brand): Brand {
  return { ...draft, business_type: applied.business_type, terms: applied.terms, modules: applied.modules };
}

/** Maket (oldindan ko'rish) uchun amaldagi ranglar */
export function effectiveColors(draft: Brand, saved: Brand | null): PaletteColors {
  if (draft.palette === 'custom') {
    return {
      primary: normalizeHex(draft.primary_color, false) ?? saved?.primary_color ?? PRESET_COLORS.classic.primary,
      accent: normalizeHex(draft.accent_color, false) ?? saved?.accent_color ?? PRESET_COLORS.classic.accent,
    };
  }
  // Tayyor palitra serverda ham shu: saqlangan bo'lsa serverning o'z qiymati (BR1 aniqlashtirgan bo'lishi mumkin)
  if (saved && saved.palette === draft.palette) return { primary: saved.primary_color, accent: saved.accent_color };
  return PRESET_COLORS[draft.palette];
}

/**
 * Maket uchun ranglar: "O'z rangingiz"da asosiy rang o'qilishi uchun to'qlashtiriladi (server ham shunday qiladi; hisob taxminiy),
 * tayyor palitralarda o'zgarishsiz.
 */
export function previewColors(draft: Brand, saved: Brand | null): PaletteColors {
  const colors = effectiveColors(draft, saved);
  if (draft.palette !== 'custom') return colors;
  return { primary: darkenToReadable(colors.primary) ?? colors.primary, accent: colors.accent };
}
