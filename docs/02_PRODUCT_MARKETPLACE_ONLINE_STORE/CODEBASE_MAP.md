# 🗺 ONLINE STORE GULISTON (MARKETPLACE): KOD VA FAYLLAR XARITASI

Ushbu mahsulot quyidagi modullar, viewlar va shablonlar orqali ishlaydi:

---

## 1. Back-End Modullari (Apps & Models)

1. **`backend/shops/`:**
   * `Shop`: Do'kon nomi, slug, kategoriya, koordinatalar (lat/lng), manzil, telefon, ish vaqti, yetkazish narxi, do'kon turi (`store_type`).
   * `ShopTemplate`: 60+ ta Figma shablonlari, CSS ranglar, shriftlar.
   * `ShopPage`: Do'kon egasi tomonidan vizual yig'ilgan shaxsiy sahifa.
2. **`backend/products/`:**
   * `Product`: Tovar nomi, narxi, skladdagi qoldig'i (stock), chegirma narxi, birligi, o'lchamlari.
   * `ProductImage`: Mahsulot rasmlari galereyasi.
3. **`backend/orders/`:**
   * `Order`: Buyurtma raqami, xaridor, yetkazish manzili, GPS koordinatalari, kuryer (`courier`), status (`pending`, `confirmed`, `out_for_delivery`, `delivered`).
   * `OrderItem`: Buyurtma tarkibidagi tovarlar, narxi, miqdori.
4. **`backend/couriers/`:**
   * `Courier`: Kuryer ismi, telefon, transport turi (avto, moto, velo, piyoda), holati (band/bo'sh), joriy koordinatalari.

---

## 2. Views & Controllers

* **[`backend/web/views.py`](file:///home/ibrohim/Desktop/client_baza/online%20store_guliston/backend/web/views.py):**
  * `customer_home` (marshrut: `/market/`): Gipermarket bosh sahifasi.
  * `customer_catalog`: Kategoriyalar va tovarlar katalogi.
  * `customer_search`: Matn bo'yicha qidiruv.
  * `customer_shop_detail`: Muayyan do'kon vitrinasi.
  * `customer_product_detail`: Tovar tafsilotlari va rasmlari.
  * `customer_cart`, `customer_cart_add`, `customer_cart_update`: Savatcha logikasi.
  * `customer_checkout`: Xaridor ma'lumotlari, yetkazib berish va to'lov.
* **[`backend/web/seller_views.py`](file:///home/ibrohim/Desktop/client_baza/online%20store_guliston/backend/web/seller_views.py):**
  * `seller_dashboard`: Savdo tahlili va ko'rsatkichlar.
  * `seller_products`: Tovarlar ro'yxati, narxlari va qoldiqlari.
  * `seller_orders`: Xaridor buyurtmalarini boshqarish.
  * `seller_couriers`: Kuryerlarni tayinlash.

---

## 3. Shablonlar (HTML Templates)

* **[`backend/templates/customer/`](file:///home/ibrohim/Desktop/client_baza/online%20store_guliston/backend/templates/customer/):**
  * `base_customer.html`: Clean Modern E-Commerce dizayni, qidiruv paneli, savat ikonkasi.
  * `home.html`: Reklama bannerlari, maxsus takliflar, do'konlar lentasi.
  * `catalog.html`: Filtrlash, saralash, narx diapazoni.
  * `cart.html`: Multi-vendor xarid savatchasi.
  * `checkout.html`: Geo-xarita orqali yetkazish manzilini aniqlash.
* **[`backend/templates/seller/`](file:///home/ibrohim/Desktop/client_baza/online%20store_guliston/backend/templates/seller/):**
  * `dashboard.html`: Do'kon egasining Mini ERP konsoli.
  * `products.html` & `product_create.html`: Yangi tovar qo'shish va CSV import.
  * `orders.html`: Buyurtmalar holati.
