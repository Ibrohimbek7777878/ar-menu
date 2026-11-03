# TZ — Multi-tenant platforma, bron mexanizmi, dinamik brend, video sayr, AI yordami, moliya tahriri

**Sana:** 2026-11-03 · **Holat:** egasi tasdiqladi ("boshla") · tartib: 0 → 1 → 2 → 3 → 4 → 5

## Qarorlar (egasi)
1. **Subdomen asosida bitta umumiy server, MULTI-TENANT arxitektura:** har mijoz (restoran / kafe / to'yxona) `mijoz.PLATFORM_DOMAIN` da. Alohida server yo'q.
2. Sayr usuli: **video asosidagi sayr** (nuqtalar/boblar + oldinga-orqaga yurish, stollar ustida bosiladigan belgilar). AI faqat TAKLIF beradi, egasi tasdiqlaydi.
3. Vaqt oraliqlari va tadbir turlari — boshlang'ich to'plam (videodagidek), har mijoz o'zi tahrirlaydi.
4. Moliyani qo'lda tahrirlash: **majburiy sabab + tarix**, jimgina o'zgartirish yo'q.
5. Tartib: 0 → 1 → 2 → 3 → 4 → 5. Hamma narsa tugmalar orqali sozlanadi (kodsiz), hech narsa o'chirilmaydi (yashiriladi).

## Bosqich 0 — Multi-tenant asos (qolganlarning sharti)
- `Shop.subdomain` (noyob, kichik harf, DNS yorlig'i `[a-z0-9-]{3,40}`, band so'zlar: www, app, admin, api, static, media, platform, mail, ...), `Shop.business_type` (`restaurant|cafe|banquet`), `Shop.status` (`active|suspended`). Mavjud `slug` boshlang'ich subdomen.
- `TenantMiddleware`: `Host = <sub>.<PLATFORM_DOMAIN>` → `request.tenant_shop`. Apex/`www`/`app` = platforma (tenantsiz). Noma'lum subdomen → 404 sahifa; `suspended` → "Faol emas" 503 sahifa. Platforma domeni sozlanmagan yoki host boshqa (127.0.0.1, localhost, CI, demo) bo'lsa — HOZIRGI xatti-harakat (asosiy restoran) saqlanadi.
- **Tenantga bog'lash:** xodim sessiyasi/login faqat o'z tenantida (xodim.shop == tenant, `super_admin` istisno); mehmon stol QR tokeni boshqa tenantniki bo'lsa 404; `guest_shop_id()` / `staff_shop()` tenantni ustun qo'yadi.
- **Ajratish:** `Category.shop` (FK, mavjud ma'lumotni backfill: kategoriya qaysi shop mahsulotlarida bo'lsa o'shaniki, bo'lmasa asosiy restoran), barcha menyu/import/kategoriya endpointlari shop bo'yicha. Global `AppSetting` kalitlarining restoranga oidlari (guest_design, kds_*, bot_scope...) — shop sozlamasiga (business_profile) ko'chadi yoki shop bo'yicha o'qiladi (orqaga mos: global qiymat zaxira).
- Cookie: host-only (domen atributisiz) — tenantlar sessiyasi aralashmaydi. `ALLOWED_HOSTS`/`CSRF_TRUSTED_ORIGINS` platforma domeni uchun `.domen` shabloni.
- Kesh/limit kalitlari shop bo'yicha; boshqa tenant ma'lumotiga yo'l YO'Q: har endpoint uchun "tenant A → tenant B" testlari (matritsa).
- Deploy eslatmasi (egasi): wildcard DNS `*.PLATFORM_DOMAIN` + wildcard TLS (Caddy on-demand yoki DNS-challenge); hujjatlanadi.

## Bosqich 1 — Bron mexanizmi (videodagi kabi)
**Sozlama** (`Shop.business_profile['booking']`, admin tahrirlaydi; birinchi o'qishda standart to'plam):
```json
{"enabled": true,
 "slots": [{"key":"lunch","label":"Tushlik","times":["12:30","13:00","13:30","14:00","14:30","15:00"]},
           {"key":"dinner","label":"Kechki ovqat","times":["19:30","20:00","20:30","21:00","21:30"]}],
 "event_types": [{"key":"none","label":"Yo'q"},{"key":"birthday","label":"Tug'ilgan kun"},{"key":"anniversary","label":"Yubiley"},
                 {"key":"business","label":"Ish uchrashuvi"},{"key":"wedding","label":"Nikoh taklifi"}],
 "duration_minutes": 120, "max_days_ahead": 30, "min_notice_minutes": 60, "auto_confirm": false, "closed_weekdays": []}
```
(`label_ru`/`label_en` ixtiyoriy.) Bron `duration_minutes` davomida stolni egallaydi: [vaqt, vaqt+davomiylik) kesishsa stol band.
**Mehmon API (ochiq, tenant bo'yicha, tezlik chegarasi bor):**
- `GET /api/restaurant/guest/booking/config/` → `{enabled, slots, event_types, max_days_ahead, halls:[{id,name,tables:[{id,number,capacity,shape,x,y,w,h}]}]}`
- `GET /api/restaurant/guest/booking/availability/?date=YYYY-MM-DD&guests=N` → `{date, tables:[{id, slots:{"12:30":"free|taken|past|closed", ...}}]}`
- `POST /api/restaurant/guest/booking/` `{table_id,date,time,guests,name,phone,event_type,notes,submission_id}` → 201 `{public_code,status,table,date,time}`; 409 `slot_taken`, 400 tekshiruv, 429. Idempotent (`submission_id`). Telefon formati, ism uzunligi, sana oralig'i, sig'im (guests ≤ capacity) tekshiriladi.
- Xodimga bildirishnoma (Telegram, mavjud outbox): yangi bron.
**Admin:** sozlamalar API'da `booking` (to'liq tekshiruv), `/ra/` da "Bronlar" bo'limi: ro'yxat/kalendar, tasdiqlash/bekor, qo'lda bron qo'shish; "Bron sozlamalari": vaqt oraliqlari va tadbir turlari muharriri.
**Mehmon ekrani:** zal rejasi (Table x,y,w,h) yoki ro'yxatdan stol tanlash → bron oynasi (sana lentasi, vaqt oraliqlari — band vaqtlar o'chirilgan, mehmonlar +/−, ism, telefon, tadbir chiplari, izoh) → "Bron qilish" → kod.

