import type { UserRole } from '../auth/types';

export interface SubdomainInfo {
  subdomain: string | null;
  detectedRole: UserRole | null;
  defaultPath: string | null;
  isStaffDomain: boolean;
}

/**
 * SubdomainService - URL domenini tahlil qilib, xodimlar subdomeni yoki mijoz domenini aniqlaydi.
 * Masalan:
 * - admin.domain.uz yoki admin.localhost -> role: 'admin', path: '/admin'
 * - kds.domain.uz yoki kitchen.domain.uz -> role: 'kitchen', path: '/kds'
 * - waiter.domain.uz yoki ofitsiant.domain.uz -> role: 'waiter', path: '/waiter'
 * - hostess.domain.uz -> role: 'hostess', path: '/hostess'
 */
export class SubdomainService {
  public static getSubdomainInfo(): SubdomainInfo {
    if (typeof window === 'undefined') {
      return { subdomain: null, detectedRole: null, defaultPath: null, isStaffDomain: false };
    }

    try {
      const hostname = window.location.hostname.toLowerCase();
      const parts = hostname.split('.');

      // localhost yoki IP manzillar (masalan: admin.localhost)
      let sub: string | null = null;
      if (parts.length > 1) {
        const firstPart = parts[0];
        if (firstPart !== 'www' && firstPart !== 'menu') {
          sub = firstPart;
        }
      }

      if (sub === 'admin') {
        return {
          subdomain: 'admin',
          detectedRole: 'admin',
          defaultPath: '/admin',
          isStaffDomain: true,
        };
      }

      if (sub === 'kds' || sub === 'kitchen' || sub === 'oshxona') {
        return {
          subdomain: sub,
          detectedRole: 'kitchen',
          defaultPath: '/kds',
          isStaffDomain: true,
        };
      }

      if (sub === 'waiter' || sub === 'ofitsiant') {
        return {
          subdomain: sub,
          detectedRole: 'waiter',
          defaultPath: '/waiter',
          isStaffDomain: true,
        };
      }

      if (sub === 'hostess' || sub === 'arrival') {
        return {
          subdomain: sub,
          detectedRole: 'hostess',
          defaultPath: '/hostess',
          isStaffDomain: true,
        };
      }

      return {
        subdomain: sub,
        detectedRole: null,
        defaultPath: null,
        isStaffDomain: false,
      };
    } catch {
      return { subdomain: null, detectedRole: null, defaultPath: null, isStaffDomain: false };
    }
  }
}
