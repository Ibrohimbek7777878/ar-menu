/**
 * Ofitsiant panelining DEMO ma'lumotlari (namuna stollar va tezkor taomlar).
 * Haqiqiy panel bularni ISHLATMAYDI: hisob serverdagi buyurtmalardan, tezkor tugmalar restoran menyusidan keladi.
 * Hech narsa o'chirilmaydi (AGENTS.md 4-qoida) — demo/ko'rsatma uchun shu yerda saqlanadi.
 */
export interface DemoTableItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
}

export const DEFAULT_TABLE_ITEMS: Record<string | number, DemoTableItem[]> = {
  '01': [
    { id: 1, name: 'To\'y Oshi', quantity: 2, price: 45000 },
    { id: 2, name: 'Achchiq-chuchuk', quantity: 1, price: 15000 },
    { id: 3, name: 'Tandir Non', quantity: 2, price: 5000 },
    { id: 4, name: 'Ko\'k Choy', quantity: 1, price: 10000 },
  ],
  '05': [
    { id: 5, name: 'Qozon Kabob', quantity: 3, price: 65000 },
    { id: 6, name: 'Mastava Sho\'rva', quantity: 2, price: 35000 },
    { id: 7, name: 'Tandir Non', quantity: 4, price: 5000 },
    { id: 8, name: 'Limon Choy', quantity: 2, price: 15000 },
  ],
  'VIP-1': [
    { id: 9, name: 'Qo\'y Go\'shti Shashlik', quantity: 6, price: 28000 },
    { id: 10, name: 'Maxsus Devzira Osh', quantity: 4, price: 52000 },
    { id: 11, name: 'Assorti Salati', quantity: 2, price: 38000 },
    { id: 12, name: 'Somsa Go\'shtli', quantity: 6, price: 12000 },
    { id: 13, name: 'Ko\'k Choy Zafaronli', quantity: 2, price: 25000 },
  ],
};

export const POPULAR_ADD_DISHES = [
  { name: 'Tandir Non', price: 5000 },
  { name: 'Ko\'k Choy', price: 10000 },
  { name: 'Achchiq-chuchuk', price: 15000 },
  { name: 'Shashlik (1 six)', price: 28000 },
  { name: 'Osh (1 pors)', price: 45000 },
];

