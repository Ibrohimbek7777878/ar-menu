# 🛍 MAHSULOT #2: ONLINE STORE GULISTON (MARKETPLACE)
**Sana:** 01.10.2026  
**Biznes Modeli:** B2C & B2B E-Commerce Marketplace (Multi-Vendor Gipermarket + Kuryerlik Logistikasi)  
**Holat:** Barqaror (Restoran mahsulotidan alohida yo'nalish sifatida `/market/` da saqlanadi)

---

## 🎯 1. Mahsulot Mohiyati va Xususiyatlari

Shahar miqyosidagi ko'p sotuvchili (multi-vendor) elektron savdo maydonchasi:
1. **Ko'p Sotuvchilar (Multi-Tenant Shops):** Gulistondagi har xil toifadagi do'konlar (elektronika, kiyim-kechak, supermarket, go'zallik, dorixona) o'z filialini ochadi.
2. **Yagona Savatcha va Kuryerlik:** Foydalanuvchi bir nechta do'kondan tovar tanlashi, geolokatsiya orqali aniq xaritada uyi/ishxonasini ko'rsatishi va tezkor kuryer xizmatini chaqirishi mumkin.
3. **To'lov Turlari:** Click, Payme va eshik oldida naqd pul to'lash.

---

## 🔗 2. Asosiy URL Marshrutlari

| Sahifa / Funksiya | URL Manzili | Tavsif |
| :--- | :--- | :--- |
| **Marketplace Bosh Sahifasi** | `/market/` | Do'konlar katalogi, bannerlar, ommabop tovarlar vitrinasi |
| **Tovar Katalogi** | `/catalog/` | Kategoriyalar bo'yicha saralangan tovarlar |
| **Qidiruv** | `/search/?q=...` | Tovar nomi va do'kon bo'yicha tezkor qidiruv |
| **Do'kon Vitrinasi** | `/shop/<slug>/` | Alohida sotuvchining o'z sahifasi va shaxsiy shabloni |
| **Tovar Sahifasi** | `/product/<slug>/` | Tovar rasmlari, tavsifi, sharhlar, narx |
| **Savatcha** | `/cart/` | Xaridor savatchasi |
| **Buyurtma Berish** | `/checkout/` | Manzil kiritish, kuryer tarifini hisoblash, to'lov |
| **Kuryer Paneli** | `/courier/` | Kuryerlar uchun buyurtmalarni qabul qilish va xaritada yetkazish paneli |
| **Sotuvchi Kabineti** | `/seller/` | Do'kon egasining Mini ERP boshqaruv paneli |

---

## ⚠️ 3. Restoran Tizimidan Farqi (Decoupling)

* Asosiy domenda (`/`) mehmon adashmasligi uchun Restoran 3D menyusi turadi.
* Marketplace to'liq `/market/` marshruti ostida avtonom ishlaydi.
* Marketplace savati kuryerlik manzili va koordinatalarini talab qiladi; Restoranda esa stollar tanlanadi.
