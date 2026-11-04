// Finance: manual editing of a record and its change history (pages/Finance: EditTransactionModal, EditDebtModal, HistoryModal, editModel).
// The key is the Uzbek text. Terminology matches ./finance.ts: Kirim = income, Chiqim = expense, Storno = reversal, Qarz/Nasiya = debt.
// Keys that already exist elsewhere ('Saqlash', 'Bekor qilish', 'Tahrirlash', 'Sana', 'Izoh', 'Kategoriya', 'Umumiy', 'Summa', 'Xodim' ...) are not repeated here.
export default {
  // Page: badge, button, help text
  'Tahrirlangan ({n})': 'Edited ({n})',
  'Tarix': 'History',
  "Tahrirlash faqat qo'lda kiritilgan kirim va chiqimga mumkin. Chek tushumini Buyurtmalar bo'limida, qarz to'lovini Qarzlar bo'limida o'zgartiring; storno qilingan yozuv tahrirlanmaydi. Har o'zgarish sabab bilan tarixga yoziladi.":
    'Only income and expenses entered by hand can be edited. Change a receipt payment in Orders and a debt payment in Debts; a reversed record cannot be edited. Every change is saved to the history with a reason.',
  "Qarzni tahrirlash mumkin: umumiy summa to'langan summadan kam bo'lmaydi. Har o'zgarish sabab bilan tarixga yoziladi.":
    'A debt can be edited: the total cannot be less than what is already paid. Every change is saved to the history with a reason.',
  "O'zgarish saqlandi va tarixga yozildi": 'Change saved and written to the history',

  // Edit dialogs
  'Operatsiyani tahrirlash': 'Edit operation',
  'Qarzni tahrirlash': 'Edit debt',
  "Nima o'zgaradi": 'What will change',
  "Hali hech narsa o'zgartirilmadi": 'Nothing has been changed yet',
  'Oldin': 'Before',
  'Endi': 'Now',
  "O'zgartirish sababi (Majburiy)": 'Reason for the change (required)',
  'Masalan: chekdagi summa boshqa ekan': 'For example: the receipt shows a different amount',
  "Pul hisobida har o'zgarish sabab bilan saqlanadi va keyin o'chirilmaydi.": 'Every change to the money records is saved with a reason and is never deleted.',
  'Adashib kiritilgan edi': 'Entered by mistake',
  "Chek bo'yicha tuzatildi": 'Corrected from the receipt',
  "Kelishuv o'zgargan": 'The agreement changed',
  '{n} / {max}': '{n} / {max}',
  'Qarz summasi': 'Debt amount',
  "To'langan: {sum}. Umumiy summa bundan kam bo'lmaydi.": 'Paid: {sum}. The total cannot be lower.',
  'Muddat belgilanmagan': 'No due date set',
  "To'lov qabul qilingan qarzning yo'nalishini o'zgartirib bo'lmaydi.": 'The direction of a debt that has payments cannot be changed.',
  "Qisman to'langan": 'Partly paid',

  // Validation
  "Sana kelajakda bo'lishi mumkin emas": 'The date cannot be in the future',
  "Umumiy summa to'langan summadan ({sum}) kichik bo'lmasin": 'The total must not be less than the amount paid ({sum})',
  'Sababni yozing (kamida 5 belgi)': 'Write a reason (at least 5 characters)',
  'Sabab 300 belgidan oshmasligi kerak': 'The reason must not exceed 300 characters',
  "Jami kirim {sum} ga ko'payadi": 'Total income will increase by {sum}',
  'Jami kirim {sum} ga kamayadi': 'Total income will decrease by {sum}',
  "Jami chiqim {sum} ga ko'payadi": 'Total expenses will increase by {sum}',
  'Jami chiqim {sum} ga kamayadi': 'Total expenses will decrease by {sum}',
  'Qarz yopilgan edi: yangi summada yana ochiladi': 'The debt was closed: with the new amount it will open again',
  "Qarz to'liq to'langan hisoblanib, yopiladi": 'The debt will count as fully paid and will be closed',

  // History dialog
  "O'zgarishlar tarixi": 'Change history',
  'Bu yozuv hali tahrirlanmagan.': 'This record has not been edited yet.',
  '{n}-tahrir': 'Edit {n}',
  'Asl qiymat': 'Original value',
  "Hali o'zgartirilmagan: bular joriy qiymatlar.": 'Not changed yet: these are the current values.',
  'Birinchi tahrirdan oldin shunday edi.': 'This is how it was before the first edit.',
  "Eski panel orqali o'zgartirildi (sabab so'ralmagan)": 'Changed through the old panel (no reason was asked)',
  "Tarix o'zgartirilmaydi va o'chirilmaydi.": 'The history cannot be changed or deleted.',

  // History field names and values (old panel, moving to a stage, reversal, hiding, debt payment). 'Holat', 'Kirim', 'Chiqim', 'Bekor qilingan',
  // 'Bekor qilish sababi' and "Yo'q" exist in other files, so they are not repeated here.
  'Ustun/bosqich': 'Column/stage',
  'Tur': 'Type',
  'Yashirilgan': 'Hidden',
  "To'langan summa": 'Amount paid',
  'Ha': 'Yes',

  // Server messages (backend/finance/services/revisions.py): the key is the EXACT server text
  "Buyurtma to'lovini Buyurtmalar bo'limida o'zgartiring": 'Change an order payment in the Orders section',
  "Qarz to'lovini Qarzlar bo'limida bekor qilib (storno), qaytadan kiriting": 'Reverse the debt payment in the Debts section and enter it again',
  "Bekor qilingan (storno) yozuvni tahrirlab bo'lmaydi": 'A reversed record cannot be edited',
  "Bu yozuv siz ochganingizdan keyin o'zgartirilgan. Ro'yxatni yangilab, qaytadan oching": 'This record changed after you opened it. Refresh the list and open it again',
  "Hech narsa o'zgarmadi": 'Nothing changed',
  "Bu maydonni qo'lda o'zgartirib bo'lmaydi": 'This field cannot be changed by hand',
  "Kirim yoki chiqim turini o'zgartirib bo'lmaydi: yozuvni storno qilib, qaytadan kiriting": 'The type (income or expense) cannot be changed: reverse the record and enter it again',
  "Sana juda eski: to'g'ri sanani kiriting": 'The date is too old: enter the correct date',
  'Yozuv topilmadi': 'Record not found',
  'Qarz topilmadi': 'Debt not found',
  "To'lov qabul qilingan qarzning turini o'zgartirib bo'lmaydi": 'The type of a debt that has payments cannot be changed',
  "Umumiy summa to'langan summadan kichik bo'lishi mumkin emas": 'The total cannot be less than the amount already paid',
} as Record<string, string>
