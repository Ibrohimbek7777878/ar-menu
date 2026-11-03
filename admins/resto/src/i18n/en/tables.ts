// "Tables & QR" page (pages/Tables). The key is the Uzbek text (exactly as in t('...') / tr('...') in the code), the value is the translation.
// Keys that exist in other files ('Barchasi', 'Qayta urinish', 'Bekor qilish', 'Tahrirlash', 'Qayta yuklash', 'Xatolik yuz berdi') are not repeated here.
export default {
  // Table statuses (chip, filter, quick select)
  "Bo'sh": 'Free',
  'Band': 'Occupied',
  'Buyurtma': 'Order',
  'Kutmoqda': 'Waiting',
  'Hisob': 'Bill',
  'Tozalanmoqda': 'Cleaning',
  'Arxiv': 'Archive',
  'Holat: {status}': 'Status: {status}',

  // Title, buttons, summary cards
  'Stollar va QR Kodlar': 'Tables and QR codes',
  'Zallar tartibi, jonli hisob-kitoblar va bosma QR menyu kartalari boshqaruvi.': 'Manage halls, live bills and printable QR menu cards.',
  'Yangi Zal': 'New hall',
  'Yangi Stol': 'New table',
  'Jami Stollar': 'Total tables',
  "Bo'sh Stollar": 'Free tables',
  'Band / Buyurtma': 'Occupied / ordering',
  'Hisob Kutilmoqda': 'Waiting for bill',
  'Barcha Zallar ({n})': 'All halls ({n})',
  "Stol raqami bo'yicha...": 'By table number...',

  // Empty state
  'Stollar topilmadi': 'No tables found',
  "Qidiruv yoki filtr bo'yicha hech qanday stol topilmadi.": 'No tables match your search or filter.',
  "Restoraningizda hali stollar mavjud emas. Yangi stol qo'shing.": 'Your restaurant has no tables yet. Add a new table.',
  "Birinchi stolni qo'shish": 'Add the first table',

  // Table card
  'Stol #{number}': 'Table #{number}',
  '{n} kishi': '{n} person|{n} people',
  'Doira': 'Round',
  "To'rtburchak": 'Rectangular',
  'Ochiq hisob ({n} buyurtma):': 'Open bill (orders: {n}):',
  "{amount} so'm": '{amount} UZS',
  'QR Kod': 'QR code',
  'Arxivlash': 'Archive',
  'Tiklash': 'Restore',
  '"{number}" raqamli stolni arxivlamoqchimisiz?': 'Archive table "{number}"?',

  // QR window
  'Stol #{number} — QR Kod': 'Table #{number} — QR code',
  'Zal:': 'Hall:',
  "Sig'im:": 'Seats:',
  'QR Code Stol {number}': 'QR code, table {number}',
  'Havoladan nusxa olish': 'Copy link',
  'SVG Yuklab olish': 'Download SVG',
  'Xavfsizlik uchun yangi QR token olish': 'Get a new QR code for security',
  'QR ni Yangilash': 'Refresh QR',
  "Haqiqatan ham ushbu stolning QR kodini yangilamoqchimisiz? Eski QR kod 24 soatdan so'ng to'xtaydi.": "Really refresh this table's QR code? The old QR code will stop working after 24 hours.",
  'QR token yangilandi': 'QR code refreshed',
  "QR tokenini yangilab bo'lmadi": "Couldn't refresh the QR code",
  'Stol menyusi havolasi nusxalandi': 'Table menu link copied',

  // Table and hall forms
  'Stol #{number} ni Tahrirlash': 'Edit table #{number}',
  "Yangi Stol Qo'shish": 'Add table',
  'Stol Raqami *': 'Table number *',
  'Masalan: 1, 2, VIP-1': 'For example: 1, 2, VIP-1',
  'Zal': 'Hall',
  "Sig'imi (kishi)": 'Seats (people)',
  'Shakli': 'Shape',
  'Saqlanmoqda...': 'Saving...',
  "O'zgarishlarni saqlash": 'Save changes',
  'Stolni yaratish': 'Create table',
  "Yangi Zal Qo'shish": 'Add hall',
  'Zal Nomi *': 'Hall name *',
  'Masalan: Yozgi Terrasa, VIP Xona, 2-qavat': 'For example: Summer terrace, VIP room, 2nd floor',
  'Tartib Raqami': 'Sort order',
  "Zalni qo'shish": 'Add hall',
  'Stol raqami kiritilishi shart': 'Enter the table number',
  'Zal nomi kiritilishi shart': 'Enter the hall name',
  '"{number}" raqamli stol yangilandi': 'Table "{number}" updated',
  '"{number}" raqamli yangi stol yaratildi': 'New table "{number}" created',
  '"{name}" zali qo\'shildi': 'Hall "{name}" added',

  // Loading and status errors (useTables)
  'Stollarni yuklashda xatolik yuz berdi': "Couldn't load the tables",
  "Holatni o'zgartirib bo'lmadi": "Couldn't change the status",
} as Record<string, string>;
