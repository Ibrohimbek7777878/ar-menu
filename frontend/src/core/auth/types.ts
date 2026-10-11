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
}
