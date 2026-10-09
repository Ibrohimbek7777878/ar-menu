export type Language = 'uz' | 'ru' | 'en';

export type Currency = 'UZS' | 'USD' | 'EUR';

export type UserRole = 'customer' | 'waiter' | 'kds' | 'admin';

export type DeviceMode = 'desktop' | 'tablet' | 'mobile';

export type DishCategory = 'milliy' | 'kabob' | 'shorva' | 'salat' | 'non' | 'ichimlik' | 'desert' | string;

export interface LocalizedString {
  uz: string;
  ru: string;
  en: string;
}

export interface Dish {
  id: string;
  name: LocalizedString;
  description: LocalizedString;
  price: number; // in Uzbek so'm
  category: DishCategory;
  prepTime: number; // in minutes
  weight: string; // e.g. "400 g"
  calories: number; // kcal
  diameterCm: number; // physical diameter in centimeters, e.g. 32cm for palov lagan
  imageUrl: string;
  has3d: boolean;
  modelType: 'plov' | 'manti' | 'somsa' | 'shashlik' | 'lagman' | 'shorva' | 'salat' | 'choy';
  tags: ('hit' | 'new' | 'halal' | 'vegan' | 'spicy')[];
  isSoldOut?: boolean;
  touristFact?: LocalizedString;
  spiceLevel?: 0 | 1 | 2 | 3;
  allergens?: string[];
  ingredients: {
    uz: string[];
    ru: string[];
    en: string[];
  };
}

export interface CartItem {
  id: string;
  dish: Dish;
  quantity: number;
  comment?: string;
}

export type OrderStatus = 'new' | 'cooking' | 'ready' | 'delivered' | 'paid';

export interface Order {
  id: string; // e.g. "#047"
  tableNumber: number;
  items: CartItem[];
  status: OrderStatus;
  subtotal: number;
  serviceFee: number;
  total: number;
  createdAt: Date;
  estimatedMinutes: number;
  customerNote?: string;
  waiterName?: string;
  paymentStatus: 'unpaid' | 'paid';
  paymentMethod?: 'payme' | 'click' | 'uzum' | 'cash';
  tipAmount?: number;
  reviewRating?: number;
  reviewComment?: string;
  isArInfluenced?: boolean;
}

export type TableStatus = 'free' | 'occupied' | 'waiting' | 'ready' | 'bill';

export interface RestaurantTable {
  number: number;
  status: TableStatus;
  capacity: number;
  guestsCount?: number;
  activeOrderId?: string;
  waiterId?: string;
  callAlert?: 'waiter' | 'bill' | 'water' | null;
  zone: 'asosiy' | 'terrasa' | 'vip';
  x: number; // relative 2D floor plan percentage
  y: number;
}
