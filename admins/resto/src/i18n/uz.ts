/**
 * Resto Admin restoranga xos o'zbekcha matnlar (TZ: 1.1, 1.3)
 */
export const restoUz = {
  appName: 'Resto Admin',
  dashboard: 'Boshqaruv Markazi',
  orders: 'Buyurtmalar',
  menu: 'Menyu',
  menu3d: '3D Taomlar',
  tables: 'Stollar & QR',
  staff: 'Xodimlar',
  finance: 'Moliya',
  settings: 'Sozlamalar',
  activeOrders: 'Faol buyurtmalar',
  occupiedTables: 'Band stollar',
  todayRevenue: 'Bugungi tushum',
  averageCheck: "O'rtacha chek",
  outOfStockDishes: 'Tugagan taomlar',
  topDishes: "Eng ko'p sotilgan 5 taom",
  cash: 'Naqd',
  card: 'Karta',
  soldCount: 'ta sotildi',
  refreshData: "Ma'lumotlarni yangilash",
  lastUpdated: 'Oxirgi yangilanish',

  // TZ 1.1 lug'ati: texnik so'zlar (KDS, Slug, CSV, xom rol kodi) o'rniga odam tili.
  kitchenScreen: 'Oshxona ekrani',
  roleFallback: 'Xodim',
  roles: {
    super_admin: 'Bosh administrator',
    shop_owner: 'Restoran egasi',
    shop_manager: 'Menejer',
    waiter: 'Ofitsiant',
    kitchen: 'Oshpaz',
    hostess: 'Hostess',
    cashier: 'Kassir',
  } as Record<string, string>,

  ordersPage: {
    viewReceipt: "Chekni ko'rish",
  },
  staffPage: {
    cooksCard: 'Oshpazlar',
    kitchenRoleOption: 'Oshpaz (oshxona ekrani)',
    lastLogin: 'Oxirgi kirish',
  },
  financePage: {
    exportButton: 'Excel uchun yuklab olish',
    exportHint: 'Hisobotni Excel uchun yuklab olish',
    profit: 'Foyda',
    profitHint: 'Tushum minus Xarajat',
    debtsTab: 'Qarzlar',
    subtitle: 'Kassa kirim-chiqimlari, foyda va qarzlar balansi',
  },
  settingsPage: {
    subtitle: 'Restoran profili, oshxona ekrani taymerlari va xizmat haqi parametrlari',
    menuLink: 'Menyu havolasi',
    kitchenTimersTitle: 'Oshxona ekrani taymer chegaralari',
    kitchenTimersHint:
      'Oshxona ekranida taomlar tayyorlanish vaqtiga qarab kartochka rangi sariq va qizilga aylanadi:',
  },
};

/**
 * Rol kodini (`shop_owner`, `waiter`, ...) odam tilidagi nomga aylantiradi.
 * Noma'lum yoki bo'sh rol uchun xom kod ko'rsatilmaydi: "Xodim" qaytariladi.
 */
export function roleLabel(role: string | null | undefined): string {
  if (!role) return restoUz.roleFallback;
  const key = role.trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(restoUz.roles, key)
    ? restoUz.roles[key]
    : restoUz.roleFallback;
}
