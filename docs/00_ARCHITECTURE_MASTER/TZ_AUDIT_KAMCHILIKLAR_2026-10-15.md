# TZ-AUDIT-2026-10-15 — Loyihaning to'liq auditi va tuzatish texnik topshirig'i

| Maydon | Qiymat |
|---|---|
| **Loyiha** | Online Store Guliston: Restoran 3D/AR OS (#1), Marketplace (#2), 3D Studio (#3) |
| **Sana** | 2026-10-15 |
| **Asos** | `main` branch, commit `3043be1` |
| **Holat** | ⏳ **TASDIQ KUTILMOQDA.** Loyiha egasi tasdiqlamaguncha kod o'zgartirilmaydi (AGENTS.md, 1-qoida) |
| **Kim uchun** | Loyiha egasi va ushbu TZ'ni bajaradigan dasturchilar va AI agentlar |
| **Oldingi audit** | `docs/04_SHARED_MODULES_AND_ARCHIVE/kamchiliklar.md` (2026-09-25). Undagi ba'zi bandlar hali ham ochiq (10-bo'lim) |

---

## 1. Umumiy hukm

Loyiha **funksiyaga boy, dizayni yoqimli prototip**. Lekin hozirgi holatda **real mijoz va real pul bilan ishga tushirib bo'lmaydi**:

1. **Server tomonda xavfsizlik deyarli yo'q.**
   - Restoran, moliya va KDS API'lari autentifikatsiyasiz ishlaydi.
   - To'lovni soxtalashtirish mumkin.
   - Mahsulot narxini istalgan odam o'zgartira oladi.
   - Xodim rollari faqat brauzerning `localStorage`ida saqlanadi.
2. **Restoran OS qurilmalar orasida ishlamaydi.**
   - Buyurtma, stol va moliya holati har bir brauzerda alohida yashaydi.
   - Real-time aloqa yo'q.
   - React'ning API manzili ishlab turgan 8001-portda ulanmagan.
3. **Infratuzilma: production noutbukda ishlaydi.**
   - SQLite, har mahsulotga 1 worker × 2 thread, `--reload`.
   - Har restartda URL'i o'zgaradigan cloudflared quick tunnel.

**6 yil / 1000+ concurrent standarti (AGENTS.md, 3-qoida) BAJARILMAGAN.** Hozirgi real sig'im bir mahsulotga taxminan **20–50 faol foydalanuvchi**, ~100 da sezilarli sekinlashish boshlanadi.

---

## 2. Audit qanday o'tkazildi va tekshirilgan raqamlar

Audit 5 yo'nalishda olib borildi: xavfsizlik, backend arxitektura va tezlik, frontend, mobil va repo, test va build. Har bir KRITIK band kodda qayta tekshirilgan. Barcha `fayl:qator` havolalari `3043be1` commitiga mos.

