import { useCallback, useEffect, useRef, useState } from 'react';
import { tr } from '@admins/shared';
import {
  fetchOrders,
  OrderDTO,
  OrdersResponse,
  OrdersSummary,
  updateOrderPayment,
  updateOrderStatus,
} from './api';

const DEFAULT_SUMMARY: OrdersSummary = {
  today_total: 0,
  pending: 0,
  confirmed: 0,
  preparing: 0,
  ready: 0,
  delivered: 0,
  cancelled: 0,
};

export function useOrders() {
  const [data, setData] = useState<OrdersResponse>({
    items: [],
    summary: DEFAULT_SUMMARY,
    page: 1,
    page_size: 20,
    total: 0,
    num_pages: 1,
    has_next: false,
    has_previous: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const timerRef = useRef<number | null>(null);

  const loadData = useCallback(
    async (isBackground = false) => {
      try {
        if (!isBackground) setLoading(true);
        setError(null);

        const res = await fetchOrders({
          status: statusFilter === 'all' ? undefined : statusFilter,
          date: dateFilter === 'all' ? undefined : dateFilter,
          q: searchQuery || undefined,
          page,
          page_size: 20,
        });

        setData(res);
      } catch (err: unknown) {
        // Xabar o'zbekcha saqlanadi, sahifa uni ko'rsatishda t() bilan tarjima qiladi (til almashganda ham to'g'ri chiqadi)
        const msg = err instanceof Error ? err.message : tr('Buyurtmalarni yuklashda xatolik yuz berdi');
        setError(msg);
      } finally {
        if (!isBackground) setLoading(false);
      }
    },
    [statusFilter, dateFilter, searchQuery, page]
  );

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  // Polling (TZ 219: 10s, document.hidden bo'lsa to'xtaydi)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        if (timerRef.current) clearInterval(timerRef.current);
      } else {
        loadData(true);
        startInterval();
      }
    };

    const startInterval = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
        if (!document.hidden) {
          loadData(true);
        }
      }, 10000);
    };

    startInterval();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadData]);

  // Optimistic status change
  const changeStatus = async (orderId: number, newStatus: string, cancelReason?: string) => {
    setData((prev) => ({
      ...prev,
      items: prev.items.map((o) =>
        o.id === orderId ? { ...o, status: newStatus as OrderDTO['status'] } : o
      ),
    }));

    try {
      await updateOrderStatus(orderId, newStatus, cancelReason);
      await loadData(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : tr("Buyurtma holatini o'zgartirib bo'lmadi");
      setError(msg);
      await loadData(true);
    }
  };

  // Optimistic payment change
  const changePayment = async (orderId: number, newPayment: string) => {
    setData((prev) => ({
      ...prev,
      items: prev.items.map((o) =>
        o.id === orderId ? { ...o, payment_status: newPayment as OrderDTO['payment_status'] } : o
      ),
    }));

    try {
      await updateOrderPayment(orderId, newPayment);
      await loadData(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : tr("To'lov holatini o'zgartirib bo'lmadi");
      setError(msg);
      await loadData(true);
    }
  };

  return {
    orders: data.items,
    summary: data.summary,
    page: data.page,
    totalPages: data.num_pages,
    totalCount: data.total,
    hasNext: data.has_next,
    hasPrev: data.has_previous,
    loading,
    error,
    statusFilter,
    setStatusFilter: (st: string) => {
      setStatusFilter(st);
      setPage(1);
    },
    dateFilter,
    setDateFilter: (df: string) => {
      setDateFilter(df);
      setPage(1);
    },
    searchQuery,
    setSearchQuery: (q: string) => {
      setSearchQuery(q);
      setPage(1);
    },
    setPage,
    changeStatus,
    changePayment,
    refresh: () => loadData(false),
  };
}
