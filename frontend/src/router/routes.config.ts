import type { RoutePermission } from '../core/auth/types';

/**
 * Tizim yo'nalishlari va ularga ruxsat etilgan rollar konfiguratsiyasi
 */
export const APP_ROUTES: Record<string, RoutePermission> = {
  // ─── GUEST (MEHMON) SAHIFALARI ───
  '/': {
    path: '/',
    allowedRoles: ['guest', 'waiter', 'kitchen', 'hostess', 'admin'],
    redirectFallback: '/menu',
  },
  '/menu': {
    path: '/menu',
    allowedRoles: ['guest', 'waiter', 'kitchen', 'hostess', 'admin'],
    redirectFallback: '/menu',
  },
  '/ar': {
    path: '/ar',
    allowedRoles: ['guest', 'waiter', 'admin'],
    redirectFallback: '/menu',
  },
  '/cart': {
    path: '/cart',
    allowedRoles: ['guest', 'waiter', 'admin'],
    redirectFallback: '/menu',
  },
  '/checkout': {
    path: '/checkout',
    allowedRoles: ['guest', 'waiter', 'admin'],
    redirectFallback: '/menu',
  },
  '/table-select': {
    path: '/table-select',
    allowedRoles: ['guest', 'waiter', 'admin'],
    redirectFallback: '/menu',
  },
  '/call-waiter': {
    path: '/call-waiter',
    allowedRoles: ['guest', 'waiter', 'admin'],
    redirectFallback: '/menu',
  },

  // ─── OFITSIANT PANELI ───
  '/waiter': {
    path: '/waiter',
    allowedRoles: ['waiter', 'admin'],
    redirectFallback: '/menu',
  },

  // ─── OSHXONA (KDS) PANELI ───
  '/kds': {
    path: '/kds',
    allowedRoles: ['kitchen', 'admin'],
    redirectFallback: '/menu',
  },

  // ─── KUTIB OLISH (HOSTESS) PANELI ───
  '/hostess': {
    path: '/hostess',
    allowedRoles: ['hostess', 'admin'],
    redirectFallback: '/menu',
  },

  // ─── MOLIYA VA KASSA PANELI ───
  '/finance': {
    path: '/finance',
    allowedRoles: ['admin'],
    redirectFallback: '/menu',
  },

  // ─── ASOSIY ADMIN PANELI ───
  '/admin': {
    path: '/admin',
    allowedRoles: ['admin'],
    redirectFallback: '/menu',
  },
};
