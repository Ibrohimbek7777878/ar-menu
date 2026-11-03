import { translated } from './translated.ts';

/**
 * Resto Admin umumiy o'zbekcha matnlar (TZ: 1.1). O'zbekcha matnlar shu yerda turadi (asl matn = tarjima kaliti);
 * `commonUz` ularni o'qilganda joriy tilga o'giradi (ru/en: ./ru.ts, ./en.ts).
 */
export const commonUzSource = {
  save: 'Saqlash',
  cancel: 'Bekor qilish',
  delete: "O'chirish",
  edit: "Tahrirlash",
  close: 'Yopish',
  refresh: 'Yangilash',
  retry: 'Qayta urinish',
  loading: 'Yuklanmoqda...',
  search: 'Qidirish...',
  actions: 'Amallar',
  status: 'Holat',
  date: 'Sana',
  all: 'Barchasi',
  noData: "Ma'lumot topilmadi",
  errorOccurred: 'Xatolik yuz berdi',
  unauthorized: 'Ruxsat berilmagan',
  accessDenied: "Bu bo'limga kirish uchun sizda yetarli huquq yo'q.",
  logout: 'Chiqish',
  profile: 'Profil',
  currency: "so'm",
};

export const commonUz = translated(commonUzSource);
