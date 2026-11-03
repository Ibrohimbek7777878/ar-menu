/** Bo'lim turi (backend: categories/kinds.py): taom oynasidagi "Qo'shimcha" tavsiyalari shunga asoslanadi */
export type DishKind = 'main' | 'salad' | 'dessert' | 'drink' | 'other';

export interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  old_price?: number;
  image?: string;
  /** Qo'shimcha rasmlar bilan birga (asosiy rasm birinchi) — taom oynasida suriladi */
  images?: string[];
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
  icon?: string;
  count?: number;
}
