# 👨‍💻 DEVELOPER & AI AGENT GUIDE (LOYIHADA ISHLASH QOIDALARI)
**Loyiha:** Online Store Guliston & Multi-Product Platform  
**Maqsad:** Har qanday dasturchi yoki sun'iy intellekt (AI) tizimni aralashtirmasdan, 100% toza va xatosiz ishlab keta olishi uchun qat'iy yo'riqnoma.

---

## ⚠️ OLTIN QOIDALAR (THE GOLDEN RULES)

1. **Uchta Mahsulotni Hech Qachon Aralashtirmang:**
   * **Mahsulot #1 (Restoran):** URL `/restaurant/`, `/ar/`, `/m/<slug>/`. Asosiy baza: `tables_restaurant`, `ar3d`.
   * **Mahsulot #2 (Marketplace):** URL `/market/`, `/catalog/`, `/cart/`. Asosiy baza: `shops`, `products`, `orders`, `couriers`.
   * **Mahsulot #3 (3D Studio):** URL `/studio/`, `/3d-print/`. Asosiy baza: `Print3DOrder`, `Print3DProduct`, `Print3DMaterial`.

2. **Root (/) Manziliga Ehtiyot Bo'ling:**
   * Asosiy domen (`/`) standart holatda **Restoran 3D Menyu** (`tma_views.tma_home`) ga ulangan.
   * Marketplace sahifasi esa `/market/` da joylashgan. Uni ko'r-ko‘rona root (`/`) ga qaytarib qo'ymang!

3. **Stol Tokenlarini Saqlang:**
   * `/ar/` va `/m/<slug>/` marshrutlarini ko'r-ko'rona `/restaurant/` ga redirect qilmang! Ular `views.ar_3d_menu_page` orqali stol parametrlarini (`?t=5`) saqlagan holda ishlashi shart.

4. **Sessiya va SECRET_KEY Xavfsizligi:**
   * `settings.py` da tasodifiy `secrets.token_urlsafe(50)` ishlatilmasin. Doimiy `DJANGO_SECRET_KEY` va uning statik zaxira kaliti mavjud bo'lishi shart. Aks holda server reload bo'lganda mijozlar savati va faol stollari o'chib ketadi.

5. **Multi-Shop Izolyatsiyasi:**
   * Telegram bildirishnomalari `order.shop_id` bo'yicha filtrlanadi. Hech qachon `Shop.objects.first()` fallbackiga tayanib boshqa restoranning xabarini adashtirib yubormang.

---

## 🗺 KOD VA FAYLLAR XARITASI (QAYSI ISH QAYSI FAYLDA QILINADI?)

