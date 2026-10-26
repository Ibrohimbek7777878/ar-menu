import { apiClient } from '@admins/shared';

export interface TableItem {
  id: number;
  number: string;
  hall_id: number;
  hall_name: string;
  capacity: number;
  shape: 'rect' | 'round';
  status: 'free' | 'occupied' | 'ordering' | 'waiting' | 'ready' | 'bill' | 'cleaning';
  status_display: string;
  total_bill: number;
  active_orders_count: number;
  qr_token: string;
  qr_path: string;
  qr_url: string;
  qr_svg_url: string;
  is_active: boolean;
  is_deleted: boolean;
  deleted_at: string | null;
}

export interface HallItem {
  id: number;
  name: string;
  name_ru: string;
  name_en: string;
  order: number;
  tables_count: number;
  is_active: boolean;
}

export interface TablesSummary {
  total: number;
  free: number;
  occupied: number;
  bill: number;
  cleaning: number;
  deleted: number;
}

export interface TablesResponse {
  items: TableItem[];
  halls: HallItem[];
  summary: TablesSummary;
}

export interface TablePayload {
  number: string;
  hall_id?: number;
  capacity?: number;
  shape?: 'rect' | 'round';
  status?: string;
}

export interface HallPayload {
  name: string;
  order?: number;
}

export const fetchTables = async (params: {
  hall_id?: number;
  status?: string;
  q?: string;
  include_deleted?: boolean;
} = {}): Promise<TablesResponse> => {
  const query = new URLSearchParams();
  if (params.hall_id) query.set('hall_id', String(params.hall_id));
  if (params.status && params.status !== 'all') query.set('status', params.status);
  if (params.q) query.set('q', params.q);
  if (params.include_deleted) query.set('include_deleted', 'true');

  const qs = query.toString();
  return apiClient<TablesResponse>(`/api/restaurant/admin/v1/tables/${qs ? `?${qs}` : ''}`);
};

export const createTable = async (data: TablePayload): Promise<TableItem> => {
  return apiClient<TableItem>('/api/restaurant/admin/v1/tables/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateTable = async (id: number, data: Partial<TablePayload>): Promise<TableItem> => {
  return apiClient<TableItem>(`/api/restaurant/admin/v1/tables/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const deleteTable = async (id: number): Promise<{ status: string; id: number; number: string }> => {
  return apiClient<{ status: string; id: number; number: string }>(`/api/restaurant/admin/v1/tables/${id}/`, {
    method: 'DELETE',
  });
};

export const restoreTable = async (id: number): Promise<{ status: string; id: number; number: string }> => {
  return apiClient<{ status: string; id: number; number: string }>(`/api/restaurant/admin/v1/tables/${id}/restore/`, {
    method: 'POST',
  });
};

export const updateTableStatus = async (id: number, status: string): Promise<{ id: number; status: string; status_display: string }> => {
  return apiClient<{ id: number; status: string; status_display: string }>(`/api/restaurant/admin/v1/tables/${id}/status/`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
};

export const rotateTableQr = async (id: number): Promise<{ id: number; qr_token: string; qr_path: string; qr_url: string; qr_svg_url: string }> => {
  return apiClient<{ id: number; qr_token: string; qr_path: string; qr_url: string; qr_svg_url: string }>(`/api/restaurant/admin/v1/tables/${id}/rotate-qr/`, {
    method: 'POST',
  });
};

export const fetchHalls = async (): Promise<HallItem[]> => {
  return apiClient<HallItem[]>('/api/restaurant/admin/v1/tables/halls/');
};

export const createHall = async (data: HallPayload): Promise<HallItem> => {
  return apiClient<HallItem>('/api/restaurant/admin/v1/tables/halls/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateHall = async (id: number, data: Partial<HallPayload>): Promise<HallItem> => {
  return apiClient<HallItem>(`/api/restaurant/admin/v1/tables/halls/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const deleteHall = async (id: number): Promise<{ status: string; id: number }> => {
  return apiClient<{ status: string; id: number }>(`/api/restaurant/admin/v1/tables/halls/${id}/`, {
    method: 'DELETE',
  });
};
