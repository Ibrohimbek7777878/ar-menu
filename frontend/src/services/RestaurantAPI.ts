/**
 * Restaurant API Client for React SPA (Offline-First & Single-Request architecture).
 * Provides single-request atomic operations between Guest, Waiter, KDS and Finance.
 */

const API_BASE = '/api/v1/restaurant';

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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_number: tableNumber, type, title }),
      });
      if (!res.ok) throw new Error('Create service call failed');
      return await res.json();
    } catch (err) {
      console.warn('[RestaurantAPI] Offline fallback for createServiceCall:', err);
      return null;
    }
  },

  // 7. Chaqiruvni qabul qilish yoki yakunlash
  async updateServiceCallStatus(callId: number | string, status: 'accepted' | 'done') {
    try {
      const res = await fetch(`${API_BASE}/calls/${callId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Update service call failed');
      return await res.json();
    } catch (err) {
      console.warn('[RestaurantAPI] Offline fallback for updateServiceCallStatus:', err);
      return null;
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dish),
      });
      if (!res.ok) throw new Error('Add item to table failed');
      return await res.json();
    } catch (err) {
      console.warn('[RestaurantAPI] Offline fallback for addDishToTable:', err);
      return null;
    }
  },

  // 10. Stol band qilish ro'yxati (Hostess Desk)
  async getReservations(params?: { date?: string; status?: string; q?: string }) {
    try {
      const query = new URLSearchParams(params as any).toString();
      const url = `${API_BASE}/reservations/${query ? `?${query}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Fetch reservations failed');
      return await res.json();
    } catch (err) {
      console.warn('[RestaurantAPI] Offline fallback for getReservations:', err);
      return null;
    }
  },

  // 11. Yangi stol band qilish (Reservation)
  async createReservation(payload: {
    customer_name: string;
    customer_phone?: string;
    table_number?: string | number;
    guests_count?: number;
    reservation_date?: string;
    reservation_time?: string;
    date?: string;
    time?: string;
    notes?: string;
    hall?: string;
    status?: string;
  }) {
    try {
      const res = await fetch(`${API_BASE}/reservations/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Create reservation failed');
      return await res.json();
    } catch (err) {
      console.warn('[RestaurantAPI] Offline fallback for createReservation:', err);
      return null;
    }
  },

  // 12. Bron holatini o'zgartirish (arrived, seated, confirmed, cancelled)
  async updateReservationStatus(reservationId: number | string, status: string) {
    try {
      const res = await fetch(`${API_BASE}/reservations/${reservationId}/status/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Update reservation status failed');
      return await res.json();
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
        headers: { 'Content-Type': 'application/json' },
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
