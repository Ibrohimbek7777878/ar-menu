# TZ: Tuzatishlar va "sodda, qulay" panel (Gemini uchun)

**Sana:** 2026-10-29 · **Muallif:** Claude (tahlil, TZ, tekshiruv) · **Ijrochi:** Gemini (kod) · **Branch:** `feature/admin-menu-telegram`
**Holat:** ⛔ **TASDIQ KUTILMOQDA.** Egasi ruxsat bermaguncha kod yozilmaydi (AGENTS.md 1-qoida).
**Asos:** 2026-10-29 tekshiruvi (538 test, PostgreSQL, brauzer, 2 ta mustaqil kod ko'rigi) + yangi paneldagi 7 sahifani egasi va ofitsiant sifatida kompyuter (1440 px) va telefonda (390 px) ko'rish.

---

## 0. Qoidalar (o'zgarmaydi)

- Til: o'zbekcha (lotin). Hech narsa o'chirilmaydi, faqat yashiriladi (flag, arxiv). Klassik panel va eski dizayn saqlanadi.
- `backend/.env` va ildizdagi `.env` ga tegilmaydi. `main` ga push/merge yo'q. Haqiqiy `backend/db.sqlite3` ga yozilmaydi. Testlar tarmoqqa chiqmaydi.
- **Dizayn:** o'zboshimchalik bilan yangi dizayn yo'q. Joylashuvni o'zgartiradigan har bir ish (4-bo'lim) **avval statik maket** → egasi ma'qullaydi → keyin kod. Mavjud ranglar, shriftlar va komponent uslublari (Buyurtmalar, Stollar, Xodimlar sahifalaridagi kabi) qayta ishlatiladi.
- Har bosqich tugagach **to'xtang**: nima o'zgargani, test natijalari, "tekshirilmadi" qismlar halol yoziladi. Claude tekshiradi, keyin keyingi bosqichga ruxsat.
- "Bajarildi" deb faqat **haqiqatan yurgizilgan** narsani yozing. Yurgizilmagan buyruqni "o'tdi" demang.

## 1. "Sodda va qulay" nimani anglatadi

Foydalanuvchilar texnik emas, ko'pchiligi telefonda, shoshilib ishlaydi:

| Rol | Qurilma | Eng ko'p ishi |
|---|---|---|
| Restoran egasi | telefon + ba'zan kompyuter | bugungi pul, taom narxi/stop-list, xodim, "hozir yopiqmiz" |
| Menejer | telefon/planshet | buyurtma, stol, stop-list |
| Ofitsiant | telefon, bir qo'l | buyurtma holati, stol holati |
| Oshpaz | planshet/monitor | oshxona ekrani (KDS) |
| Hostess | planshet | stol va bronlar |

**O'lchanadigan mezonlar** (qabul testida avtomatik tekshiriladi, 7.2-bo'lim):

| № | Vazifa (egasi, telefonda, bosh sahifadan) | Chegara |
|---|---|---|
| T1 | Bugungi tushumni ko'rish | **0 bosish** (bosh sahifada birinchi ekranda) |
| T2 | Taomni "Tugadi" qilish va qaytarish | **≤ 2 bosish** |
| T3 | Taom narxini o'zgartirish | **≤ 3 bosish** + yozish |
| T4 | Yangi taom qo'shish | **3 majburiy maydon** (nom, narx, kategoriya), qolgani ixtiyoriy |
| T5 | Restoranni vaqtincha "yopiq" qilish | **≤ 2 bosish** |
| T6 | Stolning QR kodini chop etish | **≤ 3 bosish** |
| T7 | Yangi xodim qo'shish | **≤ 4 maydon**, parol avtomatik |
| T8 | Ofitsiant: buyurtmani "Berildi" qilish | **≤ 2 bosish** |

Umumiy tamoyillar:

- **S1. Bir ekran, bir maqsad.** Ekranda eng ko'pi bilan bitta asosiy (yashil) tugma.
- **S2. Texnik so'z yo'q.** Pastdagi lug'at (1.1) bo'yicha almashtiriladi.
- **S3. Telefon birinchi.** 360–430 px da hammasi ishlaydi, yon-skroll yo'q, bosiladigan joy ≥ 44×44 px.
- **S4. Xavfli amal yashirin va qaytariladigan.** "O'chirish" o'rniga "Arxivlash" + 8 soniya "Qaytarish".
- **S5. Har amalga javob.** Saqlandi ✓ / xato sababi o'zbekcha. Hech qachon bo'sh ekran yoki "500".
- **S6. Standart qiymatlar to'g'ri.** Foydalanuvchi hech narsa o'zgartirmasa ham ishlashi kerak.
- **S7. Murakkab narsa yopiq.** Kam ishlatiladigan sozlamalar "Qo'shimcha" bo'limida (yashirin, o'chirilmagan).

