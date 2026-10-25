# TZ: Admin panel, AR menyu va Telegram Mini App (restoran mahsuloti)

Sana: 2026-10-24 · Holat: **egasi ko'rib chiqishi kerak** · Kod yozuvchi: Gemini · Tekshiruvchi va GitHub'ga yuboruvchi: Claude

> **O'ZGARISH (2026-10-26):** admin panelni alohida ilovalarga ajratish bo'yicha yangi hujjat chiqdi: `TZ_ADMIN_ARXITEKTURA_ALOHIDA_ILOVALAR_2026-10-26.md`. Bu hujjatdan **1-bosqich (P0 xatolar), 2-bosqich (Seller tozalash) va 5–6-bosqich (Telegram)** o'zgarishsiz amal qilinadi. **4-bosqich (Menyu frontend, React «Menyu» tabi) BEKOR**, Menyu sahifasi yangi `resto-admin` ilovasida qilinadi. 3-bosqichning (Menyu backend) API yo'li `/api/restaurant/admin/v1/menu/…` ga ko'chadi, model o'zgarishlari o'zgarmaydi. 7-bosqichning moliya va 3D qismlari ham resto-admin ichida. Bajarish tartibi: `TZ_INDEX_VA_BOSHLASH.md`. Telegram bosqichlari alohida `feature/telegram-miniapp` branch'ida.

Bu hujjat **o'z-o'zidan to'liq**: Gemini loyihani oldindan bilmasa ham ishlay oladi. Asos: 2026-10-23 admin tahlili (`admin_tahlil_2026-10-23/index.html`) va menyu bo'limini real vazifalar bilan sinash natijalari.

---

## 0. Qisqacha maqsad

1. **Admin panelni restoran egasi uchun oddiy va qulay qilish.** Eng muhim qismlar qoladi, keraksizlari ko'rinmay qoladi, boshqa mahsulotlar (Bozor, 3D Print) aralashmaydi.
2. **Menyu boshqaruvini (taom, narx, rasm, stop-list, 3D) 6 maydonli oddiy shaklga keltirish.** Hozir 32 maydon va bozorga mos bloklar bor.
3. **AR menyu (mehmon `/ar/`) va admindagi "3D Taomlar" bo'limini** tartibga solish.
4. **Telegram bot orqali kirganda mini ilova (Mini App) darhol ochilishi.** Hozir `/start` dan keyin yana tugma bosish kerak, stol ham tanilmaydi.
5. P0 xatolarni tuzatish: sharhlar sahifasi 500, "bugungi tushum" noto'g'ri, CSV da BOM.

---

## 1. Gemini uchun majburiy qoidalar

| № | Qoida |
|---|---|
| 1 | Barcha foydalanuvchi matnlari **o'zbek tilida** (lotin). Kod izohlari ham o'zbekcha, mavjud kod uslubiga mos. |
| 2 | **Hech narsa butunlay o'chirilmaydi** (loyiha qoidasi AGENTS.md 4-qoida). "Olib tashlash" = ko'rinishdan olib tashlash: admin sozlama yoki bayroq (`flag`) bilan yashirish. Kod va ma'lumot qoladi. |
| 3 | **Dizayn:** yangi uslub faqat `[data-design='new']` ostida, yangi fayllarda (`frontend/src/styles/*New.css`). Eski CSS fayllarga tegilmaydi. `cssOrder.ts` ga faqat yangi fayl qo'shiladi. CSS'ni bo'lib yubormang (sinf nomlari fayllar orasida to'qnashadi). |
| 4 | Branch: **`feature/admin-menu-telegram`** (joriy `fix/restaurant-phase0-security` dan). `main` ga **tegmang**. Push qilmang. Commit qilib, Claude'ga topshiring. |
| 5 | `backend/.env` va ildizdagi `.env` ni **hech qachon** o'qimang/ko'rsatmang/commit qilmang (haqiqiy Telegram va AI kalitlari bor). |
| 6 | Yangi paket (pip/npm) qo'shsangiz, nomi, versiyasi (aniq pin) va sababi commit xabarida yozilsin. Zaruratsiz qo'shmang. |
| 7 | Har bosqich uchun test yozing. Testlar internetga chiqmasligi shart (loyihada `NoNetworkDiscoverRunner` bor). |
| 8 | SQLite SQL'dagi uzunlik/cheklov farqlariga ishonmang: PostgreSQL'da ham o'tishi kerak (CharField uzunligi, CHECK cheklovlar). |
| 9 | Pul maydonlari manfiy bo'lmaydi; buyurtma yaratish faqat `orders.creation.create_order`; o'chirish faqat soft-delete (`backend/backend/softdelete.py`). |
| 10 | Dizaynni "yangilash" nomi bilan keraksiz fayllarni qayta formatlamang. Faqat shu TZ'ga tegishli o'zgarishlar. |

### 1.1 Loyiha xaritasi (qisqa)

