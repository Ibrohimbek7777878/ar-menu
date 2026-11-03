// "Orders" page (pages/Orders). The key is the Uzbek text (exactly as in t('...') / tr('...') in the code), the value is the translation.
// Keys that exist in other files ('Buyurtmalar', 'Barchasi', 'Bugun', 'Tayyor', "To'langan", 'Nomi', 'Narxi', 'Orqaga', 'Qayta urinish', 'Bekor qilish',
// 'Qayta yuklash') are not repeated here.
export default {
  // Order and payment statuses (chip)
  'Kutilmoqda': 'Pending',
  'Tasdiqlangan': 'Confirmed',
  'Tayyorlanmoqda': 'Preparing',
  "Yo'lda": 'On the way',
  'Berildi': 'Served',
  'Bekor qilindi': 'Cancelled',
  "To'lanmagan": 'Unpaid',
  'Qaytarilgan': 'Refunded',

  // Title, summary cards
  'Restoran va yetkazib berish buyurtmalari oqimi, oshxona nazorati va cheklar.': 'Restaurant and delivery orders, kitchen control and receipts.',
  'Bugungi Jami': 'Total today',
  'Kutilmoqda (Yangi)': 'Pending (new)',
  'Oshxonada (Tayyorlanmoqda)': 'In the kitchen (preparing)',
  'Tayyor (Tortish kerak)': 'Ready (to serve)',

  // Filters and search
  'Kutilmoqda ({n})': 'Pending ({n})',
  'Tayyorlanmoqda ({n})': 'Preparing ({n})',
  'Tayyor ({n})': 'Ready ({n})',
  'Bekor qilingan': 'Cancelled',
  'Kecha': 'Yesterday',
  'Barcha Vaqt': 'All time',
  'Buyurtma raqami, stol yoki mijoz ismi...': 'Order number, table or customer name...',

  // Empty state
  'Buyurtmalar mavjud emas': 'No orders',
  "Qidiruv yoki filtr mezonlari bo'yicha buyurtmalar topilmadi.": 'No orders match your search or filter.',
  'Hozircha hech qanday yangi buyurtma kelib tushmagan.': 'No new orders have come in yet.',

  // Order card
  'Stol #{number} ({hall})': 'Table #{number} ({hall})',
  'Olib ketish / Yetkazish': 'Takeaway / Delivery',
  'Izoh: "{notes}"': 'Note: "{notes}"',
  '+{n} ta boshqa': '+{n} more',
  'Jami:': 'Total:',
  "{amount} so'm": '{amount} UZS',
  'Tasdiqlash': 'Confirm',
  'Oshxonaga berish': 'Send to kitchen',
  "Tayyor bo'ldi": 'Ready',
  'Mijozga berildi': 'Handed to customer',
  "To'landi deb belgilash": 'Mark as paid',
  "To'lovni qabul qilish": 'Accept payment',
  'Jami: {n} ta buyurtma (Sahifa {page} / {pages})': 'Total orders: {n} (page {page} of {pages})',
  'Oldingi': 'Previous',
  'Keyingi': 'Next',

  // Receipt
  'Buyurtma #{number} — Chek': 'Order #{number} — receipt',
  'RESTORAN CHEKI': 'RESTAURANT RECEIPT',
  'Buyurtma #{number}': 'Order #{number}',
  'Soni': 'Qty',
  'Jami': 'Amount',
  'Oraliq summa:': 'Subtotal:',
  'Chegirma:': 'Discount:',
  'Yetkazib berish:': 'Delivery:',
  'JAMI:': 'TOTAL:',
  'Holat: {status}': 'Status: {status}',
  "To'lov: {payment}": 'Payment: {payment}',
  'Chop etish (Print)': 'Print',

  // Cancel window
  'Buyurtma #{number} ni Bekor Qilish': 'Cancel order #{number}',
  "Ushbu buyurtmani bekor qilish sababini ko'rsating. Ushbu amal audit logida qayd etiladi.": 'Enter the reason for cancelling this order. The action is saved in the audit log.',
  'Bekor qilish sababi': 'Reason for cancelling',
  'Masalan: Mijoz buyurtmani bekor qildi / Mahsulot tugagan...': 'For example: Customer cancelled the order / Item ran out...',
  'Bekor qilinmoqda...': 'Cancelling...',
  'Bekor qilishni tasdiqlash': 'Confirm cancellation',

  // Messages (toast and useOrders)
  'Buyurtma #{number} holati yangilandi': 'Order #{number} status updated',
  'Buyurtma #{number} bekor qilindi': 'Order #{number} cancelled',
  "Buyurtmani bekor qilib bo'lmadi": "Couldn't cancel the order",
  "Buyurtma #{number} to'langan deb belgilandi": 'Order #{number} marked as paid',
  'Buyurtmalarni yuklashda xatolik yuz berdi': "Couldn't load the orders",
  "Buyurtma holatini o'zgartirib bo'lmadi": "Couldn't change the order status",
  "To'lov holatini o'zgartirib bo'lmadi": "Couldn't change the payment status",
} as Record<string, string>;
