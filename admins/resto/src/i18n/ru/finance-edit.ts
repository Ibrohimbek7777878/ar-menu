// Moliya: yozuvni qo'lda tahrirlash va o'zgarish tarixi (pages/Finance: EditTransactionModal, EditDebtModal, HistoryModal, editModel).
// Kalit — o'zbekcha matn. Terminologiya ./finance.ts bilan MOS: Kirim = приход, Chiqim = расход, Storno = сторно, Qarz/Nasiya = долг.
// Boshqa fayllarda bor kalitlar ('Saqlash', 'Bekor qilish', 'Tahrirlash', 'Sana', 'Izoh', 'Kategoriya', 'Umumiy', 'Summa', 'Xodim' ...) bu yerda takrorlanmagan.
export default {
  // Sahifa: belgi, tugma, yordam matni
  'Tahrirlangan ({n})': 'Изменено ({n})',
  'Tarix': 'История',
  "Tahrirlash faqat qo'lda kiritilgan kirim va chiqimga mumkin. Chek tushumini Buyurtmalar bo'limida, qarz to'lovini Qarzlar bo'limida o'zgartiring; storno qilingan yozuv tahrirlanmaydi. Har o'zgarish sabab bilan tarixga yoziladi.":
    'Изменять можно только операции прихода и расхода, внесённые вручную. Поступление по чеку меняйте в разделе «Заказы», платёж по долгу — в разделе «Долги»; сторнированная запись не редактируется. Каждое изменение записывается в историю с причиной.',
  "Qarzni tahrirlash mumkin: umumiy summa to'langan summadan kam bo'lmaydi. Har o'zgarish sabab bilan tarixga yoziladi.":
    'Долг можно изменять: общая сумма не может быть меньше оплаченной. Каждое изменение записывается в историю с причиной.',
  "O'zgarish saqlandi va tarixga yozildi": 'Изменение сохранено и записано в историю',

  // Tahrirlash oynalari
  'Operatsiyani tahrirlash': 'Изменение операции',
  'Qarzni tahrirlash': 'Изменение долга',
  "Nima o'zgaradi": 'Что изменится',
  "Hali hech narsa o'zgartirilmadi": 'Пока ничего не изменено',
  'Oldin': 'Было',
  'Endi': 'Стало',
  "O'zgartirish sababi (Majburiy)": 'Причина изменения (обязательно)',
  'Masalan: chekdagi summa boshqa ekan': 'Например: в чеке другая сумма',
  "Pul hisobida har o'zgarish sabab bilan saqlanadi va keyin o'chirilmaydi.": 'В учёте денег каждое изменение сохраняется с причиной и потом не удаляется.',
  'Adashib kiritilgan edi': 'Ввели по ошибке',
  "Chek bo'yicha tuzatildi": 'Исправлено по чеку',
  "Kelishuv o'zgargan": 'Договорённость изменилась',
  '{n} / {max}': '{n} / {max}',
  'Qarz summasi': 'Сумма долга',
  "To'langan: {sum}. Umumiy summa bundan kam bo'lmaydi.": 'Оплачено: {sum}. Общая сумма не может быть меньше.',
  'Muddat belgilanmagan': 'Срок не указан',
  "To'lov qabul qilingan qarzning yo'nalishini o'zgartirib bo'lmaydi.": 'Направление долга, по которому приняты платежи, изменить нельзя.',
  "Qisman to'langan": 'Частично оплачен',

  // Tekshiruv
  "Sana kelajakda bo'lishi mumkin emas": 'Дата не может быть в будущем',
  "Umumiy summa to'langan summadan ({sum}) kichik bo'lmasin": 'Общая сумма не должна быть меньше оплаченной ({sum})',
  'Sababni yozing (kamida 5 belgi)': 'Укажите причину (не менее 5 символов)',
  'Sabab 300 belgidan oshmasligi kerak': 'Причина не должна превышать 300 символов',
  "Jami kirim {sum} ga ko'payadi": 'Общий приход увеличится на {sum}',
  'Jami kirim {sum} ga kamayadi': 'Общий приход уменьшится на {sum}',
  "Jami chiqim {sum} ga ko'payadi": 'Общий расход увеличится на {sum}',
  'Jami chiqim {sum} ga kamayadi': 'Общий расход уменьшится на {sum}',
  'Qarz yopilgan edi: yangi summada yana ochiladi': 'Долг был закрыт: при новой сумме он снова откроется',
  "Qarz to'liq to'langan hisoblanib, yopiladi": 'Долг будет считаться полностью оплаченным и закроется',

  // Tarix oynasi
  "O'zgarishlar tarixi": 'История изменений',
  'Bu yozuv hali tahrirlanmagan.': 'Эта запись ещё не изменялась.',
  '{n}-tahrir': 'Правка {n}',
  'Asl qiymat': 'Исходное значение',
  "Hali o'zgartirilmagan: bular joriy qiymatlar.": 'Ещё не изменялось: это текущие значения.',
  'Birinchi tahrirdan oldin shunday edi.': 'Так было до первого изменения.',
  "Eski panel orqali o'zgartirildi (sabab so'ralmagan)": 'Изменено через старую панель (причина не запрашивалась)',
  "Tarix o'zgartirilmaydi va o'chirilmaydi.": 'История не изменяется и не удаляется.',

  // Tarixdagi maydon nomlari va qiymatlari (eski panel, bosqichga ko'chirish, storno, yashirish, qarz to'lovi). 'Holat', 'Kirim', 'Chiqim', 'Bekor qilingan',
  // 'Bekor qilish sababi' va "Yo'q" boshqa fayllarda bor — bu yerda takrorlanmagan.
  'Ustun/bosqich': 'Колонка/этап',
  'Tur': 'Тип',
  'Yashirilgan': 'Скрыто',
  "To'langan summa": 'Оплаченная сумма',
  'Ha': 'Да',

  // Serverdan keladigan xabarlar (backend/finance/services/revisions.py): kalit — serverdagi AYNAN o'sha matn
  "Buyurtma to'lovini Buyurtmalar bo'limida o'zgartiring": 'Платёж по заказу меняйте в разделе «Заказы»',
  "Qarz to'lovini Qarzlar bo'limida bekor qilib (storno), qaytadan kiriting": 'Платёж по долгу отмените (сторно) в разделе «Долги» и внесите заново',
  "Bekor qilingan (storno) yozuvni tahrirlab bo'lmaydi": 'Сторнированную запись изменить нельзя',
  "Bu yozuv siz ochganingizdan keyin o'zgartirilgan. Ro'yxatni yangilab, qaytadan oching": 'Эта запись изменилась после того, как вы её открыли. Обновите список и откройте её заново',
  "Hech narsa o'zgarmadi": 'Ничего не изменилось',
  "Bu maydonni qo'lda o'zgartirib bo'lmaydi": 'Это поле нельзя изменить вручную',
  "Kirim yoki chiqim turini o'zgartirib bo'lmaydi: yozuvni storno qilib, qaytadan kiriting": 'Тип (приход или расход) изменить нельзя: сделайте сторно записи и внесите её заново',
  "Sana juda eski: to'g'ri sanani kiriting": 'Дата слишком старая: введите правильную дату',
  'Yozuv topilmadi': 'Запись не найдена',
  'Qarz topilmadi': 'Долг не найден',
  "To'lov qabul qilingan qarzning turini o'zgartirib bo'lmaydi": 'Тип долга, по которому приняты платежи, изменить нельзя',
  "Umumiy summa to'langan summadan kichik bo'lishi mumkin emas": 'Общая сумма не может быть меньше оплаченной',
} as Record<string, string>
