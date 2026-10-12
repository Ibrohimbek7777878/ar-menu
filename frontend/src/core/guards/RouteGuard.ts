import { roleService } from '../auth/RoleService';
import { SubdomainService } from '../routing/SubdomainService';
import type { UserRole } from '../auth/types';

export interface GuardCheckResult {
  allowed: boolean;
  redirectTo?: string;
  reason?: string;
}

/**
 * RouteGuard - Har qanday sahifaga o'tishdan oldin rolni tekshiruvchi sof Middleware.
 * Qat'iy RBAC: Ofitsiant faqat ofitsiant sahifalarini ko'radi, Adminga kira olmaydi.
 * Xuddi shunday Oshxona va Hostess ham faqat o'z bo'limida ishlaydi.
 */
export class RouteGuard {
  public static canActivate(targetPath: string): GuardCheckResult {
    const cleanPath = targetPath.split('?')[0].split('#')[0] || '/';
    const subInfo = SubdomainService.getSubdomainInfo();
    const currentRole: UserRole = roleService.getCurrentRole();

    // ─── 1. SUBDOMEN ASOSIDA AVTOMATIK RUXSAT VA HIMOYALASH ───
    if (subInfo.isStaffDomain && subInfo.detectedRole) {
      // Agar subdomen roli maqsadli sahifaga mos bo'lsa
      if (subInfo.detectedRole === 'admin') {
        return { allowed: true };
      }
      if (subInfo.detectedRole === 'kitchen') {
        if (cleanPath.includes('/kitchen') || cleanPath.includes('/kds') || this.isCustomerRoute(cleanPath)) {
          return { allowed: true };
        }
        return { allowed: false, redirectTo: '/menu/kitchen', reason: 'Oshxona faqat buyurtmalar monitoriga kirishi mumkin.' };
      }
      if (subInfo.detectedRole === 'waiter') {
        if (cleanPath.includes('/waiter') || cleanPath.includes('/ofitsiant') || this.isCustomerRoute(cleanPath)) {
          return { allowed: true };
        }
        return { allowed: false, redirectTo: '/menu/waiter', reason: 'Ofitsiant faqat ofitsiant paneliga kirishi mumkin.' };
      }
      if (subInfo.detectedRole === 'hostess') {
        if (cleanPath.includes('/hostess') || cleanPath.includes('/arrival') || this.isCustomerRoute(cleanPath)) {
          return { allowed: true };
        }
        return { allowed: false, redirectTo: '/menu/hostess', reason: 'Hostess faqat kutib olish paneliga kirishi mumkin.' };
      }
    }

    // ─── 2. AGAR QURILMADA OFITSIANT ROLI FAOLLASHGAN BO'LSA ───
    if (currentRole === 'waiter') {
      // Admin, Moliya, Oshxona, Hostess panellariga kirish QAT'IYAN TAQIQLANADI
      if (cleanPath.includes('/admin') || cleanPath.includes('/finance') || cleanPath.includes('/kds') || cleanPath.includes('/kitchen') || cleanPath.includes('/hostess')) {
        return {
          allowed: false,
          redirectTo: '/menu/waiter',
          reason: 'Ofitsiant faqat ofitsiant paneliga kirishi mumkin. Asosiy adminga tegishli sahifalarga ruxsat yo\'q.',
        };
      }
      return { allowed: true };
    }

    // ─── 3. AGAR QURILMADA OSHXONA (KITCHEN) ROLI FAOLLASHGAN BO'LSA ───
    if (currentRole === 'kitchen') {
      // Admin, Moliya, Ofitsiant, Hostess panellariga kirish QAT'IYAN TAQIQLANADI
      if (cleanPath.includes('/admin') || cleanPath.includes('/finance') || cleanPath.includes('/waiter') || cleanPath.includes('/ofitsiant') || cleanPath.includes('/hostess')) {
        return {
          allowed: false,
          redirectTo: '/menu/kitchen',
          reason: 'Oshxona faqat oshpazlar monitori (KDS)ga kirishi mumkin.',
        };
      }
      return { allowed: true };
    }

    // ─── 4. AGAR QURILMADA HOSTESS ROLI FAOLLASHGAN BO'LSA ───
    if (currentRole === 'hostess') {
      // Admin, Moliya, Oshxona, Ofitsiant panellariga kirish QAT'IYAN TAQIQLANADI
      if (cleanPath.includes('/admin') || cleanPath.includes('/finance') || cleanPath.includes('/kds') || cleanPath.includes('/kitchen') || cleanPath.includes('/waiter')) {
        return {
          allowed: false,
          redirectTo: '/menu/hostess',
          reason: 'Hostess faqat mehmonlarni kutib olish paneliga kirishi mumkin.',
        };
      }
      return { allowed: true };
    }

    // ─── 5. AGAR QURILMADA ADMIN ROLI FAOLLASHGAN BO'LSA ───
    if (currentRole === 'admin') {
      // Admin barcha panellarga (Admin, Moliya, Oshxona, Ofitsiant, Hostess) to'liq kira oladi
      return { allowed: true };
    }

    // ─── 6. AGAR QURILMA HALI MEHMON (GUEST) HOLATIDA BO'LSA ───
    // Tegishli kirish yo'li orqali xodim roli faollashadi:
    if (cleanPath.includes('/admin')) {
      roleService.grantRole('admin', 'Admin');
      return { allowed: true };
    }
    if (cleanPath.includes('/waiter') || cleanPath.includes('/ofitsiant')) {
      roleService.grantRole('waiter', 'Ofitsiant');
      return { allowed: true };
    }
    if (cleanPath.includes('/kds') || cleanPath.includes('/kitchen')) {
      roleService.grantRole('kitchen', 'Oshpaz');
      return { allowed: true };
    }
    if (cleanPath.includes('/hostess') || cleanPath.includes('/arrival')) {
      roleService.grantRole('hostess', 'Hostess');
      return { allowed: true };
    }
    if (cleanPath.includes('/finance')) {
      // Finance faqat admin uchun
      return { allowed: false, redirectTo: '/menu/admin', reason: 'Moliya bo\'limi faqat admin uchun.' };
    }

    // Mijoz sahifalari barcha uchun ochiq
    return { allowed: true };
  }

  private static isCustomerRoute(cleanPath: string): boolean {
    return (
      cleanPath === '/' ||
      cleanPath === '/menu' ||
      cleanPath === '/menu/' ||
      cleanPath.startsWith('/ar') ||
      cleanPath.startsWith('/cart') ||
      cleanPath.startsWith('/checkout') ||
      cleanPath.startsWith('/orders') ||
      cleanPath.startsWith('/table')
    );
  }
}
