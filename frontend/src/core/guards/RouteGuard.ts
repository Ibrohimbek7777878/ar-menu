import { roleService } from '../auth/RoleService';
import { SubdomainService } from '../routing/SubdomainService';

export interface GuardCheckResult {
  allowed: boolean;
  redirectTo?: string;
  reason?: string;
}

/**
 * RouteGuard - Har qanday sahifaga o'tishdan oldin rolni tekshiruvchi sof Middleware.
 * PIN-kodsiz — Subdomen yoki to'g'ridan-to'g'ri ruxsat berish asosida ishlaydi.
 */
export class RouteGuard {
  public static canActivate(targetPath: string): GuardCheckResult {
    const cleanPath = targetPath.split('?')[0].split('#')[0] || '/';
    const subInfo = SubdomainService.getSubdomainInfo();

    // 1. Agar xodimlar subdomeni orqali kirilgan bo'lsa (masalan: admin.domain.uz)
    if (subInfo.isStaffDomain) {
      if (subInfo.detectedRole === 'admin') {
        return { allowed: true };
      }
      if (subInfo.detectedRole === 'kitchen' && (cleanPath.startsWith('/kds') || cleanPath.startsWith('/kitchen'))) {
        return { allowed: true };
      }
      if (subInfo.detectedRole === 'waiter' && (cleanPath.startsWith('/waiter') || cleanPath.startsWith('/ofitsiant'))) {
        return { allowed: true };
      }
      if (subInfo.detectedRole === 'hostess' && (cleanPath.startsWith('/hostess') || cleanPath.startsWith('/arrival'))) {
        return { allowed: true };
      }
    }

    // 2. ADMIN VA MOLIYA PANELI (/admin, /finance)
    if (cleanPath.startsWith('/admin') || cleanPath.startsWith('/finance')) {
      // PIN-kod olib tashlangan: To'g'ridan-to'g'ri admin ruxsati beriladi
      roleService.grantRole('admin', 'Admin');
      return { allowed: true };
    }

    // 3. OSHXONA KDS PANELI (/kds, /kitchen)
    if (cleanPath.startsWith('/kds') || cleanPath.startsWith('/kitchen')) {
      roleService.grantRole('kitchen', 'Oshpaz');
      return { allowed: true };
    }

    // 4. OFITSIANT PANELI (/waiter, /ofitsiant)
    if (cleanPath.startsWith('/waiter') || cleanPath.startsWith('/ofitsiant')) {
      roleService.grantRole('waiter', 'Ofitsiant');
      return { allowed: true };
    }

    // 5. KUTIB OLISH (HOSTESS) PANELI (/hostess, /arrival)
    if (cleanPath.startsWith('/hostess') || cleanPath.startsWith('/arrival')) {
      roleService.grantRole('hostess', 'Hostess');
      return { allowed: true };
    }

    // 6. ODDIY MEHMON (GUEST) VA BARCHA UCHUN OCHIQ BO'LGAN SAHIFALAR
    // (/menu, /ar, /cart, /checkout, /orders, /table, /)
    return { allowed: true };
  }
}
