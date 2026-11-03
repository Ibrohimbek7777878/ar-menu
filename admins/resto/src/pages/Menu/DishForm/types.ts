/**
 * Taom formasi: turlar.
 * Bu fayl faqat turlardan iborat; sof mantiq fayllari uni `import type` bilan oladi
 * (shunda ular `node --test` ostida boshqa fayllarni import qilmasdan ishlaydi).
 */

/** Forma maydonlari. Hammasi matn (input qiymati sifatida); kategoriya — id (bo'sh = kategoriyasiz). */
export interface DishFields {
  name: string;
  /** Faqat raqamlar ("45000"). */
  price: string;
  prepMinutes: string;
  category: string;
  description: string;
}

/** Rasmdan o'qib to'ldirilishi mumkin bo'lgan maydonlar. */
export type AutoFillKey = 'name' | 'price' | 'category' | 'description';

/** Tizim to'ldirgan qiymatlar (maydonning o'sha paytdagi qiymati). Maydon shundan o'zgarsa, "rasmdan o'qildi" belgisi yo'qoladi. */
export type AutoFilled = Partial<Record<AutoFillKey, string>>;

/**
 * Kategoriya qaerdan kelgan:
 *  - default: forma ochilganda o'zi qo'yilgan (birinchi kategoriya), egasi tanlamagan;
 *  - tab: egasi menyuda shu kategoriya lentasini tanlab turgan;
 *  - user: egasi o'zi tanladi yoki yaratdi (yoki tahrirlanayotgan taomniki);
 *  - ai: rasmdan o'qildi.
 */
export type CategorySource = 'default' | 'tab' | 'user' | 'ai';

export interface CategoryRef {
  id: number;
  name: string;
}

/** Kategoriya nomini mavjud kategoriyalarga moslash natijasi. */
export type CategoryMatch =
  | { kind: 'existing'; id: number; name: string }
  | { kind: 'new'; name: string }
  | { kind: 'none' };

/** Server o'qigan taom (rasmdan). Narx yo'q bo'lsa null. */
export interface ParsedDish {
  name: string;
  description: string;
  category: string;
  price: number | null;
}

/** Formadagi taom rasmi. */
export type DishImage =
  | { kind: 'none' }
  /** Tahrirlanayotgan taomning hozirgi (saqlangan) rasmi. */
  | { kind: 'current'; url: string; credit: string; sourceUrl: string }
  /** Egasining o'z surati (brauzerda kichraytirilgan). `token` — server rasmni o'qigach vaqtincha saqlagan bo'lsa. */
  | { kind: 'file'; file: File; previewUrl: string; token: string | null }
  /** Internetdan tanlangan namuna rasm (server yuklab olgan, vaqtincha saqlangan). */
  | { kind: 'internet'; token: string; previewUrl: string; credit: string; sourceUrl: string };
