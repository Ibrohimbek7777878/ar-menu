import { apiClient } from '@admins/shared';

export interface OrderItemDTO {
  id: number;
  product_id?: number | null;
  product_name: string;
  product_image: string;
  quantity: number;
  price: number;
  unit: string;
  total: number;
  course: string;
  notes: string;
  cooking_status: string;
  is_done: boolean;
}

export interface OrderDTO {
  id: number;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  table: {
    id: number;
    number: string;
    hall_name: string;
  } | null;
  table_number: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
  status_display: string;
  payment_status: 'unpaid' | 'pending' | 'paid' | 'refunded';
  payment_status_display: string;
  is_pickup: boolean;
  notes: string;
  total_amount: number;
  discount_amount: number;
  delivery_fee: number;
  final_amount: number;
  items_count: number;
  items: OrderItemDTO[];
  cancel_reason: string;
  created_at: string;
  confirmed_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
}

export interface OrdersSummary {
  today_total: number;
  pending: number;
  confirmed: number;
  preparing: number;
  ready: number;
  delivered: number;
  cancelled: number;
}

export interface OrdersResponse {
  items: OrderDTO[];
  summary: OrdersSummary;
  page: number;
  page_size: number;
  total: number;
  num_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export async function fetchOrders(params: {
  status?: string;
  payment_status?: string;
  table_id?: number;
  date?: string;
  from?: string;
  to?: string;
  q?: string;
  page?: number;
  page_size?: number;
} = {}): Promise<OrdersResponse> {
  const query = new URLSearchParams();
  if (params.status && params.status !== 'all') query.set('status', params.status);
  if (params.payment_status && params.payment_status !== 'all') query.set('payment_status', params.payment_status);
  if (params.table_id) query.set('table_id', String(params.table_id));
  if (params.date) query.set('date', params.date);
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);
  if (params.q) query.set('q', params.q);
  if (params.page) query.set('page', String(params.page));
  if (params.page_size) query.set('page_size', String(params.page_size));

  const qs = query.toString();
  return apiClient<OrdersResponse>(`/api/restaurant/admin/v1/orders/${qs ? `?${qs}` : ''}`);
}

export async function fetchOrderDetail(id: number): Promise<OrderDTO> {
  return apiClient<OrderDTO>(`/api/restaurant/admin/v1/orders/${id}/`);
}

export async function updateOrderStatus(
  id: number,
  status: string,
  cancel_reason?: string
): Promise<{ id: number; order_number: string; status: string; status_display: string }> {
  return apiClient<{ id: number; order_number: string; status: string; status_display: string }>(
    `/api/restaurant/admin/v1/orders/${id}/status/`,
    {
      method: 'POST',
      body: JSON.stringify({ status, cancel_reason }),
    }
  );
}

export async function updateOrderPayment(
  id: number,
  payment_status: string
): Promise<{ id: number; order_number: string; payment_status: string; payment_status_display: string }> {
  return apiClient<{ id: number; order_number: string; payment_status: string; payment_status_display: string }>(
    `/api/restaurant/admin/v1/orders/${id}/payment/`,
    {
      method: 'POST',
      body: JSON.stringify({ payment_status }),
    }
  );
}
