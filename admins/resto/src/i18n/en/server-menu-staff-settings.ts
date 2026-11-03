// Menu, bulk add, staff and settings: texts returned by the backend React API.
// The key is EXACTLY the text the server sends; pages translate it with t(server_text) (if the key is missing the Uzbek text is shown).
// 'Restoran topilmadi' lives in another file (server-finance.ts / server-tables-orders.ts).
// Server texts with parameters are not translated (the value is written into the text, so it cannot be a key): «field» ... is required / must be (api_input.py),
// 'Faqat dastlabki N ta qator olindi', 'N ta qator o'qilmadi', 'Matn juda uzun (...)', 'Noto'g'ri rol. Mumkin bo'lganlar: ...', 'Parol yetarli kuchli emas: ...', etc.
export default {
  // Menyu API (backend/orders/interfaces/api/menu_admin.py, menu_import_views.py)
  'Kategoriya topilmadi yoki sizga ruxsat etilmagan': 'Category not found, or you do not have access to it',
  "Rasm tokeni yaroqsiz, muddati o'tgan (2 soat), allaqachon ishlatilgan yoki boshqa restoranniki. Rasmni qaytadan tanlang.": 'The photo code is invalid: it has expired (2 hours), was already used or belongs to another restaurant. Choose the photo again.',
  "Do'kon topilmadi.": 'Restaurant not found.',
  'Taom narxi kiritilishi shart.': 'The dish price is required.',
  "Rasm faylini ham, image_token ni ham bir vaqtda yuborib bo'lmaydi — bittasini tanlang": 'You cannot send both a photo file and a photo code at once: choose one',
  "Taom topilmadi yoki unga ruxsatingiz yo'q.": 'Dish not found, or you do not have access to it.',
  'Rasm tanlanmadi.': 'No photo selected.',
  'Rasm hajmi 10 MB dan oshmasligi kerak.': 'The photo must not be larger than 10 MB.',
  // 
  // Ommaviy qo'shish (backend/products/menu_import/service.py): o'qish xatolari, izohlar va qator xatolari
  "Rasmdan taom topilmadi. Rasmni aniqroq va yorug' qilib oling (matn to'liq ko'rinsin), yoki menyuni matn/Excel/PDF qilib yuboring.": 'No dishes were found in the photo. Take a clearer, well-lit photo (so the text is fully visible), or send the menu as text, Excel or PDF.',
  "PDF dan taom topilmadi. Menyu matn ko'rinishida bo'lsin yoki PDF o'rniga Excel/matn yuboring.": 'No dishes were found in the PDF. The menu should be in text form, or send Excel or text instead of a PDF.',
  "Fayldan taom topilmadi. Birinchi ustunda taom nomi, ikkinchisida narx bo'lsin (birinchi qatorda «Nomi», «Narxi» sarlavhasi bo'lsa yaxshi).": 'No dishes were found in the file. Put the dish name in the first column and the price in the second (it helps if the first row has "Name" and "Price" headings).',
  "Matndan taom topilmadi. Har qatorni «Taom nomi - narx» ko'rinishida yozing, masalan: Osh - 45 000.": 'No dishes were found in the text. Write each line as "Dish name - price", for example: Pilaf - 45 000.',
  'Fayl va matnni birga yubormang: bittasini tanlang.': 'Do not send a file and text together: choose one.',
  'Fayl yoki matn yuboring.': 'Send a file or some text.',
  "Matn bo'sh. Menyuni «Osh - 45 000» ko'rinishida qatorma-qator joylang.": 'The text is empty. Paste the menu line by line, like "Pilaf - 45 000".',
  "Qo'shiladigan qatorlar yo'q.": 'There are no rows to add.',
  "Rasmni vaqtincha saqlab bo'lmadi: uni qatorga keyin qo'lda biriktiring.": "Couldn't save the photo temporarily: attach it to the row by hand later.",
  "AI hozir ishlamayapti: matn oddiy qoidalar bilan o'qildi.": 'AI is not working right now: the text was read with simple rules.',
  'Narx kiritilishi shart.': 'The price is required.',
  'Taom nomi kiritilishi shart.': 'The dish name is required.',
  "Noto'g'ri qiymat": 'Invalid value',
  'Kategoriya topilmadi yoki sizga ruxsat etilmagan.': 'Category not found, or you do not have access to it.',
  'Yangilanadigan taom topilmadi yoki sizga ruxsat etilmagan.': 'The dish to update was not found, or you do not have access to it.',
  "Bu taom ro'yxatda ikki marta yangilanmoqda.": 'This dish is being updated twice in the list.',
  "Rasm kodi noto'g'ri. Rasmni qayta tanlang.": 'The photo code is invalid. Choose the photo again.',
  "Rasm muddati tugagan yoki topilmadi (2 soatdan keyin o'chadi). Rasmni qayta tanlang.": 'The photo has expired or was not found (it is deleted after 2 hours). Choose the photo again.',
  'Bu rasm boshqa qatorda ham ishlatilgan. Har qatorga alohida rasm tanlang.': 'This photo is also used in another row. Choose a separate photo for each row.',
  'Rasm biriktirish hozircha mavjud emas.': 'Attaching a photo is not available yet.',
  // 
  // Xodimlar API (backend/accounts/interfaces/api/staff_admin.py)
  'Login kiritilishi shart': 'The username is required',
  'Menejer egalik yoki menejer rolini bera olmaydi': 'A manager cannot assign the owner or manager role',
  "O'z akkauntingizni bloklay olmaysiz": 'You cannot block your own account',
  'Menejer egasi yoki boshqa menejerni bloklay olmaydi': 'A manager cannot block the owner or another manager',
  "Do'konning oxirgi egasini bloklab bo'lmaydi": 'You cannot block the last owner of the restaurant',
  'Menejer egasi yoki boshqa menejerni blokdan chiqara olmaydi': 'A manager cannot unblock the owner or another manager',
  'Menejer egasi yoki boshqa menejer parolini tiklay olmaydi': 'A manager cannot reset the password of the owner or another manager',
  "Rahbariyat parolini bu yerdan o'zgartirib bo'lmaydi": 'Management passwords cannot be changed from here',
  "O'z rolingizni o'zgartira olmaysiz": 'You cannot change your own role',
  "O'z rolingizni ko'tara olmaysiz": 'You cannot raise your own role',
  "Menejer egasi yoki boshqa menejerni o'zgartira olmaydi": 'A manager cannot change the owner or another manager',
  "Do'konning oxirgi egasini tushirish mumkin emas": 'You cannot demote the last owner of the restaurant',
  // 
  // Sozlamalar API (backend/shops/interfaces/api/settings_admin.py, backend/api_input.py)
  "Restoran nomi bo'sh bo'lishi mumkin emas": 'The restaurant name cannot be empty',
  "Rang #RGB yoki #RRGGBB ko'rinishida bo'lishi kerak": 'The color must be in #RGB or #RRGGBB format',
  'Bu Telegram chat ID boshqa restoranga biriktirilgan': 'This Telegram chat ID is linked to another restaurant',
  "Telegram chat ID butun son bo'lishi kerak (masalan 123456789 yoki -1001234567890)": 'The Telegram chat ID must be a whole number (for example 123456789 or -1001234567890)',
} as Record<string, string>;
