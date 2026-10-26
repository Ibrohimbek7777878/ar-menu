import { apiClient } from '@admins/shared';

export interface TopDish {
  id: number;
  name: string;
  quantity: number;
  total_sum: number;
}

export interface DashboardSummary {
  today_revenue: {
    total: number;
    cash: number;
    card: number;
  };
  orders_count: number;
  average_check: number;
  active_orders: number;
  occupied_tables: number;
  total_tables: number;
  out_of_stock_count: number;
  top_dishes: TopDish[];
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  return apiClient<DashboardSummary>('/api/restaurant/admin/v1/dashboard/summary/');
}
