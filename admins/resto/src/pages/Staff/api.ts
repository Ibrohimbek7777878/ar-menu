import { apiClient } from '@admins/shared';

export interface StaffItem {
  id: number;
  username: string;
  full_name: string;
  phone: string;
  role: 'shop_owner' | 'shop_manager' | 'waiter' | 'kitchen' | 'hostess' | 'cashier';
  role_display: string;
  is_active: boolean;
  date_joined: string | null;
  last_login: string | null;
  // Serverda hisoblanadi (accounts/staff_access.py): xodim qaysi havola bilan kiradi va qaysi sahifaga tushadi
  panel_path?: string | null;
  panel_label?: string | null;
  /** To'liq havola (`https://domen/admin/login/?next=…`); xodim kira olmasa null. */
  login_url?: string | null;
  /** Havola yo'qligining sababi (bloklangan va h.k.). */
  login_unavailable_reason?: string | null;
  // Profil (ruxsatlar yangilanishi): server bularni bermasa (eski javob) profil mavjud maydonlar bilan ishlayveradi
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  /** Ro'yxatdagi qator hozirgi foydalanuvchining o'zi (server aytadi). */
  is_self?: boolean;
  permissions?: StaffPermissions | null;
  /** Shu xodimning ruxsatlarini hozirgi foydalanuvchi o'zgartira oladimi (egasi, o'zi, huquqsiz bo'lsa — yo'q). */
  editable_permissions?: boolean;
}

/** Serverda hisoblangan ruxsatlar: samarali = (rol standarti + qo'shimcha) - olib tashlangan. */
export interface StaffPermissions {
  role_defaults: string[];
  extra: string[];
  revoked: string[];
  effective: string[];
}

export interface StaffPayload {
  username: string;
  role: string;
  password?: string;
  full_name?: string;
  phone?: string;
}

export interface StaffCreateResponse extends StaffItem {
  generated_password?: string | null;
}

/** PATCH /staff/<id>/: faqat o'zgargan maydonlar yuboriladi. */
export interface StaffPatch {
  full_name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  username?: string;
  role?: string;
  extra_capabilities?: string[];
  revoked_capabilities?: string[];
}

/** GET /staff/permissions/catalog/ — xom javob (`permissions.normalizeCatalog` tozalaydi). */
export interface PermissionCatalogResponse {
  capabilities: unknown;
  role_defaults: unknown;
  /** Hozirgi foydalanuvchi boshqalarga bera oladigan kalitlar. */
  grantable?: unknown;
  is_owner?: unknown;
}

export async function fetchStaff(): Promise<StaffItem[]> {
  return apiClient<StaffItem[]>('/api/restaurant/admin/v1/staff/');
}

export async function createStaff(data: StaffPayload): Promise<StaffCreateResponse> {
  return apiClient<StaffCreateResponse>('/api/restaurant/admin/v1/staff/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateStaff(id: number, data: StaffPatch): Promise<StaffItem> {
  return apiClient<StaffItem>(`/api/restaurant/admin/v1/staff/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function blockStaff(id: number): Promise<{ status: string; id: number; username: string }> {
  return apiClient<{ status: string; id: number; username: string }>(`/api/restaurant/admin/v1/staff/${id}/block/`, {
    method: 'POST',
  });
}

export async function unblockStaff(id: number): Promise<{ status: string; id: number; username: string }> {
  return apiClient<{ status: string; id: number; username: string }>(`/api/restaurant/admin/v1/staff/${id}/unblock/`, {
    method: 'POST',
  });
}

export async function resetStaffPassword(
  id: number,
  password?: string
): Promise<{ status: string; id: number; username: string; generated_password?: string }> {
  return apiClient<{ status: string; id: number; username: string; generated_password?: string }>(
    `/api/restaurant/admin/v1/staff/${id}/reset-password/`,
    {
      method: 'POST',
      body: JSON.stringify({ password }),
    }
  );
}

export async function fetchPermissionCatalog(): Promise<PermissionCatalogResponse> {
  return apiClient<PermissionCatalogResponse>('/api/restaurant/admin/v1/staff/permissions/catalog/');
}

/**
 * Yangi parol o'rnatish. Muvaffaqiyatda `{status: 'password_changed', ...}`; kuchsiz parol — 400 `{error, field:'password'}`.
 * O'z parolingizni almashtirishda JORIY parol (`current_password`) ham yuboriladi (server talab qiladi).
 */
export async function setStaffPassword(
  id: number,
  password: string,
  currentPassword?: string,
): Promise<{ status?: string; ok?: boolean }> {
  const body: Record<string, string> = { password };
  if (currentPassword !== undefined) body.current_password = currentPassword;
  return apiClient<{ status?: string; ok?: boolean }>(`/api/restaurant/admin/v1/staff/${id}/set-password/`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
