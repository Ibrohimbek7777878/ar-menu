// Admin bo'limlari va yo'l → bo'lim moslashuvi. Alohida modul: App.tsx shu yerdan oladi va butun admin sahifasini
// (KDS, moliya, ofitsiant...) mehmonning boshlang'ich JS'iga tortmaydi (TZ: R8-1).
export type AdminNavTab = 'dashboard' | 'kds' | 'waiter' | 'tables' | 'hostess' | 'finance' | 'menu' | 'ar';

export const TAB_TO_URL: Record<AdminNavTab, string> = {
  dashboard: '/menu/admin',
  kds: '/menu/kitchen',
  waiter: '/menu/waiter',
  tables: '/menu/table',
  hostess: '/menu/hostess',
  finance: '/menu/finance',
  menu: '/menu/admin/menu',
  ar: '/menu/ar',
};

export const getTabFromPath = (path: string): AdminNavTab => {
  if (path.includes('/kitchen') || path.includes('/kds')) return 'kds';
  if (path.includes('/waiter') || path.includes('/ofitsiant')) return 'waiter';
  if (path.includes('/finance')) return 'finance';
  if (path.includes('/table')) return 'tables';
  if (path.includes('/hostess') || path.includes('/arrival')) return 'hostess';
  if (path.includes('/menu/admin/menu')) return 'menu';
  if (path.includes('/ar')) return 'ar';
  return 'dashboard';
};
