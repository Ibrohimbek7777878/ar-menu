// "Buyurtmalar" sahifasi (pages/Orders). Kalit — o'zbekcha matn (kodda t('...') / tr('...') dagi aynan shu matn), qiymat — tarjima.
// Boshqa fayllarda bor kalitlar ('Buyurtmalar', 'Barchasi', 'Bugun', 'Tayyor', "To'langan", 'Nomi', 'Narxi', 'Orqaga', 'Qayta urinish', 'Bekor qilish',
// 'Qayta yuklash') bu yerda takrorlanmagan. Holat nomlari "Заказ" (erkak jinsi) ga moslangan: Подтверждён, Отменён, Выдан.
export default {
  // Buyurtma va to'lov holatlari (chip)
  'Kutilmoqda': 'Ожидает',
  'Tasdiqlangan': 'Подтверждён',
  'Tayyorlanmoqda': 'Готовится',
  "Yo'lda": 'В пути',
  'Berildi': 'Выдан',
  'Bekor qilindi': 'Отменён',
  "To'lanmagan": 'Не оплачено',
  'Qaytarilgan': 'Возвращено',

  // Sarlavha, xulosa kartalari
  'Restoran va yetkazib berish buyurtmalari oqimi, oshxona nazorati va cheklar.': 'Заказы ресторана и доставки, контроль кухни и чеки.',
  'Bugungi Jami': 'Всего за сегодня',
  'Kutilmoqda (Yangi)': 'Ожидают (новые)',
  'Oshxonada (Tayyorlanmoqda)': 'На кухне (готовятся)',
  'Tayyor (Tortish kerak)': 'Готовы (нужно подать)',

  // Filtrlar va qidiruv
  'Kutilmoqda ({n})': 'Ожидают ({n})',
  'Tayyorlanmoqda ({n})': 'Готовятся ({n})',
  'Tayyor ({n})': 'Готовы ({n})',
  'Bekor qilingan': 'Отменённые',
  'Kecha': 'Вчера',
  'Barcha Vaqt': 'За всё время',
  'Buyurtma raqami, stol yoki mijoz ismi...': 'Номер заказа, стол или имя клиента...',

  // Bo'sh holat
  'Buyurtmalar mavjud emas': 'Заказов нет',
  "Qidiruv yoki filtr mezonlari bo'yicha buyurtmalar topilmadi.": 'По заданному поиску или фильтру заказов не найдено.',
  'Hozircha hech qanday yangi buyurtma kelib tushmagan.': 'Новых заказов пока не поступало.',

  // Buyurtma kartasi
  'Stol #{number} ({hall})': 'Стол #{number} ({hall})',
  'Olib ketish / Yetkazish': 'С собой / Доставка',
  'Izoh: "{notes}"': 'Комментарий: «{notes}»',
  '+{n} ta boshqa': '+ещё {n}',
  'Jami:': 'Итого:',
  "{amount} so'm": '{amount} сум',
  'Tasdiqlash': 'Подтвердить',
  'Oshxonaga berish': 'Передать на кухню',
  "Tayyor bo'ldi": 'Готов',
  'Mijozga berildi': 'Выдан клиенту',
  "To'landi deb belgilash": 'Отметить как оплаченный',
  "To'lovni qabul qilish": 'Принять оплату',
  'Jami: {n} ta buyurtma (Sahifa {page} / {pages})': 'Всего заказов: {n} (стр. {page} / {pages})',
  'Oldingi': 'Назад',
  'Keyingi': 'Далее',

  // Chek
  'Buyurtma #{number} — Chek': 'Заказ #{number} — чек',
  'RESTORAN CHEKI': 'ЧЕК РЕСТОРАНА',
  'Buyurtma #{number}': 'Заказ #{number}',
  'Soni': 'Кол-во',
  'Jami': 'Сумма',
  'Oraliq summa:': 'Подытог:',
  'Chegirma:': 'Скидка:',
  'Yetkazib berish:': 'Доставка:',
  'JAMI:': 'ИТОГО:',
  'Holat: {status}': 'Статус: {status}',
  "To'lov: {payment}": 'Оплата: {payment}',
  'Chop etish (Print)': 'Печать',

  // Bekor qilish oynasi
  'Buyurtma #{number} ni Bekor Qilish': 'Отмена заказа #{number}',
  "Ushbu buyurtmani bekor qilish sababini ko'rsating. Ushbu amal audit logida qayd etiladi.": 'Укажите причину отмены заказа. Действие будет записано в журнале аудита.',
  'Bekor qilish sababi': 'Причина отмены',
  'Masalan: Mijoz buyurtmani bekor qildi / Mahsulot tugagan...': 'Например: Клиент отменил заказ / Продукт закончился...',
  'Bekor qilinmoqda...': 'Отмена...',
  'Bekor qilishni tasdiqlash': 'Подтвердить отмену',

  // Xabarlar (toast va useOrders)
  'Buyurtma #{number} holati yangilandi': 'Статус заказа #{number} обновлён',
  'Buyurtma #{number} bekor qilindi': 'Заказ #{number} отменён',
  "Buyurtmani bekor qilib bo'lmadi": 'Не удалось отменить заказ',
  "Buyurtma #{number} to'langan deb belgilandi": 'Заказ #{number} отмечен как оплаченный',
  'Buyurtmalarni yuklashda xatolik yuz berdi': 'Не удалось загрузить заказы',
  "Buyurtma holatini o'zgartirib bo'lmadi": 'Не удалось изменить статус заказа',
  "To'lov holatini o'zgartirib bo'lmadi": 'Не удалось изменить статус оплаты',
} as Record<string, string>;
