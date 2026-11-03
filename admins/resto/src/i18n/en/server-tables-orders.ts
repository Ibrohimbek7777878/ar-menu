// Tables and Orders: texts returned by the backend React API (backend/tables_restaurant/interfaces/api/tables_admin.py, backend/orders/interfaces/api/orders_admin.py,
// backend/orders/interfaces/api/permissions.py, backend/api_input.py).
// The key is EXACTLY the text the server sends; the pages translate it with t(server_text) (an unknown key stays in Uzbek).
// Server texts with values baked in are not translated (they cannot be keys):
//   "<number>" table already exists / is archived, "This hall has N active tables...", "«status» must be one of: ...",
//   "'X' dan 'Y' ga o'tish mumkin emas" (order status transition) — these stay in Uzbek.
export default {
  // Default names created by the server (hall name, customer name)
  'Asosiy Zal': 'Main hall',
  'Mehmon': 'Guest',

  // Error messages
  'Restoran topilmadi': 'Restaurant not found',
  'Zal topilmadi': 'Hall not found',
  'Bu amal sizning rolingiz uchun ruxsat etilmagan.': 'This action is not allowed for your role.',
  '«number» 20 belgidan oshmasligi kerak': 'Table number must be 20 characters or fewer',
  '«name» 100 belgidan oshmasligi kerak': 'Hall name must be 100 characters or fewer',
  "«capacity» 1 dan 100 gacha bo'lishi kerak": 'Seats must be from 1 to 100',
  "«order» butun son bo'lishi kerak": 'Sort order must be a whole number',
  "Oshpaz faqat 'preparing' va 'ready' holatlariga o'tkaza oladi.": 'A cook can only move an order to "Preparing" or "Ready".',
  "To'lovni bekor qilish yoki qaytarish uchun moliya huquqi talab qilinadi.": 'Cancelling or refunding a payment requires finance access.',
  "Bekor qilingan buyurtmaga to'lov yozib bo'lmaydi.": 'A payment cannot be recorded for a cancelled order.',
  'Kassa yozuvi yaratilmadi': 'The cash register entry was not created',
} as Record<string, string>;
