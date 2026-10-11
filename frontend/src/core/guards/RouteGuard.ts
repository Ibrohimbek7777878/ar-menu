import { roleService } from '../auth/RoleService';
import { APP_ROUTES } from '../../router/routes.config';

export interface GuardCheckResult {
  allowed: boolean;
  redirectTo?: string;
  reason?: string;
}

/**
 * RouteGuard - Har qanday sahifaga o'tishdan oldin rolni tekshiruvchi Router Middleware
 */
export class RouteGuard {
  public static canActivate(targetPath: string): GuardCheckResult {
    // URL ning asosiy qismini olish (masalan /finance?tab=1 -> /finance)
    const basePath = targetPath.split('?')[0].split('#')[0] || '/';

    const routeConfig = APP_ROUTES[basePath];

    // Agar yo'l ro'yxatda bo'lmasa (noma'lum sahifa), ruxsat beriladi yoki /menu ga yo'naltiriladi
    if (!routeConfig) {
      return { allowed: true };
    }

    const currentRole = roleService.getCurrentRole();

    // Ruxsatni tekshirish
    if (routeConfig.allowedRoles.includes(currentRole)) {
      return { allowed: true };
    }

    // Ruxsat bo'lmaganda
    return {
      allowed: false,
      redirectTo: routeConfig.redirectFallback || '/menu',
      reason: `Sizda ushbu sahifaga (${basePath}) kirish huquqi yo'q. Faqat ${routeConfig.allowedRoles.join(', ')} kira oladi.`,
    };
  }
}
