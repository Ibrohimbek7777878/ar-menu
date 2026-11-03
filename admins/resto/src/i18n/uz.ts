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
  menuPage: {
    translationsTitle: 'Tarjimalar',
    translationsSummary: 'Boshqa tillarda nomi (ixtiyoriy)',
    translationsHint: "Bo'sh qoldirilsa mehmonga o'zbekcha nom ko'rinadi",
    translationsFilled: "To'ldirilgan",
    languageRu: 'Русский',
    languageEn: 'English',
    nameLabel: 'Nomi',
    descriptionLabel: 'Tavsifi',
    nameRuPlaceholder: 'Masalan: Плов',
    nameEnPlaceholder: 'Masalan: Pilaf',
    descriptionRuPlaceholder: 'Masalan: Рис, мясо, морковь, нут',
    descriptionEnPlaceholder: 'Masalan: Rice, beef, carrots, chickpeas',
    saveFailed: "Saqlab bo'lmadi",
  },
  settingsPage: {
    subtitle: 'Restoran profili, oshxona ekrani taymerlari va xizmat haqi parametrlari',
    menuLink: 'Menyu havolasi',
    kitchenTimersTitle: 'Oshxona ekrani taymer chegaralari',
    kitchenTimersHint:
      'Oshxona ekranida taomlar tayyorlanish vaqtiga qarab kartochka rangi sariq va qizilga aylanadi:',
    seasonTitle: 'Mehmon menyusi: rang va animatsiya',
    seasonLabel: 'Fasl rangi',
    seasonHint:
      "Mehmon menyusidagi tugma, narx va urg'u ranglari. «Avtomatik» da rang oyga qarab o'zi almashadi: dekabr–fevral qish, mart–may bahor, iyun–avgust yoz, sentabr–noyabr kuz. Eski (klassik) dizaynga ta'sir qilmaydi.",
    motionLabel: 'Animatsiyalar',
    motionHint:
      "To'liq: barcha jonli effektlar. Yengil: faqat bir martalik effektlar (zaif telefon va sekin internetda avtomatik yoqiladi). O'chiq: animatsiyasiz. Eski (klassik) dizaynga ta'sir qilmaydi.",
    motionOptions: {
      full: "To'liq",
      light: 'Yengil',
      off: "O'chiq",
    },
    dishSheetLabel: 'Taom oynasi',
    dishSheetHint:
      "Mehmon taom kartasini bosganda pastdan ochiladigan oyna: qisqa ma'lumot va shunga o'xshash hamda qo'shimcha taomlar. O'chirilsa karta avvalgidek ishlaydi (faqat 3D taomning rasmini bosganda 3D oyna ochiladi). Eski (klassik) dizaynda bu oyna yo'q.",
    dishSheetOptions: {
      on: 'Yoqilgan',
      off: "O'chirilgan",
    },
    themeLabel: 'Kun va tun',
    themeHint:
      "Mehmon saytining qorong'i (tun) rejimi. Mehmon sozlamalar tugmasidan o'zi Kun, Tun yoki Avto (telefon mavzusiga ergashadi) ni tanlaydi va tanlovi eslab qolinadi; bu yerda faqat yangi mehmon nima ko'rishi belgilanadi. Eski (klassik) dizaynda tun rejimi yo'q.",
    themeOptions: {
      day: 'Kun (standart, mehmon almashtira oladi)',
      night: 'Tun (yangi mehmon qorong\'ini ko\'radi)',
      auto: 'Avto (telefon mavzusiga ergashadi)',
      off: "O'chirilgan (almashtirgich ko'rinmaydi)",
    },
    languagesLabel: 'Tillar',
    languagesHint:
      "Mehmon saytida qaysi tillar bo'lishi. Mehmon tilni sozlamalar tugmasidan almashtiradi; birinchi tashrifda telefon tili mos kelsa o'sha til tanlanadi. Taom nomlari va tavsiflari tarjimasi taom tahrirlash oynasidan kiritiladi (tarjima bo'lmasa o'zbekcha ko'rinadi).",
    languagesOptions: {
      'uz,ru,en': "O'zbekcha, Русский, English",
      'uz,ru': "O'zbekcha, Русский",
      'uz,en': "O'zbekcha, English",
      uz: "Faqat o'zbekcha",
    },
    seasonOptions: {
      off: "O'chiq (hozirgi apelsin ranglar)",
      auto: "Avtomatik (oyga qarab)",
      kuz: 'Kuz: to\'q apelsin',
      qish: 'Qish: anor-qizil',
      bahor: 'Bahor: yashil',
      yoz: 'Yoz: amber',
    },
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
