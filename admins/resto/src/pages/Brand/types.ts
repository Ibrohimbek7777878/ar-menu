/**
 * Brend sozlamalari turlari (BR1 shartnomasi): `GET/PATCH /api/restaurant/admin/v1/settings/` ichidagi `brand`.
 * Bu fayl hech narsa import qilmaydi (node --test bilan sinaladigan sof modullar uni `.ts` bilan ulaydi).
 */

export type PaletteKey = 'classic' | 'orange' | 'custom';
export const PALETTE_KEYS: readonly PaletteKey[] = ['classic', 'orange', 'custom'];

export type FontKey = 'serif' | 'sans' | 'rounded';
export const FONT_KEYS: readonly FontKey[] = ['serif', 'sans', 'rounded'];

export type BusinessType = 'restaurant' | 'cafe' | 'banquet';
export const BUSINESS_TYPES: readonly BusinessType[] = ['restaurant', 'cafe', 'banquet'];

/** Mehmon saytidagi bo'limlar (modullar): ketma-ketlik sahifada ham shunday. */
export const MODULE_KEYS = ['menu', 'ar360', 'booking', 'tour', 'orders', 'waiter_call'] as const;
export type ModuleKey = (typeof MODULE_KEYS)[number];

export type ImageKind = 'logo' | 'favicon';

export interface BrandHero {
  title: string;
  subtitle: string;
  cta_text: string;
}

export interface BrandContact {
  phone: string;
  phone2: string;
  address: string;
  instagram: string;
  telegram: string;
  website: string;
  hours_text: string;
}

export const HERO_KEYS: readonly (keyof BrandHero)[] = ['title', 'subtitle', 'cta_text'];
export const CONTACT_KEYS: readonly (keyof BrandContact)[] = ['phone', 'phone2', 'address', 'instagram', 'telegram', 'website', 'hours_text'];

export interface Brand {
  name: string;
  tagline: string;
  logo_url: string | null;
  favicon_url: string | null;
  palette: PaletteKey;
  /** Maxsus palitrada: foydalanuvchi rangi (server o'qilishi uchun to'qlashtirgan bo'lishi mumkin: `adjusted`) */
  primary_color: string;
  accent_color: string;
  /** Server rangni kontrast uchun to'qlashtirdi */
  adjusted: boolean;
  /** Foydalanuvchi bergan asl rang (faqat `adjusted` bo'lsa) */
  adjusted_from: string | null;
  font: FontKey;
  hero: BrandHero;
  contact: BrandContact;
  modules: Record<ModuleKey, boolean>;
  business_type: BusinessType;
  /** Atamalar (shablon belgilaydi): `{table: 'Stol', guest: 'Mehmon', venue: 'Restoran'}` */
  terms: Record<string, string>;
}

/** PATCH tanasi: faqat o'zgargan kalitlar (ichma-ich obyektlar ham faqat o'zgargan bandlar bilan) */
export type BrandPatch = Record<string, unknown>;
