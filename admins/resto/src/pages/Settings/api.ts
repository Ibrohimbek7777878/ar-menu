import { apiClient } from '@admins/shared';

/** Ranglar palitrasi: classic — yashil + krem (standart), orange — apelsin. Mehmon sayti, admin panel va kirish sahifasiga ta'sir qiladi (backend: shops/guest_palette.py) */
export type GuestPaletteSetting = 'classic' | 'orange';

/** Mehmon sayti fasl rangi: off — hozirgi ranglar, auto — oyga qarab (backend: shops/guest_season.py) */
export type GuestSeasonSetting = 'off' | 'auto' | 'kuz' | 'qish' | 'bahor' | 'yoz';

/** Mehmon sayti animatsiya darajasi: full — hammasi, light — faqat bir martalik, off — animatsiyasiz (backend: shops/guest_motion.py) */
export type GuestMotionSetting = 'full' | 'light' | 'off';

/** Mehmon taom oynasi: on — taom kartasini bosganda oyna ochiladi, off — avvalgi xatti-harakat (backend: shops/guest_dish_sheet.py) */
export type GuestDishSheetSetting = 'on' | 'off';

/** Menyuni ommaviy kiritishda rasm/matnni AI o'qiydimi: off bo'lsa uchinchi tomonga hech narsa yuborilmaydi (backend: shops/menu_import_ai.py) */
export type MenuImportAiSetting = 'on' | 'off';

/** Mehmon kun/tun rejimi (backend: shops/guest_theme.py) */
export type GuestThemeSetting = 'day' | 'night' | 'auto' | 'off';

/** Mehmon sayti tillari, vergul bilan; birinchisi asosiy (backend: shops/guest_languages.py) */
export type GuestLanguagesSetting = 'uz,ru,en' | 'uz,ru' | 'uz,en' | 'uz';

export interface ShopSettings {
  id: number;
  name: string;
  slug: string;
  description: string;
  address: string;
  phone: string;
  phone2: string;
  working_hours: string;
  working_days: string;
  is_open: boolean;
  color_primary: string;
  color_accent: string;
  instagram_url: string;
  service_fee_percent: number;
  kds_warning_minutes: number;
  kds_critical_minutes: number;
  telegram_chat_id: string;
  auto_accept_orders: boolean;
  guest_palette: GuestPaletteSetting;
  guest_season: GuestSeasonSetting;
  guest_motion: GuestMotionSetting;
  guest_dish_sheet: GuestDishSheetSetting;
  guest_theme: GuestThemeSetting;
  guest_languages: string;
  menu_import_ai: MenuImportAiSetting;
  panel_scope: string;
}

export type ShopSettingsPayload = Partial<Omit<ShopSettings, 'id' | 'slug' | 'panel_scope'>>;

export async function fetchSettings(): Promise<ShopSettings> {
  return apiClient<ShopSettings>('/api/restaurant/admin/v1/settings/');
}

export async function updateSettings(data: ShopSettingsPayload): Promise<ShopSettings> {
  return apiClient<ShopSettings>('/api/restaurant/admin/v1/settings/', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