## Bosqich 2 — Dinamik brend va mijoz boshqaruvi
Platforma admini (`super_admin`, apex domen): tenant yaratish (nom, subdomen, biznes turi, ega logini/paroli), to'xtatish/faollashtirish. Tenant admini (`/ra/`): **Brend** bo'limi — nom, logo, favicon, rang palitrasi (tayyor palitralar + o'z rangi), shrift tanlovi, bosh sahifa matnlari/sarlavhasi, aloqa/ijtimoiy tarmoq/manzil/ish vaqti, tillar, bo'limlarni yoqish/o'chirish (menyu, 360°, bron, sayr, buyurtma, ...), biznes turi shabloni (atamalar: stol/zal, mijoz/mehmon...). Hammasi tugmalar orqali; mehmon sayti, bot va kirish sahifasi shu brendni ko'rsatadi.

## Bosqich 3 — Video sayr
Egasi video yuklaydi → server (ffmpeg) yengil variantlar (720p H.264/WebM, poster, to'liq-kalitli kadrlar siljitish uchun) → **muharrir**: videoni nuqtalarga bo'lish (boblar), har nuqtada stol belgilarini qo'yish (vaqt oralig'i + ekran joyi + `Table` bilan bog'lash) → mehmon sayri (oldinga/orqaga, strelkalar, belgiga bosish → bron oynasi); sekin internetda surat bilan almashadi. Hajm/vaqt chegaralari, yuklash xavfsizligi (tur, hajm, tenant kvotasi).

## Bosqich 4 — AI yordami
Video kadrlaridan nuqtalar nomi va stol/belgi TAKLIFLARI (vision model; menu_import_ai kabi sozlamali), egasi tasdiqlaydi/tuzatadi. AI o'chiq bo'lsa qo'lda muharrir to'liq ishlaydi.

## Bosqich 5 — Moliya qo'lda tahrir
Mavjud yozuvni tahrirlash (summa, kategoriya, izoh, sana) — faqat `finance` ruxsatli xodim, **majburiy sabab**, o'zgarish tarixi (eski→yangi, kim, qachon), hisobotlar yangi qiymatni ko'rsatadi, tarix oynasida asl qiymat ko'rinadi; storno mavjud usuli saqlanadi.

## Qabul mezonlari (0–1)
1. Tenant A foydalanuvchisi/mehmoni tenant B ma'lumotini hech qanday endpoint orqali ko'ra/yoza olmaydi (matritsa testi); noma'lum/to'xtatilgan subdomen to'g'ri sahifa; localhost/demo/e2e o'zgarmaydi.
2. Mavjud testlar yashil (backend PostgreSQL'da, e2e 19/19), migratsiyalar orqaga qaytariladi.
3. Bron: band stolga ikkinchi bron 409; davomiylik kesishuvi; o'tgan vaqt yopiq; sig'imdan ortiq mehmon rad; idempotent; xodimga xabar; sozlamalar (vaqt oraliqlari, tadbir turlari) admin orqali o'zgaradi va mehmon ekranida darrov ko'rinadi.
