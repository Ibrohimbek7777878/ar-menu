// Stollar va Buyurtmalar: backendning React API'si (backend/tables_restaurant/interfaces/api/tables_admin.py, backend/orders/interfaces/api/orders_admin.py,
// backend/orders/interfaces/api/permissions.py, backend/api_input.py) qaytaradigan matnlar.
// Kalit — serverdagi AYNAN o'sha matn; sahifa ularni t(server_matni) bilan o'giradi (kalit topilmasa o'zbekcha ko'rinadi).
// Parametrli server matnlari tarjima qilinmaydi (qiymat matn ichiga yozilib keladi, shuning uchun kalit bo'la olmaydi):
//   "<raqam>" raqamli stol allaqachon mavjud / arxivda mavjud, "Ushbu zalda N ta faol stol...", "«status» quyidagilardan biri bo'lishi kerak: ...",
//   "'X' dan 'Y' ga o'tish mumkin emas" (buyurtma holati o'tishi) — o'zbekcha ko'rinadi.
export default {
  // Server yaratadigan standart nomlar (zal nomi, mijoz ismi)
  'Asosiy Zal': 'Основной зал',
  'Mehmon': 'Гость',

  // Xato xabarlari
  'Restoran topilmadi': 'Ресторан не найден',
  'Zal topilmadi': 'Зал не найден',
  'Bu amal sizning rolingiz uchun ruxsat etilmagan.': 'Это действие недоступно для вашей роли.',
  '«number» 20 belgidan oshmasligi kerak': 'Номер стола — не более 20 символов',
  '«name» 100 belgidan oshmasligi kerak': 'Название зала — не более 100 символов',
  "«capacity» 1 dan 100 gacha bo'lishi kerak": 'Вместимость — от 1 до 100 человек',
  "«order» butun son bo'lishi kerak": 'Порядковый номер должен быть целым числом',
  "Oshpaz faqat 'preparing' va 'ready' holatlariga o'tkaza oladi.": 'Повар может переводить заказ только в статусы «Готовится» и «Готов».',
  "To'lovni bekor qilish yoki qaytarish uchun moliya huquqi talab qilinadi.": 'Для отмены или возврата оплаты нужен доступ к финансам.',
  "Bekor qilingan buyurtmaga to'lov yozib bo'lmaydi.": 'Нельзя принять оплату по отменённому заказу.',
  'Kassa yozuvi yaratilmadi': 'Запись в кассе не создана',
} as Record<string, string>;
