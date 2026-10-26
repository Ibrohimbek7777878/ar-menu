import { useCallback, useEffect, useState } from 'react';
import {
  blockStaff,
  createStaff,
  fetchStaff,
  resetStaffPassword,
  StaffCreateResponse,
  StaffItem,
  StaffPayload,
  unblockStaff,
  updateStaff,
} from './api';

export function useStaff() {
  const [staffList, setStaffList] = useState<StaffItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchStaff();
      setStaffList(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Xodimlarni yuklashda xatolik yuz berdi";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Add staff
  const addStaff = async (data: StaffPayload): Promise<StaffCreateResponse> => {
    const res = await createStaff(data);
    await loadData();
    return res;
  };

  // Edit staff
  const editStaff = async (id: number, data: Partial<StaffPayload>): Promise<StaffItem> => {
    const res = await updateStaff(id, data);
    await loadData();
    return res;
  };

  // Block staff
  const toggleBlock = async (id: number, currentActive: boolean) => {
    if (currentActive) {
      await blockStaff(id);
    } else {
      await unblockStaff(id);
    }
    await loadData();
  };

  // Reset password
  const resetPassword = async (id: number, password?: string) => {
    return resetStaffPassword(id, password);
  };

  // Filtered staff
  const filteredStaff = staffList.filter((item) => {
    if (roleFilter === 'blocked') {
      if (item.is_active) return false;
    } else if (roleFilter !== 'all') {
      if (item.role !== roleFilter) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.full_name.toLowerCase().includes(q);
      const matchUser = item.username.toLowerCase().includes(q);
      const matchPhone = item.phone.toLowerCase().includes(q);
      if (!matchName && !matchUser && !matchPhone) return false;
    }

    return true;
  });

  // Summary counts
  const summary = {
    total: staffList.length,
    waiters: staffList.filter((s) => s.role === 'waiter').length,
    kitchen: staffList.filter((s) => s.role === 'kitchen').length,
    managers: staffList.filter((s) => s.role === 'shop_manager' || s.role === 'shop_owner').length,
    blocked: staffList.filter((s) => !s.is_active).length,
  };

  return {
    staff: filteredStaff,
    allStaff: staffList,
    summary,
    loading,
    error,
    roleFilter,
    setRoleFilter,
    searchQuery,
    setSearchQuery,
    addStaff,
    editStaff,
    toggleBlock,
    resetPassword,
    refresh: loadData,
  };
}
