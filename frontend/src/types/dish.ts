export interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  old_price?: number;
  image?: string;
  category_id?: number;
  category_name?: string;
  has_3d?: boolean;
  ar_model?: string;
  unit?: string;
  weight?: string;
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
