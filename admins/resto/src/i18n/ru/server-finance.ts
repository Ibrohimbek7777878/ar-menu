// Moliya: backendning React API'si (backend/finance/interfaces/api/finance_admin.py, finance/services/defaults.py) qaytaradigan matnlar.
// Kalit — serverdagi AYNAN o'sha matn; sahifa ularni t(server_matni) bilan o'giradi (kalit topilmasa o'zbekcha ko'rinadi).
// 'Umumiy', 'Naqd', 'Plastik / Karta', 'Mijoz nasiyasi' ham serverdan keladi, lekin sahifada ham ishlatiladi: ./finance.ts va ./core.ts da.
// Parametrli server matnlari (masalan, qoldiq summasi qo'shilgan "To'lov summasi qarz qoldig'idan (... so'm) oshmasligi kerak") tarjima qilinmaydi.
export default {
  // Kirim / chiqim nomi (type_display), qarz turi (debt_type_display)
  'Kirim': 'Приход',
  'Chiqim': 'Расход',
  'Yetkazib beruvchiga qarz': 'Долг поставщику',

  // Standart moliya kategoriyalari (finance/services/defaults.py)
  "Go'sht va Parranda": 'Мясо и птица',
  'Sabzavot va Mevalar': 'Овощи и фрукты',
  "Guruch, Yog' va Un": 'Рис, масло и мука',
  'Ichimliklar va Suv': 'Напитки и вода',
  'Kommunal (Gaz, Svet, Suv)': 'Коммунальные услуги (газ, свет, вода)',
  'Xodimlar Ish Haqi': 'Зарплата сотрудников',
  'Bino Ijarasi': 'Аренда помещения',
  "Idishlar va Xo'jalik": 'Посуда и хозтовары',
  'Boshqa xarajatlar': 'Прочие расходы',
  'Zaldagi Taom Savdosi': 'Продажа блюд в зале',
  'Yetkazib berish (Dostavka)': 'Доставка',
  "Banket va To'y xizmati": 'Банкеты и свадьбы',
  'Sarmoya va Investitsiya': 'Капитал и инвестиции',
  'Boshqa tushum': 'Прочие поступления',

  // Xato xabarlari
  'Restoran topilmadi': 'Ресторан не найден',
  'Tranzaksiya sarlavhasi kiritilishi shart': 'Укажите название операции',
  "Tranzaksiya turi \"income\" yoki \"expense\" bo'lishi kerak": 'Тип операции должен быть «income» или «expense»',
  'Kategoriya topilmadi': 'Категория не найдена',
  'Tranzaksiya allaqachon bekor qilingan': 'Операция уже отменена',
  "Bekor qilish sababini ko'rsating": 'Укажите причину отмены',
  'Shaxs/tashkilot ismi kiritilishi shart': 'Укажите имя лица или организации',
  "Ushbu qarz allaqachon to'liq yopilgan": 'Этот долг уже полностью закрыт',
} as Record<string, string>
