/**
 * Rollar va Huquqlar (RBAC) - Tizim rollari ta'rifi
 */

export type UserRole = 'guest' | 'waiter' | 'kitchen' | 'hostess' | 'admin';

export interface RoutePermission {
  path: string;
  allowedRoles: UserRole[];
  redirectFallback: string;
}

export interface UserSession {
  role: UserRole;
  name: string;
  tableNumber?: string | number;
  isAuthenticatedStaff: boolean;
  /** Server bergan panel rollari (ofitsiant hozircha oshxona va hostess ekranlarini ham qoplaydi). */
  roles?: UserRole[];
}

/** Bo'limlar (modullar) kalitlari: restoran egasi /ra/ -> Brend orqali yoqadi/o'chiradi (o'chirilmaydi — yashiriladi). */
export type BrandModuleKey = 'menu' | 'ar360' | 'booking' | 'tour' | 'orders' | 'waiter_call';
/** Atamalar kalitlari (biznes turi shabloni): stol/zal, mehmon/mijoz, restoran/kafe/to'yxona. */
export type BrandTermKey = 'table' | 'guest' | 'venue';

/**
 * Restoran brendi (server: `ServerSession.brand`, /ra/ -> Brend). Hamma maydon ixtiyoriy: yo'q yoki noto'g'ri qiymat
 * mehmon ilovasida standartga tushadi (`utils/brand.ts` tekshiradi). Kalit yo'q bo'lsa — hozirgi ko'rinish aynan saqlanadi.
 */
export interface Brand {
  name?: string;
  tagline?: string;
  logo_url?: string | null;
  favicon_url?: string | null;
  /** Server `<html data-palette>` ni o'zi yozadi; `custom` da `<style id="brand-vars">` FAQAT brend tokenlarini beradi (neytrallar frontendniki) */
  palette?: 'classic' | 'orange' | 'custom';
  primary_color?: string;
  /** Sarlavha shrifti: serif — Playfair, sans — Plus Jakarta Sans, rounded — Outfit (`<html data-font>`) */
  font?: 'serif' | 'sans' | 'rounded';
  hero?: { title?: string; subtitle?: string; cta_text?: string };
  /**
   * Bosh sahifa matnining ru/en tarjimasi. Server FAQAT biznes turi shablonining standart matni ishlatilgan maydon uchun beradi
   * (egasi o'zi yozgan matn tarjima qilinmaydi; restoran shablonida umuman yo'q). Maydon bo'lmasa — o'zbekcha `hero` matni.
   */
  hero_i18n?: Partial<Record<'ru' | 'en', { title?: string; subtitle?: string }>>;
  contact?: {
    phone?: string;
    phone2?: string;
    address?: string;
    instagram?: string;
    telegram?: string;
    website?: string;
    hours_text?: string;
  };
  modules?: Partial<Record<BrandModuleKey, boolean>>;
  terms?: Partial<Record<BrandTermKey, string>>;
}

/** Django sahifaga yozadigan HAQIQIY sessiya (web/restaurant_auth.py: spa_session). */
export interface ServerSession {
  role: UserRole;
  roles: UserRole[];
  name?: string;
  demo: boolean;
  /** Mehmon sahifalari dizayni (admin sozlamasi `guest_design`): 'new' — yangi, 'classic' — eski */
  design?: 'new' | 'classic';
  /** Ranglar palitrasi (restoran sozlamasi `guest_palette`): faqat 'orange' (muqobil) bo'lganda keladi; standart — klassik (yashil + krem), kalit yo'q */
  palette?: 'orange';
  /** Fasl rangi (restoran sozlamasi `guest_season`); o'chiq bo'lsa kalit yo'q (egasi qarori: dizaynga bog'liq emas) */
  season?: 'kuz' | 'qish' | 'bahor' | 'yoz';
  /** Animatsiya darajasi (restoran sozlamasi `guest_motion`); standart `full` bo'lsa kalit yo'q */
  motion?: 'light' | 'off';
  /** Taom oynasi (restoran sozlamasi `guest_dish_sheet`); standart yoqiq bo'lsa kalit yo'q */
  dishSheet?: 'off';
  /** Kun/tun rejimi (restoran sozlamasi `guest_theme`); standart `day` bo'lsa kalit yo'q */
  theme?: 'off' | 'night' | 'auto';
  /** Yoqilgan tillar (restoran sozlamasi `guest_languages`, masalan "uz,ru"); barcha tillar yoqiq bo'lsa kalit yo'q */
  languages?: string;
  /** Restoran brendi (nom, logo, palitra, shrift, matnlar, aloqa, bo'limlar, atamalar); kalit yo'q bo'lsa — standart ko'rinish */
  brand?: Brand;
  /** Admin paneldan sozlanadigan ish qiymatlari (xodim sessiyasida) */
  config?: { kds_warn_minutes?: number; kds_late_minutes?: number };
}

declare global {
  interface Window {
    __GULISTON_SESSION__?: ServerSession;
  }
}
