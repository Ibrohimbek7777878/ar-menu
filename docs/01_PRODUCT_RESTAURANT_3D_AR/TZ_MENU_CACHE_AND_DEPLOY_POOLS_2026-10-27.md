# TEXNIK TOPSHIRIQ (TZ): BOSQICH 0.6 VA 0.7 — MEHMON MENYUSINI KESHLASH VA DEPLOY POOL'LARINI AJRATISH

**Hujjat kodi:** `TZ_MENU_CACHE_AND_DEPLOY_POOLS_2026-10-27`  
**Loyihaning yo'nalishi:** Mahsulot #1 (Restoran 3D/AR & NFC Menyu)  
**Holati:** Tasdiqlash kutilmoqda (Approval Pending)  

---

## 1. Muammo va Kontekst (Nima uchun bu shart?)

Hozirgi paytda restoran menyusi va xodimlar paneli (KDS, Ofitsiant POS, Resto-Admin) bitta umumiy Gunicorn konteynerida (`web:8000`) ishlaydi. 
R-GST auditida aniqlanganidek:
1. **Raqobatbardosh yuklama (Resource Contention):** 100–150 ta mehmon bir vaqtda zalda QR-kodni skanerlab menyuni ochganda, Gunicorn ishchilari mehmon so'rovlari bilan band bo'lib qoladi. Natijada oshxona KDS ekrani va ofitsiantlar panelidagi `/api/kds/orders/` so'rovlarining kechikishi (p95 latency) **1643 ms** gacha ko'tarilib ketadi va oshxonada qotishlar yuzaga keladi.
2. **Kesh qamrovi:** Menyu qisman keshlangani bilan, `tma_catalog`, `tma_ar_menu` va shartli HTTP kesh sarlavhalari (`ETag`, `Last-Modified`, `304 Not Modified`) to'liq o'rnatilmagan.
3. **Statik va Media aktivlar:** Caddy'da faqat `/static/react/assets/` uchun `immutable` kesh yozilgan. Yangi Resto-Admin SPA (`/static/admins/`) va Whitenoise bilan yig'ilgan hash'li fayllar uchun abadiy kesh (`immutable, max-age=31536000`) ulanmagan.

---

## 2. Loop Engineering va 11 Tomonlama Tahlil

1. **Mijoz (Mehmon):** Stolga o'tirib QR-kodni skanerlaganda menyu va 3D taomlar ekrani ko'z ochib yumguncha (< 250 ms) ochiladi. Internet sekin bo'lsa ham brauzer keshidan darhol ko'rinadi.
2. **Tadbirkor / Biznes Egasi:** Restoranda 500 kishilik to'y yoki gavjum oqshom bo'lganda ham tizim "qulab tushmaydi" (zero crash). Buyurtmalar yo'qolmaydi, kassa to'xtamaydi.
3. **CEO:** Tizim 1000+ bir vaqtda kiruvchi (concurrent) foydalanuvchiga dosh beradigan sanoat standarti arxitekturasiga ega bo'ladi.
4. **Product Manager:** Mehmonlar oqimi xodimlar faoliyatiga zarracha xalaqit bermaydi. Har ikkala oqim alohida mustaqil magistrallar orqali o'tadi.
5. **Kiberxavfsizlik:** Mehmon tarmog'idan keluvchi DoS / yuklama xurujlari ichki oshxona va xodimlar servislarini (`web-staff`) to'xtatib qo'ya olmaydi (Network Isolation).
6. **Senior Engineer:** Clean Architecture — infratuzilma darajasida ajratish (`web` va `web-staff`), Python kodiga ortiqcha murakkablik kiritmasdan, bir xil image asosida konteynerizatsiya.
7. **Data Analytics:** Kesh samaradorligi (hit/miss) va javob vaqtlari o'lchanadi.
8. **Frontend Developer:** `immutable` Caddy kesh qoidalari tufayli qayta tashrif buyuruvchilar 0 bayt tarmoq trafigi bilan sahifalarni darhol ochadi.
9. **Backend Developer:** PostgreSQL bazasiga tushadigan `SELECT` yuklamasi 80-90% ga kamayadi. Redis / File kesh to'g'ri ishlaydi.
10. **UI/UX Designer:** "Yuklanmoqda..." aylanmasi ko'rinmaydi, interfeys jonli va tezkor seziladi.
11. **3D Designer:** GLB va USDZ 3D modellari Caddy tomonidan to'g'ri `Cache-Control: public, max-age=86400` va siqish bilan uzatiladi.

