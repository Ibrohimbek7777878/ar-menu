import type { UserRole, UserSession } from './types';

const STORAGE_KEY = 'restaurant_user_session';

class RoleService {
  private defaultSession: UserSession = {
    role: 'guest',
    name: 'Mehmon',
    isAuthenticatedStaff: false,
  };

  /**
   * Joriy foydalanuvchi sessiyasini olish
   */
  public getSession(): UserSession {
    if (typeof window === 'undefined') return this.defaultSession;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // JSON parse error
    }
    return this.defaultSession;
  }

  /**
   * Joriy rolni olish
   */
  public getCurrentRole(): UserRole {
    return this.getSession().role;
  }

  /**
   * Xodim sifatida tizimga kirish (Rolni yangilash)
   */
  public loginAsStaff(role: UserRole, name: string): void {
    const session: UserSession = {
      role,
      name,
      isAuthenticatedStaff: true,
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }
  }

  /**
   * Xodimlar profilidan chiqish va oddiy mehmon holatiga qaytish
   */
  public logoutToGuest(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  /**
   * Foydalanuvchi ma'lum bir sahifaga kirish huquqiga egami?
   */
  public hasAccess(allowedRoles: UserRole[]): boolean {
    const currentRole = this.getCurrentRole();
    return allowedRoles.includes(currentRole);
  }
}

export const roleService = new RoleService();
