import { apiClient } from '@admins/shared';

export interface MenuProduct {
  id: number;
  name: string;
  slug: string;
  description: string;
  // Mehmon menyusi tarjimalari (ixtiyoriy; bo'sh bo'lsa mehmon o'zbekcha nom/tavsifni ko'radi)
  name_ru?: string;
  name_en?: string;
  description_ru?: string;
  description_en?: string;
  price: number;
  old_price?: number | null;
  category_id?: number | null;
  category?: {
    id: number;
    name: string;
  } | null;
  image?: string | null;
  ar_model?: string | null;
  has_3d: boolean;
  is_available: boolean;
  prep_minutes?: number | null;
  cook_min?: number;
  has_real_photo: boolean;
  is_featured: boolean;
  is_deleted: boolean;
  stock?: number;
}

export interface MenuCategory {
  id: number;
  name: string;
  slug?: string;
  is_restaurant: boolean;
}

export interface MenuProductsResponse {
  count: number;
  num_pages: number;
  current_page: number;
  results: MenuProduct[];
  items?: MenuProduct[];
  total?: number;
}

export async function fetchMenuProducts(params: {
  status?: string;
  category?: number | string;
  q?: string;
  page?: number;
  page_size?: number;
}): Promise<MenuProductsResponse> {
  const searchParams = new URLSearchParams();
  if (params.status && params.status !== 'all') searchParams.set('status', params.status);
  if (params.category) searchParams.set('category', String(params.category));
  if (params.q) searchParams.set('q', params.q);
  if (params.page) searchParams.set('page', String(params.page));
  if (params.page_size) searchParams.set('page_size', String(params.page_size));

  const query = searchParams.toString();
  const endpoint = `/api/restaurant/admin/v1/menu/products/${query ? `?${query}` : ''}`;
  return apiClient<MenuProductsResponse>(endpoint);
}

export async function createMenuProduct(formData: FormData): Promise<MenuProduct> {
  return apiClient<MenuProduct>('/api/restaurant/admin/v1/menu/products/', {
    method: 'POST',
    body: formData,
  });
}

export async function updateMenuProduct(id: number, formData: FormData): Promise<MenuProduct> {
  return apiClient<MenuProduct>(`/api/restaurant/admin/v1/menu/products/${id}/`, {
    method: 'PATCH',
    body: formData,
  });
}

export async function deleteMenuProduct(id: number): Promise<{ success: boolean }> {
  return apiClient<{ success: boolean }>(`/api/restaurant/admin/v1/menu/products/${id}/`, {
    method: 'DELETE',
  });
}

export async function restoreMenuProduct(id: number): Promise<{ success: boolean }> {
  return apiClient<{ success: boolean }>(`/api/restaurant/admin/v1/menu/products/${id}/restore/`, {
    method: 'POST',
  });
}

export async function duplicateMenuProduct(id: number): Promise<MenuProduct> {
  return apiClient<MenuProduct>(`/api/restaurant/admin/v1/menu/products/${id}/duplicate/`, {
    method: 'POST',
  });
}

export async function toggleMenuProductFeature(id: number, value: boolean): Promise<{ success: boolean; is_featured: boolean }> {
  return apiClient<{ success: boolean; is_featured: boolean }>(`/api/restaurant/admin/v1/menu/products/${id}/feature/`, {
    method: 'POST',
    body: JSON.stringify({ value }),
  });
}

export async function toggleMenuProductAvailability(id: number, available?: boolean): Promise<{ success: boolean; is_available: boolean }> {
  return apiClient<{ success: boolean; is_available: boolean }>(`/api/restaurant/admin/v1/menu/products/${id}/availability/`, {
    method: 'POST',
    body: JSON.stringify({ available }),
  });
}

export async function fetchMenuCategories(): Promise<MenuCategory[]> {
  const data = await apiClient<MenuCategory[] | { items: MenuCategory[] }>('/api/restaurant/admin/v1/menu/categories/');
  if (Array.isArray(data)) return data;
  return data.items || [];
}

export async function createMenuCategory(name: string): Promise<MenuCategory> {
  return apiClient<MenuCategory>('/api/restaurant/admin/v1/menu/categories/', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}