- `backend/` — Django 6 + DRF. Restoran mahsuloti: `DJANGO_PRODUCT=restaurant` → `backend/backend/urls_restaurant.py`.
- `frontend/` — React 19 + Vite 8 + TypeScript. Build: `cd frontend && BUILD_TO_DJANGO=1 npx vite build` → `backend/static/react` (git'da kuzatiladi, hash'li fayllar).
- Admin ikki joyda: **(a)** Django "Seller" paneli: `backend/templates/seller/*.html`, `backend/web/seller_views/*`, URL: `/seller/…`; **(b)** React "Boshqaruv": `frontend/src/pages/AdminDashboardPage/` (+ `tabs.ts`), URL: `/admin/`.
- Ruxsat matritsasi: `backend/web/restaurant_auth.py` → `CAPABILITIES` (`menu_admin`, `stoplist`, `finance`...). Yangi API'lar shu `capability()` bilan himoyalanadi; ma'lumot **do'kon bo'yicha** cheklanadi (`self.staff_shop()`).
- Restoran REST API: `backend/orders/interfaces/api/` (`urls.py`, `views.py`), prefiks `/api/v1/restaurant/`.
- Telegram: `backend/web/telegram_webhook.py` (bot), `backend/web/telegram_auth.py` (Mini App `initData` imzosini tekshirish), `backend/notifications/` (xabar yuborish, outbox).
- Sozlamalar (kodni o'zgartirmasdan): `backend/backend/app_settings.py` (`get_int`, `get_choice`) + `notifications.AppSetting` modeli. Mehmon dizayni: `guest_design = new|classic` (allaqachon bor).

### 1.2 Ishga tushirish va tekshirish buyruqlari

```bash
# Backend
cd backend
venv/bin/python manage.py test                       # hammasi yashil bo'lishi shart (hozir ~436 test)
venv/bin/ruff check .                                # xatosiz
DJANGO_SKIP_DOTENV=1 DEBUG=True venv/bin/python manage.py makemigrations --check --dry-run   # "No changes detected"

# Frontend
cd frontend
npx tsc -b            # DIQQAT: `tsc --noEmit` hech narsani tekshirmaydi, faqat `tsc -b`
npx oxlint            # 7 ta eski ogohlantirish bor, yangisi qo'shilmasin
npm test
BUILD_TO_DJANGO=1 npx vite build
```

PostgreSQL bilan sinash (parallel testlar faqat shunda ishlaydi):
`docker run -d --name pgtest -e POSTGRES_PASSWORD=pgtest -e POSTGRES_USER=pgtest -e POSTGRES_DB=pgtest -p 55432:5432 postgres:16-alpine`, so'ng
`DJANGO_SKIP_DOTENV=1 DEBUG=True DATABASE_URL=postgres://pgtest:pgtest@localhost:55432/pgtest venv/bin/python manage.py test`.

---

## 2. Asosiy qaror: nima qoladi, nima yashiriladi

Tamoyil: **restoran egasi kunlik 5 ishni qiladi:** (1) bugungi tushum va buyurtmalarni ko'radi, (2) menyuni boshqaradi (taom, narx, rasm, tugadi), (3) stollar va xodimlarni nazorat qiladi, (4) moliyani yuritadi, (5) sozlamalarni o'zgartiradi. Qolgan hamma narsa ikkinchi darajali.

### 2.1 Panelni yagona qilish

**Qaror (tasdiqlanishi kerak):** asosiy panel — **React "Boshqaruv" (`/admin/`)**. U yangi dizaynga mos va toza. Seller panelining ishlayotgan funksiyalari uning ichiga bosqichma-bosqich ko'chiriladi; **ko'chirilgunga qadar** egasi Seller panelda qolaveradi, lekin ortiqcha bo'limlar yashirilgan holda (2.2).

Egasi kirgandan keyin qayerga tushishi: hozir (tekshirilgan) login'dan so'ng `/seller/` ochiladi (`restaurant_admin_login` → `role_home_url()` va `restaurant_admin_dashboard` yo'naltirishi, `web/tma_views.py`, `web/restaurant_auth.py`). 1-bosqichda o'zgarmaydi; 4-bosqichda (Menyu bo'limi React'da tayyor bo'lgach) egasi `/admin/` (React) ga tushadi (bayroq: `owner_home = seller|admin`, standart `seller`; super-admin har doim React'ga).

### 2.2 Seller paneli: har bo'lim uchun qaror

Yashirish bayrog'i: AppSetting `panel_scope` = `restaurant` (standart) yoki `all`. `all` bo'lsa hamma narsa avvalgidek ko'rinadi (eski ko'rinish qaytadi).

| Bo'lim (chap menyu) | URL | Qaror | Izoh |
|---|---|---|---|
| Dashboard | `/seller/` | **QOLADI**, soddalashtiriladi | 2.3 ga qarang |
| Order Management → «Buyurtmalar» | `/seller/orders/` | **QOLADI** | nomi o'zbekcha; sahifalash qo'shiladi (50 tadan) |
| Mahsulotlar & 3D → «Menyu» | `/seller/products/` | **QOLADI**, qayta ishlanadi | 3-bo'lim |
| Ofitsiant POS (Kassa) | `/seller/waiter/` | **QOLADI** | o'zgarmaydi |
| Stollar & Zallar | `/seller/tables/` | **QOLADI** | QR stendlar chop etish shu yerda |
| Oshxona ekrani (KDS) | `/seller/kds/` | **QOLADI** | |
| Moliya & Kassa | `/seller/finance/` | **QOLADI** | P0 tuzatishlar (5-bo'lim) |
| Telegram Bot | `/seller/telegram/` | **QOLADI** | 6-bo'lim sozlamalari shu yerga qo'shiladi |
| Sozlamalar & Do'kon | `/seller/shop/` | **QOLADI**, soddalashtiriladi | faqat nom, manzil, telefon, ish vaqti, xizmat haqi, til; "Delivery and geo", "Min order" kabilar yashiriladi |
| Mijozlar | `/seller/customers/` | QOLADI (ikkinchi darajali) | «Mehmonlar» deb nomlanadi |
| Sharhlar | `/seller/reviews/` | QOLADI, **500 xato tuzatiladi** | 5.1 |
| Analitika | `/seller/analytics/` | QOLADI, o'zbekcha | ingliz sarlavhalar tarjima qilinadi |
| Profil | `/seller/profile/` | QOLADI | |
| **3D Print Navbati** (3D Studio bloki) | `/seller/studio/` | **YASHIRILADI** | boshqa mahsulot |
| **«3 TA MAHSULOT» bloki** (Online Store, 3D Studio & Servis) | `base_seller.html` ~371–385 qatorlar | **YASHIRILADI** | boshqa mahsulotlar |
| **Do'kon yaratish/ro'yxatdan o'tish** (`shop_create`, `register`) | `/seller/register/` | **YASHIRILADI** | restoran faqat `create_restaurant` buyrug'i bilan ochiladi |
| **Shablon galereyasi, do'kon quruvchi, shablon sozlash** | `/seller/template-gallery/`, `/seller/shop/builder/`, `/seller/template-*` | **YASHIRILADI** | bozor do'konlari uchun |
| **NFC** | `/seller/nfc/` | **YASHIRILADI** (faqat `DEMO_MODE` da ko'rinadi) | production'da stolni NFC aniqlay olmaydi (loyihada shunday qaror qilingan) |
| Jonli AR (`/seller/ar/`) | `/seller/ar/` | **BIRLASHTIRILADI** → «Menyu» ichidagi «3D Taomlar» | alohida bo'lim bo'lib turmaydi |
| «Excel/CSV orqali yuklash», «Milliy taomlar» (starter) | `/seller/products/import-csv/`, `seed-starter/` | QOLADI, lekin «Menyu» sahifasida «Qo'shimcha ▾» menyusi ichida | har kuni kerak emas |
| Pastdagi suzuvchi «smart_toy» tugmasi (AI yordamchi) | `base_seller.html` | **YASHIRILADI** (bayroq `ai_assistant`, standart o'chiq) | tashqi AI ga ma'lumot ketadi, restoran uchun kerak emas |

Yashirish texnikasi: shablonda `{% if panel_scope == 'all' %}…{% endif %}`; `panel_scope` kontekst protsessori orqali beriladi (`get_choice('panel_scope', 'restaurant', ('restaurant', 'all'))`). Yashirilgan sahifalarga to'g'ridan-to'g'ri kirilsa, restoran rejimida **404 emas, `/seller/` ga yo'naltiriladi**.

### 2.3 Dashboard (egasi uchun bosh sahifa)

Faqat 6 ta karta, hammasi **bugungi** kun bo'yicha, server tomonidan hisoblanadi (bitta joyda, 5.2):

1. Bugungi tushum (naqd / plastik ajratilgan)
2. Bugungi buyurtmalar soni va o'rtacha chek
3. Faol buyurtmalar (oshxonada), bosilsa KDS ga o'tadi
4. Band stollar / jami stollar
5. Tugagan (stop-list) taomlar soni, bosilsa «Menyu» da filtr
6. Eng ko'p sotilgan 5 taom (bugun)

Olib tashlanadi (yashiriladi): «Mahsulotlar soni», «Bonus xarajat», «Haftalik tushum» (alohida bo'limda), «O'rtacha reyting» kartasi, «Tezkor amallar» dagi «Dizayn», «Profil». «Restoranni 5 daqiqada tayyorlash» yo'riqnomasi **restoranga moslab qoladi** (Stollar → Menyu → QR stendlar → KDS) va tugallangach avtomatik yo'qoladi.

### 2.4 React «Boshqaruv» paneli: bo'limlar

| Bo'lim | Qaror |
|---|---|
| Boshqaruv markazi | QOLADI, raqamlar tuzatiladi (5.2) |
| Oshxona (KDS), Ofitsiant paneli, Hostess paneli | QOLADI |
| Stollar & Bron | QOLADI; dashboard (11 stol) va tab (8 stol, boshqa zal nomlari) bir xil manbadan olsin (server) |
| **Menyu** | **QOLADI, hozir bo'sh, to'ldiriladi** (3-bo'lim) |
| Moliya & Kassa | QOLADI; sana filtri va sahifalash (5.3) |
| **3D Taomlar** | QOLADI, ishlaydigan qilinadi (4.2) |

---

## 3. Menyu bo'limi (eng muhim qism)

Joyi: React admin → «Menyu» tabi (`/admin/` ichida), hozirgi bo'sh `activeTab === 'menu'` o'rniga. Komponent: `frontend/src/pages/AdminDashboardPage/MenuManager/` (yangi). Seller paneldagi `/seller/products/` ham yangi dizayn va 3.3 qoidalari bilan tuzatiladi (egasi hali shu yerga tushadi).

### 3.1 Ro'yxat

- Katta rasmli kartalar (mehmon menyusi kabi), yuqorida: **qidiruv (yozganda ishlaydi, 250 ms kechikish bilan)**, kategoriya tugmalari, holat filtri: **Hammasi / Sotuvda / Tugagan / Rasmsiz**.
- Har kartada: rasm, nom, narx, kategoriya, holat belgilari, va **3 ta amal**:
  1. **«Tugadi / Qaytdi»** bitta bosish bilan almashtiruvchi tugma (stop-list; ichki: `POST /api/v1/restaurant/products/<id>/availability/` — mavjud). Natijasi darhol ko'rinadi (optimistik UI, xato bo'lsa qaytariladi).
  2. **«Tavsiya» yulduzi** (`is_featured`) bitta bosish bilan.
  3. **«Tahrirlash»**.
- «⋯» menyusi: **Nusxalash**, **Yashirish (o'chirish)**.
- **Yashirish** — soft-delete; tasdiqlash oynasi: «'Medovik' menyudan yashiriladi. Keyinroq «Yashirilganlar» bo'limidan qaytarish mumkin.» (taom nomi bilan). Yuqorida «Yashirilganlar (N)» ko'rinishi va **«Qaytarish»** tugmasi bo'lishi shart.
- Rasmi yo'q yoki namunaviy (placeholder) taomda kartada ogohlantirish: «📷 Haqiqiy rasm yuklang».
- Ro'yxat sahifalanadi (30 ta, «Yana ko'rsatish»); server tomonida.

### 3.2 Forma (qo'shish va tahrirlash): 6 maydon

Yuqori qismda faqat:

| № | Maydon | Turi | Qoida |
|---|---|---|---|
| 1 | Nomi | matn (majburiy) | 2–200 belgi |
| 2 | Narxi (so'm) | raqam (majburiy) | ≥ 0, butun son, maks. 99 999 999 |
| 3 | Kategoriya | tanlov (restoran toifalari) | 3.4 |
| 4 | Tavsif | matn | maks. 500 belgi, 2 qator |
| 5 | Rasm | fayl + **kamera** (`accept="image/*" capture="environment"` tugmasi) | mavjud `upload_validation` va WebP optimallashtirish ishlatiladi |
| 6 | Sotuvda | almashtirgich | standart: yoqilgan |

**Bu 6 ta maydondan keyin, yig'iladigan «Qo'shimcha ▾» bo'limi:** Eski narx (chegirma uchun), «Tavsiya» belgisi, «Halol» belgisi, Porsiya og'irligi (gramm, `weight`), Tayyorlanish vaqti (daqiqa, yangi maydon `prep_minutes`, 3.5), Tartib raqami.

**Formada ko'rinmaydi (yashiriladi, kod va ma'lumot qoladi):**
Flash-aksiya (narx va tugash vaqti), Ombor zaxirasi (`stock`: faqat «Qo'shimcha» ichida va aniq tushuntirish bilan: «0 = hisoblanmaydi»), O'lchov birligi (standart «dona»), 2- va 3-rasm, video, «Mahsulot sahifasi dizayni & shablon» (6 ta shablon), asosiy rang, vitrina nishoni (Badge), fon mavzusi, jismoniy o'lchamlar (kenglik/balandlik/chuqurlik), «3D O'lcham chizg'ichi», «Desktopda AR QR vidjeti», «3D rang o'zgartirgich», «GLB model havolasi» (faqat «Mutaxassis uchun» ichida, 4.2).

Formada: **qo'zg'almas «Saqlash» tugmasi** (telefonda pastga yopishgan), xatolar maydon yonida o'zbekcha (brauzerning inglizcha xabari emas: `novalidate` + o'z xabarlari), saqlangach ro'yxatga qaytib «'Nom' saqlandi» xabari (toast).

### 3.3 Seller `/seller/products/` shu qoidalarga ko'ra

React «Menyu» tayyor bo'lgunga qadar Seller sahifasida ham: ro'yxatda «Tugadi» tugmasi, yozganda ishlaydigan qidiruv (yoki Enter'siz 400 ms), yashirish tasdig'ida taom nomi, forma 6 maydon + «Qo'shimcha», qo'zg'almas «Saqlash» (mobil). Yashirilgan bloklar `panel_scope = all` da qaytadi.

### 3.4 Kategoriyalar (restoran uchun)

Hozir ro'yxatda 19 ta toifa, ular orasida restoranga aloqasizlar: Mevalar, Sabzavotlar, Go'sht, Sut mahsulotlari, Oziq-ovqat, Gigiena, Uy-ro'zg'or, Mahalliy mahsulotlar, Bolalar, Texnika; dublikat: «Non va pishiriq» va «Non va pishiriqlar».

- `categories.Category` ga yangi maydon `is_restaurant = BooleanField(default=False)` (migratsiya). Ma'lumot migratsiyasi nomi bo'yicha `True` qo'yadi: Milliy taomlar, Kaboblar, Somsalar, Salatlar, Non va pishiriqlar, Asosiy taomlar, Shirinliklar, Ichimliklar (+ sho'rvalar bo'lsa).
- Restoran rejimida (`panel_scope = restaurant`) menyu formasi va filtrlarida faqat `is_restaurant=True` va shu do'konda ishlatilayotgan toifalar.
- «Yangi toifa qo'shish» tugmasi (nom, emoji) egasi uchun: `is_restaurant=True` bilan yaratadi.
- Dublikat «Non va pishiriq» — `is_restaurant=False` (yashiriladi), unga bog'langan taomlar ko'rinishda «Non va pishiriqlar» ostida ko'rsatilmaydi: **ma'lumot ko'chirish kerak emas**, faqat mavjud taomlar o'z toifasini saqlaydi; yangi taomga eski toifa tanlab bo'lmaydi.

### 3.5 Model o'zgarishlari (migratsiya bilan, hammasi `null=True`/standart qiymatli)

| Model | Maydon | Maqsad |
|---|---|---|
| `products.Product` | `prep_minutes` PositiveSmallIntegerField(null, blank) | tayyorlanish vaqti (mehmon kartasida «~15 daq») |
| `products.Product` | `has_real_photo` BooleanField(default=False) | rasm UI orqali yuklanganda `True`; eski yozuvlar `False`, shuning uchun «Haqiqiy rasm yuklang» ogohlantirishi chiqadi |
| `categories.Category` | `is_restaurant` BooleanField(default=False) | 3.4 |

Eslatma: `Product.slug` uzunligi 50, `Product.save()` allaqachon noyob slug yaratadi, tegmang. Yangi CharField'lar PostgreSQL uzunligini hisobga olsin.

### 3.6 Yangi API (faqat `capability('menu_admin')`, do'kon bo'yicha cheklangan)

Prefiks: `/api/v1/restaurant/menu-admin/` (fayl: `backend/orders/interfaces/api/menu_admin.py`, URL'lar `urls.py` ga).

| Metod va yo'l | Vazifa |
|---|---|
| `GET products/?q=&category=&status=all|on|off|nophoto|hidden&page=` | ro'yxat, sahifalangan (30), `hidden` — yashirilganlar |
| `POST products/` (multipart) | yaratish (6 maydon + qo'shimcha) |
| `PATCH products/<id>/` (multipart) | tahrirlash |
| `POST products/<id>/duplicate/` | nusxalash (nomiga «(nusxa)») |
| `POST products/<id>/feature/` `{value: bool}` | «Tavsiya» |
| `DELETE products/<id>/` | **soft-delete** (yashirish); audit yozuvi |
| `POST products/<id>/restore/` | qaytarish |
| `GET categories/` / `POST categories/` | restoran toifalari |

Mavjud `POST products/<id>/availability/` (stop-list) va `POST products/<id>/3d-scan/` o'zgarishsiz qoladi (frontend ularni chaqiradi).

**Xavfsizlik (testlari majburiy):** (1) boshqa do'konning taomiga IDOR yo'q, (2) `kitchen`/`waiter`/`hostess` rollari 403 (stop-list ruxsati bundan mustasno, u alohida), (3) rasm faqat `validate_uploaded_file` dan o'tadi (kengaytma + imzo + o'lcham), (4) narx manfiy emas, (5) har o'zgarish `AuditLog` ga yoziladi, (6) javobda boshqa do'kon ma'lumoti chiqmaydi.

### 3.7 Qabul mezonlari (Menyu)

- Yangi taom qo'shish: **≤ 5 bosish** (Menyu → «Qo'shish» → nom → narx → rasm → Saqlash), maydon soni 6.
- Taomni sotuvdan olish: **1 bosish**, mehmon menyusida **≤ 3 soniyada** yo'qoladi (keyingi yuklashda).
- Telefonda (390 px) forma va ro'yxat gorizontal skrollsiz; «Saqlash» ko'rinib turadi.
- «Rasmsiz» filtri va kartada ogohlantirish ishlaydi.
- Yashirilgan taom «Yashirilganlar» da bor va «Qaytarish» ishlaydi; eski buyurtmalarda nomi saqlanadi.
- Testlar: API (CRUD, IDOR, rol, rasm validatsiyasi, soft-delete/restore, audit), frontend (`npm test`: forma tekshiruvlari), brauzer e2e (skript `scripts/e2e_menu_admin.mjs`: qo'shish → tahrir → tugadi → mehmon menyusi → yashirish → qaytarish).

---

## 4. AR menyu va «3D Taomlar»

### 4.1 Mehmon AR sahifasi (`/ar/`, `frontend/src/pages/ARMenuPage/`)

Hozir: sarlavha → 360° hero karta → qidiruv va kategoriya → 360° taomlar to'ri → 3D/AR modal → pastki navigatsiya.

| Qism | Qaror |
|---|---|
| Sarlavha (HeaderNav), pastki navigatsiya | QOLADI |
| 360° taomlar to'ri (kartalar) | **QOLADI** (asosiy qism) |
| Qidiruv va kategoriya tugmalari | QOLADI |
| 3D/AR modal (`Modal3D`) | QOLADI; asosiy amallar: aylantirish, «AR da ko'rish» (qurilma qo'llasa), «Savatga qo'shish» |
| Katta hero karta | **Ixchamlashtiriladi**: bitta sarlavha va 1 qator tavsif; uzun matn va qo'shimcha tugmalar yashiriladi |
| 3D modeli yo'q taomlar | **To'rda ko'rsatilmaydi** (faqat `has_3d` va model holati `ready`); hammasi bo'lsa `Menyuga qaytish` bilan bo'sh holat xabari |
| Demo/mock taomlar | faqat `DEMO_MODE` da (hozirgi xatti-harakat saqlanadi) |

Yangi dizayn (`[data-design='new']`): kenglik 1440/1680 px (`.ar-page-main` allaqachon ulangan), kartalar menyu kartalari bilan bir xil uslub. Texnik talablar: `model-viewer` faqat modal ochilganda yuklanadi (hozir shunday, buzmang); modal ichida `loading="lazy"`, poster rasm; model hajmi 1,5 MB dan oshsa adminda ogohlantirish (4.2); AR tugmasi qo'llamaydigan qurilmada ko'rsatilmaydi.

### 4.2 Admindagi «3D Taomlar» bo'limi (React)

Hozir: «Laboratoriya» sarlavhasi va ikkita tugma (bo'sh). O'rniga:

- Ro'yxat: har taom uchun rasm, nom, **3D holati** (`Tayyor` / `Tayyorlanmoqda` / `Xato` / `Yo'q`), `Rasmdan 3D yaratish` tugmasi (mavjud `3d-scan` API, holat har 5 soniyada yangilanadi), `Ko'rish` (modal), `Almashtirish` va `Yashirish` (modelni mehmon menyusidan olib tashlash; `has_3d=false`, fayl qoladi).
- **«Mutaxassis uchun»** yig'iladigan blok: tayyor GLB faylni **yuklash** (havola kiritish emas, fayl tanlash; `validate_uploaded_file` va 1,5 MB ogohlantirish) va tashqi GLB havola.
- Soddalashtirish: «Fotogrammetriya studiyasi» modali (`PhotogrammetryStudioModal`) qoladi, lekin «Yangi 3D taom yaratish» tugmasi faqat «Taom qo'shish» formasiga olib boradi (rasm yuklangach 3D tugmasi chiqadi).
- Seller `/seller/ar/` va `/seller/studio/` restoran rejimida shu bo'limga yo'naltiriladi.

Qabul: 3D holati serverdan; rasm yuklangach `3D yaratish` ishlaydi; model tayyor bo'lgach mehmon `/ar/` sahifasida taom paydo bo'ladi; xato holatda tushunarli xabar.

---

## 5. P0 xatolar (shu TZ bilan birga tuzatiladi)

### 5.1 `/seller/reviews/` sharh bo'lsa 500 (`NoReverseMatch: admin_review_delete`)

- Restoran URL'larida (`urls_restaurant.py`) sharhni yashirish uchun **do'kon bo'yicha cheklangan** yangi marshrut: nomi `admin_review_delete`, `POST` faqat; sharh `review.product.shop == staff_shop` bo'lsagina yashiriladi (soft-delete; `Review` allaqachon `SoftDeleteModel`).
- Bozor URLconf'idagi `web.views.admin_review_delete` ham shu tekshiruvni olsin (IDOR yopiladi).
- Test: sharhli bazada `/seller/reviews/` 200; boshqa do'kon sharhini o'chirish 404/403.

### 5.2 «Bugungi tushum» va «Buyurtmalar soni» butun davr yig'indisi

- Yagona funksiya `finance/services/summary.py: today_summary(shop)` (mahalliy kun, `Asia/Tashkent`, bekor qilinganlar hisobga olinmaydi): tushum (naqd/plastik), chiqim, buyurtmalar soni, o'rtacha chek.
- React dashboard, React moliya, Seller dashboard va Telegram `/kassa` **faqat shu funksiyadan** foydalanadi (hozir 4 xil hisob).
- `web/tma_views.py: restaurant_admin_dashboard` (va u beradigan JSON) `today_orders_count` ni bugungi kun bilan hisoblasin.
- Test: 3 kunlik ma'lumotda «bugun» faqat bugungini beradi; ikki panel bir xil raqam.

### 5.3 Moliya API'da sana filtri va sahifalash

`GET /api/v1/restaurant/finance/?from=YYYY-MM-DD&to=YYYY-MM-DD&page=` (standart: bugun). Javobda `total`, `page`, `has_next` va davr yig'indilari. React moliya sahifasida «Bugun / Hafta / Oy / Oraliq» tugmalari. Kanban «Kassaga kirdi» ustuni tanlangan davr bilan cheklanadi.

### 5.4 Eksport

`finance/views.py` (CSV eksport, ~858–880-qatorlar): `HttpResponse(content_type='text/csv; charset=utf-8-sig')` har `write()` da BOM qo'shadi (har qator boshida U+FEFF). Tuzatish: `content_type='text/csv; charset=utf-8'`, BOM faqat **bir marta** boshida yoziladi. Qo'shimcha: `from`/`to` davr parametri; summa `150000.00` ko'rinishida; kategoriya nomida emoji yo'q; **«Buyurtma №»** alohida ustun; avtomatik yozuvlarda «Kiritgan xodim» = «Tizim». Test: faylda BOM aniq 1 ta.

### 5.5 Tashqi CDN'lardan voz kechish (P1, alohida bosqich)

`backend/templates/base.html`: `cdn.tailwindcss.com`, `fonts.googleapis.com` (Fraunces, Inter, Material Icons). Talab: panel internetsiz ham to'liq ishlasin.
- Tailwind: standalone CLI bilan **yig'ilgan** CSS (`backend/static/css/seller.tw.css`), `content` — `backend/templates/**/*.html`. Skript `scripts/build_tailwind.sh`. Yig'ilgan fayl git'ga kiradi.
- Shriftlar va Material Icons `woff2` fayllari `backend/static/fonts/` ga ko'chiriladi (litsenziyasi ruxsat bergan: Material Icons — Apache 2.0, Inter/Fraunces/Outfit/Plus Jakarta — OFL).
- Qabul: tarmoq o'chirilgan brauzerda (`page.route('**', abort)` faqat o'z domeniga ruxsat) `/seller/` ni ochganda bezaksiz emas, ikonlar matn emas.

### 5.6 Til

Seller shablonlarida inglizcha qolgan yozuvlar tarjima qilinadi («Order Management» → «Buyurtmalar», «Main info» → «Asosiy ma'lumotlar», «Delivery and geo» va h.k.). Standart til **`uz`** (brauzer tilidan qat'i nazar), UZ/RU/EN tugmasi qoladi. Tarjima fayllari: `backend/locale/` va `web/templatetags/i18n_tags.py`.

---

## 6. Telegram bot → Mini App (darhol ochilishi)

### 6.1 Hozirgi holat (fakt)

- `web/telegram_webhook.py::get_menu_markup` — `/start` ga javobda 4–5 ta inline tugma: «3D Restoran Menyu», «3D Printer Studio», «Online Do'kon», «Mening stolim & Bron», admin uchun «Stollar Nazorati». Mini App ochish uchun **tugmani bosish kerak**.
- Stol deep link: `/start table_5` → `?table=5`. Production'da `?table=NN` o'chirilgan (`RESTAURANT_ALLOW_TABLE_NUMBER_URL=False`), shuning uchun **bot orqali stol tanilmaydi**.
- Bazaviy havola `get_base_url_from_request(request)` — so'rovning `Host` sarlavhasidan olinadi (xavfli: sarlavhani almashtirish mumkin). Production'da `RESTAURANT_PUBLIC_URL` ishlatilishi kerak.
- Mini App ichida `telegram-web-app.js` ulangan (`templates/tma/base_tma.html`), lekin `Telegram.WebApp.ready()`, `expand()`, `start_param`, `BackButton`, mavzu **ishlatilmaydi**. `initData` imzosi tekshiriladi (`web/telegram_auth.py::telegram_id_from_request`), faqat to'lov formasida (`CheckoutPage.tsx`) yuboriladi.

### 6.2 Maqsadli xatti-harakat

1. Mehmon botni ochadi → pastki chap burchakda doimiy **«🍽 Menyu» tugmasi** (chat menu button) mini ilovani ochadi. `/start` ga javobda **bitta katta tugma** «🍽 Menyuni ochish».
2. Stol QR kodi Telegram'da skanerlansa, mini ilova **to'g'ridan-to'g'ri ochiladi va stol tanilgan holda** (`t.me/<bot>/<app>?startapp=t_<token>`).
3. Boshqa mahsulot tugmalari («3D Printer Studio», «Online Do'kon») bot javobidan yashiriladi (`bot_scope = restaurant`, standart).
4. Mini ilova Telegram uslubiga mos: to'liq balandlik, brend rangidagi sarlavha, «Orqaga» tugmasi.

### 6.3 Vazifalar

**T1. Bot javobi va doimiy tugma**
- `get_menu_markup`: `bot_scope = restaurant` bo'lsa faqat 2 ta tugma: «🍽 Menyuni ochish» (`web_app`), «📍 Mening stolim & Bron». Adminda (`is_admin`) «📊 Stollar nazorati» qoladi. `bot_scope = all` eski ro'yxatni qaytaradi.
- Yangi boshqaruv buyrug'i: `python manage.py setup_telegram_miniapp` (`backend/notifications/management/commands/`):
  1. `setChatMenuButton` — `{"type": "web_app", "text": "🍽 Menyu", "web_app": {"url": "<RESTAURANT_PUBLIC_URL>/restaurant/"}}`;
  2. `setMyCommands` — `/start`, `/menu`, `/id` (admin buyruqlari ro'yxatda ko'rinmaydi);
  3. `setMyDescription` / `setMyShortDescription` (o'zbekcha);
  4. natijani chop etadi, **tokenni hech qachon chop etmaydi**.
  Telegram so'rovlari `TELEGRAM_API_BASE` orqali (testlarda soxta server).
- `RESTAURANT_PUBLIC_URL` bo'sh bo'lsa production'da buyruq aniq xato bilan to'xtaydi; Mini App URL'lari **HTTPS** bo'lishi shart.

**T2. Bazaviy havola xavfsizligi**
`get_base_url_from_request` o'rniga: production'da `settings.RESTAURANT_PUBLIC_URL` (bo'sh bo'lmasa) ustun; `Host` sarlavhasi faqat DEBUG/lokal sinovda (Cloudflare tunnel) ishlatiladi. Test: noto'g'ri `Host` bilan kelgan webhook so'rovi tugma URL'ini o'zgartirmaydi.

**T3. Stol bilan to'g'ridan-to'g'ri ochilish (`startapp`)**
- Payload formati: `t_<qr_token_hex>` (UUID tire'siz, 32 belgi, `[a-z0-9]`; Telegram `startapp` 64 belgigacha, `A-Za-z0-9_-`).
- Mini ilova kirish nuqtasi (`frontend/src/main.tsx` yoki yangi `utils/telegramBoot.ts`): `Telegram.WebApp.initDataUnsafe.start_param` o'qiladi; `t_` bilan boshlansa `/t/<uuid>/` (mavjud `table_menu_redirect`) ga o'tkaziladi, sessiyada stol eslab qolinadi. Noma'lum/yaroqsiz payload **jim e'tiborsiz** qoldiriladi va umumiy menyu ochiladi.
- Bot deep link (`https://t.me/<bot>?start=t_<token>` → `/start t_<token>`) kelganda bot token'ni tekshiradi (`Table.objects.filter(qr_token=<UUID>, is_active=True)`) va `web_app` tugmasi URL'ini to'g'ridan-to'g'ri **`<RESTAURANT_PUBLIC_URL>/t/<uuid>/`** qilib beradi (mavjud `table_menu_redirect`); bu yo'lda `start_param` kerak emas (Telegram klaviatura `web_app` tugmasida uni bermaydi). `start_param` faqat to'g'ridan-to'g'ri havola (`t.me/<bot>/<app>?startapp=…`) orqali ochilganda keladi, shuning uchun mini ilova **ikkala** manbani ham o'qiydi. Raqamli `table_5` **production'da qabul qilinmaydi** (hozirgi `RESTAURANT_ALLOW_TABLE_NUMBER_URL` siyosati saqlanadi), faqat `DEMO_MODE` da.
- Admin QR generatori (`QRGeneratorModal`, Seller «Stollar»): QR turi tanlovi — «Brauzer» (hozirgi `/t/<uuid>/`) yoki «Telegram» (`https://t.me/<bot>/<app>?startapp=t_<token>`). Bot username va app short name — AppSetting (`telegram_bot_username`, `telegram_app_short_name`); bo'sh bo'lsa «Telegram» varianti o'chiq va tushuntirish ko'rsatiladi.

**T4. Mini ilova sozlamalari (frontend)**
`frontend/src/utils/telegramBoot.ts` (yangi), `main.tsx` da bir marta chaqiriladi, faqat `window.Telegram?.WebApp` mavjud bo'lsagina:
- `WebApp.ready()`; `WebApp.expand()`;
- `setHeaderColor('#FFFFFF')` va `setBackgroundColor('#FAF7F2')`;
- `BackButton`: ichki sahifada ko'rinadi, `history.back()`/`navigate` ga ulanadi; bosh sahifada yashirin;
- `enableClosingConfirmation()` — savat bo'sh bo'lmaganda; buyurtma yuborilgach o'chiriladi;
- `HapticFeedback.impactOccurred('light')` — «Qo'shish» tugmasida;
- Telegram mavzusini **qo'llamaymiz** (brend ranglari qoladi).
Brauzerda (Telegram tashqarisida) hech narsa o'zgarmasligi shart. Test: `window.Telegram` bo'lmaganda xatosiz ishlaydi; soxta `WebApp` bilan `ready/expand` chaqirilishi birlik testida tekshiriladi.

**T5. Mehmonni tanish (`initData`)**
- Barcha mehmon yozuv so'rovlariga (`checkout`, ofitsiantni chaqirish, buyurtmalar ro'yxati) `X-Telegram-Init-Data` sarlavhasi avtomatik qo'shiladi (yagona `fetch` o'rovchisi; hozir faqat to'lov formasida).
- Server har doim imzoni `telegram_id_from_request` bilan tekshiradi; imzosiz yoki muddati o'tgan (`auth_date` > 24 soat) so'rov — oddiy anonim mehmon sifatida ishlaydi (**xato emas**).
- «Mening buyurtmalarim» Telegram ID bo'yicha ham ko'rinadi (sessiya yo'qolganda tiklanadi). Boshqa foydalanuvchi buyurtmasi ko'rinmasligi **testlanadi**.

**T6. Mehmonga bildirishnoma (ixtiyoriy, P2)**
Buyurtma «tayyor» bo'lganda mehmonga Telegram xabari: faqat mehmon `WebApp.requestWriteAccess()` ga rozilik bergan bo'lsa va `telegram_notify_guest_status = True` (admin sozlamasi, standart **o'chiq**). Mavjud outbox (`notifications.outbox`) orqali; xodim chatiga yuboriladigan xabarlar bilan aralashmaydi. Maxfiylik: xabarda telefon/ism yo'q.

**T7. Admin Telegram orqali (tadqiqot, kod yozilmaydi)**
Egasi boshqaruv panelini Mini App ichida ochishi uchun Telegram identifikatori bilan kirish kerak (`AdminUser` ↔ Telegram ID bog'lash). Bu alohida TZ va xavfsizlik sharhini talab qiladi. **Hozir qilinmaydi**; `/kassa`, `/order` buyruqlari avvalgidek qoladi.

### 6.4 Egasi (inson) qiladigan qadamlar, kod emas

1. @BotFather → botni tanlang → **Bot Settings → Configure Mini App** (yoki `/newapp`): URL = `https://<domen>/restaurant/`, short name = masalan `menu`. Natijada `https://t.me/<bot>/menu` havolasi ishlaydi.
2. Admin sozlamada (`Telegram Bot` bo'limi) `telegram_bot_username` va `telegram_app_short_name` ni kiriting.
3. Serverda bir marta: `python manage.py setup_telegram_miniapp`.
4. Haqiqiy telefonda tekshiring (7.2 ro'yxati).

Domen (HTTPS) hali yo'q bo'lsa, lokal sinov Cloudflare tunnel bilan; `RESTAURANT_PUBLIC_URL` shu havolaga qo'yiladi.

### 6.5 Qabul mezonlari (Telegram)

- `/start` → bitta katta tugma; bosilganda mini ilova ochiladi. Chat menyu tugmasi mini ilovani ochadi.
- Stol QR (Telegram turi) skanerlansa, mini ilova to'g'ridan-to'g'ri ochiladi, **stol tanilgan** (menyuda «Stol 5»), buyurtma shu stolga tushadi.
- Yaroqsiz `startapp` payload ilovani buzmaydi.
- `Telegram.WebApp` yo'q joyda (oddiy brauzer) hech narsa o'zgarmaydi.
- `get_base_url_from_request` ga soxta `Host` ta'sir qilmaydi.
- Testlar: tugma markup'i (`bot_scope` ikkala qiymat), `/start t_<token>` tahlili, `setup_telegram_miniapp` (soxta Telegram serveri: 3 ta chaqiruv, token chiqmaydi), `start_param` → stol sessiyasi, `initData` bilan/siz so'rovlar.

---

## 7. Bosqichlar, topshirish va tekshirish tartibi

### 7.1 Bosqichlar (har biri alohida commit(lar), alohida tekshiruv)

| № | Bosqich | Daraja | Hajm |
|---|---|---|---|
| 1 | **P0 xatolar:** 5.1 sharhlar, 5.2 bugungi hisob, 5.4 CSV BOM | P0 | S |
| 2 | **Seller paneli tozalash:** `panel_scope`, 2.2 jadvali, 2.3 dashboard, 5.6 til | P0/P1 | M |
| 3 | **Menyu backend:** 3.4–3.6 (migratsiyalar, `menu-admin` API, testlar) | P1 | M |
| 4 | **Menyu frontend:** 3.1–3.2 (React «Menyu» tabi), Seller `/seller/products/` 3.3 | P1 | L |
| 5 | **Telegram T1–T3:** bot javobi, `setup_telegram_miniapp`, `startapp` stol | P1 | M |
| 6 | **Telegram T4–T5 + 3D bo'limi 4.1–4.2** | P1 | M |
| 7 | **Moliya 5.3** (sana filtri/sahifalash), yangi dizaynni AR sahifasiga | P1 | M |
| 8 | **5.5 CDN'lardan voz kechish** | P1 | M |
| 9 | T6 (mehmon bildirishnomasi) | P2 | S |

Har bosqich: kichik commit'lar, xabar formati `feat(admin): …` / `fix(finance): …`, oxirida `Co-Authored-By: Gemini <noreply@google.com>`. Bosqich tugagach **testlar yashil bo'lmaguncha** keyingisiga o'tmang.

### 7.2 Topshirish va tekshirish (Claude)

1. Gemini ishni `feature/admin-menu-telegram` branch'ida commit qiladi va xabar beradi (qaysi bosqich).
2. Claude: `git diff`ni o'qiydi (xavfsizlik, do'kon bo'yicha cheklash, soft-delete, migratsiyalar), `manage.py test` (SQLite **va** PostgreSQL), `ruff`, `tsc -b`, `oxlint`, `npm test`, build, `makemigrations --check`.
3. Claude brauzerda haqiqiy tekshiruv o'tkazadi: 390/820/1440/1920 px skrinshotlar, e2e skript, internetsiz rejim (5.5), mehmon va admin o'rtasida aylanma yo'l (menyu → mehmon menyusi).
4. Muammo bo'lsa, ro'yxat bilan Gemini'ga qaytariladi. Hammasi yaxshi bo'lsa — Claude **branch'ni GitHub'ga yuboradi** (`git push -u <remote> feature/admin-menu-telegram`). `main` ga birlashtirish faqat egasining aniq buyrug'i bilan.
5. **Remote tanlovi (egasi aytishi kerak):** loyihada ikki remote bor: `origin` → `online_Store.git`, `menu` → `3d-ar-menu-.git`. Qaysi biriga yuborilishi hozircha belgilanmagan.

Telefondagi qo'lda tekshiruv ro'yxati (egasi/Claude): Telegram'da botni oching → «Menyu» tugmasi → ilova to'liq ekran → taom qo'shing → stol QR (Telegram turi) → buyurtma → admin panelda ko'rinadi → «Tugadi» → mehmon menyusidan yo'qoladi.

---

## 8. Umumiy qabul mezonlari

1. Egasi panelga kirganda **faqat restoran bo'limlarini** ko'radi; Bozor, 3D Print, shablon galereyasi yashirin; `panel_scope = all` hammasini qaytaradi.
2. «Bugungi tushum» barcha joyda bir xil va faqat bugungi.
3. Menyuda taom qo'shish/tahrirlash/tugadi/yashirish/qaytarish ishlaydi, 6 maydonli forma, mobil qulay.
4. `/ar/` va «3D Taomlar» bo'limi ishlaydi; modelsiz taomlar AR to'rida yo'q.
5. Telegram: `/start` va chat menyu tugmasi mini ilovani ochadi; Telegram turidagi stol QR stolni taniydi.
6. Hech narsa o'chirilmagan: eski dizayn (`guest_design=classic`) va bozor bo'limlari (`panel_scope=all`) sozlama bilan qaytadi.
7. Barcha testlar SQLite va PostgreSQL'da yashil; `ruff`, `tsc -b`, `oxlint` yangi xatosiz; migratsiyalar tozalanadi (`makemigrations --check`).
8. Yangi dizayn eskisiga ta'sir qilmaydi (`classic` rejimda skrinshot o'zgarmaydi).

## 9. Ochiq qarorlar (egasidan)

| № | Savol | Tavsiya |
|---|---|---|
| 1 | Qaysi panel asosiy: React «Boshqaruv» yoki Seller? | React; Seller bosqichma-bosqich ko'chiriladi |
| 2 | GitHub remote: `origin` (online_Store) yoki `menu` (3d-ar-menu-)? | restoran mahsuloti uchun `menu`, lekin egasi hal qiladi |
| 3 | Telegram bot username va Mini App short name? | BotFather'da yaratiladi (egasi) |
| 4 | Domen (HTTPS) qachon bo'ladi? | Mini App uchun majburiy; hozircha tunnel |
| 5 | Mehmonga Telegram bildirishnomasi (T6) kerakmi? | pilotdan keyin |
| 6 | Haqiqiy taom rasmlari (22 ta soxta) kim yuklaydi? | egasi; 3.2 forma va «Rasmsiz» filtri shu uchun |

## Ilova A. Gemini'ga beriladigan boshlang'ich ko'rsatma (nusxa ko'chirish uchun)

> Sen `docs/01_PRODUCT_RESTAURANT_3D_AR/TZ_ADMIN_AR_MENYU_VA_TELEGRAM_MINI_APP_2026-10-24.md` hujjatidagi 7.1-jadvalning **1-bosqichidan** boshla. Avval 1-bo'limdagi qoidalarni o'qi. Ish branch'i: `feature/admin-menu-telegram`. Har bosqichda: testlarni yoz, 1.2-dagi hamma tekshiruvlarni o'zing yurgiz, natijani (yashil/qizil) yoz, commit qil, **push qilma**. Bosqich tugagach nima o'zgargani, qaysi fayllar va qaysi testlar qo'shilganini qisqa yoz. TZ'da yo'q narsani o'zingdan qo'shma; noaniqlik bo'lsa savol ber. `.env` fayllarga tegma.
