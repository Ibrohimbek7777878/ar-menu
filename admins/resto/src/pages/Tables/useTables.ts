import { useCallback, useEffect, useRef, useState } from 'react';
import {
  deleteTable,
  fetchTables,
  restoreTable,
  rotateTableQr,
  TableItem,
  TablesResponse,
  TablesSummary,
  updateTableStatus,
} from './api';

const DEFAULT_SUMMARY: TablesSummary = {
  total: 0,
  free: 0,
  occupied: 0,
  bill: 0,
  cleaning: 0,
  deleted: 0,
};

export function useTables() {
  const [data, setData] = useState<TablesResponse>({
    items: [],
    halls: [],
    summary: DEFAULT_SUMMARY,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedHall, setSelectedHall] = useState<number | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const timerRef = useRef<number | null>(null);

  const loadData = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      setError(null);

      const res = await fetchTables({
        hall_id: selectedHall === 'all' ? undefined : selectedHall,
        status: statusFilter === 'deleted' ? undefined : statusFilter,
        q: searchQuery || undefined,
        include_deleted: statusFilter === 'deleted',
      });

      setData(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Stollarni yuklashda xatolik yuz berdi";
      setError(msg);
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [selectedHall, statusFilter, searchQuery]);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  // Polling (TZ 223: 10s, document.hidden bo'lsa to'xtaydi)
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

  // Optimistic status update
  const changeStatus = async (tableId: number, newStatus: string) => {
    // 1. Optimistic UI update
    setData((prev) => ({
      ...prev,
      items: prev.items.map((t) => (t.id === tableId ? { ...t, status: newStatus as TableItem['status'] } : t)),
    }));

    try {
      await updateTableStatus(tableId, newStatus);
      await loadData(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Holatni o'zgartirib bo'lmadi";
      setError(msg);
      await loadData(true); // rollback
    }
  };

  // QR Rotate
  const rotateQr = async (tableId: number) => {
    const res = await rotateTableQr(tableId);
    setData((prev) => ({
      ...prev,
      items: prev.items.map((t) =>
        t.id === tableId
          ? {
              ...t,
              qr_token: res.qr_token,
              qr_path: res.qr_path,
              qr_url: res.qr_url,
              qr_svg_url: res.qr_svg_url,
            }
          : t
      ),
    }));
    return res;
  };

  // Soft delete
  const removeTable = async (tableId: number) => {
    await deleteTable(tableId);
    await loadData(false);
  };

  // Restore
  const restoreDeletedTable = async (tableId: number) => {
    await restoreTable(tableId);
    await loadData(false);
  };

  return {
    tables: data.items,
    halls: data.halls,
    summary: data.summary,
    loading,
    error,
    selectedHall,
    setSelectedHall,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    changeStatus,
    rotateQr,
    removeTable,
    restoreDeletedTable,
    refresh: () => loadData(false),
  };
}