### 1.1 Lug'at (matnlarni almashtirish)

| Hozir | Bo'ladi |
|---|---|
| KDS, "Oshxona (KDS)" | Oshxona ekrani |
| "Tizimdagi identifikator (Slug)" | ko'rinmaydi (avtomatik); kerak bo'lsa "Menyu havolasi" faqat o'qish uchun |
| `Shop_owner`, `shop_manager` ... (pastki burchakda xom ko'rinadi) | Restoran egasi, Menejer, Ofitsiant, Oshpaz, Hostess |
| CSV | Excel uchun yuklab olish |
| "Chek & Tafsilotlar" | Chekni ko'rish |
| "Nasiyalar va Qarzlar Daftari" | Qarzlar |
| "Sof pul oqimi" | Foyda (tushum − xarajat) |
| `2026-10-29 13:44:23` | bugun 13:44 / kecha 18:20 / 26-sentabr |
| `10/29/2026` (brauzer sana maydoni) | Bugun · Kecha · 7 kun · 30 kun tugmalari; "Boshqa sana" ochilsa sana tanlagich |
| "Ish kunlari: Dush-Shan" (erkin matn) | kun tugmalari: Du Se Ch Pa Ju Sh Ya |
| "Ish soatlari: 08:00-22:00" (erkin matn) | ikkita vaqt tanlagich |

Yangi matnlar `admins/resto/src/i18n/uz.ts` orqali beriladi (hozir sahifalar matnni kodning ichiga yozgan, bu TZ 1.1 ga zid).

## 2. Hozirgi holat (men o'lchadim, demo server, 2026-10-29)

| Ko'rsatkich | Natija |
|---|---|
| Dashboard | ✅ sodda va tushunarli (4 karta, top-5 taom) |
| Menyu sahifasi | 175 ta bosiladigan element (taom soni bilan o'sadi). Har kartada 3 ta ikonka-tugma (nusxa, tahrir, **qizil o'chirish yonma-yon**). Filtrlar 3 qator (kategoriya, qidiruv, holat) |
| Stollar | har stol kartasida alohida "Holat" tanlagichi + QR + tahrir + o'chirish (11 stolda 66 element) |
| **Moliya va Sozlamalar** | ❌ **CSS yo'q**: xom HTML, ikonkalar va matn bir-biriga yopishgan. Egasi bu sahifalarda ishlay olmaydi |
| Telefon (390 px) | ❌ **240 px sidebar doim ochiq**, kontent 150 px ga qisilib kesilib ketadi (skrinshotda ko'rindi) |
| Ofitsiant `/ra/` ni ochsa | ❌ **bugungi tushum (300 000, naqd/karta) ko'rinadi** |
| Egasi login qilsa | ❌ **eski `/seller/` ga tushadi**, yangi panelni topmaydi (`admin_ui` bayrog'i ishlamaydi) |
| Matn | pastki burchakda xom `Shop_owner`; Xodimlarda `2026-10-29 13:44:23` xom sana; "KDS", "Slug", "CSV" |
| Yangi taom formasi | ✅ yaxshi (nom, narx, vaqt, kategoriya, rasm, tavsif). Kamchilik: kategoriya oldindan "Ichimliklar" tanlangan (xato qilish oson), rasm tanlash brauzerning inglizcha "Choose File / No file chosen" tugmasi |
| Ikonka-tugmalar nomi | ✅ Menyu/Stollar/Xodimlarda `aria-label`/`title` bor (0 ta nomsiz). Sozlamalarda 2 ta nomsiz |
| Tashqi manba | yangi panel hamon `fonts.googleapis.com` (Playfair, Plus Jakarta) dan shrift oladi; `favicon.svg` 404 |

*Tekshirilmadi:* real telefonlarda barmoq bilan ishlash, sekin internet (3G), ekran o'qish dasturi, rus tili.

---

## 3. A BOSQICH: to'sib turuvchi xatolar (soddalashtirishdan OLDIN)

Bular hal bo'lmaguncha na push, na pilot mumkin. Har biri uchun **avval xatoni takrorlovchi test** (qizil), keyin tuzatish (yashil).

### A1. `Shop.public_id` migratsiyasi 2+ do'konli bazada yiqiladi
- **Qayerda:** `backend/shops/migrations/0015_shop_public_id.py`, `0016`, `0017`.
- **Sabab:** `AddField(default=uuid.uuid4)` mavjud barcha qatorga **bitta** UUID beradi, 0017 unikal qilmoqchi bo'lganda `IntegrityError`. Haqiqiy bazada 15 do'kon bor. Men PostgreSQL'da 3 do'kon bilan takrorladim.
- **Tuzatish:** 0015 da maydon `null=True` va **defaultsiz**; 0016 da har qator uchun alohida `uuid4()` (RunPython, `public_id IS NULL`); 0017 da `unique=True, null=False` + `default=uuid.uuid4`.
- **Qabul:** yangi test: 3 ta do'kon yaratib, migratsiya 0014 → oxirgisiga o'tadi, UUID'lar noyob. Haqiqiy bazaning nusxasida (scratchpad) `migrate` xatosiz o'tadi. SQLite **va** PostgreSQL'da.

### A2. Menejer egani tushirib, parolini oladi
- **Qayerda:** `backend/accounts/interfaces/api/staff_admin.py` (rol PATCH ~147-157, blok ~188, parol tiklash ~255, `CREATABLE_ROLES`).
- **Takrorlash (men jonli o'tkazdim):** `demo-menejer` → egasiga PATCH `role=waiter` → 200 → parol tiklash → yangi parol javobda.
- **Tuzatish:** rol ierarxiyasi `shop_owner > shop_manager > qolganlar`. Menejer: egasi/menejerni o'zgartira, bloklay, parolini tiklay olmaydi; egalik (`shop_owner`) va menejer rolini bera olmaydi; o'z rolini ko'tara olmaydi. Do'konning **oxirgi egasini** tushirish/bloklash/o'chirish mumkin emas. O'zini bloklay olmaydi.
- **Qabul:** testlar: menejer→ega PATCH/blok/parol = 403; menejer o'z rolini ko'tarsa = 403; oxirgi egani tushirish = 400; ega hammasini qila oladi.

### A3. Dashboard daromadi ofitsiant/oshpaz/hostess'ga ochiq
- **Qayerda:** `backend/web/resto_admin_views.py` (~149, ruxsat faqat `RESTAURANT_STAFF_ROLES`), dashboard API.
- **Tuzatish:** pul raqamlari (tushum, naqd/karta, o'rtacha chek, top taomlar summasi) faqat `finance` imkoniyati bor rolga. Qolganlarga API bu maydonlarni **umuman qaytarmaydi** (frontend'da yashirish yetmaydi). Sidebar ham rolga qarab (allaqachon qisman bor).
- **Qabul:** test: ofitsiant uchun dashboard javobida pul maydonlari yo'q; egasi uchun bor. Brauzerda ofitsiant `/ra/` da tushum ko'rmaydi.

### A4. Moliya va Sozlamalar sahifalari CSS'siz
- **Sabab:** sahifalar Tailwind sinflarida yozilgan, yangi ilovada Tailwind yo'q.
- **Tuzatish:** ikkala sahifa Buyurtmalar/Stollar/Xodimlar sahifalaridagi **mavjud** komponent uslublari bilan qayta bezatiladi (yangi dizayn emas). Tailwind CDN qaytarilmaydi.
- **Qabul:** 1440 va 390 px da skrinshot (men ko'raman). Hech bir sahifada xom HTML qolmaydi.

### A5. Buyurtma holati/to'lov endpointlari domen qoidalarini chetlab o'tadi
- **Qayerda:** `backend/orders/interfaces/api/orders_admin.py` (holat ~238-295, to'lov ~298-334).
- **Muammo:** holat to'g'ridan-to'g'ri yoziladi (oshpaz yetkazilgan buyurtmani bekor qila oladi), `payment_status` istalgan qiymatga o'zgaradi (ofitsiant "to'langan"ni "to'lanmagan"ga qaytaradi), kassa yozuvi yaratilmaydi.
- **Tuzatish:** holat o'zgarishi `orders/state_machine.py` (`transition_order`) orqali; ruxsat etilgan o'tishlar rolga bog'liq; to'lov faqat `finance`/kassir imkoniyatida va kassa yozuvi bilan; zaxira (stock) qaytarilishi mavjud mantiq bilan.
- **Qabul:** testlar: yetkazilgan → bekor = 400; ofitsiant to'lovni qaytara olmaydi (403); to'lov belgilansa kassa yozuvi bor; bekor qilinsa zaxira qaytadi.

### A6. Qarz to'lovini storno qilish doim 500
- **Qayerda:** `backend/finance/interfaces/api/finance_admin.py` (~293-299): modelda yo'q `initial_amount` / `is_settled` ga yozadi.
- **Tuzatish:** modelning haqiqiy maydonlariga moslash. **Qabul:** test (hozir yo'q): qarz → to'lov → storno = 200, qoldiq to'g'ri.

### A7. Sovuq ishga tushishda ikki konteyner bir vaqtda `migrate` qiladi
- **Qayerda:** `deploy/docker-compose.yml` (`web` va `web-staff` ikkalasi `command: ["web"]`).
- **Ko'rinish:** toza bazada `web` ikki marta qayta ishga tushdi (`UniqueViolation`).
- **Tuzatish:** migratsiyani faqat `init`/bitta servis qiladi; `web-staff` `migrate`ni o'tkazib yuboradi (`SKIP_MIGRATE=1` yoki alohida buyruq) va `web` sog'lom bo'lgach ishga tushadi (`depends_on: condition`).
- **Qabul:** `docker compose down -v && up` — hech bir konteyner qayta ishga tushmaydi (`docker compose ps` da `restarts=0`).

---

## 4. B BOSQICH: soddalashtirish (asosiy maqsad)

### 4.0 Tartib: avval maket
Quyidagi 5 ekran uchun **statik HTML maket** (`docs/01_PRODUCT_RESTAURANT_3D_AR/mockups/admin_oddiy_maket.html`, 390 va 1440 px): (1) Bosh sahifa, (2) Menyu, (3) Stollar, (4) Moliya, (5) Telefon navigatsiyasi. Egasi ma'qullamaguncha shu bo'limdagi joylashuv o'zgarishlari **kodlanmaydi**. Maketsiz bajariladigan: matn lug'ati, A bosqich, 5-bo'lim.

### 4.1 Telefon navigatsiyasi
- ≤ 1023 px: doimiy sidebar **yo'q**. O'rniga pastda belgilangan tab-bar (5 tadan oshmaydi): *Bugun · Buyurtmalar · Menyu · Stollar · Yana* ("Yana" ichida Xodimlar, Moliya, Sozlamalar, "Klassik panelga o'tish", Chiqish). Rolga ko'rinmaydigan bo'limlar ko'rsatilmaydi (ofitsiant: *Bugun (pul raqamlarisiz, A3) · Buyurtmalar · Stollar*).
- ≥ 1024 px: hozirgi sidebar o'zgarishsiz.
- Qo'shimcha: sahifa sarlavhasida restoran nomi va **"Restoran ochiq/yopiq"** tugmasi (T5).
- Qabul: 360, 390, 430, 820, 1440 px da yon-skroll yo'q, kontent kesilmaydi, bosiladigan joy ≥ 44 px.

### 4.2 Sahifama-sahifa

**Bugun (Dashboard)** — allaqachon yaxshi; qo'shiladi:
- Birinchi ekranda katta "Bugungi tushum" (T1) va **"Ochiq/Yopiq"** tugmasi.
- "Diqqat talab qiladi" bloki: kutilayotgan buyurtmalar soni, tugagan taomlar soni — har biri tegishli sahifaga o'tadigan havola.
- "Ma'lumotlarni yangilash" tugmasi olib tashlanmaydi, lekin ikkilamchi (kichik ikonka); ma'lumot o'zi yangilanadi (C5 dagi SWR xatosi tuzatilgach).

**Buyurtmalar**
- Holat tablari 6 tadan 4 taga: *Yangi · Tayyorlanmoqda · Tayyor · Yopilgan* ("Berildi" va "Bekor qilingan" "Yopilgan" ichida filtr sifatida, o'chirilmaydi).
- Karta bosilganda chek ochiladi (alohida "Chek & Tafsilotlar" tugmasi shart emas).
- Ofitsiant faqat o'z stollari/hammasi — qaysi biri ekani 9-bo'limda savol.
- Bitta katta amal tugmasi kartada: keyingi mumkin bo'lgan holat ("Tayyor qilish", "Berildi") — A5 dagi `transition_order` orqali.

**Menyu**
- Har kartada ko'rinadigan: nomi, narxi, rasm, **"Bor / Tugadi" almashtirgichi** (T2, optimistik yangilanish, xato bo'lsa orqaga qaytadi). Kartaga bosish = tahrirlash (T3).
- Nusxalash va arxivlash — kartadagi "⋯" menyusida, **matn bilan**. Qizil o'chirish ikonkasi kartadan olib tashlanadi ("Arxivlash", 8 soniya "Qaytarish"). "Arxiv" filtri qoladi.
- Filtrlar: kategoriya chiplari + qidiruv (2 qator). "Holat" (Sotuvda / Stop-list / Arxiv) bitta "Filtr" tugmasi ostida.
- Yangi taom formasi: majburiy 3 maydon (nom, narx, kategoriya). **Kategoriya oldindan tanlanmaydi** ("Kategoriyani tanlang"). Tayyorlanish vaqti, tavsif, rasm — "Qo'shimcha" ochiladigan bo'limda (standart yopiq; hozirgi forma o'chirilmaydi, shu bo'lim ichiga kiradi).
- Rasm: "Rasm tanlash" tugmasi (o'zbekcha), tanlangach ko'rinish, **brauzerda 1600 px gacha kichraytirish** (telefon rasmi 5–10 MB bo'ladi), telefonda kamera tanlovi.
- Kartada "3D AR" belgisi qoladi (ma'nosi sichqoncha/uzoq bosishda: "Mehmon 3D da ko'ra oladi").

**Stollar**
- Har kartada alohida "Holat" tanlagichi **olib tashlanadi**: stol rangli plitka (bo'sh / band / hisob so'ralgan / tozalanmoqda), bosilganda pastdan **holat tanlash oynasi** (bottom sheet) chiqadi.
- "Yangi stol" yonida **"Ko'p stol qo'shish"** (1–50 ta, raqam avtomatik, zal tanlanadi).
- QR: stol ichida "QR" tugmasi + sahifa tepasida **"Barcha QR kodlarni chop etish"** (T6).
- Tahrir/arxiv — "⋯" menyusida.

**Xodimlar**
- Rol nomlari 1.1 lug'ati bo'yicha. "Oxirgi kirish" odam tilida (bugun 13:44).
- Yangi xodim: ism, login, rol (T7, 4 maydon); **parol avtomatik** yaratiladi va **bir marta** ko'rsatiladi ("Nusxalash" tugmasi bilan).
- Tahrir, parol tiklash, bloklash — kartada matnli tugmalar yoki "⋯"; bloklash tasdiq so'raydi. Egasi kartasida bloklash/tushirish tugmasi ko'rinmaydi (A2).

**Moliya**
- Birinchi ekran: 3 raqam: **Tushum · Xarajat · Foyda** (+ "Kassada qoldi"), davr chiplari: Bugun · Kecha · 7 kun · 30 kun.
- "Kirim/Chiqim qo'shish": katta tugma, forma: summa, turi (kirim/chiqim), izoh. Kategoriya ixtiyoriy.
- Qolgani (naqd/karta taqsimoti, qarzlar, kassa operatsiyalari ro'yxati) ro'yxat ko'rinishidagi tablar. Excel yuklash ikkilamchi tugma.
- Fayl 1182 qator: sahifa komponentlarga bo'linadi (har fayl ≤ 400 qator, TZ-2 talabi).

**Sozlamalar**
- To'rt bo'lim (yig'iladigan): *Restoran ma'lumoti · Ish vaqti · Xizmat haqi · Oshxona ekrani*. "Oshxona ekrani" (sariq/qizil chegaralar) va boshqa kam ishlatiladigan narsalar "Qo'shimcha" ostida, standart qiymatlar bilan (15/30 daqiqa).
- Almashtirgichlar (switch) — tushunarli yoqilgan/o'chirilgan holat bilan. Har maydon ostida **bitta qisqa jumla** izoh.
- Bitta yopishqoq **"O'zgarishlar bor — Saqlash / Bekor qilish"** paneli; saqlanmay boshqa sahifaga o'tilsa ogohlantirish. "Qayta yuklash" tugmasi olib tashlanadi (hech kim kerak qilmaydi); o'chirilmaydi, "Qo'shimcha" ostida qoladi.
- Slug ko'rinmaydi (read-only "Menyu havolasi" sifatida mumkin).

### 4.3 Xato, bo'sh va yuklanish holatlari (hamma sahifa)
- Yuklanayotganda skelet (bo'sh ekran emas). Tarmoq yo'q: "Internet yo'q. Qayta urinish" tugmasi bilan. Server xatosi: "Xatolik yuz berdi. Qayta urining" — texnik matn yo'q.
- Bo'sh ro'yxat: izoh + bitta tugma ("Hali taom yo'q — Birinchi taomni qo'shing").
- Ilova darajasida `ErrorBoundary` ("Nimadir noto'g'ri ketdi. Sahifani yangilang").
- Har saqlash/almashtirishda: tugma "Saqlanmoqda…" holatida bloklanadi (ikki marta bosish = ikki so'rov bo'lmasin; Idempotency-Key, TZ-2).

### 4.4 Birinchi ishga tushirish ustasi (onboarding)
Yangi restoran (0 ta taom va 0 ta stol) birinchi marta kirsa, 4 qadamli oyna: **1) restoran nomi va telefon → 2) nechta stol bor (avtomatik yaratiladi) → 3) birinchi taom → 4) QR kodlarni chop etish.** Har qadam "Keyinroq" bilan o'tkaziladi. Bayroq: `onboarding_wizard` (standart yoqilgan; AppSetting).

### 4.5 Bayroqlar (4-qoida: hech narsa o'chirilmaydi, hammasi sozlanadi)
| Kalit (AppSetting) | Standart | Ta'siri |
|---|---|---|
| `admin_ui` | `new` | egasi/menejer login qilgach `/ra/` ga tushadi; `classic` = `/seller/`. **Hozir cookie'dan o'qiydi va hech narsaga ta'sir qilmaydi, TZ-2 1.4 bo'yicha tuzatiladi** |
| `admin_simple_mode` | `true` | `false` bo'lsa "Qo'shimcha" bo'limlari ochiq turadi (kuchli foydalanuvchi uchun) |
| `onboarding_wizard` | `true` | 4.4 |

Kodga kirmasdan, Sozlamalar → "Qo'shimcha" dan o'zgartiriladi (faqat egasi/super_admin).

---

## 5. C BOSQICH: "bajarildi" deyilgan, lekin yo'q yoki soxta (halol ro'yxat)

| № | Muammo | Talab |
|---|---|---|
| C1 | **TZ 0.1/0.2 bajarilmagan:** Seller `base.html` hamon `cdn.tailwindcss.com`, Alpine (jsdelivr), Google Fonts va Material Icons'dan yuklaydi; ichki CSS/JS shablonda | Tailwind'ni build qilingan CSS ga o'tkazish, Alpine va shriftlarni lokal (self-host), inline `<style>/<script>` ni statik faylga chiqarish. Qabul: sahifa yuklanganda tashqi domenga **0 ta** so'rov |
| C2 | Yangi panel ham Google Fonts'dan shrift oladi, `favicon.svg` 404 | Shriftlar lokal (woff2, `font-display: swap`), favicon qo'shiladi |
| C3 | **`scripts/e2e_resto_admin.mjs` soxta:** brauzer ochmaydi, "muvaffaqiyatli" deb yozadi | Haqiqiy Playwright e2e: login → har sahifa → hujjat qayta yuklanmadi (`navigation` so'rovi 1 ta) → T1–T8 bosish soni. CI'da alohida job |
| C4 | 15 ta `admins` testi deyarli bo'sh (sozlamalar clamp'i testning o'zida qayta yozilgan); hook, `client.ts`, sessiya, guard sinovsiz; CI'da `admins` joyi yo'q | Haqiqiy testlar (haqiqiy funksiyani chaqiradigan), CI'ga `admins` ishi (`npm ci`, `tsc -b`, `oxlint`, `npm test`, build, `check:budget`) |
| C5 | **Kesh (SWR) buzuq:** `admins/shared/src/api/cache.ts` — fonda yangilangan qiymat hook'ga yetmaydi, "Yangilash" 10–15 soniya yangilamaydi | Fonda kelgan yangi qiymat obunachilarga yetkaziladi. Test: eski → yangi qiymat ekranga chiqadi |
| C6 | Caddy `@hashed` regex'i yangi ilovaning fayl nomlariga (`index.CTPRylCe.js`) mos kelmaydi → `immutable` kesh berilmaydi | Regex yangi nomlarni qamrasin. Qabul: `curl -I` da `Cache-Control: ... immutable` |
| C7 | Telegram `start_param`: 32 belgili tiresiz UUID `/t/<uuid>/` ga yuboriladi, marshrut tireli UUID kutadi → 404 (`frontend/src/utils/telegramBoot.ts`) | Tiresiz ham, tireli ham qabul qilinsin. Test |
| C8 | `check_bundle_budget.mjs` faqat `Page.*.js` ni tekshiradi, qobiqni emas | Qobiq (≤ 200 KB gzip) ham tekshirilsin |
| C9 | Menyu keshi maqsadi ≥ 5× bajarilmadi (JSON 127–168 → 246 so'rov/s; HTML menyu sahifasi o'zgarmadi 131–156) | TZ `MENU_CACHE` bo'yicha HTML sahifa ham keshlansin (yoki maqsad halol qayta yozilsin). Orm obyektlarini emas, tayyor JSON keshlash; tranzaksiya commit'idan keyin versiyani oshirish |
| C10 | Legacy admin dashboard `todayRevenue` regressiyasi (`pollerRoute.ts`/`NavigationContext.tsx`) | Haqiqiy qiymat ko'rinsin; test |

## 6. D BOSQICH: xavfsizlik (agentlar topgan, **men hali tasdiqlamadim**)

Tartib: **har bir band uchun avval takrorlovchi test yozing.** Takrorlansa — tuzating. Takrorlanmasa — "tasdiqlanmadi" deb yozing, o'zboshimchalik bilan "tuzatmang".

1. Telegram `/kassa` boshqa do'konlar daromadini berishi mumkin; `is_admin` Telegram username'ga ishonadi (soxtalash mumkin) → faqat bog'langan `telegram_chat_id` va do'kon bo'yicha filtr.
2. CSV eksport: mehmon ismi `=HYPERLINK(...)` bo'lsa Excel formula bajaradi → `= + - @` bilan boshlangan hujayralarga `'` qo'shish (`finance_admin.py` ~531-540).
3. Kategoriyalar global (do'konlararo) → do'konga bog'lash.
4. `ar_model` maydoni tekshirilmaydi (fayl turi/hajm/URL).
5. `bool("false")` kabi noto'g'ri tur o'girish; kiritish xatolarida 500 (bir nechta joyda) → 400 + tushunarli xabar.
6. `telegram_chat_id` ixtiyoriy bo'lib qolgan joylar.

## 7. Bajarish tartibi va tekshirish

### 7.1 Tartib

| Bosqich | Ish | Maket kerakmi | Chiqish sharti |
|---|---|---|---|
| **1** | A1–A7 (to'sib turuvchi xatolar) | yo'q (A4 faqat mavjud uslublar) | 7.3 |
| **2** | Matn lug'ati (1.1) + C2 + C5 + C6 + C7 + C8 | yo'q | 7.3 |
| **3** | **Maket** (4.0) → egasi ma'qullaydi | ha | egasining yozma "maqul" javobi |
| **4** | 4.1–4.4 (telefon navigatsiya, sahifalar, holatlar, ustasi) + 4.5 bayroqlar | maket asosida | 7.3 + 7.2 |
| **5** | C1, C3, C4, C9, C10 | yo'q | 7.3 |
| **6** | D bosqich | yo'q | 7.3 |

Har bosqich **alohida commit(lar)**. Commit xabari o'zbekcha, `feat/fix(sohasi): ...`. Bosqich tugamaguncha keyingisi boshlanmaydi.

### 7.2 Qabul testlari (T1–T8 va umumiy)
Haqiqiy brauzerda (Playwright, 390×844 va 1440×900), demo bazaning nusxasida:
- T1–T8 bosish soni chegaradan oshmaydi (test bosishlarni sanaydi, oshsa **yiqiladi**).
- 5 ta kenglikda yon-skroll yo'q; sahifalarda xom `Shop_owner`, `KDS`, `Slug`, `CSV`, `YYYY-MM-DD hh:mm:ss`, `MM/DD/YYYY` matnlari yo'q.
- Ofitsiant uchun `/ra/` da pul raqami yo'q; menejer egani o'zgartira olmaydi.
- Sahifa o'tishida hujjat qayta yuklanmaydi (navigatsiya so'rovi 1 ta).
- Tashqi domenga so'rov yo'q (C1/C2 dan keyin).

### 7.3 Har bosqich oxirida yurgiziladigan buyruqlar (natijani yozing)
```
cd backend && ruff check . && DEBUG=True python manage.py makemigrations --check --dry-run && python manage.py test --noinput
cd frontend && npx tsc -b && npx oxlint && npm test
cd admins && npm test && npm run build && npm run check:budget
```
+ PostgreSQL'da (CI'dagi kabi) backend testlari; yangi migratsiya bo'lsa 3+ do'konli bazada `migrate`. Hozirgi bazaviy natija: **538 test yashil** — bundan kam bo'lmasin.

### 7.4 Gemini'ga halol hisobot shakli
Har bosqich oxirida: (1) nima o'zgargan (fayllar), (2) qaysi buyruq qanday natija berdi (xom chiqish), (3) **bajarilmagan yoki tekshirilmagan** narsalar, (4) TZ'dan chetga chiqilgan joy bo'lsa sababi.

---

## 8. 11 rol nuqtai nazaridan (AGENTS.md 2-qoida), qisqa

| Rol | Xulosa |
|---|---|
| Mijoz (mehmon) | Bu TZ mehmon menyusiga tegmaydi (dizayni ma'qullangan). Panel soddaligi bilvosita mehmonga ta'sir qiladi: stop-list tez yangilansa, "tugagan taomni buyurtma qildim" holati kamayadi |
| Tadbirkor | Asosiy foyda: egasi panelni o'zi boshqaradi → qo'llab-quvvatlash xarajati kamayadi; onboarding sotuvni tezlashtiradi |
| CEO | Soddalik = sotuvga tayyorlik va mijozni ushlab qolish. Murakkab panel pilotda "ishlatolmayapmiz" degan natija beradi |
| PM | Foydalanuvchi sayohati: login → bugun → eng ko'p 8 vazifa. T1–T8 aynan shu |
| Kiberxavfsizlik | A2, A3, A5, D bosqich; ierarxiya, minimal huquq. Soddalashtirish xavfsizlikni **pasaytirmasligi** kerak (4.2 da tugma yashirish yetmaydi, backend ham tekshiradi) |
| Senior Engineer | Fayllar ≤ 400 qator, matnlar i18n da, bayroqlar AppSetting'da, DRY (bitta "⋯" menyu komponenti, bitta bottom sheet) |
| Data Analytics | Onboarding qadamlari va T1–T8 bajarilishini keyin o'lchash uchun hodisa nomlarini oldindan belgilash (ixtiyoriy, 9-bo'lim savoli) |
| Frontend | Tab-bar/sidebar CSS orqali, JS emas; shrift lokal; 1600 px rasm kichraytirish; bundle byudjeti saqlanadi |
| Backend | A1, A5, A6; dashboardda rolga qarab maydon qaytarish; yuk: bu TZ yangi og'ir so'rov qo'shmaydi |
| UI/UX | 44 px tap target, bitta asosiy tugma, tilni soddalashtirish, bo'sh/xato holatlar, kontrast (qora fonda yashil/kulrang matn kontrasti tekshiriladi) |
| 3D Designer | "3D AR" belgisi va rasm yuklash soddalashadi; 3D model yuklash bu TZ doirasida o'zgarmaydi |

**3-qoida (6 yil / 1000 foydalanuvchi):** bu TZ yangi server ishini deyarli qo'shmaydi. Yuk bilan bog'liq band: C9 (menyu keshi) va A7 (ishga tushish poygasi). 1000 bir vaqtdagi foydalanuvchi **noutbukda isbotlab bo'lmaydi** (oldingi o'lchovda ~3000 taxmin, tasdiqlanmagan): haqiqiy serverda yuk testi kerak (R10-8).

## 9. Egasiga savollar (javob kerak, ayniqsa 3-bosqichdan oldin)

1. **Telefonda navigatsiya:** pastki tab-bar (tavsiya, 4.1) yoki yuqoridagi "hamburger" menyu?
2. **Ofitsiant** buyurtmalar ro'yxatida faqat **o'z stollarini** ko'rsinmi yoki hamma buyurtmani?
3. **Buxgalter roli** kerakmi (faqat Moliya, hech narsani o'zgartirmaydi)? Hozir bunday rol yo'q: egasi yoki menejer ko'radi.
4. **Til:** faqat o'zbekcha lotin yetadimi, yoki rus tili ham kerakmi (restoranlar uchun ko'pincha kerak)? Rus tili alohida katta ish, shu TZ'ga kirmaydi.
5. Menyu sidebar nomlari: hozirgi ("Boshqaruv Markazi, Stollar & QR, Moliya") yoki soddasi ("Bugun, Stollar, Pul")?
6. Pilot restoranda egasi asosan **telefon** ishlatadimi yoki kompyuter? (4.1 prioritetini belgilaydi.)

## 10. Qamrovdan tashqari (bu TZ'da qilinmaydi)

Telegram Mini App (alohida branch), mehmon menyusi dizayni, rus tili, 3D modellarni yuklash tarmog'i, VPS/domen sozlash, haqiqiy taom rasmlari (egasi beradi), yuk testi (haqiqiy serverda).
