import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MenuProduct,
  MenuCategory,
  fetchMenuProducts,
  fetchMenuCategories,
  toggleMenuProductAvailability,
  toggleMenuProductFeature,
  deleteMenuProduct,
  restoreMenuProduct,
  duplicateMenuProduct,
  createMenuProduct,
  updateMenuProduct,
  createMenuCategory,
} from './api';
import { fetchWithSWR, invalidateCache, useToast } from '@admins/shared';

export type StatusFilter = 'all' | 'on' | 'off' | 'featured' | 'hidden';

export function useMenu() {
  const { showToast } = useToast();
  const [products, setProducts] = useState<MenuProduct[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  // Unmount bo'lgandan keyin va filtr almashgandan keyin eski javob holatni buzmasligi uchun
  const mountedRef = useRef(true);
  const activeKeyRef = useRef('');

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Kategoriyalarni yuklash
  const loadCategories = useCallback(async () => {
    try {
      const cats = await fetchMenuCategories();
      setCategories(cats);
    } catch {
      // ignore
    }
  }, []);

  // Mahsulotlarni yuklash (SWR kesh bilan)
  const loadProducts = useCallback(async (silent = false, force = false) => {
    if (!silent) setLoading(true);
    const cacheKey = `resto:menu:${selectedCategory}:${statusFilter}:${searchQuery}`;
    activeKeyRef.current = cacheKey;
    // Javob hali ham shu filtrga tegishlimi va sahifa ochiqmi
    const isCurrent = () => mountedRef.current && activeKeyRef.current === cacheKey;
    try {
      const res = await fetchWithSWR(
        cacheKey,
        () =>
          fetchMenuProducts({
            category: selectedCategory || undefined,
            status: statusFilter,
            q: searchQuery || undefined,
          }),
        {
          ttlMs: 15000,
          force,
          // Eskirgan kesh ko'rsatilgach, fonda kelgan yangi qiymat ekranga chiqadi
          onUpdate: (fresh) => {
            if (!isCurrent()) return;
            setProducts(fresh.results || fresh.items || []);
            setError(null);
          },
        }
      );
      if (!isCurrent()) return;
      setProducts(res.data.results || res.data.items || []);
      setError(null);
    } catch (err) {
      // Xatoda eski ro'yxat (products) o'zgarmaydi
      if (!isCurrent()) return;
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (!silent && isCurrent()) setLoading(false);
    }
  }, [selectedCategory, statusFilter, searchQuery]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Stop-list toggle (optimistic UI)
  const handleToggleAvailability = async (product: MenuProduct) => {
    const nextVal = !product.is_available;
    // Optimistic update
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, is_available: nextVal } : p))
    );
    try {
      await toggleMenuProductAvailability(product.id, nextVal);
      invalidateCache('resto:menu:');
      showToast(
        nextVal ? `"${product.name}" sotuvga qo'shildi` : `"${product.name}" stop-listga olindi`,
        'success'
      );
    } catch {
      // Rollback
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, is_available: !nextVal } : p))
      );
      showToast("Holatni o'zgartirib bo'lmadi", 'error');
    }
  };

  // Tavsiya (is_featured) toggle
  const handleToggleFeature = async (product: MenuProduct) => {
    const nextVal = !product.is_featured;
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, is_featured: nextVal } : p))
    );
    try {
      await toggleMenuProductFeature(product.id, nextVal);
      invalidateCache('resto:menu:');
      showToast(
        nextVal ? `"${product.name}" tavsiya etilganlarga qo'shildi` : `Tavsiya bekor qilindi`,
        'info'
      );
    } catch {
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, is_featured: !nextVal } : p))
      );
      showToast("Tavsiya holatini o'zgartirib bo'lmadi", 'error');
    }
  };

  // Nusxalash
  const handleDuplicate = async (product: MenuProduct) => {
    try {
      const duplicated = await duplicateMenuProduct(product.id);
      invalidateCache('resto:menu:');
      setProducts((prev) => [duplicated, ...prev]);
      showToast(`"${product.name}" nusxalandi`, 'success');
    } catch {
      showToast("Taomdan nusxa olib bo'lmadi", 'error');
    }
  };

  // Soft delete (yashirish)
  const handleDelete = async (product: MenuProduct) => {
    try {
      await deleteMenuProduct(product.id);
      invalidateCache('resto:menu:');
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      showToast(`"${product.name}" yashirildi (arxivlandi)`, 'info');
    } catch {
      showToast("Taomni yashirib bo'lmadi", 'error');
    }
  };

  // Qayta tiklash
  const handleRestore = async (product: MenuProduct) => {
    try {
      await restoreMenuProduct(product.id);
      invalidateCache('resto:menu:');
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      showToast(`"${product.name}" qayta tiklandi`, 'success');
    } catch {
      showToast("Taomni tiklab bo'lmadi", 'error');
    }
  };

  // Saqlash (Yaratish yoki Tahrirlash)
  const handleSaveProduct = async (id: number | null, formData: FormData) => {
    if (id) {
      const updated = await updateMenuProduct(id, formData);
      invalidateCache('resto:menu:');
      setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
      showToast(`"${updated.name}" saqlandi`, 'success');
      return updated;
    } else {
      const created = await createMenuProduct(formData);
      invalidateCache('resto:menu:');
      setProducts((prev) => [created, ...prev]);
      showToast(`"${created.name}" qo'shildi`, 'success');
      return created;
    }
  };

  // Yangi kategoriya yaratish
  const handleAddCategory = async (name: string) => {
    const cat = await createMenuCategory(name);
    setCategories((prev) => [...prev, cat]);
    showToast(`"${cat.name}" kategoriyasi yaratildi`, 'success');
    return cat;
  };

  return {
    products,
    categories,
    selectedCategory,
    setSelectedCategory,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    loading,
    error,
    // "Yangilash" keshni chetlab o'tib, darrov yangi ma'lumot oladi
    refresh: () => loadProducts(false, true),
    toggleAvailability: handleToggleAvailability,
    toggleFeature: handleToggleFeature,
    duplicate: handleDuplicate,
    remove: handleDelete,
    restore: handleRestore,
    saveProduct: handleSaveProduct,
    addCategory: handleAddCategory,
  };
}
