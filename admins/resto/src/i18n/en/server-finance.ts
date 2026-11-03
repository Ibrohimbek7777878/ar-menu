// Finance: texts returned by the backend React API (backend/finance/interfaces/api/finance_admin.py, finance/services/defaults.py).
// The key is the exact server text; pages translate it with t(server_text) (an unknown key stays in Uzbek).
// 'Umumiy', 'Naqd', 'Plastik / Karta', 'Mijoz nasiyasi' also come from the server but are used on the page too: see ./finance.ts and ./core.ts.
// Server texts with parameters (e.g. the "payment exceeds the remaining ... so'm" message) are not translated.
export default {
  // Income / expense label (type_display), debt type (debt_type_display)
  'Kirim': 'Income',
  'Chiqim': 'Expense',
  'Yetkazib beruvchiga qarz': 'Debt to a supplier',

  // Default finance categories (finance/services/defaults.py)
  "Go'sht va Parranda": 'Meat and poultry',
  'Sabzavot va Mevalar': 'Vegetables and fruit',
  "Guruch, Yog' va Un": 'Rice, oil and flour',
  'Ichimliklar va Suv': 'Drinks and water',
  'Kommunal (Gaz, Svet, Suv)': 'Utilities (gas, electricity, water)',
  'Xodimlar Ish Haqi': 'Staff salaries',
  'Bino Ijarasi': 'Premises rent',
  "Idishlar va Xo'jalik": 'Tableware and household supplies',
  'Boshqa xarajatlar': 'Other expenses',
  'Zaldagi Taom Savdosi': 'Dining room sales',
  'Yetkazib berish (Dostavka)': 'Delivery',
  "Banket va To'y xizmati": 'Banquets and weddings',
  'Sarmoya va Investitsiya': 'Capital and investment',
  'Boshqa tushum': 'Other income',

  // Error messages
  'Restoran topilmadi': 'Restaurant not found',
  'Tranzaksiya sarlavhasi kiritilishi shart': 'Enter the transaction title',
  "Tranzaksiya turi \"income\" yoki \"expense\" bo'lishi kerak": 'The transaction type must be "income" or "expense"',
  'Kategoriya topilmadi': 'Category not found',
  'Tranzaksiya allaqachon bekor qilingan': 'The transaction has already been cancelled',
  "Bekor qilish sababini ko'rsating": 'Enter the reason for cancelling',
  'Shaxs/tashkilot ismi kiritilishi shart': 'Enter the person or company name',
  "Ushbu qarz allaqachon to'liq yopilgan": 'This debt has already been fully settled',
} as Record<string, string>
