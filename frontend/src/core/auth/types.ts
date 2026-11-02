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
  /** Fasl rangi (restoran sozlamasi `guest_season`); faqat mehmon va yangi dizaynda, o'chiq bo'lsa kalit yo'q */
  season?: 'kuz' | 'qish' | 'bahor' | 'yoz';
  /** Admin paneldan sozlanadigan ish qiymatlari (xodim sessiyasida) */
  config?: { kds_warn_minutes?: number; kds_late_minutes?: number };
}

declare global {
  interface Window {
    __GULISTON_SESSION__?: ServerSession;
  }
}
