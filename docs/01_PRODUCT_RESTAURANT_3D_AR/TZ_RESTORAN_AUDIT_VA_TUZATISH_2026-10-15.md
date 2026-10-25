# TZ-RESTORAN-2026-10-15 — Restoran 3D/AR menyu: audit va tuzatish texnik topshirig'i

| Maydon | Qiymat |
|---|---|
| **Mahsulot** | #1 Restoran 3D/AR va NFC menyu (port 8001, `backend/backend/urls_restaurant.py`) |
| **Sana** | 2026-10-15 |
| **Asos** | `main`, commit `3043be1` |
| **Holat** | ✅ **QISMAN BAJARILGAN VA YANGILANGAN (SUPERSEDED / COMPLETED).** Bosqich 0 (Xavfsizlik), Bosqich 1 (Mehmon oqimi) va Bosqich 2 (Moliya) `fix/restaurant-phase0-security` branchida bajarildi (commitlar `b021260`..`231fbc6`). Qolgan bandlar va yangi arxitektura `TZ_ADMIN_AR_MENYU_VA_TELEGRAM_MINI_APP_2026-10-24.md` hamda `TZ_ADMIN_ARXITEKTURA_ALOHIDA_ILOVALAR_2026-10-26.md` ga ko'chirildi. Amaldagi boshlash tartibi: `TZ_INDEX_VA_BOSHLASH.md`. |
| **Kim uchun** | Loyiha egasi va ushbu TZ'ni bajaradigan dasturchilar va AI agentlar |
| **Umumiy TZ** | `docs/00_ARCHITECTURE_MASTER/TZ_AUDIT_KAMCHILIKLAR_2026-10-15.md`. Ushbu fayl undagi restoranga oid bandlarni batafsil va yangi topilmalar bilan to'ldiradi |

> **OGOHLANTIRISH VA YO'RIQNOMA (2026-10-26):**
> Ushbu hujjat tarixiy audit hujjati hisoblanadi. Undagi kritik xavfsizlik (KDS himoyasi, to'lov imzosi tekshiruvi, XSS, IDOR) va mehmon oqimi muammolari muvaffaqiyatli bartaraf etilgan.
> Xodimlar, Menyu boshqaruvi va Admin paneli bo'yicha qolgan ishlar 2026-10-26 sanasidagi yangi alohida ilova arxitekturasi (`admins/resto/`) asosida amalga oshirilmoqda. Yangi vazifalar uchun `TZ_INDEX_VA_BOSHLASH.md` ga qarang.

---

## 1. Hukm

Restoran tizimi **chiroyli demo**, lekin real restoranda **ishlamaydi** va **xavfli**:

- **Mehmon oqimi buzilgan.**
  - Stol QR kodi 500 xato beradigan sahifaga olib boradi.
  - 3D menyu demo taomlarni ko'rsatadi.
  - Savatda soxta taomlar turadi.
  - Checkout qo'lda kiritilgan stol raqami bilan yiqiladi.
  - "Ofitsiantni chaqirish" ofitsiantga yetib bormaydi.
- **Xodim panellari bir-birini ko'rmaydi.**
  - React panellarining API'si 8001-portda ulanmagan (17 ta yo'l `404` qaytaradi).
  - Holat har bir brauzerning `localStorage`ida alohida yashaydi.
  - KDS yangi buyurtmani o'zi ko'rmaydi.
  - Ofitsiant POS buyurtma yarata olmaydi.
- **Pul hisobi noto'g'ri.**
  - Karta to'lovi naqd deb yoziladi.
  - Kirim ikki marta hisoblanadi.
  - Stol yopilganda boshqa restoranlarning shu raqamli stol buyurtmalari ham "to'landi" bo'ladi.
  - Qarzni ortiqcha to'lash ortiqcha kirim sifatida yoziladi.
- **Xavfsizlik yo'q.**
  - KDS, ofitsiant, hostess va 8 ta seller sahifasi anonim foydalanuvchiga ochiq.
  - `/seller/telegram/` bot tokenini ochib beradi.
  - Mijoz ismi yoki URL orqali XSS qilish mumkin.
  - Istalgan odam admin bo'ladi.

---

## 2. Audit qanday o'tkazildi

1. Restoran backend'i, React sahifalari va komponentlari qatorma-qator o'qildi.
2. **Avtomatik smoke test** o'tkazildi. U bazaning nusxasida, tarmoq to'liq bloklangan holda ishladi va real bazaga tegmadi.
   - `urls_restaurant` dagi **483 ta URL** to'rt rolda tekshirildi: anonim, ofitsiant, do'kon egasi, super admin.
   - Mehmon oqimi boshidan oxirigacha yurgizildi: menyu → savat → checkout → chaqiruv → KDS → yopish.
   - Og'ir sahifalarning SQL so'rovlari sanaldi.
3. Har bir KRITIK band kodda qayta tekshirildi. Barcha `fayl:qator` havolalari `3043be1` commitiga mos.

