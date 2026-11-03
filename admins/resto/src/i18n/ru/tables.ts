// "Stollar va QR" sahifasi (pages/Tables). Kalit — o'zbekcha matn (kodda t('...') / tr('...') dagi aynan shu matn), qiymat — tarjima.
// Boshqa fayllarda bor kalitlar ('Barchasi', 'Qayta urinish', 'Bekor qilish', 'Tahrirlash', 'Qayta yuklash', 'Xatolik yuz berdi') bu yerda takrorlanmagan.
export default {
  // Stol holatlari (chip, filtr, tezkor tanlov)
  "Bo'sh": 'Свободен',
  'Band': 'Занят',
  'Buyurtma': 'Заказ',
  'Kutmoqda': 'Ждёт',
  'Hisob': 'Счёт',
  'Tozalanmoqda': 'Уборка',
  'Arxiv': 'Архив',
  'Holat: {status}': 'Статус: {status}',

  // Sarlavha, tugmalar, xulosa kartalari
  'Stollar va QR Kodlar': 'Столы и QR-коды',
  'Zallar tartibi, jonli hisob-kitoblar va bosma QR menyu kartalari boshqaruvi.': 'Управление залами, текущими счетами и печатными QR-карточками меню.',
  'Yangi Zal': 'Новый зал',
  'Yangi Stol': 'Новый стол',
  'Jami Stollar': 'Всего столов',
  "Bo'sh Stollar": 'Свободные столы',
  'Band / Buyurtma': 'Заняты / с заказом',
  'Hisob Kutilmoqda': 'Ждут счёта',
  'Barcha Zallar ({n})': 'Все залы ({n})',
  "Stol raqami bo'yicha...": 'По номеру стола...',

  // Bo'sh holat
  'Stollar topilmadi': 'Столы не найдены',
  "Qidiruv yoki filtr bo'yicha hech qanday stol topilmadi.": 'По вашему поиску или фильтру столов не найдено.',
  "Restoraningizda hali stollar mavjud emas. Yangi stol qo'shing.": 'В вашем ресторане пока нет столов. Добавьте новый стол.',
  "Birinchi stolni qo'shish": 'Добавить первый стол',

  // Stol kartasi
  'Stol #{number}': 'Стол #{number}',
  '{n} kishi': '{n} чел.',
  'Doira': 'Круглый',
  "To'rtburchak": 'Прямоугольный',
  'Ochiq hisob ({n} buyurtma):': 'Открытый счёт (заказов: {n}):',
  "{amount} so'm": '{amount} сум',
  'QR Kod': 'QR-код',
  'Arxivlash': 'В архив',
  'Tiklash': 'Восстановить',
  '"{number}" raqamli stolni arxivlamoqchimisiz?': 'Отправить стол «{number}» в архив?',

  // QR oynasi
  'Stol #{number} — QR Kod': 'Стол #{number} — QR-код',
  'Zal:': 'Зал:',
  "Sig'im:": 'Вместимость:',
  'QR Code Stol {number}': 'QR-код, стол {number}',
  'Havoladan nusxa olish': 'Скопировать ссылку',
  'SVG Yuklab olish': 'Скачать SVG',
  'Xavfsizlik uchun yangi QR token olish': 'Получить новый QR-код для безопасности',
  'QR ni Yangilash': 'Обновить QR',
  "Haqiqatan ham ushbu stolning QR kodini yangilamoqchimisiz? Eski QR kod 24 soatdan so'ng to'xtaydi.": 'Действительно обновить QR-код этого стола? Старый QR-код перестанет работать через 24 часа.',
  'QR token yangilandi': 'QR-код обновлён',
  "QR tokenini yangilab bo'lmadi": 'Не удалось обновить QR-код',
  'Stol menyusi havolasi nusxalandi': 'Ссылка на меню стола скопирована',

  // Stol va zal formalari
  'Stol #{number} ni Tahrirlash': 'Редактирование стола #{number}',
  "Yangi Stol Qo'shish": 'Добавить стол',
  'Stol Raqami *': 'Номер стола *',
  'Masalan: 1, 2, VIP-1': 'Например: 1, 2, VIP-1',
  'Zal': 'Зал',
  "Sig'imi (kishi)": 'Вместимость (чел.)',
  'Shakli': 'Форма',
  'Saqlanmoqda...': 'Сохранение...',
  "O'zgarishlarni saqlash": 'Сохранить изменения',
  'Stolni yaratish': 'Создать стол',
  "Yangi Zal Qo'shish": 'Добавить зал',
  'Zal Nomi *': 'Название зала *',
  'Masalan: Yozgi Terrasa, VIP Xona, 2-qavat': 'Например: Летняя терраса, VIP-зал, 2 этаж',
  'Tartib Raqami': 'Порядковый номер',
  "Zalni qo'shish": 'Добавить зал',
  'Stol raqami kiritilishi shart': 'Укажите номер стола',
  'Zal nomi kiritilishi shart': 'Укажите название зала',
  '"{number}" raqamli stol yangilandi': 'Стол «{number}» обновлён',
  '"{number}" raqamli yangi stol yaratildi': 'Создан новый стол «{number}»',
  '"{name}" zali qo\'shildi': 'Зал «{name}» добавлен',

  // Yuklash va holat xatolari (useTables)
  'Stollarni yuklashda xatolik yuz berdi': 'Не удалось загрузить столы',
  "Holatni o'zgartirib bo'lmadi": 'Не удалось изменить статус',
} as Record<string, string>;
