/** Bo'lim turi (backend: categories/kinds.py): taom oynasidagi "Qo'shimcha" tavsiyalari shunga asoslanadi */
export type DishKind = 'main' | 'salad' | 'dessert' | 'drink' | 'other';

export interface Product {
  id: number;
  name: string;
  /** Rus/ingliz tarjimalari (restoran egasi /ra/ menyu bo'limidan kiritadi); bo'sh bo'lsa server kalitni yubormaydi -> o'zbekcha ko'rinadi */
  name_ru?: string;
  name_en?: string;
  description?: string;
  desc_ru?: string;
  desc_en?: string;
  price: number;
  old_price?: number;
  image?: string;
  /** Qo'shimcha rasmlar bilan birga (asosiy rasm birinchi) — taom oynasida suriladi */
  images?: string[];
  /** Internetdan olingan namuna rasm: muallif · litsenziya (bo'sh = restoranning o'z rasmi) */
  image_credit?: string;
  image_source_url?: string;
  category_id?: number;
  category_kind?: DishKind;
  category_name?: string;
  has_3d?: boolean;
  ar_model?: string;
  /** Server: taom rasmidan 3D holati (TZ_LOKAL_RASMDAN_3D_MENYU) */
  model_status?: 'none' | 'queued' | 'processing' | 'ready' | 'failed';
  spin_frames?: string[];
  spin_video?: string;
  unit?: string;
  weight?: string;
  /** Masalan "620 kkal" (server tayyor matn yuboradi) */
  calories?: string;
  prep_time?: string;
  is_halal?: boolean;
  is_popular?: boolean;
  is_new?: boolean;
}

export interface Category {
  id: number;
  name: string;
  name_ru?: string;
  name_en?: string;
  icon?: string;
  count?: number;
}
