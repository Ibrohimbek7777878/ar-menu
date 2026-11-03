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
  /** Admin paneldan sozlanadigan ish qiymatlari (xodim sessiyasida) */
  config?: { kds_warn_minutes?: number; kds_late_minutes?: number };
}

declare global {
  interface Window {
    __GULISTON_SESSION__?: ServerSession;
  }
}