| Ko'rsatkich | Natija |
|---|---|
| Django `manage.py check` | ✅ xato yo'q |
| `check --deploy` | ⚠️ 5 ogohlantirish: W004 HSTS, W008 SSL redirect, W012/W016 secure cookie, W018 DEBUG |
| Migratsiyalar | ✅ sinxron, 90 ta, hammasi qo'llangan |
| Django testlari | ⚠️ 73 ta: **70 o'tdi, 3 yiqildi** |
| Testsiz app'lar | `accounts`, `categories`, `couriers`, `orders` (bo'sh `tests.py`); `tables_restaurant`, `web` (umuman yo'q) |
| Frontend `tsc` | ✅ 0 xato (`--strict` bilan ham) |
| Frontend build | ⚠️ o'tadi, lekin **bitta JS chunk 500 KB** (gzip 134 KB), code splitting yo'q |
| Frontend testlari | ❌ yo'q |
| Flutter `analyze` | ✅ 0 xato, 1 warning, 173 info |
| 3D modellar | ⚠️ 16 GLB = **77 MB**, har biri 0.49–9.23 MB |
| `.git` hajmi | ⚠️ 141 MB, eng katta fayl `backend/bin/cloudflared` (40 MB) |
| Real baza (`db.sqlite3`) | ⚠️ 80 buyurtmadan **63 tasi test buyurtma**, 36 Print3D'dan 35 tasi test |
| Yutib yuborilgan xatolar | ⚠️ 61 ta `except ...: pass`, 1 ta bare `except:` |

---

## 3. Darajalar va band formati

| Belgi | Daraja | Ma'nosi |
|---|---|---|
| 🔴 | **KRITIK (P0)** | Pul yo'qotish, ma'lumot oqishi yoki tizimning ishlamasligi. Pilotdan oldin tuzatilishi SHART |
| 🟠 | **YUQORI (P1)** | Jiddiy xavf yoki 1000 foydalanuvchida yiqilish. Production'dan oldin tuzatiladi |
| 🟡 | **O'RTA (P2)** | Sifat, texnik qarz, tezlik. Barqarorlashtirish bosqichida tuzatiladi |
| ⚪ | **PAST (P3)** | Gigiyena va kosmetika |

Har bir band quyidagi qismlardan iborat: **Joy** (fayl:qator), **Muammo**, **Oqibat**, **Yechim**, **Qabul mezoni** (bajarilganini qanday tekshiramiz).

---

## 4. Bajarish qoidalari (barcha bandlar uchun majburiy)

1. **O'chirmaslik (4-qoida).**
   - Mock va demo ma'lumotlar, eski sahifalar va prototiplar o'chirilmaydi.
   - Ular `DEMO_MODE` feature flag orqali yashiriladi yoki arxiv branch'iga ko'chiriladi.
   - Production'da `DEMO_MODE=false` bo'ladi va admin paneldan boshqariladi.
2. **Dinamiklik (4-qoida).** To'lov provayderlari, demo rejim, polling oralig'i va xodim qurilmalari kabi sozlamalar kodda emas, admin panel yoki `.env` orqali boshqariladi.
3. **Har bir tuzatish testi bilan topshiriladi.** Xavfsizlik bandlari uchun "hujum muvaffaqiyatsiz bo'ladi" degan avtomatik test majburiy.
4. **Testlar tarmoqqa chiqmaydi.** Test sozlamalari Telegram, Groq va to'lov API'larini mock qiladi (TEST-02).
5. **Bitta band — bitta commit**, commit xabarida band ID'si ko'rsatiladi (masalan `fix(SEC-03): ...`).

---

## 5. Kamchiliklar ro'yxati

### 5.1 Xavfsizlik — SEC

#### SEC-01 · 🔴 Istalgan odam admin bo'ladi (RBAC faqat brauzerda)
- **Joy:**
  - `frontend/src/core/guards/RouteGuard.ts:95-110`
  - `frontend/src/core/auth/RoleService.ts:21-44` va `:62-70`
  - `frontend/src/App.tsx:23`
- **Muammo:**
  - Yo'lida `/admin`, `/finance`, `/waiter`, `/kds` yoki `/arrival` bo'lgan sahifani ochgan mehmonga `grantRole('admin' | 'waiter' | ...)` avtomatik beriladi.
  - `?staff_grant=admin` parametri tokensiz va sirsiz admin rolini beradi.
  - Rol `localStorage`dan oddiy `JSON.parse` bilan o'qiladi, devtools orqali o'zgartirish mumkin.
  - Guard render paytida `localStorage`ga yozadi.
- **Oqibat:** Har qanday mehmon moliya, admin, KDS va ofitsiant panellariga kiradi.
- **Yechim:**
  - Xodim qurilmasiga **server imzolagan device token** beriladi: admin qurilmani bir marta QR orqali ro'yxatdan o'tkazadi, token HttpOnly cookie'da saqlanadi va muddati, roli va `shop_id`'si bo'ladi.
  - Frontend guard faqat ko'rinish uchun qoladi, haqiqiy tekshiruv serverda bo'ladi.
  - `staff_grant` parametri `DEMO_MODE` ortiga yashiriladi.
- **Qabul mezoni:**
  - Token'siz brauzerda `/admin` login yoki ro'yxatdan o'tish ekraniga yo'naltiradi.
  - `localStorage`ni qo'lda tahrirlash server javoblarini o'zgartirmaydi.

#### SEC-02 · 🔴 Restoran, moliya va KDS API'lari autentifikatsiyasiz
- **Joy:**
  - `backend/backend/settings.py:197-199` (global `AllowAny`)
  - `backend/orders/interfaces/api/views.py`: 13 ta view'ning birortasida `permission_classes` yo'q (`:15, :37, :75, :106, :117, :144, :198, :241, :254, :276, :289, :304, :319`)
  - `backend/backend/middleware.py:218` va `:224`
- **Muammo:**
  - RBAC middleware `/api/restaurant/...` prefiksini qo'riqlaydi, real marshrut esa `/api/v1/restaurant/...` (`backend/backend/urls.py:37`).
  - Bundan tashqari `:224` dagi shart istalgan login qilgan foydalanuvchini o'tkazib yuboradi.
- **Oqibat:**
  - `GET /api/v1/restaurant/finance/` butun moliya daftarini, qarzdorlarning ism va telefonlarini ochib beradi.
  - `orders/` barcha buyurtmalarni mijoz telefonlari bilan qaytaradi.
  - `reservations/find/` ism yoki telefon bo'yicha bronlarni topib beradi.
  - `POST tables/<n>/settle/` istalgan stol hisobini "to'landi" qiladi va kassaga soxta kirim yozadi.
- **Yechim:**
  - Global default `IsAuthenticated` bo'ladi, ochiq endpoint'larga `AllowAny` faqat aniq ko'rsatiladi.
  - Restoran view'lariga rolga asoslangan permission klasslari qo'shiladi: `IsRestaurantStaff`, `IsKitchen`, `IsWaiter`, `IsRestaurantAdmin`.
  - Middleware prefiksi tuzatiladi yoki permission klasslari foydasiga middleware olib tashlanadi, `:224` mantig'i tuzatiladi.
- **Qabul mezoni:**
  - Token'siz har bir xodim endpoint'i `401` yoki `403` qaytaradi.
  - Waiter tokeni bilan `finance/` `403` qaytaradi.
  - Har bir endpoint uchun avtomatik test bor.

#### SEC-03 · 🔴 Soxta to'lov ("to'landi" qilish)
- **Joy:**
  - `backend/payments/services/click_service.py:70` va `backend/payments/services/payme_service.py:35`: kalit bo'sh bo'lsa `return True`.
  - `backend/payments/api_views.py:126`: `sign_string` bo'lmasa tekshiruv o'tkazib yuboriladi.
  - `backend/payments/views.py:161` `payment_demo_confirm`: DEBUG tekshiruvi ham, auth ham yo'q (`payments/urls.py:11`).
  - `.env`da `CLICK_SECRET_KEY` va `PAYME_SECRET_KEY` bo'sh.
- **Muammo:** Imzo tekshiruvi "fail-open". Click `action=1` so'rovida summa kelmaydi, shuning uchun summa ham tekshirilmaydi.
- **Oqibat:** Bitta POST so'rov bilan istalgan buyurtma "to'langan" bo'ladi. Natijada kassaga kirim yoziladi, kuryer chaqiriladi va mahsulot bepul olinadi.
- **Yechim:**
  - Kalit bo'lmasa provayder **o'chirilgan** hisoblanadi va callback `403` qaytaradi (fail-closed).
  - Imzo har doim majburiy, summa buyurtmadagi `final_amount` bilan solishtiriladi.
  - Demo to'lov `DEMO_MODE` flag'i va staff auth ortiga olinadi.
  - Provayderni yoqish va o'chirish admin paneldan boshqariladi.
- **Qabul mezoni:**
  - Imzosiz yoki noto'g'ri imzoli callback `403` qaytaradi va buyurtma holati o'zgarmaydi.
  - Summasi mos kelmagan callback rad etiladi.

#### SEC-04 · 🔴 Mahsulot, kategoriya, banner, aksiya va sharhlarni anonim CRUD qilish mumkin
- **Joy:**
  - `backend/products/views.py:10`
  - `backend/categories/views.py:11`
  - `backend/notifications/views.py:19` (Banner), `:30` (Promotion), `:46` (Review)
  - Hammasida `ModelViewSet` + `AllowAny`.
- **Oqibat:**
  - Har kim narxni 1 so'mga tushiradi, mahsulotni o'chiradi, soxta banner qo'yadi yoki cheksiz soxta sharh yozadi.
  - `shops/views.py:18` ham to'liq yopilmagan: istalgan login qilgan foydalanuvchi do'kon yarata oladi.
- **Yechim:**
  - O'qish uchun `AllowAny`, yozish uchun `IsAuthenticated` + egalik tekshiruvi (`shop=request.user.shop`).
  - `perform_create` ichida egasi server tomonidan qo'yiladi.
  - Sharh faqat buyurtma bergan mijozdan qabul qilinadi.
- **Qabul mezoni:** Anonim `POST/PUT/PATCH/DELETE` so'rovlari `401` qaytaradi, boshqa do'kon egasining so'rovi `403` qaytaradi.

#### SEC-05 · 🔴 Narxni mijoz belgilaydi
- **Joy:**
  - `backend/orders/application/services.py:57` va `:194`: `Decimal(str(it.get('price', 0)))`
  - `backend/orders/serializers.py:52-73`: `total` va `final` mijoz yuborgan narxdan hisoblanadi
  - `backend/ar3d/views.py:1270`: `custom_estimated_price`
- **Oqibat:** `price: 1` yuborib qimmat taom buyurtma qilinadi, moliya hisobotlari buziladi.
- **Yechim:**
  - Narx har doim server tomonda `Product.price`dan olinadi.
  - Tayyor namuna bor: `backend/api/views.py:517+` (`api_order_create`) narxni server o'zi hisoblaydi va zaxirani tekshiradi.
- **Qabul mezoni:** So'rovdagi `price` maydoni e'tiborga olinmaydi, test shuni tasdiqlaydi.

#### SEC-06 · 🔴 Stored XSS: mijoz ismi orqali xodim brauzerida kod ishlatish
- **Joy:**
  - `backend/web/tma_views.py:965` va `:1403`: `json.dumps(..., ensure_ascii=False)`
  - `backend/templates/tma/kds.html:16` va `backend/templates/restaurant_admin/dashboard.html:16`: `{{ ...|safe }}` `<script>` ichida
  - Mijozdan keladigan `customer_name` va `notes` maydonlari (`backend/web/tma_views.py:426`)
- **Oqibat:** Mijoz ismiga `</script><script>…` yozsa, kod admin yoki KDS brauzerida bajariladi. Bu sessiya va token o'g'irlashga olib keladi.
- **Yechim:**
  - Hamma joyda `{{ data|json_script:"id" }}` ishlatiladi va `JSON.parse(document.getElementById(...).textContent)` bilan o'qiladi.
  - Barcha `*_json|safe` joylari qayta ko'rib chiqiladi.
- **Qabul mezoni:** `</script><img src=x onerror=alert(1)>` ismli buyurtma KDS'da oddiy matn sifatida ko'rinadi.

#### SEC-07 · 🔴 DEBUG yoqilgan, SECRET_KEY ochiq, hostlar va CORS ochiq
- **Joy:**
  - `backend/backend/settings.py:21`: `DEBUG` default `'True'`
  - `backend/backend/settings.py:22`: hardcoded `django-insecure-...` kalit, git tarixida bor
  - `backend/backend/settings.py:218-219`: DEBUG'da `CORS_ALLOW_ALL_ORIGINS=True`
  - `backend/.env`: `DEBUG=True`, `ALLOWED_HOSTS=...,*`
- **Muammo:** `.env`dagi hozirgi `DJANGO_SECRET_KEY` git'dagi hardcoded kalitning bir qismi, ya'ni amalda ochiq.
- **Oqibat:**
  - Xato sahifalarida kod va sozlamalar ochiladi.
  - Sessiya va imzolarni (jumladan QR token HMAC'larini) soxtalashtirish mumkin.
  - Host header orqali havolalarni zaharlash mumkin.
- **Yechim:**
  - `DEBUG` default `False` bo'ladi.
  - `SECRET_KEY` faqat env'dan olinadi, bo'lmasa server ishga tushmaydi. Yangi kalit generatsiya qilinadi.
  - `ALLOWED_HOSTS` va CORS aniq ro'yxat bilan cheklanadi.
- **Qabul mezoni:**
  - `check --deploy` 0 ogohlantirish beradi.
  - Kodda hardcoded kalit yo'q.

#### SEC-08 · 🟠 Telegram webhook'lari tekshirilmaydi, bot nomidan xabar yuborish mumkin
- **Joy:**
  - `backend/web/telegram_webhook.py:97, :394, :401, :448`: `@csrf_exempt`, `X-Telegram-Bot-Api-Secret-Token` tekshiruvi yo'q
  - `backend/notifications/admin_bot.py:68` `is_admin()` so'rov tanasidagi `chat_id` va `username`ga ishonadi
  - `:375` `telegram_send_test` autentifikatsiyasiz
  - `:369` `telegram_set_chat_id` barcha obunachilar ro'yxatini ochib beradi
  - `:25` havolalarni `request.get_host()` dan quradi
- **Oqibat:**
  - Soxta update bilan admin buyruqlari bajariladi.
  - Biznes boti nomidan istalgan chatga matn yuboriladi.
  - Obunachilarning shaxsiy ma'lumotlari (PII) oqadi.
- **Yechim:**
  - `setWebhook(secret_token=...)` o'rnatiladi va har so'rovda header tekshiriladi.
  - Admin ro'yxati faqat bazadan olinadi va webhook so'rovining haqiqiyligi bilan birga tekshiriladi.
  - Test va debug endpoint'lari staff auth + `DEMO_MODE` ortiga olinadi.
  - Bazaviy URL sozlamadan olinadi.
- **Qabul mezoni:** Secret header'siz webhook `403` qaytaradi, `send-test` anonim so'rovga `401` qaytaradi.

#### SEC-09 · 🟠 Telegram Mini App `initData` HMAC tekshiruvi yo'q
- **Joy:** `backend/web/tma_views.py:501-505`: `telegram_id` POST maydonidan olinadi. Butun kodda `initData` yoki `WebAppData` tekshiruvi yo'q.
- **Oqibat:** Mijoz o'zini boshqa Telegram foydalanuvchisi qilib ko'rsatadi.
- **Yechim:** `initData` bot tokeni asosida HMAC-SHA256 bilan tekshiriladi va `auth_date` muddati cheklanadi.
- **Qabul mezoni:** Soxta yoki eskirgan `initData` rad etiladi.

#### SEC-10 · 🟠 IDOR: boshqa mijozlarning buyurtmalari va wishlist'i
- **Joy:**
  - `backend/web/tma_views.py:824` (`tma_order_detail`)
  - `backend/web/views.py:718-719` (`customer_order_tracking`)
  - `backend/ar3d/views.py:1100` (`v1_order_status_api`)
  - `backend/api/views.py:776` (`api_wishlist`, `?phone=` fallback)
  - `backend/orders/views.py:40` (`update_status` `.get(pk)` bilan scoped queryset'ni chetlab o'tadi)
- **Oqibat:** `/tma/order/1..N/` ni ketma-ket tersa, boshqa mijozlarning ismi, telefoni, manzili va buyurtmalari chiqadi.
- **Yechim:**
  - Ko'rish huquqi egasi yoki imzolangan tracking token (UUID + HMAC) bilan tekshiriladi.
  - `?phone=` fallback olib tashlanadi yoki faqat `DEMO_MODE`da qoldiriladi.
  - `get_queryset()` orqali scoping qilinadi.
- **Qabul mezoni:** Boshqa mijozning buyurtmasi `404` qaytaradi.

#### SEC-11 · 🟠 Operatsion endpoint'lar ochiq
- **Joy:**
  - `backend/web/tma_views.py:1423` `kds_status_update_api`: `:1455` da istalgan statusni majburan yozadi
  - `backend/ar3d/views.py:1350` `print_3d_mark_ready_api`: csrf_exempt, `final_amount`ni qayta yozadi
  - `backend/maps/views.py:81`: kuryerning GPS joylashuvi
  - KDS, ofitsiant va hostess HTML sahifalari
- **Oqibat:** Istalgan odam buyurtma holatini o'zgartiradi, 3D chop etish narxini qayta yozadi yoki kuryerni kuzatadi.
- **Yechim:** Rolga asoslangan himoya qo'yiladi (SEC-02 bilan bir xil yondashuv).
- **Qabul mezoni:** Hammasi token'siz `401` yoki `403` qaytaradi.

#### SEC-12 · 🟠 Transport xavfsizligi sozlanmagan
- **Joy:** `backend/backend/settings.py`: `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, `SECURE_SSL_REDIRECT`, `SECURE_HSTS_SECONDS`, `SECURE_PROXY_SSL_HEADER` umuman yo'q.
- **Yechim:** Barchasi `not DEBUG` sharti bilan yoqiladi.
- **Qabul mezoni:** `check --deploy` toza o'tadi.

#### SEC-13 · 🟠 Rate limit aylanib o'tiladi
- **Joy:** `backend/backend/ratelimit.py:15`: `X-Forwarded-For` header'iga ko'r-ko'rona ishonadi. LocMem har jarayonda alohida va `--reload` bilan tozalanadi.
- **Muammo:** Login, to'lov callback, buyurtma va webhook endpoint'larining aksariyatida limit yo'q.
- **Yechim:**
  - IP faqat ishonchli proxy'dan olinadi.
  - Redis'da atomik hisoblagich yuritiladi.
  - Login, buyurtma, callback va chaqiruv endpoint'lariga DRF throttle qo'yiladi.
- **Qabul mezoni:** Header'ni almashtirish limitni aylanib o'tmaydi.

#### SEC-14 · 🟠 Mijoz URL konfiguratsiyasini header orqali tanlaydi
- **Joy:** `backend/backend/middleware.py:155-180`: `X-Product` va `X-Forwarded-Port` bo'yicha urlconf tanlanadi, host substring bo'yicha moslashtiriladi ("model", "shop", "store").
- **Oqibat:** Mahsulotlar orasidagi izolyatsiya buziladi, yopiq marshrutlarga boshqa urlconf orqali kiriladi.
- **Yechim:** Mahsulot faqat server sozlamasi (`DJANGO_PRODUCT`) yoki aniq domen xaritasi bo'yicha aniqlanadi.

#### SEC-15 · 🟠 Tenant'lar aralashadi
- **Joy:**
  - `backend/backend/middleware.py:66-67`: do'koni yo'q `shop_owner`ga birinchi "restoran" do'koni yoki `Shop.objects.first()` beriladi
  - `backend/orders/application/services.py:22` (`get_or_default_shop`), `:115` (stol barcha do'konlar bo'yicha raqam bilan qidiriladi), `:500` (menyu barcha do'konlar mahsulotlarini qaytaradi)
- **Oqibat:** Bir do'kon egasi boshqasining ma'lumotini ko'radi. 5-stol yopilganda boshqa restoranning 5-stoli ham yopilishi mumkin.
- **Yechim:** Har bir so'rovda `shop` aniq kontekstdan olinadi (token yoki domen), fallback olib tashlanadi.
- **Qabul mezoni:** Ikki do'konli test'da ma'lumotlar aralashmaydi.

#### SEC-16 · 🟡 Shaxsiy va to'lov ma'lumotlari ortiqcha saqlanadi
- **Joy:**
  - `backend/payments/payment_service.py:57` va `:96`: provayderning to'liq `raw_request` va `raw_response` ma'lumotlari bazaga yoziladi
  - `backend/backend/settings.py:333`: `send_default_pii=True` (Sentry)
- **Yechim:** Maxfiy maydonlar maskalanadi, `send_default_pii=False` qilinadi.

#### SEC-17 · 🟡 Fayl yuklash tekshirilmaydi
- **Joy:**
  - `backend/ar3d/views.py:1244`, `backend/web/views.py:1279` (`_handle_asset_3d`)
  - `ar3d/models.py` va `products/models.py` dagi `FileField` maydonlari
  - `DATA_UPLOAD_MAX_*` va `FILE_UPLOAD_MAX_*` sozlanmagan
- **Oqibat:** Katta fayllar bilan disk to'ldiriladi (DoS), SVG yoki HTML fayl orqali stored content hujumi qilinadi.
- **Yechim:** Kengaytma va MIME tekshiruvi, magic-byte tekshiruvi va o'lcham limitlari (GLB ≤ 15 MB, rasm ≤ 5 MB, admin paneldan sozlanadi).

#### SEC-18 · ⚪ Git tarixidagi eski `.env`
- **Joy:** commit `4e609e4` (`backend/.env`, `f63ca57` da o'chirilgan).
- **Holat:** Bu eski Node konfiguratsiyasi, hozirgi Telegram, Payme yoki Django kalitlari unda **yo'q**. `DB_PASSWORD` va `OPENWEATHER_API_KEY` haqiqiy qiymatga o'xshaydi.
- **Yechim:** Bu qiymatlar biror joyda hali ishlatilayotgan bo'lsa almashtiriladi. Tarixni tozalash (`git filter-repo`) ixtiyoriy, egasining qarori bilan.
- **Eslatma:** Hozirgi `backend/.env`da haqiqiy Telegram bot tokeni va Groq kaliti bor va u git'da kuzatilmaydi. Bu to'g'ri, shunday qolishi kerak.

---

### 5.2 Restoran OS funksionalligi — RST

#### RST-01 · 🔴 Holat har bir brauzerning `localStorage`ida, server bilan sinxron emas
- **Joy:** `frontend/src/context/NavigationContext.tsx`
  - `:600-631`: server bilan faqat sahifa ochilganda bir marta sinxronlanadi
  - `:611`: server javobi bo'sh bo'lsa demo buyurtmalar ("Rustam aka") qoladi
- **Muammo:** Quyidagi amallar serverga **umuman bormaydi**:
  - `updateOrderStatus` (`:776-807`);
  - chaqiruvni qabul qilish va yakunlash;
  - `updateTableStatus`;
  - `toggleStopList`;
  - barcha moliya yozuvlari (`:913-1006`).
- **Oqibat:**
  - Oshpaz "tayyor" bossa, ofitsiant ko'rmaydi.
  - Moliya daftari bitta brauzerda yashaydi va kesh tozalanganda yo'qoladi.
- **Yechim:**
  - Server yagona haqiqat manbai bo'ladi. Barcha yozuv amallari API orqali ketadi.
  - Server holati TanStack Query bilan boshqariladi.
  - Oflayn rejim uchun haqiqiy outbox navbati tuziladi (IndexedDB + retry).
  - Mock seed `DEMO_MODE` ortiga yashiriladi.
- **Qabul mezoni:** Ikki xil qurilmada KDS va ofitsiant panelini ochib, birida status o'zgartirilsa, ikkinchisida ≤ 3 soniyada ko'rinadi.

#### RST-02 · 🔴 React'ning API'si ishlab turgan 8001-portda ulanmagan
- **Joy:**
  - `frontend/src/services/RestaurantAPI.ts:6` (`API_BASE='/api/v1/restaurant'`)
  - `backend/backend/urls_restaurant.py`: `include('orders.interfaces.api.urls')` yo'q, u faqat `backend/backend/urls.py:37` da bor
- **Oqibat:** Daemon ishga tushiradigan restoran portida barcha React API chaqiruvlari `404` qaytaradi va ilova jimgina mock ma'lumotga o'tadi.
- **Yechim:**
  - Restoran urlconf'iga API ulanadi.
  - Urlconf'lar umumiy bazaviy ro'yxatdan meros oladigan qilinadi, shunda bunday tafovut qayta yuzaga kelmaydi.
- **Qabul mezoni:** 8001-portda `/api/v1/restaurant/menu/` `200` qaytaradi va bu holat integratsion test bilan qamralgan.

#### RST-03 · 🔴 Real-time yo'q, KDS yangi buyurtmani ko'rmaydi
- **Joy:**
  - Butun frontend'da polling, WebSocket yoki SSE yo'q
  - `frontend/src/pages/KDSPage/KDSPage.tsx:131-134`: "yangilash" faqat 500 ms soxta spinner
  - `backend/static/guest/js/ws.js`: WebSocket mijozi bor, lekin server tomoni (Channels) yo'q
- **Yechim:**
  - KDS, ofitsiant va admin uchun **SSE** (yoki Django Channels + Redis) qo'llaniladi.
  - Zaxira sifatida 5–10 soniyalik polling qoladi, oralig'i admin paneldan sozlanadi.
- **Qabul mezoni:** Yangi buyurtma KDS'da ≤ 3 soniyada ovozli signal bilan chiqadi.

#### RST-04 · 🔴 Mijozning buyurtma oqimi soxta
- **Joy:**
  - `frontend/src/pages/CartPage/CartPage.tsx:31-63`: haqiqiy savat o'rniga `DEFAULT_CART_ITEMS` (Plov ×2, Somsa ×4) ko'rsatiladi
  - `frontend/src/context/NavigationContext.tsx:463`: yangi mehmon savati `{101:2, 104:4}` bilan to'ldiriladi; `:451` da standart stol `'05'`
  - `frontend/src/pages/CheckoutPage/CheckoutPage.tsx:92-104`: savat bo'sh bo'lsa hardcoded taomlar va `156000` yuboriladi
  - `CheckoutPage.tsx:97-113`: buyurtma **ikki marta** yaratiladi (`createOrder` API va `/checkout/` form POST)
  - `CheckoutPage.tsx:106-126`: muvaffaqiyat, HTTP xato va tarmoq xatosida bir xil "Qabul qilindi" chiqadi
- **Oqibat:**
  - Mijoz buyurtma qilmagan taomlar oshxonaga boradi.
  - Buyurtmalar ikki baravar ko'payadi.
  - Yo'qolgan buyurtma "qabul qilindi" deb ko'rsatiladi.
- **Yechim:**
  - Savat faqat context yoki store'dan olinadi.
  - Bitta yuborish yo'li qoladi, `Idempotency-Key` header'i qo'shiladi.
  - Xato bo'lsa aniq xabar va "qayta urinish" tugmasi chiqadi.
  - Demo qiymatlar `DEMO_MODE` ortiga olinadi.
- **Qabul mezoni:**
  - Bo'sh savat bilan checkout tugmasi faol emas.
  - Bitta buyurtma bazada aynan bitta yozuv hosil qiladi.
  - Server xatosida "qabul qilindi" chiqmaydi.

#### RST-05 · 🔴 Marshrut xatolari mijozni admin paneliga olib boradi
- **Joy:**
  - `frontend/src/App.tsx:43`: `/menu/table` `AdminDashboardPage`ga yo'naltiriladi, holbuki Django mijozning stol hub'ini `/menu/table/` da beradi
  - `App.tsx:64`: `/ar` tekshiruvi `/arrival`dan oldin turadi, natijada `/reservation/arrival/` AR menyuni ko'rsatadi va hostess rolini beradi; `:79` hech qachon ishlamaydi
  - `frontend/src/pages/AdminDashboardPage/AdminDashboardPage.tsx:98-104`: tab o'zgarishi xom `pushState` bilan bo'ladi va guard'ni chetlab o'tadi
- **Yechim:** `react-router` (yoki shunga o'xshash) aniq marshrut jadvali bilan ishlatiladi. `includes()` zanjiri olib tashlanadi.
- **Qabul mezoni:** Har bir marshrut uchun "qaysi sahifa ochiladi" testi bor.

#### RST-06 · 🔴 Mijozga barcha buyurtmalar va moliya ma'lumotlari yuklanadi
- **Joy:**
  - `NavigationContext.tsx:604-608`: har bir mehmon uchun sahifa ochilganda `/finance/`, `/orders/`, `/tables/` so'raladi
  - `frontend/src/pages/OrdersPage/OrdersPage.tsx:54-80`: mijozga restoranning **barcha** buyurtmalari ko'rsatiladi
- **Yechim:**
  - Mijoz faqat o'z sessiyasi yoki stoli buyurtmalarini oladi (`/orders/mine/`, imzolangan stol tokeni bilan).
  - Xodim ma'lumotlari faqat xodim token'i bilan olinadi.
- **Qabul mezoni:** Mehmon brauzerining network tab'ida moliya so'rovi yo'q.

#### RST-07 · 🟠 Mock fallback'lar haqiqiy ma'lumotdek ko'rinadi
- **Joy:**
  - `frontend/src/pages/MenuPage/MenuPage.tsx:39-42` (`INITIAL_PRODUCTS`): API ishlamasa mijoz mavjud bo'lmagan taomlarni buyurtma qiladi
  - `AdminDashboardPage.tsx:139-140`: 42 mahsulot va 12 AR taom qattiq yozilgan
  - `frontend/src/pages/WaiterPanelPage/WaiterPanelPage.tsx:47` (`DEFAULT_TABLE_ITEMS`) va `:86` (`'Alisher (Navbatchi)'`)
- **Yechim:** API ishlamasa "Ulanish yo'q" holati ko'rsatiladi. Mock faqat `DEMO_MODE`da ishlaydi.

#### RST-08 · 🟠 3D yuklash studiyasi hech narsani yuklamaydi
- **Joy:** `frontend/src/components/ui/PhotogrammetryStudioModal/PhotogrammetryStudioModal.tsx:58` va `:71` (`URL.createObjectURL`), `:107` (`blob:` URL serverga yuboriladi)
- **Oqibat:** Model sahifa qayta yuklanganda yo'qoladi va boshqa qurilmalarda ko'rinmaydi. Blob URL'lar bo'shatilmaydi, ya'ni xotira oqadi.
- **Yechim:** Fayl `multipart/form-data` bilan serverga yuklanadi (SEC-17 tekshiruvlari bilan), server URL qaytaradi, `revokeObjectURL` chaqiriladi.

#### RST-09 · 🟠 React updater ichidagi side-effect'lar noto'g'ri qiymat beradi
- **Joy:** `NavigationContext.tsx`
  - `updateOrderStatus` `:778-791`: `changedOrder` `setOrders` ichida o'rnatilib, undan keyin o'qiladi
  - `settleTableBill` `:1008-1066`: chek summasi 0 yoki standart qiymat bo'lib qolishi mumkin
  - `cancelFinanceTransaction` va `payDebtPartial` `:933, :988`: StrictMode'da kirim ikki marta yoziladi
- **Yechim:** Hisob-kitob updater'dan oldin bajariladi. Yaxshisi, bu mantiq serverga ko'chiriladi (RST-01).

#### RST-10 · 🟡 NFC "skaneri" soxta
- **Joy:** `frontend/src/components/ui/NFCGatewayModal/NFCGatewayModal.tsx:15` (`setTimeout`). Mijoz istalgan stolni o'zi tanlaydi.
- **Yechim:** Stol faqat imzolangan QR yoki NFC token orqali aniqlanadi. Backend'da HMAC token allaqachon bor (`tables_restaurant/models.py:55`).

#### RST-11 · 🟡 Smart3DMatcher noto'g'ri model ko'rsatadi
- **Joy:** `frontend/src/services/Smart3DMatcher.ts:183`: so'z chegarasisiz substring qidiruv. Natijada "Toshkentcha kompot" va "Shivit oshi" uchun `plov` modeli chiqadi.
- **Oqibat:** Mijozga "sizning taomingiz" deb boshqa taom ko'rsatiladi, bu mijozni chalg'itadi.
- **Yechim:**
  - Moslashtirish so'z chegarasi bilan qilinadi.
  - Taomga model admin tomonidan qo'lda biriktiriladi, avtomatik moslik faqat taklif sifatida beriladi.
  - Stok modelda "namuna ko'rinish" belgisi qo'yiladi.

---

### 5.3 Buyurtma, ombor va moliya yaxlitligi — DATA

#### DATA-01 · 🔴 Buyurtma raqamlari to'qnashadi
- **Joy:**
  - `backend/orders/application/services.py:51` va `:201`: `Order.objects.count() + 101`
  - `backend/orders/models.py:22`: `order_number` unique
  - `frontend/src/services/RestaurantAPI.ts:33-36`: xatoni yutib, `null` qaytaradi
- **Oqibat:**
  - Bir vaqtdagi buyurtmalar bir xil raqam oladi, natijada `IntegrityError` bo'ladi va buyurtma **jimgina yo'qoladi**.
  - Bitta buyurtma o'chirilsa, raqamlash butunlay to'xtaydi.
- **Yechim:** DB sequence yoki do'kon bo'yicha atomik hisoblagich (`select_for_update`) ishlatiladi, va/yoki raqam formati `YYMMDD-NNNN` bo'ladi.
- **Qabul mezoni:** 50 parallel buyurtma testida 50 ta noyob raqam chiqadi.

#### DATA-02 · 🔴 Ombor mantig'i noto'g'ri
- **Joy:**
  - `backend/orders/state_machine.py:63-79`: zaxira faqat `delivered`da kamayadi
  - `state_machine.py:96`: har `cancelled`da qaytariladi, natijada kamaymagan zaxira ham "qaytariladi" va qoldiq asossiz ko'payadi
  - `state_machine.py:133`: `max(0, stock - qty)` qulfsiz (read-modify-write) va oshiqcha sotishni yashiradi
  - `reserve_stock` natijasi e'tiborsiz qoldiriladi: `backend/web/views.py:648`, `backend/api/views.py:718`, `backend/ar3d/views.py:646`
  - `backend/orders/inventory.py:72`: `atomic` ichida `return False` qisman rezervlarni commit qiladi
- **Yechim:**
  - Zaxira bitta joyda (rezerv yoki tasdiqlash vaqtida) `F()` va `select_for_update` bilan kamaytiriladi.
  - Bekor qilishda faqat haqiqatda kamaytirilgan miqdor qaytariladi.
  - Rezerv muvaffaqiyatsiz bo'lsa buyurtma rad etiladi (`raise` bilan rollback).
- **Qabul mezoni:** Parallel test'da zaxira hech qachon manfiy bo'lmaydi va bekor qilish qoldiqni oshirmaydi.

#### DATA-03 · 🔴 `transition_order` atomik emas, `logger` aniqlanmagan
- **Joy:** `backend/orders/state_machine.py:86`: `logger.warning(...)` ishlatiladi, lekin faylda `import logging` va `logger` **yo'q**. Funksiyada `atomic` blok ham, qulf ham yo'q.
- **Oqibat:** Moliya yozuvida xato bo'lsa `NameError` ko'tariladi. Mijoz va zaxira saqlangan bo'ladi, buyurtma esa saqlanmaydi, ya'ni ma'lumotlar nomuvofiq qoladi.
- **Yechim:** `logger` qo'shiladi, butun o'tish `transaction.atomic` + `select_for_update` ichida bajariladi.

#### DATA-04 · 🟠 Buyurtma 9 xil yo'l bilan yaratiladi, har birida qoidalar turlicha
- **Joy:**
  - `backend/web/views.py:546`
  - `backend/web/tma_views.py:386` (zaxira tekshiruvi yo'q)
  - `backend/api/views.py:517` (`atomic` blok `:611` da yopiladi, buyurtma esa `:645` da yaratiladi)
  - `backend/ar3d/views.py:504` va `:1229`
  - `backend/orders/application/services.py:30`
  - `backend/orders/serializers.py:52`
  - `backend/web/seller_views/restaurant.py:375` va `backend/web/seller_views/marketplace.py:1221`: **har doim yiqiladi**, chunki `Order(note=...)` beriladi, modelda esa maydon `notes` (`orders/models.py:39`); `OrderItem(unit_price=...)` beriladi, bu esa property (`orders/models.py:156`)
- **Yechim:**
  - Bitta `OrderService.create()` yaratiladi (narx serverda, atomik, idempotent, zaxira bilan) va barcha yo'llar shuni chaqiradi.
  - Eski yo'llar yangi servisga ulanadi, alohida mantiq olib tashlanmaydi, faqat yo'naltiriladi.
- **Qabul mezoni:** Butun kodda `Order.objects.create` faqat bitta servis ichida qoladi.

#### DATA-05 · 🟠 Status yozuvlari state machine'ni chetlab o'tadi
- **Joy:**
  - `backend/web/tma_views.py:1455`: KDS state machine rad etgan statusni ham majburan yozadi
  - `OrderSerializer`da `status` va `final_amount` yozish uchun ochiq
  - Kodda jami ~9 ta to'g'ridan-to'g'ri status yozuvi bor
- **Yechim:** Barcha o'zgarishlar faqat `transition_order()` orqali, serializer'da `read_only_fields` bilan.

#### DATA-06 · 🟠 Moliya yozuvlari ikki marta hisoblanishi mumkin
- **Joy:**
  - `backend/orders/application/services.py:144-154`: stol yopilganda `FinanceTransaction` buyurtmaga bog'lanmasdan yoziladi
  - `state_machine.py:79-86`: `delivered`da `record_order_payment_income` alohida kirim yozadi
  - `finance/models.py`da unique cheklov yo'q
  - `Payment.provider_transaction_id` unique ham, indekslangan ham emas
- **Yechim:**
  - `(order, tx_type)` uchun `UniqueConstraint` qo'yiladi va kirim faqat bitta joyda yoziladi.
  - Stol cheki buyurtmalarga bog'lanadi.
  - `provider_transaction_id` unique qilinadi.
- **Qabul mezoni:** Bitta buyurtma uchun aynan bitta kirim yozuvi bo'ladi.

#### DATA-07 · 🟠 Soft delete deyarli yo'q (AGENTS.md 4-qoidaga zid)
- **Joy:**
  - Soft delete faqat `orders`, `products`, `tables_restaurant` modellarida qisman bor va umumiy manager yo'q.
  - To'liq o'chirish joylari: `backend/api/seller_views.py:117` (`product.delete()`, sharhlar, AR analitika va rezervlar ham CASCADE bilan o'chadi), `backend/finance/views.py:601` (`DebtRecord ... .delete()`), `backend/web/views.py:1881` (`review.delete()`, GET so'rov bilan), `ModelViewSet` DELETE endpoint'lari.
  - `Shop` → `FinanceTransaction` va `DebtRecord` CASCADE.
- **Yechim:**
  - Umumiy `SoftDeleteModel` (`is_deleted`, `deleted_at`, `deleted_by`) va `objects` / `all_objects` manager'lari kiritiladi.
  - Barcha `.delete()` chaqiruvlari arxivlashga almashtiriladi.
  - Moliya bo'yicha `on_delete=PROTECT` qo'yiladi.
  - O'chirish amallari GET emas, faqat POST bilan.
- **Qabul mezoni:** Kodda biznes modellari uchun `.delete()` chaqiruvi qolmaydi (test va grep bilan tekshiriladi).

#### DATA-08 · 🟡 Pul maydonlari aniqligi turlicha
- **Muammo:**
  - `Decimal` scale'lari aralash: (12,0), (14,2), (12,2).
  - `Shop` pul maydonlari `IntegerField`.
  - 10% komissiya `decimal_places=0` maydonga kasr bilan tushadi.
  - Pul maydonlarida `CheckConstraint` yo'q.
- **Yechim:** Yagona standart qabul qilinadi (so'm uchun `DecimalField(14,2)`), `CheckConstraint(amount >= 0)` qo'shiladi va migratsiya qilinadi.

#### DATA-09 · 🟡 `Product.slug` global unique
- **Joy:** `backend/products/models.py:19` va `:140-142`: `slugify(name)`. Boshqa do'konda ikkinchi "Plov" yaratilsa `500` xato chiqadi.
- **Yechim:** `UniqueConstraint(shop, slug)` va to'qnashuvda `-2`, `-3` qo'shimchasi.

#### DATA-10 · 🟡 Real baza test ma'lumotlari bilan to'lgan
- **Holat:**
  - 80 buyurtmadan 63 tasi test ("Test Mehmon", "Marketplace Haridor").
  - 36 Print3D'dan 35 tasi test ("Inomjon Muhandis").
  - 11 ta "Test Soft Delete" mahsuloti.
- **Sabab:** `backend/scripts/loop_engineering_test.py` real bazaga yozadi (TEST-03).
- **Yechim:** Test ma'lumotlari belgilanadi va arxivlanadi (o'chirilmaydi). Analitika ularni hisobga olmaydi.

#### DATA-11 · ⚪ Uchta alohida foydalanuvchi modeli
- **Muammo:** `AdminUser`, `Customer` va `Courier` alohida modellar, autentifikatsiya mantig'i takrorlanadi.
- **Yechim (uzoq muddatli):** Yagona `User` + rollar + profil modellari. Bu bosqichma-bosqich migratsiya qilinadi.

---

### 5.4 Infratuzilma va masshtab — INF

#### INF-01 · 🔴 Production noutbukda ishlaydi
- **Joy:**
  - `start_server.sh` → `backend/scripts/laptop_server_daemon.py:207-211`: har mahsulotga `gunicorn --workers 1 --threads 2 --reload`
  - 3 ta cloudflared quick tunnel (`*.trycloudflare.com`): har restartda yangi URL, daemon `.env`ni qayta yozadi va webhook'ni qayta ro'yxatdan o'tkazadi
  - `setup_autostart_and_lid.sh`: qopqoq yopilganda uxlash o'chiriladi
- **Oqibat:**
  - Bir vaqtda jami ~6 ta so'rovga xizmat qiladi.
  - Chop etilgan QR kod va NFC teglar har restartdan keyin buziladi.
  - Elektr yoki internet uzilsa tizim to'xtaydi.
- **Yechim:**
  - VPS yoki bulut serveri.
  - Doimiy domen va **named** Cloudflare tunnel (yoki nginx + Let's Encrypt).
  - `gunicorn` CPU soniga qarab worker'lar bilan, `--reload`siz.
  - systemd yoki docker restart siyosati.
- **Qabul mezoni:** Server restartidan keyin QR URL o'zgarmaydi.

#### INF-02 · 🔴 Production bazasi SQLite
- **Joy:** `backend/backend/settings.py:124`: Postgres faqat `POSTGRES_DB` o'rnatilganda yoqiladi. `.env`dagi `DATABASE_URL` hech qayerda o'qilmaydi. SQLite WAL rejimida ham emas, bitta faylni 3 ta jarayon ishlatadi.
- **Yechim:**
  - PostgreSQL 16 + PgBouncer (`docker-compose.yml`da tayyor shabloni bor).
  - `DATABASE_URL` `dj-database-url` orqali o'qiladi.
  - Ma'lumotlar migratsiya skripti va kunlik backup.
- **Qabul mezoni:** Production'da `connection.vendor == 'postgresql'`.

#### INF-03 · 🔴 Har bir so'rov sessiyaga yozadi
- **Joy:** `backend/backend/middleware.py:107`: `request.session['language'] = lang` har so'rovda, media so'rovlarida ham.
- **Oqibat:**
  - Har so'rovda bazaga yozuv tushadi (sessiya jadvalida 1,869 qator, buyurtmalar esa 80 ta).
  - SQLite yozuvlari navbatga tushadi.
  - `Vary: Cookie` sababli CDN keshi ishlamaydi.
- **Yechim:** Til faqat o'zgarganda saqlanadi (yoki cookie'da), media va static so'rovlari middleware'dan chetlab o'tiladi.

#### INF-04 · 🟠 Redis va Celery yo'q
- **Joy:** `backend/backend/settings.py:163`: `CELERY_TASK_ALWAYS_EAGER`, chunki `REDIS_URL` yo'q. Kesh LocMem va har jarayonda alohida.
- **Muammo:** Outbox vazifalari so'rov ichida bajariladi, beat umuman ishlamaydi.
- **Yechim:** Redis (kesh, sessiya, rate limit, broker) + Celery worker + beat.

#### INF-05 · 🟠 Tashqi API chaqiruvlari so'rovni bloklaydi
- **Joy:**
  - `backend/notifications/services/telegram_service.py:30` (`httpx.post`, 10 s timeout) va `:102` (har chat uchun ketma-ket sikl)
  - `backend/ai/mcp/base.py:21`: 30 s timeout × bir nechta provayder
- **Oqibat:** 2 ta thread bo'lgani uchun ikkita sekin Telegram javobi butun mahsulotni qotiradi.
- **Yechim:** Barcha tashqi chaqiruvlar Celery'ga ko'chiriladi (outbox naqshi kodda bor, uni ishga tushirish kerak).

#### INF-06 · 🟠 Media fayllarni Django o'zi beradi
- **Joy:** `backend/backend/urls.py:52`: `django.views.static.serve` production'da ishlatiladi. Media 204 MB (GLB'lar + 103 MB banner MP4).
- **Oqibat:** 1000 mehmon × ~7 MB model = ~7 GB trafik bitta noutbuk orqali o'tadi.
- **Yechim:** nginx yoki obyekt saqlash (S3-mos) + CDN, `Cache-Control: immutable`.

#### INF-07 · 🟠 Docker konfiguratsiyasi ishlatilmaydi va buzilgan
- **Muammo:**
  - `backend/docker-compose.yml` to'g'ri tuzilgan (Postgres, PgBouncer, Redis, Celery), lekin `POSTGRES_DB` o'rnatilmagani uchun baribir SQLite'ga tushadi.
  - `docker-compose.products.yml` 6432-portdagi PgBouncer'ga ulanadi, lekin u faylda PgBouncer yo'q, worker ham yo'q.
  - `Dockerfile` root foydalanuvchi bilan ishlaydi va `collectstatic || true` xatoni yashiradi.
- **Yechim:** Bitta ishlaydigan compose fayli, non-root foydalanuvchi, healthcheck'lar va build'ning xato bilan to'xtashi.

#### INF-08 · 🟠 `requirements.txt` to'liq emas
- **Muammo:**
  - Import qilingan, lekin ro'yxatda yo'q: `numpy`, `trimesh`, `pygltflib` (`backend/ar3d/generator.py:8-10`), `sentry_sdk` (`SENTRY_DSN` berilsa server yiqiladi), `slugify` (`backend/accounts/serializers.py:74`: o'rnatilmagan va noto'g'ri chaqirilgan, shuning uchun do'kon nomi bilan ro'yxatdan o'tish yiqiladi), `psutil`.
  - `uvicorn` versiyasi qotirilmagan.
  - `psycopg2-binary` o'rniga `psycopg[binary]` 3 ishlatish kerak.
- **Yechim:** Ro'yxat to'ldiriladi, versiyalar qotiriladi (`pip-tools` yoki `uv lock`), toza muhitda o'rnatish testi CI'ga qo'shiladi.

#### INF-09 · 🟡 Logging va monitoring yo'q
- **Muammo:** `LOGGING` sozlanmagan, `logs/` dagi fayllar eski (4-oktabrgacha), Sentry faol emas.
- **Yechim:** Strukturali loglar (JSON), xatolar uchun Sentry, uptime monitoring va Telegram'ga alert.

#### INF-10 · 🟡 N+1 so'rovlar va paginatsiya yo'q
- **Joy:**
  - `backend/orders/interfaces/api/views.py:127-129`: har stol uchun 2 ta so'rov
  - `backend/orders/application/services.py:507`: har kategoriya uchun alohida `count()`
  - `backend/web/views.py`: 129 ta ORM chaqiruvi, 6 ta `select_related`, 0 ta `prefetch_related`; `admin_products` sahifasi ~975 so'rov qiladi
  - `backend/templates/seller/orders.html:405`: barcha buyurtmalarni har 15 soniyada qayta yuklaydi
  - DRF paginatsiyasi sozlangan, lekin function view'lar uni ishlatmaydi
- **Yechim:**
  - `select_related` va `prefetch_related` qo'shiladi, `annotate(Count)` ishlatiladi.
  - Ro'yxatlarga paginatsiya.
  - `django-debug-toolbar` / `nplusone` bilan tekshirish.
- **Qabul mezoni:** Har sahifa ≤ 20 SQL so'rov.

**INF yakuni:** INF-01…INF-06 tuzatilgandan keyin `locust` yoki `k6` bilan **1000 virtual foydalanuvchi** yuk testi o'tkaziladi. Maqsad: p95 < 500 ms, xatolar < 0.1%.

---

### 5.5 Backend kod sifati — BE

#### BE-01 · 🟠 Mavjud bo'lmagan modullar import qilinadi va xato jim yutiladi
- **Joy:**
  - `backend/payments/payment_service.py:133`: `couriers.tasks` yo'q, kuryer chaqiruvi hech qachon ishlamaydi
  - `backend/notifications/outbox.py:64`: `notify_new_order_to_seller` funksiyasi yo'q
  - `backend/domains/restaurant/application/services.py:58`: `send_waiter_call_notification` yo'q, ofitsiant chaqiruvi Telegramga bormaydi
  - `backend/finance/services/ai_copilot.py:77`: `ai.gemini_client` yo'q
  - Kodda jami 61 ta `except ...: pass` va 1 ta bare `except:` (`backend/web/seller_views/marketplace.py:148`)
- **Yechim:**
  - Importlar tuzatiladi yoki funksiya yoziladi.
  - `except: pass` o'rniga log + aniq exception turi.
  - CI'ga `ruff` qo'shiladi (`F401`, `F821`, `E722`, `BLE001`).

#### BE-02 · 🟠 `/seller/profile/` 500 xato beradi
- **Joy:** `backend/templates/seller/profile.html:259`: `{% url 'seller_telegram_bot_web' %}` nomli URL mavjud emas (NoReverseMatch).
- **Yechim:** URL nomi tuzatiladi va barcha seller sahifalari uchun "200 qaytaradi" testi yoziladi.

#### BE-03 · 🟡 "DDD" faqat ko'rinishda
- **Muammo:**
  - `backend/orders/domain/models.py` dataclass'larini hech kim import qilmaydi.
  - `orders/infrastructure/` papkasi yo'q.
  - `application/services.py` ORM'ni to'g'ridan-to'g'ri chaqiradigan oddiy transaction script.
  - `backend/domains/` (494 qator) va `backend/core/` (152 qator) `INSTALLED_APPS`da yo'q va ishlatilmaydi, ichida mavjud bo'lmagan maydonlar bor (`Table.is_occupied`, `stock_quantity`).
- **Yechim:** DDD'ga "ko'rinish uchun" o'tish shart emas. Aniq qatlamlar kifoya: `services/` (biznes mantiq), `selectors/` (o'qish), `api/` (transport). Ishlatilmayotgan skeletlar `archive/` ga ko'chiriladi.

#### BE-04 · 🟡 God-fayllar
- **Joy:**
  - `backend/web/views.py` (2,199 qator)
  - `backend/web/templatetags/i18n_tags.py` (2,002 qator, ~1,800 qatori lug'at)
  - `backend/api/views.py` (1,587)
  - `backend/web/tma_views.py` (1,467)
  - `backend/ar3d/views.py` (1,395)
  - `backend/finance/views.py:90`: bitta 760 qatorlik funksiya
- **Qo'shimcha muammolar:**
  - `backend/backend/urls_market.py` `web/urls.py` dagi 63 marshrutni takrorlaydi.
  - `courier_dashboard` URL nomi takrorlangan, shu sababli kuryer web paneli buzilgan.
- **Yechim:** Domen bo'yicha modullarga bo'linadi, URL'lar bitta joyda yig'iladi.

#### BE-05 · 🟡 i18n ishlamaydi
- **Muammo:**
  - Tarjimalar Python lug'atlarida saqlanadi va takrorlangan kalitlar jim ustma-ust yoziladi.
  - `locale/` ichida faqat venv msgid'lari bor, `.mo` fayl yo'q, shuning uchun 185 ta `{% trans %}` hech qachon tarjima qilinmaydi.
- **Yechim:** Standart Django gettext (`makemessages` / `compilemessages`) yoki bitta JSON manba. Tarjimalarni admin paneldan tahrirlash imkoniyati (4-qoida).

#### BE-06 · ⚪ Mayda ishlar
- `backend/archive/seller_views.py.bak` (2,415 qator) git'da kuzatiladi.
- Refresh token blacklist app'i o'rnatilmagan, holbuki token rotatsiyasi yoqilgan.

---

### 5.6 Frontend sifati va tezligi — FE

#### FE-01 · 🟠 God-context va keraksiz qayta renderlar
- **Joy:** `frontend/src/context/NavigationContext.tsx` (1,190 qator). Unda routing, RBAC, savat, buyurtmalar, stollar, chaqiruvlar, moliya, modallar va ~200 qator seed ma'lumot bor. `:1131` dagi `value` memoize qilinmagan, shuning uchun har o'zgarishda 22 ta consumer qayta render bo'ladi.
- **Yechim:**
  - Router alohida.
  - Server holati TanStack Query'da.
  - Savat uchun kichik store (Zustand yoki alohida context).
  - Seed ma'lumot `DEMO_MODE` moduliga ko'chiriladi.

#### FE-02 · 🟠 Code splitting yo'q
- **Muammo:**
  - Hammasi bitta 500 KB chunk'da. Har bir mijoz ~140 KB xodim kodini ham yuklab oladi (Finance 31.7, Admin 18.3, qrcode 21.6 KB va boshqalar).
  - Showcase production'da `/ui-components` manzilida ochiq (`frontend/src/App.tsx:31-33`).
- **Yechim:**
  - `React.lazy` bilan route bo'yicha bo'lish.
  - `qrcode` faqat admin chunk'ida.
  - Showcase `DEMO_MODE` yoki dev build ortiga yashiriladi.
- **Qabul mezoni:** Mijozning boshlang'ich JS hajmi ≤ 90 KB gzip.

#### FE-03 · 🟠 Kesh va model-viewer yuklanishi
- **Muammo:**
  - `frontend/vite.config.ts:14-20`: Django build'ida fayl nomlarida hash yo'q.
  - 15 ta shablonda `?v=12`, `air_3d_menu_index.html`da `?v=16`, shuning uchun foydalanuvchiga eski bundle tushadi.
  - `frontend/index.html:9`: `model-viewer` 4.0.0 Google CDN'dan SRI'siz yuklanadi.
  - 10 ta Django SPA shablonida `model-viewer` yo'q, shu sababli SPA navigatsiyadan keyin 3D oyna bo'sh chiqadi.
- **Yechim:**
  - Hash'li fayl nomlari + Vite `manifest.json` orqali Django shablonlariga ulash.
  - `@google/model-viewer` npm paketi lazy import bilan.

#### FE-04 · 🟡 `RestaurantAPI.ts` mustahkam emas
- **Muammo:** Timeout, AbortController va retry yo'q, har xato `null`ga aylanadi. "Offline-first" deb yozilgan, lekin outbox yo'q.
- **Yechim:** Umumiy `apiClient` (timeout, retry, auth header, CSRF, xato turlari).

#### FE-05 · 🟡 AudioContext oqishi
- **Joy:** `NavigationContext.tsx:169` va `frontend/src/pages/KDSPage/KDSPage.tsx:44`: har signalda yangi `AudioContext` yaratiladi va yopilmaydi. KDS smenasi davomida ular to'planib qoladi.
- **Yechim:** Bitta umumiy `AudioContext` va bitta umumiy `beep()` utiliti.

#### FE-06 · 🟡 Takrorlanish va o'lik kod
- **Muammo:**
  - 4 ta bir-biriga o'xshash buyurtma turi (`LiveOrder`, `KDSOrder`, `AdminOrderItem`, `OrderData`).
  - 11 marta takrorlangan `showToast` + `setTimeout` naqshi.
  - 12 ta `__GULISTON_*_DATA__` bootstrap.
  - `router/routes.config.ts` (`APP_ROUTES`) ishlatilmaydi.
  - Ikkita `popstate` handler.
  - `MenuPage.tsx:126-149` dagi effect hech narsa qilmaydi.
- **Yechim:** Yagona turlar (`types/order.ts`), umumiy `useToast`, bitta bootstrap mexanizmi.

#### FE-07 · 🟡 Sifat vositalari
- **Muammo:**
  - `tsconfig.app.json`da `strict` yoqilmagan (kod `--strict` bilan ham o'tadi, shuning uchun yoqish oson).
  - 16 ta `any` va 2 ta `@ts-ignore`.
  - ESLint yo'q (oxlint 9 ta ogohlantirish beradi).
  - Testlar yo'q.
- **Yechim:** `strict: true`, ESLint + `react-hooks` plugin, Vitest + Testing Library (kamida savat, checkout va guard uchun).

#### FE-08 · 🟡 `vercel.json` demo rejimni yaratadi
- **Joy:** `frontend/vercel.json`: barcha yo'llar, shu jumladan `/api/*`, `index.html`ga yo'naltiriladi. Natijada Vercel'da ilova soxta ma'lumot bilan "ishlayotgandek" ko'rinadi.
- **Yechim:** Faylga "faqat demo" belgisi qo'yiladi yoki `/api/*` backend'ga proxy qilinadi.

#### FE-09 · ⚪ UI/UX va accessibility
- **Muammo:**
  - 9–11px o'lchamli 56 ta shrift.
  - `tma/kds.html` va `air_3d_menu_index.html`da `user-scalable=no` zoom'ni bloklaydi (WCAG'ga zid).
  - `viewport-fit=cover` yo'q, shuning uchun `--safe-*` tokenlar ishlamaydi.
  - 1,347 ta qattiq yozilgan hex rang (`:root` tokenlari bor bo'lsa ham) va 165 ta inline `style`.
  - `index.html`da `lang="en"`, holbuki interfeys o'zbekcha; rus tili yo'q.
  - Faqat 1 ta `loading="lazy"`.
  - 7 ta `alert`, `prompt` yoki `confirm`.
  - Google Fonts `@import` bilan render'ni bloklaydi (`frontend/src/index.css:1`).
- **Yechim:**
  - Minimal shrift 12px (asosiy matn 14–16px).
  - Zoom'ga ruxsat.
  - Ranglar tokenlarga o'tkaziladi.
  - `lang="uz"` va i18n (uz/ru).
  - `<link rel="preconnect">` + `display=swap`.

#### FE-10 · ⚪ Ortiqcha bog'liqliklar
- `lucide-react` ishlatilmaydi (0 ta import).
- `@types/qrcode` `dependencies`da turibdi, `devDependencies`da bo'lishi kerak.
- `src/assets/{hero.png, react.svg, vite.svg}` ishlatilmaydi.

---

### 5.7 3D aktivlar — 3D

#### 3D-01 · 🟠 GLB modellar haddan tashqari og'ir
- **Holat:**
  - 16 GLB = 77 MB, har biri 0.49–9.23 MB.
  - Hajmning 85–99% qismini teksturalar egallaydi.
  - Faqat 1 tasida Draco bor, KTX2, WebP va meshopt yo'q.
  - `salad_bahor.glb` 682 uchburchak uchun 8.1 MB.
  - `drink_bottle.glb` 4.5k uchburchak uchun 9 MB.
  - `mastava.glb` 9.2 MB, uning 6.3 MB'i bitta JPEG tekstura.
- **Oqibat:** Mobil internetda 10–30 soniya yuklanadi, mijoz kutmasdan chiqib ketadi.
- **Yechim:** `gltf-transform` pipeline: teksturalarni 1024–2048 px'ga tushirish, WebP yoki KTX2, meshopt yoki Draco. Bu yuklash paytida avtomatik bajariladi (Celery vazifasi).
- **Qabul mezoni:** Har bir model ≤ 1.5 MB (maqsad 0.3–1 MB), 4G'da ≤ 3 soniyada ko'rinadi.

#### 3D-02 · 🟡 Modellar va rasmlar bir necha joyda takrorlangan
- **Muammo:**
  - Git'da 33 ta GLB kuzatiladi, ulardan 17 tasi noyob.
  - Ular `frontend/public/models`, `apps/prototypes/.../media/ar/glb`, `backend/media` va `backend/static/react/models`da takrorlanadi.
  - `media/dish` dagi 28 JPEG ham takrorlangan.
- **Yechim:** Yagona manba (obyekt saqlash + CDN). Git'da GLB saqlanmaydi yoki Git LFS ishlatiladi.

#### 3D-03 · 🟡 Taom rasmlari optimallashtirilmagan
- **Muammo:** 29 ta JPEG asosan 600×450 o'lchamda, ba'zilari 154–290 KB. WebP/AVIF ham, `srcset` ham yo'q.
- **Yechim:** Yuklashda avtomatik WebP/AVIF + 2–3 o'lcham, `<img srcset loading="lazy">`.

---

### 5.8 Mobil ilova (Flutter) — MOB

#### MOB-01 · 🔴 Release APK backend'ga ulana olmaydi
- **Joy:** `apps/marketplace_mobile/lib/services/api_service.dart:19-27`: manzil `http://127.0.0.1:8000` yoki `http://10.0.2.2:8000` qilib qattiq yozilgan. `api_base_url` sozlamasi o'qiladi, lekin hech qayerda yozilmaydi. Cleartext HTTP uchun ruxsat ham sozlanmagan.
- **Oqibat:** Haqiqiy telefonda ilova faqat oflayn demo sifatida ishlaydi.
- **Yechim:** `--dart-define=API_BASE_URL=https://...` va faqat HTTPS.

#### MOB-02 · 🟠 Ikki xil haqiqat manbai
- **Joy:** `lib/database/database_helper.dart:215-790`: ~575 qator hardcoded do'kon va mahsulot seed'i. Admin CRUD faqat telefonning lokal bazasini o'zgartiradi, Django'ga hech narsa bormaydi.
- **Yechim:** Django yagona manba bo'ladi, lokal SQLite faqat kesh sifatida ishlatiladi.

#### MOB-03 · 🟠 Autentifikatsiya zaif
- **Muammo:**
  - JWT tokenlar ochiq `SharedPreferences`da saqlanadi.
  - Refresh token ishlatilmaydi, shuning uchun foydalanuvchi tez-tez jimgina tizimdan chiqib qoladi.
  - Admin parollari lokal SQLite'da tuzsiz SHA-256 bilan saqlanadi.
  - `/admin/register` marshruti ochiq (`lib/config/router_config.dart:129`).
- **Yechim:**
  - `flutter_secure_storage`.
  - Refresh oqimi.
  - Admin faqat server orqali, lokal admin olib tashlanadi (`DEMO_MODE` ortiga yashiriladi).

#### MOB-04 · 🟡 Firebase sozlanmagan
- **Joy:** `lib/main.dart:25-32`: `Firebase.initializeApp` jim xato beradi. `google-services.json` va `firebase_options` yo'q, 7 ta Firebase paketi bekorga turibdi, `services/firebase_service.dart` ishlatilmaydi.
- **Yechim:** Firebase sozlanadi yoki paketlar olib tashlanadi.

#### MOB-05 · 🟡 Play Store'ga chiqarib bo'lmaydi
- **Muammo:**
  - `android/app/build.gradle:21` `applicationId "com.example.store_guliston"`.
  - Release debug kalit bilan imzolanadi.
  - Bluetooth paketi yo'q, lekin Bluetooth ruxsatlari so'raladi.
- **Yechim:** Haqiqiy paket nomi, release keystore va faqat kerakli ruxsatlar.

#### MOB-06 · ⚪ Bog'liqliklar va l10n
- **Muammo:**
  - 9 ta paket ishlatilmaydi: `google_fonts`, `cached_network_image`, `lottie`, `intl`, `google_maps_flutter`, `image_picker`, `permission_handler`, `firebase_auth`, `firebase_storage`.
  - `pubspec` SDK cheklovi lock fayl bilan mos emas.
  - l10n ishlamaydi: `l10n.yaml` yo'q, `LanguageProvider.translate()` hech qayerda chaqirilmaydi, ~197 ta hardcoded matn bor.
  - `SERVERLESS_IMPLEMENTATION.md`, `README.md` va `IMPLEMENTATION_COMPLETE.md` mavjud bo'lmagan ilovani tasvirlaydi.
- **Yechim:** Paketlar tozalanadi, `flutter gen-l10n` sozlanadi, hujjatlar yangilanadi.

---

### 5.9 Testlar — TEST

#### TEST-01 · 🟠 3 ta test yiqiladi
Sahifalar `200` qaytaradi, lekin kutilgan matn yo'q. Dizayn yangilangan, testlar yangilanmagan:
- `api.test_production_e2e …test_admin_and_seller_ar_consoles_and_smart_routing`: `/seller/ar/` sahifasida "3D modellar boshqaruvi" yo'q.
- `api.test_production_e2e …test_telegram_mini_app_and_bot_integration`: `/tma/?table=…` sahifasida "Stol №12" yo'q.
- `ar3d.tests …test_ar_page_classic_fallback`: `/ar/?classic=1` endi `tma_ar_menu`ga o'tadi.

**Yechim:** Har biri uchun "regressiyami yoki eskirgan testmi" aniqlanadi va tuzatiladi.

#### TEST-02 · 🔴 Testlar real Telegram va Groq'ga so'rov yuboradi
- **Joy:** `backend/backend/settings.py:15`: `load_dotenv(BASE_DIR / '.env', override=True)`. Testlar ham haqiqiy `.env` tokenlarini oladi va env o'zgaruvchilari ularni bekor qila olmaydi.
- **Holat:** Tarmoq bloklangan sinov yurgizishida 23 ta `api.telegram.org` va 2 ta `api.groq.com` so'rovi to'xtatildi.
- **Oqibat:** Har test yurgizishi real chatlarga real xabar yuborishi mumkin.
- **Yechim:**
  - `override=False`.
  - Alohida `settings_test.py` (tokenlar bo'sh, HTTP mock).
  - Testlarda tarmoqni bloklovchi fixture (`pytest-socket` yoki `responses`).
- **Qabul mezoni:** Internetsiz muhitda barcha testlar o'tadi.

#### TEST-03 · 🟠 `loop_engineering_test.py` haqiqiy test emas
- **Joy:** `backend/scripts/loop_engineering_test.py`: real bazada `django.setup()` qiladi, buyurtma, mahsulot, Print3D va outbox yozuvlarini yaratadi va tozalamaydi. Signal orqali real Telegram xabarlari ham ketadi.
- **Holat:** Nusxa bazada 55/55 PASS (README'da "45/45" deb yozilgan, bu eskirgan).
- **Yechim:** Django test runner'ga ko'chiriladi (alohida test bazasi bilan). Skript `archive/` ga o'tkaziladi.

#### TEST-04 · 🟠 Qamrov bo'shliqlari
- **Muammo:**
  - `accounts`, `categories`, `couriers`, `orders` app'larida `tests.py` bo'sh, `tables_restaurant` va `web`da test umuman yo'q.
  - Concurrency, auth va IDOR testlari yo'q.
  - `backend/api/tests.py:122-143` IDOR'ni (faqat telefon bilan wishlist'ga kirish) "to'g'ri xatti-harakat" sifatida tasdiqlaydi.
  - To'lov e2e testi (`backend/api/test_production_e2e.py:498-561`) faqat imzo tekshiruvi o'tkazib yuborilgani uchun o'tadi.
- **Yechim:** Har bir SEC va DATA bandi uchun regressiya testi, buyurtma va zaxira uchun parallel testlar.

#### TEST-05 · 🟡 CI yo'q
- **Yechim:** GitHub Actions orqali:
  - backend: `ruff`, `manage.py check --deploy`, `makemigrations --check`, testlar;
  - frontend: `tsc`, `eslint`, `vitest`, `build`;
  - Flutter: `flutter analyze` va `flutter test`.

---

### 5.10 Repozitoriy va hujjatlar — REPO

#### REPO-01 · 🟠 `apps/prototypes`: ~166K qatorlik o'lik nusxalar
- **Muammo:**
  - `apps/prototypes/marketplace/frontend/flutter_lib` `apps/marketplace_mobile/lib` bilan bayt-bayt bir xil.
  - Ko'zgu sifatida nusxalangan 61 ta shablondan 9 tasi allaqachon farqlanib ketgan. Ularni tahrirlash jonli tizimga ta'sir qilmaydi, bu esa dasturchi va AI'ni chalg'itadi.
  - `3d_ar_menu/AR_MENU_LOYIHA` alohida Django loyihasi, ichida Redis dump fayli (`dump.rdb`) git'da kuzatiladi.
  - Faol tizim prototiplarga hech qanday bog'liq emas.
- **Yechim (4-qoidaga mos):** `archive/prototypes-2026-10` tag yoki branch yaratiladi va prototiplar egasi tasdig'i bilan `main`dan chiqariladi. O'rniga ko'rsatkich README va `FILES.md` manifestlari qoldiriladi.

#### REPO-02 · 🟠 Git'dagi og'ir binar fayllar
- **Muammo:**
  - `backend/bin/cloudflared` (40 MB binar).
  - `.git` hajmi 141 MB.
  - Tarixda `backend/node_modules` va ikkita MP4 (10.6 MB va 8.3 MB) bor.
  - GLB takrorlari (3D-02).
- **Yechim:** `cloudflared` sozlash skripti orqali yuklab olinadi. Media fayllar uchun LFS yoki obyekt saqlash. Tarixni tozalash egasining qarori bilan.

#### REPO-03 · 🟡 `.gitignore` noto'g'ri
- **Muammo:**
  - `apps/marketplace_mobile/android/.gradle/**` (25 fayl) va `android/local.properties` (`/home/ibrohim/...` yo'llari bilan) git'da kuzatiladi.
  - Root-anchored Android naqshlari ichki joylashgan ilovaga ta'sir qilmaydi.
  - Eski yo'llar qolgan (`3D_AR_MENU/...`) va takrorlangan bo'limlar bor.
  - `lib/l10n/` va `lib/generated/` naqshlari kelajakda Flutter manbasini yashirib qo'yishi mumkin.
- **Yechim:** `.gitignore` qayta tuziladi, keraksiz fayllar indeksdan chiqariladi (`git rm --cached`, diskdan o'chirilmaydi).

#### REPO-04 · 🟡 Build natijasi git'da
- **Joy:** `backend/static/react/` (`index.js` 500 KB, hash'siz, 15 commit davomida o'zgargan).
- **Yechim:** Build CI yoki deploy vaqtida bajariladi, natija git'da saqlanmaydi (FE-03 bilan birga).

#### REPO-05 · 🟡 Skriptlar takrorlangan va buzilgan
- **Muammo:**
  - Root'dagi `start_server.sh`, `stop_server.sh`, `status_server.sh` va `setup_autostart_and_lid.sh` `scripts/server/*` va `scripts/system/*` bilan bir xil.
  - `scripts/` ichidagi nusxalar **ishlamaydi**: `DIR`ni o'z joylashuvidan hisoblaydi (`scripts/server/start_server.sh:7`) va natijada `scripts/server/backend/venv`ni qidiradi.
  - README mavjud bo'lmagan `./scripts/start_server.sh`ga ishora qiladi.
  - Root'dagi `static/air` `backend/static/air`ning eskirgan va farqlanib ketgan nusxasi.
- **Yechim:** Bitta ishlaydigan skriptlar to'plami qoldiriladi, nusxalar arxivlanadi, README tuzatiladi.

#### REPO-06 · 🟡 Hujjatlar kod bilan mos emas
- **Muammo:**
  - `docs/00_ARCHITECTURE_MASTER/REPOSITORY_STRUCTURE.md` mavjud bo'lmagan papkalarni ko'rsatadi (`MARKETPLACE/store_guliston_v1`, `3D_AR_MENU/`, `STUDIO_3D/`, `roadmap/`). Yana 31 ta faylda eski yo'llar bor.
  - `README.md` mavjud bo'lmagan `SHARED_CORE_ENGINE.md` va `ARCHIVE_SPECS/`ga havola beradi.
  - Concurrency maqsadlari bir-biriga zid: `SIX_YEAR_PRODUCTION_ARCHITECTURE.md`da 100, AGENTS.md va IDEAL'da 1000+. Bu ikki hujjat ~70% takrorlanadi.
  - `HANDOFF_CURRENT.md` §1 da "real vaqtda yetib boradi" deyilgan, bu noto'g'ri. Shu hujjatning §6.3 qismi haqiqatni tan oladi.
  - 30 guruh bir xil `.md` fayllar bor. AGENTS.md 3 nusxada turibdi (root, `.agents/rules/SYSTEM_RULES.md`, `docs/00_ARCHITECTURE_MASTER/AI_CORE_RULES.md`).
  - "3 ta to'liq mustaqil mahsulot" degan da'vo oshirib yuborilgan: kod, baza va `Customer` jadvali bitta, izolyatsiya faqat URL darajasida.
- **Yechim:**
  - Yagona "Hozirgi holat va maqsad" jadvali.
  - Arxitektura qarorlari uchun ADR fayllari.
  - `REPOSITORY_STRUCTURE.md` va README qayta yoziladi.
  - Takrorlar arxivlanadi.

#### REPO-07 · ⚪ Mayda ishlar
- Ikkita git remote bor (`origin`, `menu`) va subtree push qo'lda qilinadi. Uni CI'da avtomatlashtirish kerak.
- `.aws`, `.codex` va `.sixth/skills` papkalari bo'sh.

---

## 6. Bosqichlar (amalga oshirish tartibi)

Har bir bosqich oldingisi qabul qilingandan keyin boshlanadi. Bosqich ichidagi bandlar alohida commit va alohida test bilan topshiriladi.

| Bosqich | Maqsad | Bandlar | Natija |
|---|---|---|---|
| **0. Xavfsizlikni zudlik bilan yopish** | Pul va ma'lumot yo'qotilishini to'xtatish | SEC-01…07, SEC-08, SEC-10, SEC-11, SEC-12, TEST-02 | Anonim foydalanuvchi pulga yoki ma'lumotga tegolmaydi |
| **1. Infratuzilma** | 1000 foydalanuvchiga tayyor poydevor | INF-01…08, SEC-13, SEC-14 | VPS, Postgres, Redis, Celery, CDN, doimiy domen |
| **2. Restoran OS'ni haqiqiy backend'ga ulash** | Qurilmalar orasida ishlaydigan restoran | RST-01…09, DATA-04, DATA-05, SEC-09, SEC-15 | KDS, ofitsiant va admin real vaqtda sinxron |
| **3. Ma'lumotlar yaxlitligi** | Pul va zaxira hisobi aniq | DATA-01…03, DATA-06…09, BE-01, BE-02 | Parallel testlar o'tadi, soft delete hamma joyda |
| **4. Tezlik va UX** | Tez yuklanadigan 3D menyu | FE-01…05, 3D-01…03, FE-09, RST-10, RST-11 | Mijoz JS ≤ 90 KB gzip, model ≤ 1.5 MB |
| **5. Sifat va avtomatlashtirish** | Uzoq muddatli barqarorlik | TEST-01, TEST-03…05, FE-06, FE-07, BE-03…05, INF-09, INF-10 | CI yashil, yuk testi 1000 VU |
| **6. Mobil ilova** | Play Store'ga tayyor APK | MOB-01…06 | Haqiqiy backend'ga HTTPS orqali ulangan APK |
| **7. Repo va hujjatlar** | Toza va tushunarli repo | REPO-01…07, FE-08, FE-10, DATA-10, SEC-16…18 | Hujjatlar kod bilan mos |

**Eslatma:** 0-bosqich pilotdan **oldin** majburiy. Tizim hozir real mijozlarga ochiq bo'lsa, 0-bosqich darhol boshlanishi kerak.

---

## 7. Umumiy qabul mezonlari (Definition of Done)

Har bir band quyidagi shartlar bajarilganda yopiladi:

1. Kod o'zgarishi bandning **Qabul mezoni** bo'yicha tekshirilgan.
2. Avtomatik test yozilgan va CI'da o'tadi. Xavfsizlik bandlari uchun "hujum muvaffaqiyatsiz" testi bor.
3. Hech qanday funksiya, sahifa yoki tugma o'chirilmagan, faqat flag ortiga yashirilgan (4-qoida).
4. Yangi sozlamalar admin panel yoki `.env.example`da hujjatlashtirilgan.
5. `manage.py check --deploy` yangi ogohlantirish bermaydi, frontend `tsc` va `build` toza.
6. Tegishli hujjat (`docs/`) yangilangan.

Loyiha darajasidagi yakuniy mezon: **1000 virtual foydalanuvchi yuk testi** (k6 yoki locust) — p95 < 500 ms, xatolar < 0.1%, 30 daqiqa davomida qotishsiz.

---

## 8. Yechim talab qiladigan savollar (loyiha egasi uchun)

1. **Tizim hozir real restoranda yoki do'konda (pilot) ishlayaptimi?** Shunga qarab 0-bosqich darhol boshlanadimi yoki rejali bo'ladimi, aniqlanadi.
2. **Qaysi mahsulot birinchi:** Restoran (#1) yoki Marketplace (#2)? 2-bosqich shunga qarab tartiblanadi.
3. **VPS va doimiy domen uchun byudjet bormi?** Noutbuk va quick tunnel bilan INF bandlarini va 1000 foydalanuvchi standartini bajarib bo'lmaydi.
4. **Xodimlarning kirishi qanday bo'ladi:** PIN va parolsiz "device grant" g'oyasi saqlanib, server imzolagan qurilma tokeniga o'tkazilsinmi (SEC-01)? Yoki xodimlar uchun oddiy login va parol kiritilsinmi?
5. **Git tarixini tozalash** (`filter-repo` bilan cloudflared, MP4 va eski `.env`ni olib tashlash) ma'qulmi? Bu barcha klonlarni qayta olishni talab qiladi.
6. **Prototiplarni `main`dan arxiv branch'iga chiqarishga ruxsat bormi** (REPO-01)?

---

## 9. Saqlab qolinadigan yaxshi tomonlar

- Pul hamma joyda `Decimal`da saqlanadi, float yo'q.
- `mark_payment_paid` atomic, `select_for_update` bilan va qayta chaqirilsa ham xavfsiz (`backend/payments/payment_service.py:63`).
- Flutter API'dagi buyurtma (`backend/api/views.py:517+`) narxni serverda hisoblaydi, zaxirani va kuponni tekshiradi. Bu boshqa oqimlar uchun **namuna**.
- Sotuvchi panellari tenant bo'yicha to'g'ri ajratilgan (`get_object_or_404(..., shop=request.tenant_shop)`).
- Stol QR tokenlari HMAC bilan imzolangan va muddatli (`backend/tables_restaurant/models.py:55`).
- Parollar `make_password` bilan xeshlangan, JWT muddatlari to'g'ri, o'z-o'zini imtiyozli rolga ro'yxatdan o'tkazish bloklangan.
- Xavfsizlik header'lari middleware'i bor (nosniff, Referrer-Policy, X-Frame-Options).
- `docker-compose.yml` to'g'ri tuzilgan (Postgres + PgBouncer + Redis + Celery), uni faqat ishga tushirish kerak.
- Frontend `tsc --strict` bilan ham toza, bog'liqliklar minimal va yangi (React 19, Vite 8). Design tokenlar, 44px tap target, `aria` atributlari va o'zbekcha apostrofni tushunadigan qidiruv bor.
- `model-viewer` faqat modal ochilganda yuklanadi, AR rejimlari (WebXR, Scene Viewer, Quick Look) to'g'ri sozlangan.
- Outbox + `on_commit` g'oyasi to'g'ri, faqat Celery bilan ishga tushirish kerak.
- `HANDOFF_CURRENT.md` §6 holatni rostgo'ylik bilan tan oladi.

---

## 10. Eski hujjatlar bilan bog'liqlik

- `docs/04_SHARED_MODULES_AND_ARCHIVE/kamchiliklar.md` (2026-09-25) dagi holat:
  - **To'lov imzosi** muammosi qisman tuzatilgan: tekshiruv qo'shilgan, lekin kalit bo'sh bo'lsa hali ham o'tkazib yuboradi (SEC-03).
  - **DEBUG va CORS** muammosi hali ochiq (SEC-07).
  - **Wishlist IDOR** muammosi hali ochiq (SEC-10).
  - **UzCard importi** muammosi tuzatilgan.
- `HANDOFF_CURRENT.md` §6.3 (Mock State) va §8 (WebSocket) bandlari ushbu TZ'ning RST-01 va RST-03 bandlariga kiritilgan.
- Ushbu TZ tasdiqlangandan keyin `REPOSITORY_STRUCTURE.md` va README'ga bu faylga havola qo'shiladi (REPO-06).

---

*Ushbu TZ AGENTS.md qoidalariga muvofiq tuzilgan: avval tahlil, keyin savollar, so'ng TZ va tasdiq, undan keyingina ish. Loyiha egasining aniq ruxsatisiz hech bir band bo'yicha kod o'zgartirilmaydi.*
