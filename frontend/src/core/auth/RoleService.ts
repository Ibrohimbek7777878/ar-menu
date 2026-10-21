import type { UserRole, UserSession } from './types';
import { SubdomainService } from '../routing/SubdomainService';

const STORAGE_KEY = 'restaurant_device_grant';

/** Yo'l qaysi panel rolini talab qiladi (null — mehmon sahifasi). */
export function roleRequiredForPath(path: string): UserRole | null {
  const clean = path.split('?')[0].split('#')[0];
  if (clean.includes('/admin') || clean.includes('/finance')) return 'admin';
  if (clean.includes('/waiter') || clean.includes('/ofitsiant')) return 'waiter';
  if (clean.includes('/kds') || clean.includes('/kitchen')) return 'kitchen';
  if (clean.includes('/hostess') || clean.includes('/arrival')) return 'hostess';
  return null;
}

class RoleService {
  private defaultSession: UserSession = {
    role: 'guest',
    name: 'Mehmon',
    isAuthenticatedStaff: false,
  };

  constructor() {
    this.checkUrlForStaffGrant();
  }

  /**
   * Demo rejim: qurilma-ruxsatnomasi (?staff_grant=), subdomen va yo'l bo'yicha avtomatik rol — faqat shu rejimda.
   * Production'da rol faqat Django sessiyasidan keladi (window.__GULISTON_SESSION__). Vite dev server'da
   * (Django yo'q) lokal sinov uchun demo.
   */
  public isDemo(): boolean {
    if (typeof window === 'undefined') return false;
    const server = window.__GULISTON_SESSION__;
    if (server) return server.demo === true;
    return import.meta.env.DEV;
  }

  /** Server tasdiqlagan xodim sessiyasi bormi (login + parol bilan kirgan). */
  public hasServerSession(): boolean {
    const server = typeof window !== 'undefined' ? window.__GULISTON_SESSION__ : undefined;
    return !!server && server.role !== 'guest';
  }

  /**
   * Admin bergan ruxsat havolasini URL'dan jim (silent) tekshirish va sessiyani faollashtirish.
   * Masalan: ?staff_grant=waiter yoki ?staff_grant=kitchen
   */
  public checkUrlForStaffGrant(): void {
    if (typeof window === 'undefined') return;

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const staffGrant = urlParams.get('staff_grant') as UserRole | null;
      const staffName = urlParams.get('staff_name') || undefined;

      const validRoles: UserRole[] = ['waiter', 'kitchen', 'hostess', 'admin'];

      if (staffGrant && validRoles.includes(staffGrant)) {
        // grantRole production'da hech narsa bermaydi — havola orqali rol olib bo'lmaydi
        this.grantRole(staffGrant, staffName || `${staffGrant.toUpperCase()} Qurilmasi`);

        // URL manzilidan ?staff_grant parametrini tozalash
        urlParams.delete('staff_grant');
        urlParams.delete('staff_name');
        const newSearch = urlParams.toString();
        const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash;
        window.history.replaceState({}, '', newUrl);
      }
    } catch {
      // Browser environment check
    }
  }

  /**
   * Joriy qurilma / sessiya ma'lumotlarini olish
   */
  public getSession(): UserSession {
    if (typeof window === 'undefined') return this.defaultSession;

    // 0. Server tasdiqlagan sessiya (login + parol) — har doim ustun
    const server = window.__GULISTON_SESSION__;
    if (server && server.role !== 'guest') {
      return {
        role: server.role,
        roles: server.roles,
        name: server.name || server.role,
        isAuthenticatedStaff: true,
      };
    }
    if (!this.isDemo()) return this.defaultSession;

    // 1. (Demo) Agar subdomen xodimlar subdomeni bo'lsa (masalan: admin.domain.uz)
    const subInfo = SubdomainService.getSubdomainInfo();
    if (subInfo.detectedRole) {
      return {
        role: subInfo.detectedRole,
        name: `${subInfo.detectedRole.toUpperCase()} (Subdomen)`,
        isAuthenticatedStaff: true,
      };
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // JSON parse fallback
    }
    return this.defaultSession;
  }

  /**
   * Joriy rolni olish (Default: 'guest'). Bir nechta panelni qoplaydigan server roli (ofitsiant) uchun —
   * ochilayotgan yo'lga mos panel roli (masalan /kds da 'kitchen').
   */
  public getCurrentRole(path?: string): UserRole {
    const session = this.getSession();
    if (session.roles && session.roles.length > 1 && typeof window !== 'undefined') {
      const needed = roleRequiredForPath(path ?? window.location.pathname);
      if (needed && session.roles.includes(needed)) return needed;
    }
    return session.role;
  }

  /**
   * Admin yoki xodim qurilmasiga ruxsat berish (Parolsiz, PIN-kodsiz)
   */
  public grantRole(role: UserRole, name = 'Xodim'): void {
    if (!this.isDemo()) return;   // production: rol faqat server sessiyasidan
    const session: UserSession = {
      role,
      name,
      isAuthenticatedStaff: role !== 'guest',
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }
  }

  /**
   * Ruxsatni bekor qilish (Oddiy mehmon / guest holatiga qaytarish)
   */
  public revokeRole(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  /**
   * Sahifaga kirish huquqini tekshirish
   */
  public hasAccess(allowedRoles: UserRole[]): boolean {
    const currentRole = this.getCurrentRole();
    return allowedRoles.includes(currentRole);
  }

  /**
   * Admin uchun xodimga yuboriladigan to'g'ridan-to'g'ri ruxsat havolasini yaratish
   */
  public generateGrantUrl(role: UserRole, staffName?: string): string {
    if (typeof window === 'undefined') return '';
    const base = window.location.origin;
    const targetPath = role === 'waiter' ? '/waiter' : role === 'kitchen' ? '/kds' : role === 'hostess' ? '/hostess' : '/admin';
    const params = new URLSearchParams();
    params.set('staff_grant', role);
    if (staffName) params.set('staff_name', staffName);
    return `${base}${targetPath}?${params.toString()}`;
  }
}

export const roleService = new RoleService();
