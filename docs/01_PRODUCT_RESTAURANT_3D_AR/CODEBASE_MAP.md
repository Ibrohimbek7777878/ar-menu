# 🗺 RESTORAN 3D/AR: KOD VA FAYLLAR XARITASI

Ushbu mahsulot quyidagi fayllar, modellar va shablonlar orqali ishlaydi:

---

## 1. Back-End Modullari (Apps & Models)

1. **`backend/tables_restaurant/`:**
   * `Hall` (Zal): Zallar (1-qavat, VIP xona, Terassa), tartib raqami.
   * `Table` (Stol): Stol raqami, sig'imi, holati (`free`, `occupied`, `ordering`, `bill`), QR token (`qr_token`), biriktirilgan ofitsiant.
   * `TableReservation` (Bron): Mehmon ismi, telefon, mehmonlar soni, sana, vaqt, status.
   * `TableServiceCall` (Xizmat chaqiruvi): Choy, non, ofitsiant, hisob chaqiruvlari.
2. **`backend/ar3d/`:**
   * `Product3DModel`: GLB/USDZ modellari, masshtab, animatsiya parametrlari.
   * `ProductLibrary`: Tayyor 3D taomlar kutubxonasi (Osh, Shashlik, Somsa, Manti...).
3. **`backend/orders/`:**
   * `Order.table`: Buyurtma qaysi stolga tegishli ekanligini ko'rsatadi.
   * `Order.shop`: Multi-shop tizimida aniq restoranni ko'rsatadi.

---

## 2. Views & Controllers

* **[`backend/web/tma_views.py`](file:///home/ibrohim/Desktop/client_baza/online%20store_guliston/backend/web/tma_views.py):**
  * `tma_home`: Restoran bosh sahifasi (3D taomlar vitrinasi, toifalar).
  * `tma_cart` & `tma_cart_api`: Savat bilan ishlash (miqdorni oshirish/kamaytirish).
  * `tma_checkout`: Stol orqali rasmiylashtirish, naqd to'lov, darhol KDS ga yuborish.
  * `tma_table_hub`: Mening stolim, jonli hisob, bron qilish formasi.
  * `tma_order_detail`: Oshxona navbati va buyurtma holati kuzatuvi.
* **[`backend/ar3d/views.py`](file:///home/ibrohim/Desktop/client_baza/online%20store_guliston/backend/ar3d/views.py):**
  * `ar_3d_menu_page`: WebXR interaktiv 3D menyu sahifasi.
  * `v1_menu_api`: Mobil va TMA uchun JSON ma'lumotlar API.
  * `v1_call_waiter_api`: Stoldan ofitsiant chaqirish API.
  * `table_entry_redirect`: `/t/<token>/` qisqa linklarini ochuvchi dispatcher.

---

## 3. Shablonlar (HTML Templates)

* **[`backend/templates/tma/`](file:///home/ibrohim/Desktop/client_baza/online%20store_guliston/backend/templates/tma/):**
  * `base_tma.html`: TMA uchun qora-oltin (Dark-Gold) luxury stil, Google Fonts, Tailwind.
  * `home.html`: Bosh vitrina, taom kartochkalari, in-place 3D modal viewer.
  * `cart.html`: Stoldagi buyurtmalar savati, dynamic DOM counters.
  * `checkout.html`: 3 tomonlama xizmat rejimi (Stolda, Dastavka, Olib ketish), Naqd to'lov default.
  * `table_hub.html`: Mening stolim, ofitsiant chaqirish tugmalari, stol bron qilish.
  * `order_detail.html`: Buyurtma cheki va holati (Kutilmoqda, Tayyorlanmoqda, Tayyor, Yetkazildi).
* **[`backend/templates/air_3d_menu_index.html`](file:///home/ibrohim/Desktop/client_baza/online%20store_guliston/backend/templates/air_3d_menu_index.html):**
  * Three.js / WebXR asosidagi ultra-zamonaviy 3D ko'rgazma interfeysi.

---

## 4. Mini ERP & Admin Shablonlari

* **[`backend/templates/seller/tables.html`](file:///home/ibrohim/Desktop/client_baza/online%20store_guliston/backend/templates/seller/tables.html):** Zallar va stollar boshqaruvi.
* **[`backend/templates/seller/kds.html`](file:///home/ibrohim/Desktop/client_baza/online%20store_guliston/backend/templates/seller/kds.html):** Oshpaz ekrani (Kitchen Display System).
* **[`backend/templates/seller/waiter_panel.html`](file:///home/ibrohim/Desktop/client_baza/online%20store_guliston/backend/templates/seller/waiter_panel.html):** Ofitsiant POS paneli.
* **[`backend/templates/seller/telegram_messages.html`](file:///home/ibrohim/Desktop/client_baza/online%20store_guliston/backend/templates/seller/telegram_messages.html):** Telegram xabarlari auditi.
