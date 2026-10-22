/**
 * Restaurant API Client for React SPA (Offline-First & Single-Request architecture).
 * Provides single-request atomic operations between Guest, Waiter, KDS and Finance.
 */

const API_BASE = '/api/v1/restaurant';

// Django CSRF token (cookie'dan). Xodim sessiyasi bilan yuboriladigan POST/PATCH so'rovlari
// server tomonida CSRF bilan tekshiriladi — tokensiz 403 qaytadi (TZ: R-SEC-02).
function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

function jsonHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() };
}

export const RestaurantAPI = {
  // 1. Yangi buyurtma yaratish (Guest & Waiter) -> Bitta so'rov
  async createOrder(payload: {
    table_number: string | number;
    customer_name: string;
    phone?: string;
    notes?: string;
    items: Array<{
      name: string;
      price: number;
      quantity: number;
      unit?: string;
      course?: string;
      notes?: string;
      product_id?: number | null;
    }>;
  }) {
    try {
      const res = await fetch(`${API_BASE}/orders/create/`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Server order create failed');
      return await res.json();
    } catch (err) {
      console.warn('[RestaurantAPI] Offline fallback for createOrder:', err);
      return null;
    }
  },

  // 2. Buyurtmalar ro'yxatini olish (KDS, Waiter, Admin)
  async getOrders() {
    try {
      const res = await fetch(`${API_BASE}/orders/`);
      if (!res.ok) throw new Error('Fetch orders failed');
      return await res.json();
    } catch (err) {
      console.warn('[RestaurantAPI] Offline fallback for getOrders:', err);
      return null;
    }
  },

  // 3. Oshpaz taom holatini o'zgartirishi (KDS -> Waiter) -> Bitta so'rov
  async toggleKitchenItem(itemId: number | string) {
    try {
      const res = await fetch(`${API_BASE}/kitchen/items/${itemId}/toggle/`, {
        method: 'POST',
        headers: jsonHeaders(),
      });
      if (!res.ok) throw new Error('Toggle kitchen item failed');
      return await res.json();
    } catch (err) {
      console.warn('[RestaurantAPI] Offline fallback for toggleKitchenItem:', err);
      return null;
    }
  },

  // 4. Stollar holatini olish
  async getTables() {
    try {
      const res = await fetch(`${API_BASE}/tables/`);
      if (!res.ok) throw new Error('Fetch tables failed');
      return await res.json();
    } catch (err) {
      console.warn('[RestaurantAPI] Offline fallback for getTables:', err);
      return null;
    }
  },

  // 5. Stol hisobini bitta so'rovda yopish (Stol bo'shaydi + Kassaga kirim tushadi!) -> Bitta so'rov
  async settleTableBill(tableNumber: string | number, paymentMethod: 'cash' | 'card' = 'cash') {
    try {
      const res = await fetch(`${API_BASE}/tables/${tableNumber}/settle/`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ payment_method: paymentMethod }),
      });
      if (!res.ok) throw new Error('Settle table bill failed');
      return await res.json();
    } catch (err) {
      console.warn('[RestaurantAPI] Offline fallback for settleTableBill:', err);
      return null;
    }
  },

  // 6. Xizmat chaqiruvi (Choy, Non, Ofitsiant, Hisob) -> Bitta so'rov
  async createServiceCall(tableNumber: string | number, type: string, title: string) {
    try {
      const res = await fetch(`${API_BASE}/calls/`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ table_number: tableNumber, type, title }),
      });
      if (!res.ok) throw new Error('Create service call failed');
      return await res.json();
    } catch (err) {
      console.warn('[RestaurantAPI] Offline fallback for createServiceCall:', err);
      return null;
    }
  },

  // 6b. Ochiq chaqiruvlar ro'yxati (ofitsiant paneli)
  async getServiceCalls() {
    try {
      const res = await fetch(`${API_BASE}/calls/`, { credentials: 'same-origin' });
      if (!res.ok) throw new Error('Fetch service calls failed');
      return await res.json();
    } catch (err) {
      console.warn('[RestaurantAPI] getServiceCalls failed:', err);
      return null;
    }
  },

  // 6c. Oshxona buyurtma holatini o'zgartiradi (state machine serverda; pending -> preparing avval confirmed)
  async updateOrderStatus(orderId: number | string, status: string): Promise<boolean> {
    try {
      const res = await fetch('/api/kds/status/', {
        method: 'POST',
        headers: jsonHeaders(),
        credentials: 'same-origin',
        body: JSON.stringify({ order_id: orderId, new_status: status }),
      });
      return res.ok;
    } catch (err) {
      console.warn('[RestaurantAPI] updateOrderStatus failed:', err);
      return false;
    }
  },

  // 7. Chaqiruvni qabul qilish yoki yakunlash
  async updateServiceCallStatus(callId: number | string, status: 'accepted' | 'done') {
    try {
      const res = await fetch(`${API_BASE}/calls/${callId}/`, {
        method: 'PATCH',
        headers: jsonHeaders(),
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Update service call failed');
      return await res.json();
    } catch (err) {
      console.warn('[RestaurantAPI] Offline fallback for updateServiceCallStatus:', err);
      return null;
    }
  },

  // 7b. Moliya yozuvlari (serverda saqlanadi). Natija: { ok, data } yoki { ok:false, error } — sababi foydalanuvchiga ko'rsatiladi
  async financeWrite(path: string, body: Record<string, unknown>): Promise<{ ok: boolean; data?: any; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/finance/${path}`, {
        method: 'POST',
        headers: jsonHeaders(),
        credentials: 'same-origin',
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) return { ok: false, error: data?.error || "Server xatosi. Qayta urinib ko'ring." };
      return { ok: true, data };
    } catch {
      return { ok: false, error: "Internet bilan aloqa yo'q. Yozuv saqlanmadi." };
    }
  },

  // 8. Moliya va Nasiyalar sinxronizatsiyasi
  async getFinanceData() {
    try {
      const res = await fetch(`${API_BASE}/finance/`);
      if (!res.ok) throw new Error('Fetch finance data failed');
      return await res.json();
    } catch (err) {
      console.warn('[RestaurantAPI] Offline fallback for getFinanceData:', err);
      return null;
    }
  },

  // 9. Ofitsiant ochiq stolga yangi taom qo'shishi (Atomic)
  async addDishToTable(tableNumber: string | number, dish: { name: string; price: number; quantity?: number; course?: string; notes?: string; product_id?: number | null }) {
    try {
      const res = await fetch(`${API_BASE}/tables/${tableNumber}/add-item/`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify(dish),
      });
      if (!res.ok) throw new Error('Add item to table failed');
      return await res.json();
    } catch (err) {
      console.warn('[RestaurantAPI] Offline fallback for addDishToTable:', err);
      return null;
    }
  },

  // 10. Stol band qilish ro'yxati (Hostess Desk). Standart: bugun, faol holatlar.
  async getReservations(params?: { date?: string; status?: string; q?: string }) {
    try {
      const query = new URLSearchParams((params || {}) as Record<string, string>).toString();
      const res = await fetch(`${API_BASE}/reservations/${query ? `?${query}` : ''}`);
      if (!res.ok) throw new Error('Fetch reservations failed');
      return await res.json();
    } catch (err) {
      console.warn('[RestaurantAPI] Offline fallback for getReservations:', err);
      return null;
    }
  },

  // 11. Yangi bron / jonli mehmon (walk_in). Server xatosi ({error, code, status}) qaytariladi, tarmoq xatosida null.
  async createReservation(payload: {
    customer_name: string;
    customer_phone?: string;
    table_number?: string | number;
    guests_count?: number;
    reservation_date?: string;
    reservation_time?: string;
    notes?: string;
    hall?: string;
    walk_in?: boolean;
  }) {
    try {
      const res = await fetch(`${API_BASE}/reservations/`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { error: data?.error || "Bronni saqlab bo'lmadi", code: data?.code, status: res.status };
      return data;
    } catch (err) {
      console.warn('[RestaurantAPI] Offline fallback for createReservation:', err);
      return null;
    }
  },

  // 12. Bron holatini o'zgartirish (pending → confirmed → arrived → seated → completed; cancelled)
  async updateReservationStatus(reservationId: number | string, status: string, tableNumber?: string | number) {
    try {
      const res = await fetch(`${API_BASE}/reservations/${reservationId}/status/`, {
        method: 'PATCH',
        headers: jsonHeaders(),
        body: JSON.stringify(tableNumber === undefined ? { status } : { status, table_number: tableNumber }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { error: data?.error || "Holatni o'zgartirib bo'lmadi", code: data?.code, status: res.status };
      return data;
    } catch (err) {
      console.warn('[RestaurantAPI] Offline fallback for updateReservationStatus:', err);
      return null;
    }
  },

  // 13. Bronni kod yoki telefon bo'yicha qidirish
  async findReservation(query: string) {
    try {
      const res = await fetch(`${API_BASE}/reservations/find/?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Find reservation failed');
      return await res.json();
    } catch (err) {
      console.warn('[RestaurantAPI] Offline fallback for findReservation:', err);
      return null;
    }
  },

  // 14. 3D Fotogrammetriya va 360 Spin Frame ma'lumotlarini serverga yozish
  async saveProduct3DScan(payload: {
    name: string;
    price: number;
    category_name?: string;
    description?: string;
    image?: string;
    spin_frames?: string[];
    ar_model?: string;
    has_3d?: boolean;
  }, productId?: number) {
    try {
      const url = productId
        ? `${API_BASE}/products/${productId}/3d-scan/`
        : `${API_BASE}/products/3d-scan/`;
      const res = await fetch(url, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Save 3D scan failed');
      return await res.json();
    } catch (err) {
      console.warn('[RestaurantAPI] Offline fallback for saveProduct3DScan:', err);
      return null;
    }
  },

  // 15. Dinamik Menyu va Katalog olish (Pure SPA rejimida)
  async getMenu() {
    try {
      const res = await fetch(`${API_BASE}/menu/`);
      if (!res.ok) throw new Error('Fetch menu failed');
      return await res.json();
    } catch (err) {
      console.warn('[RestaurantAPI] Offline fallback for getMenu:', err);
      return null;
    }
  },
};
