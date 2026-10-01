# 🗺 3D STUDIO & PRINTING: KOD VA FAYLLAR XARITASI

Ushbu mahsulot quyidagi modullar, viewlar va shablonlar orqali ishlaydi:

---

## 1. Back-End Modullari (Apps & Models)

1. **`backend/ar3d/`:**
   * `Print3DOrder`:
     * Buyurtma raqami (`3DP-...`), mijoz ismi, telefon, Telegram chat ID.
     * Turi (`custom` yoki tayyor `catalog`).
     * Material (`PLA`, `PETG`, `ABS`, `TPU`, `Resin`), rang, infill, qatlam qalinligi.
     * Yuklangan fayl (`file_path`), fayl hajmi, taxminiy gramm og'irligi.
     * Boshlang'ich narx (`base_amount`), 5% keshbek chegirmasi (`discount_amount`), yakuniy narx (`final_amount`).
     * Yetkazib berish turi (`pickup` yoki `delivery`).
     * Holati (`new`, `confirmed`, `printing`, `ready`, `delivered`, `cancelled`).
   * `Print3DMaterial`: Materiallar spetsifikatsiyasi, 1 gramm narxi, xususiyatlari, ranglar ro'yxati.
   * `Print3DProduct`: Tayyor 3D suvenirlar, ehtiyot qismlar katalogi.

---

## 2. Views & Controllers

* **[`backend/ar3d/views.py`](file:///home/ibrohim/Desktop/client_baza/online%20store_guliston/backend/ar3d/views.py):**
  * `print_3d_studio_page` (marshrut: `/studio/`): Asosiy taqdimot portali va xizmatlar vitrinasi.
  * `print_3d_service_page` (marshrut: `/3d-print/`): Interaktiv narx kalkulyatori va Three.js 3D viewer.
  * `print_3d_order_api` (marshrut: `/3d-print/order/`): AJAX orqali buyurtma qabul qilish va Telegram bildirishnomasini yuborish.
* **[`backend/web/seller_views.py`](file:///home/ibrohim/Desktop/client_baza/online%20store_guliston/backend/web/seller_views.py):**
  * `seller_3d_studio` (marshrut: `/seller/studio/`): 3D ustaxona Kanban paneli (Chop etish navbati, status o'zgartirish).
* **[`backend/notifications/services/print3d_notification_service.py`](file:///home/ibrohim/Desktop/client_baza/online%20store_guliston/backend/notifications/services/print3d_notification_service.py):**
  * `notify_admin_new_3d_order`: Yangi 3D buyurtma tushganda ustaga Telegram orqali fayl, material va smeta hisobini yuborish.
  * `notify_customer_3d_order_ready`: Buyurtma chop etib bo'lingach, mijozga fotosurat va lokatsiya bilan chek yuborish.

---

## 3. Shablonlar (HTML Templates)

* **[`backend/templates/ar3d/print_3d_studio.html`](file:///home/ibrohim/Desktop/client_baza/online%20store_guliston/backend/templates/ar3d/print_3d_studio.html):** Cyberpunk / High-tech qora dizayndagi 3D Studio taqdimot portali.
* **[`backend/templates/ar3d/print_3d_service.html`](file:///home/ibrohim/Desktop/client_baza/online%20store_guliston/backend/templates/ar3d/print_3d_service.html):** Three.js 3D interaktiv STL yuklash kalkulyatori.
* **[`backend/templates/seller/studio.html`](file:///home/ibrohim/Desktop/client_baza/online%20store_guliston/backend/templates/seller/studio.html):** Usta / Admin uchun Print Queue Kanban doskasi.