**Smoke test natijasi (GET so'rovlari):**

| Rol | 200 | 302 | 401/403 | 404 | **500** |
|---|---|---|---|---|---|
| Anonim | 87 | 308 | 36 | 8 | **16** |
| Ofitsiant | 115 | 110 | 191 | 20 | **17** |
| Do'kon egasi | 111 | 276 | 34 | 17 | **15** |
| Super admin | 281 | 112 | 35 | 8 | **17** |

**Haqiqiy ishlash holati:**

| Modul | Holat | Asosiy muammo |
|---|---|---|
| QR/NFC kirish | ❌ buzilgan | `/t/<uuid>/` → 500; QR imzosi 24 soatda eskiradi |
| Menyu (3D) | ⚠️ qisman | Demo taomlar, barcha do'konlar aralashgan, 35/40 taom bilan kesiladi |
| Savat va checkout | ❌ soxta | Hardcoded taomlar, ikki marta yuborish, qo'lda stol → 500 |
| Ofitsiant chaqiruvi | ❌ yetmaydi | API `404`, kartalar faqat toast, chaqiruv faqat keshda |
| KDS | ⚠️ qisman | Django KDS ishlaydi, lekin ochiq; React KDS yangilanmaydi |
| Ofitsiant POS | ❌ buzilgan | Buyurtma yaratish `TypeError`; summa va to'lov turi noto'g'ri |
| Hostess va bron | ⚠️ qisman | Mock bron, walk-in stolni band qilmaydi, PII ochiq |
| Moliya | ❌ noto'g'ri | Karta naqd bo'lib yoziladi, ikki marta kirim, React yozuvlari faqat brauzerda |
| Admin panel | ⚠️ ko'p qismi soxta | O'lik filtrlar, Menyu tabi bo'sh, mock stollar |
| Telegram bot | ⚠️ ishonchsiz | Escape yo'q, xatolar "yuborildi" deb belgilanadi, havolalar `127.0.0.1` |

---

## 3. Darajalar va band formati

| Belgi | Daraja | Ma'nosi |
|---|---|---|
| 🔴 | **KRITIK (P0)** | Pul yo'qotish, ma'lumot oqishi yoki asosiy oqim ishlamaydi. Pilotdan oldin SHART |
| 🟠 | **YUQORI (P1)** | Real restoranda jiddiy muammo. Production'dan oldin |
| 🟡 | **O'RTA (P2)** | Sifat, qulaylik, texnik qarz |
| ⚪ | **PAST (P3)** | Kosmetika |

Har bir band quyidagi qismlardan iborat: **Joy** (fayl:qator) → **Muammo** → **Yechim** → **Qabul** (bajarilganini qanday tekshiramiz).

**Barcha bandlar uchun qoidalar (AGENTS.md):**
- **4-qoida.** Hech narsa o'chirilmaydi. Mock va demo ma'lumotlar `DEMO_MODE` feature flag ortiga yashiriladi, flag admin paneldan boshqariladi va production'da `false` bo'ladi.
- **Dinamiklik.** Xizmat haqi foizi, polling oralig'i, KDS taymer chegaralari, QR domeni, stop-list va to'lov provayderlari admin paneldan sozlanadi.
- **Testlar.** Har bir tuzatish avtomatik testi bilan topshiriladi. Testlar tarmoqqa chiqmaydi.

---

## 4. Kamchiliklar

### 4.1 Kirish va xavfsizlik — R-SEC

#### R-SEC-01 🔴 Istalgan odam admin, oshpaz yoki ofitsiant bo'ladi
- **Joy:**
  - `frontend/src/core/guards/RouteGuard.ts:95-110`: `/admin`, `/finance`, `/kds`, `/waiter` yoki `/arrival` ochilsa, rol avtomatik beriladi.
  - `frontend/src/core/auth/RoleService.ts:21-44`: `?staff_grant=admin` parametri.
  - `frontend/src/core/routing/SubdomainService.ts:25-44`: hostname `admin.` bilan boshlansa, istalgan domenda admin rolini beradi.
  - Rol `localStorage`da saqlanadi.
- **Muammo:**
  - Server hech narsani tekshirmaydi.
  - Backend `AdminUser` rollarida `kitchen` va `hostess` umuman yo'q (`accounts/models.py:6-13`).
  - "Bir martalik" deb yozilgan xodim havolasi aslida statik, muddatsiz va uni bekor qilib bo'lmaydi (`StaffDeviceManagerModal.tsx:110`).
- **Yechim:**
  - Xodim autentifikatsiyasi serverda bo'ladi. Q1 qarori bo'yicha har bir xodim login va parol bilan kiradi (Django sessiyasi, HttpOnly cookie), akkauntlarni admin yaratadi.
  - `kitchen` va `hostess` rollari qo'shiladi.
  - Frontend guard faqat ko'rinish uchun qoladi.
  - `staff_grant` va subdomen rollari `DEMO_MODE` ortiga olinadi.
- **Qabul:**
  - Toza brauzerda `/admin`, `/kds` va `/waiter` kirish ekranini ko'rsatadi.
  - `localStorage`ni tahrirlash serverdan ma'lumot olib bermaydi.

#### R-SEC-02 🔴 Restoran API'si autentifikatsiyasiz
- **Joy:**
  - `backend/orders/interfaces/api/views.py`: 13 ta view'ning birortasida `permission_classes` yo'q.
  - Global sozlama `AllowAny` (`backend/backend/settings.py:197`).
  - RBAC middleware `/api/restaurant/` prefiksini tekshiradi, real yo'l esa `/api/v1/` (`backend/backend/middleware.py:218`). `:224` dagi shart ham noto'g'ri.
- **Smoke test isboti:** anonim, bo'sh tanali POST "1-stol"ni yopdi. **Barcha do'konlardagi 38 ta buyurtma, jami 3,955,500 so'm**, "to'landi" bo'ldi (natija rollback qilindi).
- **Yechim:**
  - Mehmon endpoint'lari (menyu, buyurtma yaratish, chaqiruv) imzolangan stol tokeni bilan ishlaydi.
  - Xodim endpoint'lari (KDS, yopish, moliya, bron) xodim roli bilan ishlaydi va hammasi `shop` bo'yicha cheklanadi.
- **Qabul:**
  - Token'siz xodim endpoint'i `401` qaytaradi.
  - Ofitsiant tokeni bilan `finance/` `403` qaytaradi.
  - Har endpoint uchun test bor.

#### R-SEC-03 🔴 8 ta seller sahifasida `@seller_required` yo'q, `/seller/telegram/` bot tokenini ochib beradi
- **Joy:** fayl bo'linganda har fayldagi birinchi view'dan decorator tushib qolgan:
  - `backend/web/seller_views/marketplace.py:18`, `:1165`, `:1191`
  - `backend/web/seller_views/restaurant.py:18` (`seller_tables`), `:345` (`waiter_panel`), `:556` (`seller_ar`)
  - `backend/web/seller_views/telegram.py:18`
  - `backend/web/seller_views/studio.py:18`
- **Muammo:**
  - `templates/seller/telegram.html:264` bot tokenini input'ning `value` atributiga yozadi. Barcha bot xabarlari va mijoz ma'lumotlari ham shu sahifada ko'rinadi.
  - `/seller/ar/` anonim foydalanuvchiga kategoriya yaratish va kutubxonani seed qilish imkonini beradi.
  - Anonim so'rovlarda bu sahifalar 500 beradi (`base_seller.html:395`).
- **Yechim:**
  - Decorator'lar qaytariladi.
  - Bot tokeni hech qachon HTML'ga chiqarilmaydi, faqat oxirgi 4 belgisi ko'rsatiladi.
  - "Har bir `/seller/*` URL anonimni login sahifasiga yo'naltiradi" degan avtomatik test yoziladi.
- **Qabul:** Test barcha seller URL'lari uchun `302 → login` ni tasdiqlaydi.

#### R-SEC-04 🔴 KDS, ofitsiant va hostess sahifalari hamda ularning JSON'lari anonimga ochiq
- **Joy:**
  - `backend/web/tma_views.py`:
    - `:1372` va `:1407`: KDS va `api/kds/orders/`
    - `:1423` va `:1454-1455`: `api/kds/status/`; state machine rad etsa ham status majburan yoziladi
    - `:1199`: ofitsiant paneli
    - `:1143`: `arrival_desk` (telefon raqamlari bilan bronlar ro'yxati)
    - `:1087`: `find_reservation`, telefonni `icontains` bilan qidiradi; `GS-n` kodlari ketma-ket
  - `ar3d/views.py:858` va `:873`: chaqiruvlarni qabul qilish istalgan `staff_token=x` bilan ishlaydi, DEBUG rejimida esa tokensiz ham.
- **Smoke test isboti:** anonim POST buyurtmani `pending`dan `delivered`ga o'tkazdi.
- **Yechim:** Hamma joyda xodim roli talab qilinadi, status faqat `transition_order()` orqali o'zgaradi, bron qidiruvi to'liq telefon + kod bilan ishlaydi.
- **Qabul:** Anonim so'rovlar `302` yoki `401` oladi va status majburan yozilmaydi.

#### R-SEC-05 🔴 XSS: QR havolasi (reflected) va mijoz ismi (stored) orqali
- **Joy:**
  - **Reflected:** `backend/ar3d/views.py:365` va `:394` dagi `?t=` qiymati `json.dumps` (`:407`) orqali `templates/air_3d_menu_index.html:17-19` ga `|safe` bilan tushadi. Shuning uchun `/m/x/?t=</script><script>…` kod ishlatadi.
  - **Stored:** `templates/tma/kds.html:16` va `templates/restaurant_admin/dashboard.html:16`, shuningdek 13 ta boshqa shablon (tma/home, cart, checkout, orders, table_hub, ar_menu, welcome, arrival_confirm, find_reservation, seller/arrival_*, waiter_mobile). Mijoz ismi va izohi xodim brauzerida kod bo'lib ishlaydi.
- **Yechim:** Hamma joyda `{{ data|json_script:"id" }}` ishlatiladi.
- **Qabul:** `</script><img src=x onerror=alert(1)>` ismli buyurtma va shunday `?t=` qiymati oddiy matn sifatida ko'rinadi.

#### R-SEC-06 🔴 Soxta to'lov
- **Joy:**
  - `backend/payments/services/click_service.py:70` va `payme_service.py:35`: kalit bo'sh bo'lsa `return True`. `.env`da ikkala kalit ham bo'sh.
  - `payments/api_views.py:126`
  - `payments/views.py:161` (`payment_demo_confirm`, himoyasiz)
- **Yechim:**
  - Kalit bo'lmasa provayder o'chirilgan hisoblanadi (fail-closed).
  - Imzo va summa har doim tekshiriladi.
  - Demo to'lov `DEMO_MODE` ortiga va staff auth ortiga olinadi.
- **Qabul:** Imzosiz callback `403` qaytaradi va buyurtma o'zgarmaydi.

#### R-SEC-07 🔴 Narx va mahsulotni mijoz belgilaydi
- **Joy:**
  - `backend/orders/application/services.py:57` va `:194`: narx so'rov tanasidan olinadi.
  - `backend/ar3d/views.py:584`: boshqa do'konning mahsuloti ham qabul qilinadi; `:597`: noma'lum taom 35,000 so'm deb narxlanadi.
- **Yechim:**
  - Narx faqat `Product.price`dan, faqat shu do'kon mahsulotlari uchun olinadi.
  - Namuna: `backend/api/views.py:517+`.
- **Qabul:** So'rovdagi `price` e'tiborsiz qoladi, boshqa do'kon mahsuloti `400` qaytaradi.

#### R-SEC-08 🔴 Mehmon real mahsulot yaratadi va admin vositalariga kiradi
- **Joy:**
  - `frontend/src/pages/ARMenuPage/ARMenuPage.tsx:163-170`: mehmonga "Yangi 3D/360 Taom Yaratish" tugmasi ko'rinadi. U `/api/v1/restaurant/products/3d-scan/` ga (`AllowAny`) ulanadi va istalgan narxli real `Product` yaratadi. `/products/<id>/3d-scan/` esa istalgan mahsulot modelini qayta yozadi.
  - `TableHubPage.tsx:228`: mehmonga "QR chop etish" tugmasi ko'rinadi.
  - `WelcomePage.tsx:127`: "QR skanerlash" tugmasi QR generatorni ochadi.
- **Yechim:** Bu tugmalar faqat xodim rolida ko'rinadi (flag bilan yashiriladi), endpoint'lar xodim roli talab qiladi.

#### R-SEC-09 🟠 Stol QR tokeni ishonchsiz va chop etilgan QR 24 soatda eskiradi
- **Joy:**
  - `backend/tables_restaurant/models.py:59`: imzo QR **chizilgan paytda** qo'yiladi.
  - `web/tma_views.py:81` va `ar3d/views.py:377`: `max_age=24*3600`. Natijada chop etilgan stend ertasi kuni ishlamaydi, 3D yo'l esa 5-stolga o'tib ketadi (`ar3d/views.py:383`).
  - `web/tma_views.py:82-83`: imzo noto'g'ri bo'lsa `split(':')[0]` qilinadi va **tekshiruvsiz davom etiladi**.
  - Istalgan stolga bog'lanish yo'llari: `?table=<raqam|pk>`, xom UUID, istalgan do'konning `select_table` pk'si.
  - `frontend/src/components/ui/QRGeneratorModal/QRGeneratorModal.tsx:47-49`: QR `window.location.origin + /menu/?table=NN` dan yasaladi, imzosiz. Admin subdomenidan chop etilsa, mehmonga admin domeni beriladi.
  - QR rasmlari `api.qrserver.com` orqali yasaladi (`templates/ar_guest/admin_panel/tables_manager.html:29`), ya'ni stol tokenlari begona servisga ketadi.
- **Yechim:**
  - QR'da **muddatsiz, stolga xos doimiy token** bo'ladi (`qr_token` UUID + HMAC), uni admin qayta generatsiya qilib bekor qila oladi.
  - Imzo noto'g'ri bo'lsa so'rov rad etiladi.
  - QR domeni admin paneldagi sozlamadan olinadi.
  - QR serverda (`qrcode` kutubxonasi) yoki frontend'da yasaladi.
- **Qabul:** 30 kun avval chop etilgan QR ishlaydi, soxta token rad etiladi.

#### R-SEC-10 🟠 Ofitsiant roli juda keng
- **Smoke test isboti:**
  - Ofitsiant `/seller/finance/` (Excel va PDF eksport bilan), `/seller/customers/` va `/seller/analytics/` sahifalarida `200` oladi.
  - `GET /seller/products/<pk>/delete/` mahsulotni o'chiradi (CSRF orqali uchinchi saytdan ham ishga tushirish mumkin).
  - Ofitsiantda `is_staff=1`, shuning uchun `/djangoadmin/` ochiladi.
- **Yechim:** Rol-huquq matritsasi joriy qilinadi (8-ilova), o'chirish faqat POST bilan, ofitsiantga `is_staff=False`.

#### R-SEC-11 🟠 Mijozga boshqa mijozlarning buyurtmalari va moliya ko'rinadi
- **Joy:**
  - `/orders/` stol bo'lmasa barcha do'konlarning oxirgi 20 buyurtmasini ko'rsatadi.
  - `/tma/order/<pk>/` IDOR (`web/tma_views.py:824`).
  - `frontend/src/pages/OrdersPage/OrdersPage.tsx:54-80`
  - `NavigationContext.tsx:604-608`: har bir mehmon uchun `finance/` so'raladi.
- **Yechim:** Mehmon faqat o'z sessiyasi yoki stoli buyurtmalarini ko'radi, kuzatish uchun imzolangan token ishlatiladi.

#### R-SEC-12 🟠 Telegram webhook va bot buyruqlari himoyasiz
- **Joy:**
  - `web/telegram_webhook.py:394` (restaurant_webhook): secret token tekshiruvi yo'q.
  - `notifications/admin_bot.py:68` va `:77`: `is_admin` so'rov tanasiga ishonadi va `icontains` ishlatadi.
  - `telegram_webhook.py:375` (`send-test`) va `:369` (`chat-ids`) ochiq.
  - `:269`: `/order <raqam>` buyrug'i istalgan foydalanuvchiga mijoz ismi va summani beradi.
  - `ord_status` callback state machine'siz va tenant tekshiruvisiz ishlaydi.
- **Yechim:**
  - `secret_token` tekshiriladi.
  - Admin aniq `chat_id` ro'yxati bo'yicha aniqlanadi.
  - Test endpoint'lari yopiladi.
  - Buyruqlar do'kon va rol bo'yicha cheklanadi.

#### R-SEC-13 🟡 Umumiy sozlamalar
- **Muammo:** `DEBUG=True` (default ham `True`), SECRET_KEY git tarixida, `ALLOWED_HOSTS=*`.
- **Yechim:** Umumiy TZ'dagi SEC-07 bo'yicha.

---

### 4.2 Mehmon oqimi (QR → menyu → savat → buyurtma) — R-GST

#### R-GST-01 🔴 Stol QR kodi 500 xatoga olib boradi
- **Joy:** `/t/<uuid>/` (`backend/backend/urls_restaurant.py:101`) mijozni `/shop/<slug>/` ga yo'naltiradi. U yerda `templates/customer/base_customer.html:55` `{% url 'customer_orders' %}` ni chaqiradi, bu nom esa `urls_restaurant.py`da yo'q, natijada `NoReverseMatch` → **500**.
- **Yechim:**
  - `/t/<uuid>/` restoran menyusiga (`/menu/?t=<token>`) yo'naltiriladi.
  - Restoran urlconf'idagi barcha `{% url %}` nomlari tekshiriladi.
- **Qabul:** Har bir stolning QR havolasi `200` beradi va menyu ochiladi (test bilan).

#### R-GST-02 🔴 QR/NFC landing (`/m/<slug>/`) demo menyuni ko'rsatadi *(brauzerda yakuniy tasdiqlanadi)*
- **Joy:** `backend/ar3d/views.py:388-400` dagi `initial_data`da `products` va `shop` kalitlari yo'q. React `getMenu()` chaqiradi, u `404` qaytaradi va bundle'dagi demo ro'yxatga ("To'y Oshi" 48,000) o'tiladi.
- **Yechim:**
  - Menyu serverdan keladi (`initial_data`ga qo'shiladi yoki API ulanadi).
  - Demo faqat `DEMO_MODE`da ishlaydi.

#### R-GST-03 🔴 React'ning restoran API'si 8001-portda ulanmagan
- **Joy:**
  - `frontend/src/services/RestaurantAPI.ts:6` (`/api/v1/restaurant`)
  - `backend/backend/urls_restaurant.py`: `orders.interfaces.api.urls` yo'q, u faqat `backend/backend/urls.py:37` da ulangan.
- **Smoke test isboti:** 17 ta yo'lning hammasi `404` qaytaradi. Buyurtma, chaqiruv, yopish, moliya va bron jimgina "oflayn" ishlaydi.
- **Yechim:** API restoran urlconf'iga ulanadi (R-SEC-02 himoyasi bilan birga). Urlconf'lar umumiy bazaviy ro'yxatdan meros oladigan qilinadi.
- **Qabul:** 8001-portda `/api/v1/restaurant/menu/` `200` qaytaradi.

#### R-GST-04 🔴 Savat va checkout soxta
- **Joy:**
  - `frontend/src/pages/CartPage/CartPage.tsx:31-63`: `DEFAULT_CART_ITEMS` (Plov ×2, Somsa ×4).
  - `frontend/src/context/NavigationContext.tsx:463`: yangi mehmon savati to'ldirilgan; `:451`: standart stol `'05'`.
  - `frontend/src/pages/CheckoutPage/CheckoutPage.tsx:92-104`: hardcoded taomlar va `156000`.
  - `CheckoutPage.tsx:97-113`: buyurtma **ikki marta** yuboriladi.
  - `CheckoutPage.tsx:106-126`: xato bo'lsa ham "Qabul qilindi" chiqadi.
- **Yechim:**
  - Savat faqat haqiqiy holatdan olinadi.
  - Bitta yuborish yo'li qoladi va `Idempotency-Key` header'i qo'shiladi.
  - Xatoda aniq xabar va "qayta urinish" tugmasi chiqadi.
- **Qabul:**
  - Bo'sh savatda checkout tugmasi faol emas.
  - Bitta buyurtma bazada bitta yozuv hosil qiladi.
  - Server xatosida "qabul qilindi" chiqmaydi.

#### R-GST-05 🔴 Qo'lda kiritilgan stol raqami bilan checkout 500 beradi
- **Joy:** `backend/web/tma_views.py:443` zalsiz `Table.objects.create(...)` qiladi → `IntegrityError: NOT NULL restaurant_tables.hall_id`. SPA aynan shu yo'lni ishlatadi (`table_number_manual`).
- **Yechim:**
  - Mavjud bo'lmagan stol yaratilmaydi.
  - Faqat imzolangan token yoki shu do'konning mavjud stoli qabul qilinadi, aks holda "stol topilmadi" xabari chiqadi.
- **Qabul:** Noto'g'ri stol raqami `400` va tushunarli xabar beradi, 500 bo'lmaydi.

#### R-GST-06 🔴 Buyurtma raqamlari to'qnashadi
- **Joy:**
  - `backend/orders/application/services.py:51` va `:201`: `count()+101`.
  - `ar3d/views.py` `v1_orders_api`: soniya + 3 ta tasodifiy raqam.
  - `order_number` unique, xato esa frontend'da yutib yuboriladi (`RestaurantAPI.ts:33-36`).
- **Yechim:** Do'kon va kun bo'yicha atomik hisoblagich (`select_for_update`) yoki DB sequence.
- **Qabul:** 50 parallel buyurtma testida 50 ta noyob raqam chiqadi.

#### R-GST-07 🟠 Menyu: do'konlar aralashadi, menyu kesiladi, N+1 so'rovlar
- **Joy:**
  - `web/tma_views.py:1243` (`tma_ar_menu`) va `orders/application/services.py:500`: barcha do'konlarning mahsulotlari chiqadi.
  - Menyu 35 taomda (`web/tma_views.py:121`) va 40 taomda (`ar3d/views.py:457`, tartibsiz) jimgina kesiladi.
  - Har kategoriya uchun alohida `COUNT`: `/ar/` sahifasida 31 so'rov, shundan 19 tasi COUNT.
- **Yechim:** `shop` bo'yicha filtr, paginatsiya yoki to'liq ro'yxat, `annotate(Count)`.

#### R-GST-08 🟠 Mock fallback'lar haqiqiy ma'lumotdek ko'rinadi
- **Joy:** `frontend/src/pages/MenuPage/MenuPage.tsx:39-42` (`INITIAL_PRODUCTS`). API ishlamasa mehmon mavjud bo'lmagan taomni buyurtma qiladi.
- **Yechim:** "Ulanish yo'q, qayta urinish" holati ko'rsatiladi, mock faqat `DEMO_MODE`da ishlaydi.

#### R-GST-09 🟠 Stop-list ishlamaydi
- **Joy:** `stopList` va `toggleStopList` hech qayerda ishlatilmaydi, `DishCard`da "tugagan" holati yo'q.
- **Yechim:** `Product.is_available` maydoni serverda saqlanadi va admin, KDS va ofitsiant tomonidan almashtiriladi. Menyuda "Tugagan" belgisi va buyurtmaga ruxsat yo'qligi.

#### R-GST-10 🟠 Qidiruv noto'g'ri natija beradi
- **Joy:** `frontend/src/utils/uzbekSearch.ts:71-74`: "relaxed" regex escape qilinmagan, `o` va `g` harflari ixtiyoriy qilingan. Natijada:
  - "go" va "og" barcha taomlarni topadi;
  - "osh" Shashlik va Sho'rvani topadi;
  - "." hamma narsani topadi;
  - kirill yozuvi bilan qidiruv ishlamaydi.
- **Yechim:**
  - Regex escape qilinadi va apostrof normalizatsiyasi saqlanadi.
  - Lotin-kirill transliteratsiyasi qo'shiladi.
  - Testlar (`o'g'ri`, `o‘g‘ri`, `ogri`, `огри`).

#### R-GST-11 🟠 10% xizmat haqi har joyda turlicha
- **Muammo:**
  - Menyu 10% xizmat haqini ko'rsatadi, buyurtmada esa 0.
  - Ofitsiant oynasi 10% qo'shib ko'rsatadi (`WaiterPanelPage.tsx:178-180`), kassaga esa 10%siz yoziladi.
- **Yechim:** Xizmat haqi foizi admin paneldagi bitta sozlamada saqlanadi va hamma joyda server hisoblaydi (Q2 qarori).

#### R-GST-12 🟡 Stol tanlash nazoratsiz
- **Muammo:**
  - `WelcomePage.tsx:44` istalgan matnni stol raqami sifatida qabul qiladi.
  - NFC "skaneri" soxta (`NFCGatewayModal.tsx:15`).
  - TableHub bron qilingan stolni tanlashga va o'tgan sanaga bron qilishga ruxsat beradi.
  - TableHub kontekstdagi stol raqamini e'tiborsiz qoldiradi (`TableHubPage.tsx:38`).
- **Yechim:** Stol faqat token orqali aniqlanadi, bron formasi validatsiya qilinadi.

#### R-GST-13 🟡 Narxlar bir-biriga mos emas
- **Muammo:** Osh menyuda 48,000 (`mockDishes.ts:17`), ofitsiant tez qo'shish ro'yxatida 45,000 (`WaiterPanelPage.tsx:74`). Non 8,000 va 5,000.
- **Yechim:** Narx faqat serverdan keladi.

#### R-GST-14 ⚪ "Barchasi" chipi ikki marta chiqadi
- **Joy:** `mockDishes.ts:4`. Ikkinchi chip bosilganda 0 taom ko'rsatadi.

---

### 4.3 Ofitsiant chaqiruvi va ofitsiant paneli — R-WTR

#### R-WTR-01 🔴 "Ofitsiantni chaqirish" ofitsiantga yetib bormaydi
- **Joy:**
  - SPA'dagi `/api/v1/restaurant/calls/` → `404`.
  - `TableHubPage.tsx:82-84`: ofitsiant, hisob, choy va non kartalari faqat toast chiqaradi.
  - `CallWaiterModal.tsx:52-68`: so'rov muvaffaqiyatsiz bo'lsa ham "yuborildi" deydi, cooldown yo'q.
  - `ar3d/views.py` `v1_call_waiter_api`:
    - `ServiceCall` yozuvi yaratilmaydi, chaqiruv faqat LocMem keshda yashaydi (har jarayonda alohida);
    - noma'lum stol uchun `Table.objects.first()` olinadi (`:707`), ya'ni boshqa restoranning stoli bo'lishi mumkin;
    - cooldown kaliti mijozdan keladi ("05" ≠ "5").
  - `domains/restaurant/application/services.py:58`: mavjud bo'lmagan `send_waiter_call_notification` import qilinadi.
- **Yechim:**
  - Bazada `ServiceCall` modeli: holatlar `pending → accepted → done` va kim qabul qilgani.
  - Serverda cooldown (stol + tur bo'yicha).
  - Ofitsiant paneliga real-time yetkazish (R-KDS-01 mexanizmi) va Telegram bildirishnomasi.
- **Qabul:** Mehmon chaqirsa, ofitsiant panelida ≤ 5 soniyada ko'rinadi. Ikki ofitsiant bitta chaqiruvni qabul qila olmaydi.

#### R-WTR-02 🔴 Ofitsiant POS buyurtma yarata olmaydi
- **Joy:**
  - `backend/web/seller_views/restaurant.py:375`: `Order(note=...)` beriladi, modelda maydon `notes` (`orders/models.py:39`).
  - `:398`: `OrderItem(unit_price=...)` beriladi, bu esa property (`orders/models.py:156`).
- **Smoke test isboti:** `TypeError`.
- **Yechim:** Maydon nomlari tuzatiladi va POS yagona `OrderService`ga ulanadi.
- **Qabul:** Ofitsiant POS'dan yaratilgan buyurtma KDS'da ko'rinadi (test bilan).

#### R-WTR-03 🔴 Ofitsiant ko'rsatgan, olgan va yozgan summalar har xil
- **Joy:**
  - `frontend/src/pages/WaiterPanelPage/WaiterPanelPage.tsx:178-180`: subtotal + 10% ko'rsatiladi.
  - `:168`: `settleTableBill` 10%siz summani **har doim naqd** deb yozadi, tanlangan to'lov turi (`:104`) e'tiborsiz qoladi.
- **Yechim:** Hisob summasi va to'lov turi server tomonda hisoblanadi va yoziladi.
- **Qabul:** Ekrandagi, chekdagi va kassadagi summa bir xil, karta to'lovi karta bo'lib yoziladi.

#### R-WTR-04 🔴 Bitta stolni yopish barcha restoranlarning pulini o'zgartiradi
- **Joy:** `backend/orders/application/services.py:114-119`: buyurtmalar faqat `table__number` bo'yicha tanlanadi. `shop`, holat va sana filtri yo'q. Xuddi shu xato `:162` va `:188` da ham bor.
- **Muammo:** "5-stol" yopilsa, platformadagi **barcha** 5-stollarning to'lanmagan buyurtmalari, jumladan bekor qilinganlari va oldingi mehmonlarniki, "to'landi" bo'ladi. Ularning jami bu do'konning kirimi sifatida yoziladi.
- **Yechim:**
  - Stol `shop` bo'yicha aniqlanadi.
  - **Stol seansi (TableSession)** obyekti kiritiladi: stol ochilganda yaratiladi, yopilganda yopiladi va faqat shu seansdagi buyurtmalar hisoblanadi.
  - Bekor qilingan buyurtmalar chiqarib tashlanadi, `select_for_update` ishlatiladi.
- **Qabul:** Ikki restoranli testda bir restoranning stolini yopish ikkinchisiga ta'sir qilmaydi.

#### R-WTR-05 🟠 Ofitsiant cheki haqiqiy buyurtmalarni ko'rsatmaydi
- **Joy:** `WaiterPanelPage.tsx:518-539`: chek lokal ro'yxatdan chiqariladi, QR orqali kelgan buyurtmalar unda yo'q, raqamlar formatlanmagan, telefon hardcoded (`:503`).
- **Yechim:** Chek server ma'lumotidan yasaladi.

#### R-WTR-06 🟠 Ofitsiant taom qo'sha olmaydi
- **Joy:** `WaiterPanelPage.tsx:69-75`: faqat 5 ta hardcoded taom, miqdor, izoh va kurs yo'q. Hammasi majburan "2-taom" (`NavigationContext.tsx:859`).
- **Yechim:** To'liq menyu qidiruv bilan, miqdor, izoh va kurs.

#### R-WTR-07 🟡 Chaqiruvlar boshqaruvi zaif
- **Muammo:**
  - `call.time` doim "Hozir" bo'lib qoladi.
  - Kechikkan chaqiruvlar eskalatsiya qilinmaydi, zona filtri yo'q.
  - "+ Buyurtma ochish" tugmasi hisob oynasini ochadi (`:344`).
  - Mehmon soni `guests_count||2` deb ko'rsatiladi, backend esa 0 yuboradi.
- **Yechim:** Vaqt serverdan olinadi, eskalatsiya chegarasi sozlamada bo'ladi.

---

### 4.4 Oshxona ekrani (KDS) — R-KDS

#### R-KDS-01 🔴 KDS yangi buyurtmani o'zi ko'rmaydi
- **Joy:**
  - React KDS'da polling, SSE yoki WebSocket yo'q.
  - `frontend/src/pages/KDSPage/KDSPage.tsx:131-134`: "yangilash" 500 ms davom etadigan soxta spinner.
  - `templates/tma/kds.html` boshqa sahifalardan farqli bundle versiyasini (`?v=12`) yuklaydi.
- **Yechim:**
  - **1-qadam:** 5 soniyalik polling (hozirgi infratuzilmada ishlaydi), oraliq admin paneldan sozlanadi.
  - **2-qadam (Redis paydo bo'lgach):** SSE.
  - Yangi buyurtmada ovozli signal.
- **Qabul:** Mehmon buyurtmasi KDS'da ≤ 5 soniyada ovoz bilan chiqadi.

#### R-KDS-02 🟠 Tugagan buyurtmalar ekrandan ketmaydi
- **Joy:** `KDSPage.tsx:155-170` va `:464-472`: "Barchasi" filtri yetkazilgan va to'langan buyurtmalarni ham ko'rsatadi, ustiga bosilsa to'langan buyurtma qayta "topshirildi" holatiga qaytadi.
- **Yechim:** KDS faqat faol holatlarni ko'rsatadi, holat orqaga qaytmaydi.

#### R-KDS-03 🟠 Oshxona uchun noqulay tartib
- **Muammo:**
  - Eng yangi buyurtma tepada turadi, kechikkanlar pastga tushib ketadi. Oshxonaga teskari tartib kerak: eng eskisi birinchi.
  - Kurs bo'yicha guruhlash, ommaviy "tayyor" va bekor qilish (undo) yo'q.
  - "Tayyor bo'ldi" taomlari hali tayyor bo'lmagan buyurtmada ham bosiladi.
- **Yechim:** Eng eski birinchi, kurs bo'yicha guruhlash, ommaviy amallar, 5 soniyalik undo.

#### R-KDS-04 🟡 Taymerlar
- **Joy:** `KDSPage.tsx:356-357`: taymer chegaralari (10/20 daqiqa) hardcoded va tayyor buyurtmada ham to'xtamaydi.
- **Muammo:** Mijoz soati server vaqti bilan solishtiriladi (soat mintaqasi farqi xavfi).
- **Yechim:** Chegaralar sozlamada saqlanadi, taymer tayyor bo'lganda to'xtaydi, vaqt server bilan sinxronlanadi.

#### R-KDS-05 🟡 Devor ekrani uchun mos emas
- **Muammo:**
  - Ovoz faqat oshpaz o'zi bosganda chiqadi (`:138`).
  - Wake Lock yo'q, shuning uchun planshet uxlab qoladi.
  - 1 soniyalik interval barcha kartalarni qayta render qiladi.
  - Fullscreen xatosi `true` deb hisoblanadi (`:92`).
  - Har signalda yangi `AudioContext` yaratiladi (`:44`).
- **Yechim:** Wake Lock API, bitta `AudioContext`, taymer faqat kerakli komponentda.

#### R-KDS-06 🟡 State machine chetlab o'tiladi
- **Joy:** `web/tma_views.py:1454-1455` va `web/seller_views/restaurant.py:427`: rad etilgan status ham yoziladi.
- **Yechim:** Faqat `transition_order()`, rad etilsa `409` qaytariladi.

---

### 4.5 Hostess va bron — R-RES

#### R-RES-01 🟠 Bronlar to'qnashadi
- **Muammo:**
  - Bir stol va vaqtga bir nechta bron qilish mumkin: tekshiruv, qulf va cheklov yo'q.
  - Statusni mijoz yuboradi (`orders/application/services.py:363`).
  - Noto'g'ri sana jimgina "bugun 19:00" ga aylanadi.
  - Bekor qilish yoki yakunlash stolni bo'shatmaydi.
- **Yechim:** Bron oralig'ini tekshirish (`select_for_update` + vaqt oralig'i), status faqat server tomonidan, validatsiya xatolari aniq ko'rsatiladi.

#### R-RES-02 🟠 Hostess walk-in mehmonni stolga joylashtirmaydi
- **Joy:** `frontend/src/pages/HostessDeskPage/HostessDeskPage.tsx`
  - `:166-207`: stol band qilinmaydi, natijada ikki marta joylashtirish mumkin.
  - `:517-520`: mavjud bo'lmagan zallar ("Registon Zali", "Yozgi Ayvon").
  - `:174`: lokal ID `guests.length+1` server ID bilan to'qnashadi, shuning uchun boshqa mehmonning broni PATCH qilinishi mumkin (`:152`).
- **Yechim:** Walk-in serverda yaratiladi va stol band qilinadi, zallar serverdan olinadi, ID'ni server beradi.

#### R-RES-03 🟠 Bron sahifasi soxta yoki buzilgan
- **Joy:**
  - `ReservationPage.tsx:34-48`: har bir tashrifchiga "Muhayyo Karimova, stolingiz tayyor!" degan mock bron ko'rsatiladi.
  - `:82-107`: PATCH so'rovi `form.submit()` navigatsiyasi tufayli bekor bo'ladi.
  - `web/tma_views.py:1063`: `arrival_confirm` istalgan kod uchun birinchi bronni ko'rsatadi; `:1081` da `json.dumps(time)` → 500.
- **Yechim:** Mock olib tashlanadi (flag ortiga), so'rov `await` bilan kutiladi, kod va telefon birga tekshiriladi.

#### R-RES-04 🟡 Status nomlari va mayda kamchiliklar
- **Muammo:**
  - Frontend `bill_requested`, `reserved` va `arrived` statuslarini ishlatadi, backend'da bunday statuslar yo'q (`tables_restaurant/models.py:22`).
  - Hostess `confirmed` va `cancelled` bronlar uchun tugma ko'rsatmaydi.
  - "Eslatma SMS" faqat toast chiqaradi.
  - Sana filtri yo'q, vaqt jadvali saralanmagan, checklist saqlanmaydi.
- **Yechim:** Yagona status ro'yxati (backend enum → TS turi), SMS funksiyasi yo flag bilan yashiriladi, yo integratsiya qilinadi.

---

### 4.6 Moliya ("Sobir tog'a") — R-FIN

#### R-FIN-01 🔴 Karta to'lovi naqd deb yoziladi
- **Joy:** `backend/finance/services/order_integration.py:38`: `getattr(order, 'payment_method', '')` o'qiladi. `Order` modelida **bunday maydon yo'q**, shuning uchun barcha avtomatik kirimlar naqd bo'lib yoziladi.
- **Yechim:** To'lov turi `Payment` yoki stol seansidan olinadi.
- **Qabul:** Karta bilan yopilgan stol kassada karta bo'lib ko'rinadi.

#### R-FIN-02 🔴 Kirim ikki marta hisoblanadi
- **Joy:**
  - `orders/state_machine.py:79-86`: buyurtma `delivered` bo'lganda to'lanmagan bo'lsa ham kirim yoziladi. Smoke test buni tasdiqladi: `payment_status` `unpaid` qoldi, kirim esa yozildi.
  - `orders/application/services.py:144-154`: stol yopilganda buyurtmalarga bog'lanmagan alohida kirim yoziladi.
  - `finance/models.py`da unique cheklov yo'q.
- **Yechim:**
  - Kirim **faqat to'lov haqiqatda qabul qilinganda**, bitta joyda yoziladi.
  - `(order yoki table_session, tx_type)` uchun `UniqueConstraint`.
- **Qabul:** Bitta mehmon cheki uchun aynan bitta kirim yozuvi bo'ladi.

#### R-FIN-03 🔴 Qarzni ortiqcha to'lash ortiqcha kirim yozadi
- **Joy:** `frontend/src/pages/FinancePage/FinancePage.tsx:214-220` (tekshiruv yo'q) va `NavigationContext.tsx:967` (qarz cheklanadi), `:980` (kirimga to'liq summa yoziladi). 200,000 so'mlik qarzga 1,000,000 kiritilsa, kassaga +1,000,000 yoziladi.
- **Backend'da ham muammo:** `finance/views.py:354` (`pay_debt`) qulfsiz va atomik emas, shuning uchun parallel to'lovlarda ortiqcha to'lov o'tib ketadi.
- **Yechim:** Summa qolgan qarzdan oshmasligi serverda `select_for_update` bilan tekshiriladi.

#### R-FIN-04 🔴 React moliya yozuvlari faqat brauzerda qoladi
- **Joy:** `NavigationContext.tsx:913-1006`: kirim, chiqim, qarz va bekor qilish amallarining birortasi API'ga bormaydi.
- **Yechim:** Moliya sahifasi faqat server API orqali ishlaydi. Django'dagi mavjud `finance` moduli asos qilinadi.

#### R-FIN-05 🟠 Summa noto'g'ri o'qiladi
- **Joy:** `FinancePage.tsx:151, :172, :193, :217`: `replace(/\D/g,'')`.
- **Muammo:** "150000.50" qiymati 15,000,050 bo'lib, "1,5" esa 15 bo'lib o'qiladi.
- **Yechim:** Bo'shliq va vergulni tushunadigan summa input komponenti bitta joyda yoziladi.

#### R-FIN-06 🟠 Kun Toshkent vaqti bilan emas, UTC bilan kesiladi (soat 05:00 da)
- **Joy:**
  - `web/tma_views.py:893`: `now.replace(hour=0)`
  - `notifications/admin_bot.py:325`
  - `web/seller_views/restaurant.py:83`
  - `orders/application/services.py:153, :271, :330`
  - `web/tma_views.py:932`: UTC vaqt satri ko'rsatiladi
- **Muammo:** `TIME_ZONE='Asia/Tashkent'` to'g'ri o'rnatilgan, lekin kod `timezone.localtime()` ishlatmaydi.
- **Yechim:** Hamma joyda `timezone.localdate()` va `localtime()`.
- **Qabul:** 23:30 dagi chek o'sha kunning hisobotiga tushadi.

#### R-FIN-07 🟠 Bekor qilish va tahrirlash izsiz
- **Muammo:**
  - React'da bekor qilish hech narsani qaytarmaydi: qarz to'lovi bekor qilinsa qarz tiklanmaydi, chek bekor qilinsa stol ochilmaydi (`NavigationContext.tsx:927-945`). Tasdiqlovchi ham yo'q.
  - Backend'da summa, sana va to'lov turini tahrirlash audit'siz (`finance/views.py:194-245`).
  - `delete_tx` (`:577`) tarixsiz ishlaydi, `delete_debt` (`:601`) yozuvni butunlay o'chiradi (4-qoidaga zid).
- **Yechim:**
  - Moliya yozuvi o'chirilmaydi va tahrirlanmaydi. Uning o'rniga **teskari yozuv (storno)** yaratiladi va sabab ko'rsatiladi.
  - Har o'zgarish `FinanceAuditLog`ga yoziladi (kim, qachon, nima, eski → yangi qiymat).

#### R-FIN-08 🟠 Hisobotlar noaniq
- **Muammo:**
  - KPI'lar barcha vaqt bo'yicha qo'shiladi, sana va smena filtri, Z-hisobot va smena yopish yo'q (`FinancePage.tsx:65-112`).
  - Admin panelidagi "bugungi tushum" 3,480,000 dan boshlanadigan alohida hisoblagich (`NavigationContext.tsx:499`) va unga qarz qaytarishlari ham qo'shiladi. Natijada ikki xil tushum raqami chiqadi.
  - Chekdagi taomlar jami summaga mos kelmaydi (`FinancePage.tsx:665` va `:680`).
  - Chekda buyurtma raqami va mijoz ismi doim "#Chek" va "Mijoz" bo'lib qoladi (`NavigationContext.tsx:1030-1042`).
- **Yechim:** Barcha hisobotlar serverdagi agregatlardan olinadi. Smena ochish/yopish va Z-hisobot qo'shiladi.

#### R-FIN-09 🟠 Do'konlar orasida ma'lumot aralashadi
- **Joy:** `finance/views.py:723`: global `STAGE_NAMES` lug'ati har so'rovda o'zgartiriladi, shuning uchun bir do'konning bosqich nomlari boshqasiga o'tadi. Barcha restoranlarning kunlik hisoboti bitta global Telegram chatiga ketadi.
- **Yechim:** Lokal nusxa ishlatiladi, hisobot har do'konning o'z chatiga yuboriladi.

#### R-FIN-10 🟡 Chop etish buzilgan
- **Joy:** `QRGeneratorModal.css:639`, `FinancePage.css:682` va `WaiterPanelPage.css:636` uchalasi ham `body *{visibility:hidden}` qiladi va bitta bundle'da yuklanadi. Natijada moliya hisobotini chop etish bo'sh sahifa beradi.
- **Muammo:** `@page` o'lchami berilmagan, shuning uchun 80mm chek A4 ga chiqadi. 58mm varianti va'da qilingan, lekin yo'q.
- **Yechim:** Har chop etish uchun alohida izolyatsiyalangan print konteyner va `@page { size: 80mm auto }` / `58mm`.

#### R-FIN-11 🟡 Hisob yopish imkoniyatlari kam
- **Muammo:**
  - Hisob tasdiqsiz, bir bosish bilan yopiladi.
  - Bo'lib to'lash, chegirma va "nasiyaga yopish" yo'q.
  - **Fiskal chek (OFD)** yo'q, holbuki O'zbekistonda bu qonuniy talab (Q3 qarori).
- **Yechim:** Tasdiqlash oynasi, aralash to'lov (naqd + karta), chegirma (rol bo'yicha), nasiya, fiskal integratsiya (qarorga ko'ra).

---

### 4.7 Admin panel — R-ADM

#### R-ADM-01 🟠 O'lik boshqaruvlar va menyuni boshqarib bo'lmaydi
- **Joy:** `frontend/src/pages/AdminDashboardPage/AdminDashboardPage.tsx`
  - `:123`: "Bugun/Hafta/Oy" filtri hech narsa qilmaydi.
  - `:555`: "Chekni ko'rish" faqat tabni almashtiradi.
  - `:609-626`: Menyu tabi bo'sh joy (placeholder). Narx va stop-list faqat kod orqali o'zgaradi (4-qoidaga zid).
- **Yechim:** Menyu CRUD (narx, rasm, 3D model, mavjudlik, kategoriya) API orqali, filtrlar server agregatlari bilan.

#### R-ADM-02 🟠 Admin raqamlari soxta
- **Muammo:**
  - "Stollar va Bron" tabi aslida mehmonlar uchun mo'ljallangan TableHub sahifasi bo'lib, 8 ta mock stol ko'rsatadi.
  - Mahsulot va AR taomlar soni hardcoded (`:139-140`).
  - `today_orders_count` barcha vaqtdagi buyurtmalarni sanaydi (`:136`).
  - `bill_requested` va `reserved` holatidagi stollar "Bo'sh" deb ko'rsatiladi (`:476`).
- **Yechim:** Haqiqiy stol xaritasi va server statistikasi.

#### R-ADM-03 🟡 Chiqish ishlamaydi
- **Joy:** `AdminDashboardPage.tsx:290` va `StaffNavHeader.tsx:116`: "Chiqish" `localStorage`dagi rolni tozalamaydi, subdomen roli esa hech qachon chiqmaydi.
- **Yechim:** Server sessiyasi bekor qilinadi (R-SEC-01 bilan birga).

---

### 4.8 3D/AR menyu — R-3D

#### R-3D-01 🟠 3D modellar juda og'ir
- **Holat:**
  - 16 GLB = 77 MB, 16 tadan 15 tasida siqish yo'q, USDZ yo'q.
  - `mastava.glb` 9.2 MB (~123k uchburchak).
  - `salad_bahor.glb` 682 uchburchak uchun 8.1 MB (og'irlikning asosi PNG tekstura).
  - `salad_achichuk.glb` transmission material ishlatadi, bu arzon Android'lar uchun juda og'ir.
  - Modellarni Django `static.serve` beradi (`urls_restaurant.py:150`).
- **Yechim:**
  - `gltf-transform` pipeline: teksturalar 1024–2048 px, WebP yoki KTX2, meshopt.
  - Model yuklanganda avtomatik siqiladi.
  - Media CDN orqali beriladi.
- **Qabul:** Har model ≤ 1.5 MB (maqsad 0.3–1 MB), 4G'da ≤ 3 soniyada ko'rinadi.

#### R-3D-02 🟠 3D generatsiyada cheksiz rekursiya
- **Joy:** `backend/ar3d/services.py:426` (`auto_attach_library_3d` → `create_3d_for_product`) ↔ `backend/ar3d/generator.py:249` (`create_3d_for_product` → `auto_attach_library_3d`).
- **Muammo:** Rasmi bor, lekin kutubxonada mosi yo'q taom uchun bu ikki funksiya bir-birini cheksiz chaqiradi va **so'rov ichida `RecursionError`** chiqadi. "AI" model aslida trimesh bilan sinxron yasalgan teksturali quti.
- **Yechim:** Rekursiya uziladi, generatsiya Celery vazifasiga ko'chiriladi, "AI" yorlig'i haqiqatga moslanadi.

#### R-3D-03 🟠 Model yuklanmasa holat yo'q
- **Joy:** `frontend/src/components/ui/Modal3D/Modal3D.tsx:62-75`: xato holati va progress yo'q. 2D taomda AR tugmasi `alert` chiqaradi (`:34-40`).
- **Yechim:** Poster rasm, progress paneli, xatoda rasmga qaytish, AR tugmasi faqat model bor taomda.

#### R-3D-04 🟡 Noto'g'ri model ko'rsatiladi
- **Muammo:**
  - `Smart3DMatcher.ts:183` so'z chegarasisiz moslashtiradi: "kompot" uchun plov modeli chiqadi.
  - Backend'da `has_3d` va `has_ar` hardcoded `True`, noma'lum taom `plov.glb` oladi.
- **Yechim:** Model admin tomonidan biriktiriladi, avtomatik moslik faqat taklif sifatida beriladi, stok modelda "namuna" belgisi bo'ladi.

#### R-3D-05 🟡 Studiya va model-viewer muammolari
- **Muammo:**
  - Fotogrammetriya studiyasi `blob:` URL saqlaydi va hech narsani yuklamaydi (`PhotogrammetryStudioModal.tsx:58, :71, :107`).
  - `model-viewer` CDN'dan SRI'siz yuklanadi.
  - Ba'zi shablonlarda `model-viewer` yo'q, shuning uchun 3D oyna bo'sh chiqadi.
  - 8001-portda AR analitikasi yozilmaydi.
- **Yechim:** Real yuklash (multipart + validatsiya), `@google/model-viewer` npm paketi lazy import bilan.

---

### 4.9 Telegram bot va bildirishnomalar — R-TG

#### R-TG-01 🟠 Oshxona va ofitsiantga xabar yetmasligi mumkin
- **Muammo:**
  - Matnlar HTML-escape qilinmaydi. Ismda `&` yoki `<` bo'lsa, Telegram xabarni rad etadi va oshxona **hech narsa olmaydi**.
  - Xabarlar so'rov ichida sinxron yuboriladi, har chat uchun 10 s timeout (`notifications/services/telegram_service.py:30`).
  - Buyurtma havolasi `http://127.0.0.1:8000` (`telegram_service.py:66, :171`).
- **Yechim:** `html.escape()`, yuborish Celery orqali, havola sozlamadagi domendan.

#### R-TG-02 🟠 Outbox muvaffaqiyatsiz xabarni "yuborildi" deb belgilaydi
- **Joy:**
  - `backend/notifications/outbox.py:61`: `bool(_send_message(...))`. `_send_message` doim `dict` qaytaradi (`telegram_service.py:17-38`), shuning uchun natija doim `True`.
  - `:64`: mavjud bo'lmagan `notify_new_order_to_seller` import qilinadi.
  - `processing` holatida qolgan event'lar qayta urinilmaydi.
- **Yechim:** `result['success']` tekshiriladi, qayta urinishlar va backoff, osilib qolgan event'larni tiklash vazifasi.

#### R-TG-03 🟡 Bot mayda kamchiliklari
- **Muammo:**
  - `/kassa` birinchi do'konning kassasini ko'rsatadi.
  - "Mening stolim" tugmasi mavjud bo'lmagan `/restaurant/table/` manziliga olib boradi.
  - `update_id` takrorlanishi tekshirilmaydi.
  - Vaqtlar UTC'da ko'rsatiladi.
- **Yechim:** Do'kon konteksti, to'g'ri havolalar, dedup, mahalliy vaqt.

---

### 4.10 Infratuzilma va tezlik — R-INF

#### R-INF-01 🔴 Har restartda URL o'zgaradi, chop etilgan QR'lar ishlamay qoladi
- **Joy:** `backend/scripts/laptop_server_daemon.py`: cloudflared quick tunnel ishlatiladi (`*.trycloudflare.com`), shuning uchun URL har restartda yangilanadi. Bunga R-SEC-09 (24 soatlik imzo) ham qo'shiladi.
- **Yechim:**
  - Doimiy domen (masalan `menu.<restoran>.uz`) va named tunnel yoki VPS.
  - QR'dagi domen admin sozlamasidan olinadi (Q4).

#### R-INF-02 🔴 SQLite, har so'rovda sessiya yozuvi, 1 worker × 2 thread
- **Joy:**
  - `backend/backend/settings.py:124` (Postgres faqat `POSTGRES_DB` o'rnatilganda yoqiladi)
  - `backend/backend/middleware.py:107` (sessiyaga yozuv)
  - `laptop_server_daemon.py:207-211` (gunicorn sozlamalari)
- **Muammo:** Kechki payt to'lgan zalda, ya'ni 50 ta stol va 100+ telefon bir vaqtda ishlaganda, tizim sekinlashadi va yozuvlar navbatga tushadi.
- **Yechim:** Umumiy TZ'dagi INF-01…INF-03 bandlari bo'yicha. Restoran uchun minimal talab: Postgres, sessiyaga faqat o'zgarishda yozish, 4+ worker.

#### R-INF-03 🟠 Sinxron tashqi chaqiruvlar va media
- **Muammo:**
  - Telegram va AI so'rovlari request ichida bajariladi.
  - Media fayllarni Django `serve` orqali beradi.
- **Yechim:** Celery + Redis, media nginx yoki CDN orqali.

#### R-INF-04 🟡 N+1 so'rovlar
- **Smoke test isboti:**
  - `/ar/`: 31 so'rov (19 tasi kategoriya COUNT).
  - `/orders/`: 26 so'rov (15 tasi stol qidiruvi).
  - `/seller/tables/`: 27 so'rov (11 tasi do'kon qidiruvi).
  - `/menu/`: 20 so'rov (8 tasi COUNT).
- **Yechim:** `select_related`, `prefetch_related` va `annotate`.
- **Qabul:** Har sahifa ≤ 12 so'rov.

#### R-INF-05 🟡 Frontend bundle
- **Muammo:**
  - Bitta 500 KB chunk, mehmon xodim kodini ham yuklaydi.
  - Fayl nomlarida hash yo'q.
  - Shablonlarda `?v=12` va `?v=16` aralash ishlatiladi.
- **Yechim:** Route bo'yicha `React.lazy`, Vite manifest bilan hash'li nomlar.
- **Qabul:** Mehmonning boshlang'ich JS hajmi ≤ 90 KB gzip.

---

### 4.11 Kod sifati va testlar — R-QA

#### R-QA-01 🟠 Restoran urlconf'idagi boshqa 500 xatolar (smoke test)
- `/seller/orders/<pk>/`: `seller/order_detail.html:118` `admin_order_status` URL nomi yo'q.
- `/seller/shop/`, `/seller/shop/builder/`, `/seller/reviews/`, `/seller/profile/`: NoReverseMatch (`shop.html:105`, `shop_builder.html:14`, `reviews.html:50`, `profile.html:259`).
- `/api/v1/categories/all.json` va `/api/v1/notifications/promotions/active.json`: `format` argumenti tufayli `TypeError` (`categories/views.py:23`, `notifications/views.py:36`).
- `/api/cart/` `product_id`siz → `ValueError` (`web/tma_views.py:335`).

**Yechim:** Har biri tuzatiladi. "Restoran urlconf'idagi har bir URL 500 bermaydi" degan avtomatik test yoziladi (smoke testning doimiy versiyasi).

#### R-QA-02 🟠 Jimgina yutilgan xatolar va mavjud bo'lmagan importlar
- **Muammo:** Kodda 61 ta `except ...: pass` bor. Mavjud bo'lmagan importlar: `send_waiter_call_notification`, `notify_new_order_to_seller`, `couriers.tasks`.
- **Yechim:** Xatolar logga yoziladi, CI'ga `ruff` (`F401`, `F821`, `E722`) qo'shiladi.

#### R-QA-03 🟠 Testlar yo'q yoki xavfli
- **Muammo:**
  - `tables_restaurant` va `web` app'larida test yo'q, `orders` testi bo'sh.
  - `settings.py:15` `.env`ni `override=True` bilan yuklaydi, shuning uchun testlar real Telegram tokenini oladi.
  - `scripts/loop_engineering_test.py` real bazaga yozadi.
- **Yechim:** Alohida test sozlamalari va tarmoq blokeri, restoran oqimi uchun end-to-end testlar (smoke skripti asosida).

#### R-QA-04 🟡 Marshrutlar tartibsiz
- **Muammo:**
  - `ar-menu/` ikki marta e'lon qilingan (`urls_restaurant.py:47` va `:104`).
  - `t/<uuid>` marketplace sahifasiga olib boradi.
  - `restaurant_admin_redirect` hech qayerga ulanmagan.
  - React'da `includes()` asosidagi routing `/menu/table` ni admin paneliga, `/reservation/arrival` ni AR menyuga olib boradi (`App.tsx:43`, `:64`).
- **Yechim:** Aniq marshrut jadvali (backend va `react-router`).

#### R-QA-05 🟡 React holat xatolari
- **Muammo:**
  - Updater ichida side-effect'lar bor (`NavigationContext.tsx:778-791`, `:1008-1066`, `:933`, `:988`).
  - God-context 1,190 qator va memoize qilinmagan.
  - `AudioContext` oqishi.
- **Yechim:** Server holati TanStack Query'da, savat uchun alohida store, kontekstlar bo'linadi.

---

## 5. Tuzatish rejasi (bosqichlar)

Har bosqich oldingisi qabul qilingandan keyin boshlanadi. Har band alohida commit (`fix(R-SEC-03): ...`) va alohida test bilan topshiriladi.

| Bosqich | Maqsad | Bandlar | Infratuzilma talabi |
|---|---|---|---|
| **0. Xavfsizlikni yopish** | Pul va ma'lumot oqishini to'xtatish | R-SEC-02…08, R-SEC-10…12, R-WTR-04, R-QA-03 (test sozlamalari) | Yo'q, hozirgi serverda bajariladi |
| **1. Restoran ishlashi** | QR → menyu → buyurtma → KDS → ofitsiant oqimi real ishlaydi | R-GST-01…08, R-WTR-01…03, R-KDS-01, R-KDS-02, R-KDS-06, R-QA-01, R-QA-04, `DEMO_MODE` flag | Yo'q (polling bilan) |
| **2. Moliya to'g'riligi** | Har so'm to'g'ri hisoblanadi | R-FIN-01…09, R-GST-11 | Yo'q |
| **3. Xodim kirishi** | PIN va parolsiz, lekin xavfsiz kirish | R-SEC-01, R-ADM-03, kitchen va hostess rollari | Yo'q |
| **4. Infratuzilma** | Doimiy domen va 1000 foydalanuvchi | R-INF-01…03, R-SEC-09, R-SEC-13 | **VPS, domen, Postgres, Redis** (Q4) |
| **5. UX, 3D va tezlik** | Tez va qulay | R-GST-09, R-GST-10, R-GST-12…14, R-WTR-05…07, R-KDS-03…05, R-RES-*, R-ADM-01…02, R-3D-*, R-TG-*, R-FIN-10…11, R-INF-04…05 | CDN (3D uchun) |
| **6. Sifat** | Uzoq muddatli barqarorlik | R-QA-02, R-QA-05, CI, yuk testi | — |

### Bosqich 0 ning aniq tarkibi (tasdiqlansa birinchi bajariladi)

| # | Ish | Asosiy fayllar |
|---|---|---|
| 0.1 | Test sozlamalari: tarmoq bloklanadi va tokenlar bo'shatiladi, `override=True` muammosi hal qilinadi | `backend/backend/settings.py`, yangi `settings_test.py` |
| 0.2 | 8 ta seller view'ga `@seller_required` qaytariladi, bot tokeni HTML'ga chiqmaydi | `web/seller_views/*.py`, `templates/seller/telegram.html` |
| 0.3 | KDS, ofitsiant va hostess sahifalari hamda JSON'lariga xodim tekshiruvi, status faqat state machine orqali | `web/tma_views.py`, `ar3d/views.py` (staff calls) |
| 0.4 | Restoran API'si: xodim endpoint'lari faqat xodimga, `shop` bo'yicha cheklangan; mehmon endpoint'lari validatsiya bilan | `orders/interfaces/api/views.py`, yangi `orders/interfaces/api/permissions.py` |
| 0.5 | Stol yopish `shop` va holat bo'yicha cheklanadi | `orders/application/services.py` |
| 0.6 | Narx faqat serverdan, boshqa do'kon mahsuloti rad etiladi | `orders/application/services.py`, `ar3d/views.py` |
| 0.7 | To'lov fail-closed, demo to'lov flag va auth ortida | `payments/services/*.py`, `payments/views.py`, `payments/api_views.py` |
| 0.8 | XSS: barcha `*_json|safe` → `json_script` (backend va React bootstrap o'qilishi) | 15 ta shablon, `frontend/src` bootstrap o'quvchilari |
| 0.9 | Telegram: webhook secret, `send-test` va `chat-ids` yopiladi, `is_admin` aniq moslik bilan | `web/telegram_webhook.py`, `notifications/admin_bot.py` |
| 0.10 | Mehmonga ko'rinadigan admin vositalari (3D yaratish, QR chop etish) faqat xodimga | `ARMenuPage.tsx`, `TableHubPage.tsx`, `WelcomePage.tsx` |
| 0.11 | Ofitsiant huquqlari cheklanadi (moliya va eksport yo'q, GET bilan o'chirish yo'q) | `web/seller_decorators.py`, seller URL'lari |

**Bosqich 0 xavfi:** 0.3 va 0.4 dan keyin xodim panellari faqat login qilingan xodimga ochiladi. Mavjud `/admin/login/` va xodim akkauntlari (masalan `ofitsiant1`) bilan kirish mumkin bo'ladi. PIN va parolsiz qulay kirish 3-bosqichda (Q1) qo'shiladi.

---

## 6. Umumiy qabul mezonlari (Definition of Done)

1. Bandning **Qabul** sharti avtomatik test bilan tekshirilgan.
2. Xavfsizlik bandlari uchun "hujum muvaffaqiyatsiz" testi bor.
3. Restoran urlconf smoke testida **0 ta 500** chiqadi va xodim sahifalari anonimga yopiq.
4. Hech narsa o'chirilmagan, faqat flag ortiga olingan (4-qoida). Yangi sozlamalar admin panelda yoki `.env.example`da.
5. `manage.py check` toza, testlar internetsiz o'tadi, frontend `tsc` va `build` toza.
6. Tegishli hujjat yangilangan.

**Restoran uchun yakuniy mezon:** bir restoranda 50 stol, 150 telefon va 3 KDS ekranli simulyatsiyada 30 daqiqa davomida qotish va yo'qolgan buyurtma bo'lmaydi.

---

## 7. Qarorlar va ochiq savollar

| # | Savol | Holat |
|---|---|---|
| **Q1** | Xodimlar qanday kiradi? | ✅ **Qaror (2026-10-15): login va parol.** Har bir xodimga alohida akkaunt va Django sessiyasi. Rollar: admin, ofitsiant, oshpaz, hostess. Akkauntlarni admin yaratadi va bloklaydi |
| **Q2** | Xizmat haqi olinadimi? | ✅ **Qaror: yo'q.** 10% hamma joydan yashiriladi (flag), hisob 0% bilan. Kelajakda kerak bo'lsa admin paneldan yoqiladi |
| **Q3** | Fiskal chek (OFD) hozir kerakmi? | ⏳ Ochiq. Tavsiya: keyin, alohida TZ bilan |
| **Q4** | Doimiy domen va VPS bormi? | ✅ **Qaror: hali yo'q, keyin hal qilinadi.** 0–3 bosqichlar hozirgi serverda bajariladi, Bosqich 4 keyinga qoldiriladi |
| **Q5** | Ruxsat qamrovi | ⏳ Kutilmoqda. Qisqa TZ: `TZ_RESTORAN_QISQA_2026-10-15.md` |

---

## 8. Ilova: rol-huquq matritsasi (taklif)

| Amal | Mehmon | Ofitsiant | Oshpaz | Hostess | Admin/Ega |
|---|---|---|---|---|---|
| Menyu ko'rish, buyurtma, chaqiruv | ✅ (stol tokeni bilan) | ✅ | — | — | ✅ |
| KDS ko'rish, status o'zgartirish | — | ko'rish | ✅ | — | ✅ |
| Stol ochish/yopish, hisob qabul qilish | — | ✅ | — | — | ✅ |
| Bron va walk-in | — | ko'rish | — | ✅ | ✅ |
| Moliya, eksport, mijozlar bazasi | — | — | — | — | ✅ |
| Menyu, narx, stop-list tahriri | — | stop-list | stop-list | — | ✅ |
| Xodim qurilmalarini boshqarish | — | — | — | — | ✅ |

---

*AGENTS.md qoidalariga muvofiq: avval tahlil, keyin savollar, so'ng TZ va tasdiq, undan keyingina ish. Loyiha egasining aniq ruxsatisiz hech bir band bo'yicha kod o'zgartirilmaydi.*
