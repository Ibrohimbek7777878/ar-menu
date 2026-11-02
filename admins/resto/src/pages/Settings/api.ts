import { apiClient } from '@admins/shared';

/** Mehmon sayti fasl rangi: off — hozirgi ranglar, auto — oyga qarab (backend: shops/guest_season.py) */
export type GuestSeasonSetting = 'off' | 'auto' | 'kuz' | 'qish' | 'bahor' | 'yoz';

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
  guest_season: GuestSeasonSetting;
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