---

## 3. Texnik Talablar va Reja

### 3.1. Bosqich 0.6: Mehmon va Xodim Konteynerlarini Ajratish (Deploy)
- **`deploy/docker-compose.yml`:**
  - `web` xizmati: Mehmon so'rovlari uchun (`2–3 ishchi`).
  - `web-staff` xizmati: Xodimlar va ma'muriyat uchun (`2 ishchi × 4 oqim`). Bir xil image, bir xil konfiguratsiya, alohida port (`web-staff:8000`). Sog'lomlik tekshiruvi (healthcheck) ikkalasida ham mustaqil ishlaydi.
- **`deploy/Caddyfile`:**
  - Statik aktivlar regexini yangilash:
    ```caddyfile
    @hashed path_regexp hashed (^/static/(admins|react)/.+-[A-Za-z0-9_-]{8}\.(js|css)$|^/static/.+\.[0-9a-f]{12}\.(css|js|woff2)$)
    handle @hashed {
        root * /srv
        header Cache-Control "public, max-age=31536000, immutable"
        file_server
    }
    ```
  - Xodimlar marshrutlarini `web-staff:8000` ga yo'naltirish:
    `/api/restaurant/admin/*`, `/api/kds/*`, `/api/v1/restaurant/orders*`, `/api/v1/restaurant/tables*`, `/api/v1/restaurant/calls*`, `/api/v1/restaurant/finance*`, `/seller/*`, `/admin*`, `/kds*`, `/kitchen*`, `/waiter*`, `/arrival*`, `/ra/*` -> `web-staff:8000`.
  - Qolgan barcha yo'llar (mehmon menyusi `/menu/*`, `/tma/*`, `/welcome/`, `/catalog/`, `/cart/`, `/checkout/`, `/nfc/*`, `/m/*`) -> `web:8000`.
  - Subdomen qo'llab-quvvatlovi: Agar `{$RESTO_ADMIN_HOST}` berilgan bo'lsa, to'g'ridan-to'g'ri `web-staff:8000` ga yo'naltiriladi.
- **`deploy/.env.production.example`:**
  - `RESTO_ADMIN_HOST=` sozlamasini tushuntirish bilan kiritish.

### 3.2. Bosqich 0.7: Mehmon Menyusini Kengaytirilgan Keshlash va Avto-Invalidatsiya
- **`products/menu_cache.py` kengaytmasi:**
  - `tma_catalog`, `tma_ar_menu` va API menyulari uchun umumiy kesh funksiyasi.
  - Har bir menyu keshiga `menu_version` bog'lanadi.
  - Taom narxi, nomi, stop-list (`is_available`), rasmi yoki 3D modeli o'zgarganda signal orqali `menu_version` oshiriladi va kesh bir soniyada yangilanadi.
- **HTTP Shartli Keshlash (Conditional Headers):**
  - `/api/v1/restaurant/menu/` va `/api/restaurant/admin/v1/menu/products/` so'rovlariga `ETag: W/"<version>-<shop_id>"` qo'shiladi.
  - Agar brauzer `If-None-Match` bilan kelsa va versiya o'zgarmagan bo'lsa -> `304 Not Modified` (0 bayt payload, 5 ms javob).
- **Avtomatlashtirilgan Testlar:**
  - `backend/products/test_menu_cache.py` ni kengaytirish (ETag, 304 Not Modified, stop-list tezkor yangilanishi, 60 ta taom kesh o'tkazuvchanligi testi).

---

## 4. Qabul Mezonlari (Acceptance Criteria)

1. `deploy/docker-compose.yml` va `deploy/Caddyfile` sintaktik va mantiqiy jihatdan 100% to'g'ri bo'lishi.
2. Mehmon menyusi va xodimlar marshrutlari to'liq ajratilgan holda proksilanishi.
3. Kesh invalidatsiyasi test orqali isbotlanishi: taom narxi o'zgargach mehmon menyusida kechikishsiz aks etishi.
4. Django barcha 535+ ta testlari yashil (`OK`) bo'lib qolishi.
5. Hech qanday `.env` fayliga tegilmasligi va remote git push qilinmasligi.
