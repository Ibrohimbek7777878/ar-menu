import { apiClient } from '@admins/shared';

export interface FinanceSummary {
  income: number;
  income_cash: number;
  income_card: number;
  expense: number;
  net_cash_flow: number;
  orders_count: number;
  average_check: number;
  cash_balance: number;
  from_date: string;
  to_date: string;
}

export interface FinanceTransaction {
  id: number;
  title: string;
  type: 'income' | 'expense';
  type_display: string;
  category_id: number | null;
  category_name: string;
  amount: number;
  payment_method: 'cash' | 'card' | 'bank';
  payment_method_display: string;
  source_type: 'manual' | 'receipt' | 'debt_payment';
  tx_date: string;
  created_at: string;
  is_cancelled: boolean;
  cancel_reason: string;
  cancelled_at: string | null;
}

export interface FinanceTransactionsResponse {
  items: FinanceTransaction[];
  page: number;
  page_size: number;
  total: number;
  num_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface DebtItem {
  id: number;
  person_name: string;
  phone: string;
  debt_type: 'customer' | 'supplier';
  debt_type_display: string;
  initial_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: string;
  status_display?: string;
  is_settled: boolean;
  due_date: string | null;
  notes: string;
  created_at: string;
}

export interface DebtsResponse {
  items: DebtItem[];
  summary: {
    total_debts_count: number;
    open_receivable: number;
    open_payable: number;
  };
}

export interface CategoryItem {
  id: number;
  name: string;
  type: string;
}

export async function fetchFinanceSummary(from?: string, to?: string): Promise<FinanceSummary> {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const q = params.toString();
  return apiClient<FinanceSummary>(`/api/restaurant/admin/v1/finance/summary/${q ? '?' + q : ''}`);
}

export async function fetchTransactions(params?: {
  page?: number;
  type?: string;
  from?: string;
  to?: string;
  category?: number;
  q?: string;
}): Promise<FinanceTransactionsResponse> {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', String(params.page));
  if (params?.type && params.type !== 'all') sp.set('type', params.type);
  if (params?.from) sp.set('from', params.from);
  if (params?.to) sp.set('to', params.to);
  if (params?.category) sp.set('category', String(params.category));
  if (params?.q) sp.set('q', params.q);
  const q = sp.toString();
  return apiClient<FinanceTransactionsResponse>(`/api/restaurant/admin/v1/finance/transactions/${q ? '?' + q : ''}`);
}

export async function createTransaction(data: {
  type: 'income' | 'expense';
  amount: number;
  title: string;
  payment_method: string;
  category_id?: number;
  tx_date?: string;
}): Promise<FinanceTransaction> {
  return apiClient<FinanceTransaction>('/api/restaurant/admin/v1/finance/transactions/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function cancelTransaction(id: number, reason: string): Promise<FinanceTransaction> {
  return apiClient<FinanceTransaction>(`/api/restaurant/admin/v1/finance/transactions/${id}/cancel/`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function fetchDebts(params?: {
  type?: string;
  status?: string;
  q?: string;
}): Promise<DebtsResponse> {
  const sp = new URLSearchParams();
  if (params?.type && params.type !== 'all') sp.set('type', params.type);
  if (params?.status && params.status !== 'all') sp.set('status', params.status);
  if (params?.q) sp.set('q', params.q);
  const q = sp.toString();
  return apiClient<DebtsResponse>(`/api/restaurant/admin/v1/finance/debts/${q ? '?' + q : ''}`);
}

export async function createDebt(data: {
  person_name: string;
  phone?: string;
  debt_type: 'customer' | 'supplier';
  initial_amount: number;
  due_date?: string;
  notes?: string;
}): Promise<DebtItem> {
  return apiClient<DebtItem>('/api/restaurant/admin/v1/finance/debts/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function payDebt(
  id: number,
  data: {
    amount: number;
    payment_method: string;
    note?: string;
  }
): Promise<DebtItem> {
  return apiClient<DebtItem>(`/api/restaurant/admin/v1/finance/debts/${id}/pay/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchCategories(): Promise<CategoryItem[]> {
  return apiClient<CategoryItem[]>('/api/restaurant/admin/v1/finance/categories/');
}

export function getExportCsvUrl(from?: string, to?: string): string {
  const sp = new URLSearchParams();
  if (from) sp.set('from', from);
  if (to) sp.set('to', to);
  const q = sp.toString();
  return `/api/restaurant/admin/v1/finance/export.csv${q ? '?' + q : ''}`;
}