### 1. Agar Siz RESTORAN 3D/AR MENYUSIDA ishlayotgan bo'lsangiz:
* **Asosiy View:** [`backend/web/tma_views.py`](file:///home/ibrohim/Desktop/client_baza/online%20store_guliston/backend/web/tma_views.py) va [`backend/ar3d/views.py`](file:///home/ibrohim/Desktop/client_baza/online%20store_guliston/backend/ar3d/views.py)
* **HTML Shablonlar:** [`backend/templates/tma/`](file:///home/ibrohim/Desktop/client_baza/online%20store_guliston/backend/templates/tma/)
  * `home.html` — 3D taomlar vitrinasi va toifalar.
  * `checkout.html` — Stolda, Yetkazib berish, Olib ketish va Naqd to'lov.
  * `table_hub.html` — Mening stolim, ofitsiant chaqirish, jonli hisob (live bill).
  * `order_detail.html` — Buyurtma holati kuzatuvi.
* **Mini ERP:** [`backend/web/seller_views.py`](file:///home/ibrohim/Desktop/client_baza/online%20store_guliston/backend/web/seller_views.py) dagi `seller_tables`, `seller_kds`, `waiter_panel`.
* **Bot & Webhook:** [`backend/notifications/admin_bot.py`](file:///home/ibrohim/Desktop/client_baza/online%20store_guliston/backend/notifications/admin_bot.py) va [`backend/web/telegram_webhook.py`](file:///home/ibrohim/Desktop/client_baza/online%20store_guliston/backend/web/telegram_webhook.py).
* **Hujjatlar:** [`docs/01_PRODUCT_RESTAURANT_3D_AR/`](file:///home/ibrohim/Desktop/client_baza/online%20store_guliston/docs/01_PRODUCT_RESTAURANT_3D_AR/)

---

### 2. Agar Siz ONLINE MARKETPLACE (E-COMMERCE) da ishlayotgan bo'lsangiz:
* **Asosiy View:** [`backend/web/views.py`](file:///home/ibrohim/Desktop/client_baza/online%20store_guliston/backend/web/views.py)
* **HTML Shablonlar:** [`backend/templates/customer/`](file:///home/ibrohim/Desktop/client_baza/online%20store_guliston/backend/templates/customer/)
  * `home.html` — Gipermarket bosh sahifasi (bannerlar, to'plamlar).
  * `catalog.html` — Bo'limlar va do'konlar filtri.
  * `cart.html`, `checkout.html` — Multi-vendor savatcha va kuryerlik yetkazish.
* **Mini ERP:** [`backend/web/seller_views.py`](file:///home/ibrohim/Desktop/client_baza/online%20store_guliston/backend/web/seller_views.py) dagi `seller_dashboard`, `seller_products`, `seller_orders`, `seller_couriers`.
* **Bot:** [`backend/notifications/bots.py`](file:///home/ibrohim/Desktop/client_baza/online%20store_guliston/backend/notifications/bots.py) dagi `market` boti.
* **Hujjatlar:** [`docs/02_PRODUCT_MARKETPLACE_ONLINE_STORE/`](file:///home/ibrohim/Desktop/client_baza/online%20store_guliston/docs/02_PRODUCT_MARKETPLACE_ONLINE_STORE/)

---

### 3. Agar Siz 3D STUDIO & PRINTING da ishlayotgan bo'lsangiz:
* **Asosiy View:** [`backend/ar3d/views.py`](file:///home/ibrohim/Desktop/client_baza/online%20store_guliston/backend/ar3d/views.py) dagi `print_3d_studio_page`, `print_3d_service_page`, `print_3d_order_api`.
* **HTML Shablonlar:**
  * [`backend/templates/ar3d/print_3d_studio.html`](file:///home/ibrohim/Desktop/client_baza/online%20store_guliston/backend/templates/ar3d/print_3d_studio.html)
  * [`backend/templates/ar3d/print_3d_service.html`](file:///home/ibrohim/Desktop/client_baza/online%20store_guliston/backend/templates/ar3d/print_3d_service.html)
  * [`backend/templates/seller/studio.html`](file:///home/ibrohim/Desktop/client_baza/online%20store_guliston/backend/templates/seller/studio.html)
* **Mini ERP:** [`backend/web/seller_views.py`](file:///home/ibrohim/Desktop/client_baza/online%20store_guliston/backend/web/seller_views.py) dagi `seller_3d_studio` (Print Queue Kanban).
* **Bot:** [`backend/notifications/bots.py`](file:///home/ibrohim/Desktop/client_baza/online%20store_guliston/backend/notifications/bots.py) dagi `studio` boti va [`backend/notifications/services/print3d_notification_service.py`](file:///home/ibrohim/Desktop/client_baza/online%20store_guliston/backend/notifications/services/print3d_notification_service.py).
* **Hujjatlar:** [`docs/03_PRODUCT_3D_STUDIO_PRINTING/`](file:///home/ibrohim/Desktop/client_baza/online%20store_guliston/docs/03_PRODUCT_3D_STUDIO_PRINTING/)

---

## 🧪 TEKSHIRISH VA TEST QOIDALARI

Har qanday o'zgarish kiritgandan so'ng, quyidagi 2 ta diagnostikani bajaring:
```bash
# 1. Django testlarini tekshirish (kamida 19/19 OK bo'lishi shart)
backend/venv/bin/python backend/manage.py test ar3d shops notifications

# 2. To'liq 45 ta ekotizim testlarini tekshirish (45/45 PASS bo'lishi shart)
backend/venv/bin/python backend/scripts/loop_engineering_test.py
```
Agar ushbu testlardan biri yiqilsa, kodni commit qilmang va xatoni zudlik bilan tuzating!
