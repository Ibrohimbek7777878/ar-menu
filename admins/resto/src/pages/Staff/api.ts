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

export async function fetchStaff(): Promise<StaffItem[]> {
  return apiClient<StaffItem[]>('/api/restaurant/admin/v1/staff/');
}

export async function createStaff(data: StaffPayload): Promise<StaffCreateResponse> {
  return apiClient<StaffCreateResponse>('/api/restaurant/admin/v1/staff/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateStaff(id: number, data: Partial<StaffPayload>): Promise<StaffItem> {
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
