import { roleService } from '../auth/RoleService';

export interface GuardCheckResult {
  allowed: boolean;
  redirectTo?: string;
  reason?: string;
}

/**
 * RouteGuard - Har qanday sahifaga o'tishdan oldin rolni tekshiruvchi sof Middleware.
 * Parolsiz, kodsiz — faqat admin bergan qurilma ruxsati asosida ishlaydi.
 */
export class RouteGuard {
  public static canActivate(targetPath: string): GuardCheckResult {
    const cleanPath = targetPath.split('?')[0].split('#')[0] || '/';
    const currentRole = roleService.getCurrentRole();

    // 1. ADMIN VA MOLIYA PANELI (/admin, /finance)
    if (cleanPath.startsWith('/admin') || cleanPath.startsWith('/finance')) {
      if (currentRole === 'admin') {
        return { allowed: true };
      }
      return {
        allowed: false,
        redirectTo: '/menu',
        reason: 'Ushbu bo\'lim faqat restoran administratsiyasi uchun.',
      };
    }

    // 2. OSHXONA KDS PANELI (/kds, /kitchen)
    if (cleanPath.startsWith('/kds') || cleanPath.startsWith('/kitchen')) {
      if (currentRole === 'kitchen' || currentRole === 'admin') {
        return { allowed: true };
      }
      return {
        allowed: false,
        redirectTo: '/menu',
        reason: 'Oshxona monitori faqat oshpazlar uchun.',
      };
    }

    // 3. OFITSIANT PANELI (/waiter, /ofitsiant)
    if (cleanPath.startsWith('/waiter') || cleanPath.startsWith('/ofitsiant')) {
      if (currentRole === 'waiter' || currentRole === 'admin') {
        return { allowed: true };
      }
      return {
        allowed: false,
        redirectTo: '/menu',
        reason: 'Ofitsiant paneli faqat xizmat ko\'rsatuvchi xodimlar uchun.',
      };
    }

    // 4. KUTIB OLISH (HOSTESS) PANELI (/hostess, /arrival)
    if (cleanPath.startsWith('/hostess') || cleanPath.startsWith('/arrival')) {
      if (currentRole === 'hostess' || currentRole === 'admin') {
        return { allowed: true };
      }
      return {
        allowed: false,
        redirectTo: '/menu',
        reason: 'Kutib olish stoli faqat ma\'muriyat uchun.',
      };
    }

    // 5. ODDIY MEHMON (GUEST) VA BARCHA UCHUN OCHIQ BO'LGAN SAHIFALAR
    // (/menu, /ar, /cart, /checkout, /orders, /table, /)
    return { allowed: true };
  }
}
