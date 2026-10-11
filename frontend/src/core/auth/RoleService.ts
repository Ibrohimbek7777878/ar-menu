import type { UserRole, UserSession } from './types';

const STORAGE_KEY = 'restaurant_device_grant';

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
        this.grantRole(staffGrant, staffName || `${staffGrant.toUpperCase()} Qurilmasi`);

        // URL manzilidan ?staff_grant parametrini tozalash (foydalanuvchi ko'ziga ko'rinmasligi uchun)
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
   * Joriy rolni olish (Default: 'guest')
   */
  public getCurrentRole(): UserRole {
    return this.getSession().role;
  }

  /**
   * Admin tomonidan xodim qurilmasiga ruxsat berish
   */
  public grantRole(role: UserRole, name = 'Xodim'): void {
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
