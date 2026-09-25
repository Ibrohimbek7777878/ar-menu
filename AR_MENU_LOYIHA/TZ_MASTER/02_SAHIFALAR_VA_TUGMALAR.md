# QISM II — SAHIFALAR, TUGMALAR VA JARAYON ZANJIRLARI

> **Bu qism eng muhim.** Har bir sahifa, har bir tugma, tugma bosilganda
> qaysi funksiya ishga tushishi va keyingi jarayon to'liq yozilgan.
> Dasturchi/AI bu qismni o'qib, hech narsa o'ylab topmasdan kod yoza oladi.

---

## 0. SAHIFALAR XARITASI (butun tizim)

```
ARMENU TIZIMI
│
├── 👤 MIJOZ (PWA / Telegram Mini App)          — auth YO'Q
│   ├── M-01  QR kirish (redirect)
│   ├── M-02  Menyu (bosh sahifa)
│   ├── M-03  Kategoriya
│   ├── M-04  Taom kartochkasi
│   ├── M-05  🎯 AR ko'rish (kamera)
│   ├── M-06  Savat
│   ├── M-07  Buyurtma tasdiqlash
│   ├── M-08  Buyurtma holati (real-time)
│   ├── M-09  Chaqiruv (ofitsiant/hisob/suv)
│   ├── M-10  Hisob va to'lov
│   ├── M-11  Choychaqa (tips)
│   ├── M-12  Otziv va reyting
│   ├── M-13  🤖 AI chatbot (yordamchi)
│   └── M-14  Mening buyurtmalarim (tarix)
│
├── 🧑‍🍳 OFITSIANT (PWA)                          — PIN auth
│   ├── O-01  Kirish (PIN)
│   ├── O-02  Bosh ekran (yangi buyurtmalar)
│   ├── O-03  Buyurtma tafsiloti
│   ├── O-04  Mening stollarim
│   ├── O-05  2D zal plani
│   ├── O-06  Chaqiruvlar
│   ├── O-07  Buyurtma kiritish (ofitsiant o'zi)
│   ├── O-08  Hisob berish
│   └── O-09  Mening statistikam
│
├── 🍳 KDS — OSHXONA MONITORI (TV)              — token auth
│   └── K-01  Buyurtmalar taxtasi (kanban)
│
├── 💵 KASSA                                     — PIN auth
│   ├── S-01  Ochiq hisoblar
│   ├── S-02  To'lov qabul qilish
│   └── S-03  Smena yopish
│
├── 👨‍💼 ADMIN (desktop + mobil)                  — login auth
│   ├── A-01  Dashboard (real-time)
│   ├── A-02  Menyu boshqaruvi
│   ├── A-03  Taom tahrirlash
│   ├── A-04  🎯 3D model boshqaruvi
│   ├── A-05  Stollar va QR
│   ├── A-06  Zal plani redaktori
│   ├── A-07  Xodimlar
│   ├── A-08  Buyurtmalar (jonli + tarix)
│   ├── A-09  Hisobotlar
│   ├── A-10  AR analitika
│   ├── A-11  Menyu-injiniring
│   ├── A-12  Otzivlar
│   ├── A-13  Sodiqlik sozlamalari
│   ├── A-14  Fiskal sozlamalar
│   ├── A-15  Tarjima boshqaruvi
│   ├── A-16  To'lov sozlamalari
│   ├── A-17  Brending
│   ├── A-18  Tarif va to'lov
│   └── A-19  Sozlamalar
│
└── 🔧 SUPER-ADMIN (platforma egasi)             — 2FA auth
    ├── P-01  Restoranlar ro'yxati
    ├── P-02  3D kutubxona boshqaruvi
    ├── P-03  Moliya (obunalar)
    ├── P-04  Tizim salomatligi (health)
    ├── P-05  AI xarajatlari
    └── P-06  Global sozlamalar
```

---

# 1. 👤 MIJOZ SAHIFALARI

## M-01 — QR KIRISH (redirect sahifa)

**URL:** `GET /t/<uuid:qr_token>`
**Auth:** yo'q
**Fayl:** `apps/guest/views.py::table_entry`

### Jarayon zanjiri

```
Mijoz QR skanerlaydi
   │
   ▼
[1] GET /t/a3f2c891-...
   │
   ▼
[2] views.table_entry(request, qr_token)
   │
   ├─ [2.1] Table.objects.select_related('hall__restaurant')
   │          .filter(qr_token=qr_token, is_active=True).first()
   │
   ├─ [2.2] Topilmadi? → 404 sahifa "QR kod yaroqsiz"
   │
   ├─ [2.3] Restaurant.is_active=False? → "Restoran vaqtincha yopiq"
   │
   ├─ [2.4] Guest aniqlash:
   │          device_token = request.COOKIES.get('armenu_device')
   │          yo'q bo'lsa → uuid4() generatsiya, cookie o'rnatish (1 yil)
   │          Guest.objects.get_or_create(restaurant, device_token)
   │
   ├─ [2.5] GuestSession yaratish/yangilash:
   │          session = GuestSession(guest, table, started_at=now)
   │          → Redis: session_key = f"gs:{restaurant_id}:{table_id}:{guest_id}"
   │
   ├─ [2.6] Til aniqlash:
   │          1. URL ?lang=en   2. Cookie armenu_lang
   │          3. Accept-Language header   4. Restaurant.default_lang
   │
   ├─ [2.7] Analitika: TableScan(table, guest, ts) — async task
   │
   ├─ [2.8] WS xabar: rest_<id>_admin → {"type":"table.scanned", "table":5}
   │          (admin dashboardda "Stol 5 skanerlandi" ko'rinadi)
   │
   ▼
[3] redirect(f"/m/{restaurant.slug}/?t={table.id}&s={session_id}")
   │
   ▼
[4] M-02 Menyu sahifasi ochiladi
```

### Xato holatlari

| Holat | HTTP | Foydalanuvchi ko'radi |
|---|---|---|
| QR topilmadi | 404 | "QR kod yaroqsiz. Ofitsiantga murojaat qiling." |
| Restoran nofaol | 403 | "Restoran vaqtincha xizmat ko'rsatmayapti" |
| Stol nofaol | 403 | "Bu stol vaqtincha ishlamayapti" |
| Tarif tugagan | 402 | Restoran adminiga xabar; mijozga oddiy menyu |

---

## M-02 — MENYU (bosh sahifa)

**URL:** `GET /m/<slug>/?t=<table_id>`
**Fayl:** `templates/guest/menu.html` + `static/guest/js/menu.js`

### Ekran tuzilishi

```
┌─────────────────────────────────────────┐
│ [Logo]  Restoran nomi      [🇺🇿▾] [🌙]  │ ← Header (sticky)
│         Stol №5                          │
├─────────────────────────────────────────┤
│ 🔍 Qidiruv...                            │
├─────────────────────────────────────────┤
│ [Hammasi][Salatlar][Issiq][Ichimlik]... │ ← Kategoriya (scroll)
├─────────────────────────────────────────┤
│ 🏷 Filtr: [Halol][Vegan][Achchiqsiz]    │
├─────────────────────────────────────────┤
│  ┌────────────────────────────────────┐ │
│  │ [rasm]  Osh (Palov)          🎯AR │ │ ← Taom karta
│  │         Toshkent oshi, 400g        │ │
│  │         45 000 so'm      [+ Savat] │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │ [rasm]  Manti                🎯AR │ │
│  │  🔥 HIT      38 000 so'm  [+Savat] │ │
│  └────────────────────────────────────┘ │
│              ...                         │
├─────────────────────────────────────────┤
│ [🛒 Savat: 2 ta · 83 000]      [🤖]     │ ← Pastki panel (sticky)
│ [🔔 Chaqiruv]                            │
└─────────────────────────────────────────┘
```

### Tugmalar → funksiyalar

| # | Tugma | JS funksiya | Backend | Keyingi jarayon |
|---|---|---|---|---|
| 1 | 🇺🇿 Til | `switchLang(code)` | `POST /api/guest/lang/` | Cookie saqlanadi → sahifa qayta render → **barcha matn tarjima qilinadi** |
| 2 | 🌙 Tema | `toggleTheme()` | — | `localStorage.theme`, `data-theme` atributi |
| 3 | 🔍 Qidiruv | `searchDishes(q)` | `GET /api/menu/search/?q=` | Debounce 300ms → natija ro'yxati |
| 4 | Kategoriya | `filterCategory(id)` | — (lokal) | Ro'yxat filtrlanadi, URL `#cat-3` |
| 5 | 🏷 Filtr | `applyDietFilter(tags)` | — (lokal) | `dish.diet_tags` bo'yicha filtr |
| 6 | Taom kartasi | `openDish(id)` | `GET /api/menu/dish/<id>/` | **M-04** modal ochiladi |
| 7 | 🎯 **AR** | `openAR(dishId)` | `GET /api/ar/<dish_id>/` | **M-05** — quyida batafsil |
| 8 | + Savat | `addToCart(dishId, 1)` | — (lokal) | Savat yangilanadi, toast, upsell tekshiriladi |
| 9 | 🛒 Savat | `openCart()` | — | **M-06** |
| 10 | 🔔 Chaqiruv | `openCallMenu()` | — | **M-09** |
| 11 | 🤖 AI | `openAIChat()` | — | **M-13** |

### Ma'lumot yuklash (birinchi kirish)

```javascript
// static/guest/js/menu.js
async function initMenu() {
  // 1. Menyu ma'lumotlari (bitta so'rov, hammasi)
  const data = await fetch(`/api/menu/${SLUG}/?lang=${LANG}`).then(r=>r.json());
  //    → {categories:[...], dishes:[...], restaurant:{...}, upsell_rules:[...]}
  //    ⚡ Cache: Redis 60s, ETag, brauzer localStorage 5 daq

  // 2. Render (virtual scroll agar 100+ taom)
  renderCategories(data.categories);
  renderDishes(data.dishes);

  // 3. Savatni tiklash
  restoreCart();                  // localStorage

  // 4. WebSocket ulanish (buyurtma holati uchun)
  connectWS(`/ws/guest/${SESSION_ID}/`);

  // 5. Rasmlarni lazy-load (IntersectionObserver)
  initLazyImages();

  // 6. 3D poster'larni oldindan yuklash (faqat ko'rinadiganlar)
  prefetchARPosters();
}
```

### ⚡ Ishlash talablari

| Metrika | Maqsad |
|---|---|
| First Contentful Paint | < 1,2 s (3G) |
| Time to Interactive | < 2,5 s |
| Menyu API javob | < 150 ms (p95) |
| Rasm hajmi | < 60 KB (WebP, 400px) |
| Umumiy sahifa (birinchi) | < 400 KB |

---

## M-04 — TAOM KARTOCHKASI (modal)

**URL:** `GET /api/menu/dish/<id>/?lang=uz`

```
┌─────────────────────────────────────────┐
│                                    [✕]  │
│  ┌───────────────────────────────────┐  │
│  │        [Katta rasm / 3D]          │  │
│  │                          [🎯 AR]  │  │ ← AR tugmasi rasm ustida
│  └───────────────────────────────────┘  │
│  Osh (Palov)                            │
│  ⭐ 4.8 (127 ta baho)   🔥 HIT          │
│                                          │
│  Toshkent usulida tayyorlangan palov,   │
│  qo'y go'shti, sabzi, guruch...         │
│                                          │
│  ⏱ 20 daqiqa    ⚖️ 400 g               │
│  🏷 Halol · Achchiq emas                │
│  ⚠️ Allergenlar: yo'q                   │
│                                          │
│  Tarkibi: guruch, qo'y go'shti, sabzi,  │
│           piyoz, zira, no'xat           │
│                                          │
│  ┌─────────────────────────────────┐    │
│  │ Qo'shimcha:                     │    │
│  │ ☐ Qo'shimcha go'sht  +25 000   │    │
│  │ ☐ Achchiq qilib      +0        │    │
│  └─────────────────────────────────┘    │
│                                          │
│  Izoh: [_______________________]        │
│                                          │
│  [−] 1 [+]         45 000 so'm          │
│  ┌─────────────────────────────────┐    │
│  │      🛒 SAVATGA QO'SHISH        │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### Tugmalar

| Tugma | Funksiya | Jarayon |
|---|---|---|
| 🎯 AR | `openAR(dishId)` | → **M-05** |
| ☐ Qo'shimcha | `toggleModifier(id)` | Narx qayta hisoblanadi (real-time) |
| − / + | `changeQty(delta)` | `Math.ceil()`, min 1, maks 99 |
| Izoh | — | Maks 200 belgi |
| 🛒 Savatga | `addToCart(payload)` | Savatga qo'shiladi → **upsell tekshiruvi** → toast → modal yopiladi |

### Upsell mantiq (savatga qo'shilgandan keyin)

```javascript
function checkUpsell(addedDish) {
  // Qoidalar admin panelda sozlanadi (A-02)
  const rules = MENU_DATA.upsell_rules;
  //   [{trigger_dish_ids:[1,2], suggest_dish_id:15, text_uz:"...", ...}]

  const rule = rules.find(r => r.trigger_dish_ids.includes(addedDish.id));
  if (!rule) return;

  // Savatda allaqachon bormi?
  if (cart.some(i => i.dish_id === rule.suggest_dish_id)) return;

  showUpsellToast({
    text: rule[`text_${LANG}`],       // "Oshga achchiq-chuchuk salat?"
    dish: getDish(rule.suggest_dish_id),
    onAccept: () => { addToCart(rule.suggest_dish_id, 1); trackUpsell(rule.id, true); },
    onDismiss: () => trackUpsell(rule.id, false)
  });
}
```

> 📊 **Analitika:** har upsell ko'rsatilishi va qabul qilinishi yoziladi →
> A-10 da "Upsell konversiyasi: 34%" ko'rinadi.

---

## M-05 — 🎯 AR KO'RISH (eng muhim sahifa)

**URL:** `GET /api/ar/<dish_id>/`
**Fayl:** `static/guest/js/ar.js`

### To'liq jarayon zanjiri

```
[1] Mijoz "🎯 AR" tugmasini bosadi
    │
    ▼
[2] openAR(dishId) — static/guest/js/ar.js
    │
    ├─ [2.1] Qurilma imkoniyatini tekshirish
    │         const support = await detectARSupport();
    │         // iOS Safari + ARKit → 'quick-look'
    │         // Android Chrome + ARCore → 'scene-viewer'
    │         // WebXR mavjud → 'webxr'
    │         // hech biri → '3d-only'
    │
    ├─ [2.2] GET /api/ar/<dish_id>/  →
    │         {
    │           "glb":  "https://cdn.../dish_15.glb",
    │           "usdz": "https://cdn.../dish_15.usdz",
    │           "poster":"https://cdn.../dish_15.webp",
    │           "scale_m": 0.32,          // real o'lcham metrda
    │           "name": "Osh (Palov)",
    │           "ready": true
    │         }
    │
    ├─ [2.3] ready=false? → "3D model tayyorlanmoqda" + oddiy rasm
    │
    ├─ [2.4] Modal ochiladi, <model-viewer> render qilinadi:
    │
    │   <model-viewer
    │     src="dish_15.glb"                  ← Android/web
    │     ios-src="dish_15.usdz"             ← iOS
    │     poster="dish_15.webp"
    │     ar ar-modes="webxr scene-viewer quick-look"
    │     ar-scale="fixed"                   ⚡ REAL O'LCHAM (auto EMAS)
    │     ar-placement="floor"
    │     camera-controls                    ⚡ sichqoncha/barmoq bilan
    │     touch-action="pan-y"
    │     shadow-intensity="1"
    │     environment-image="neutral"
    │     loading="eager">
    │       <button slot="ar-button">📱 Stolga qo'yib ko'rish</button>
    │   </model-viewer>
    │
    ├─ [2.5] Yuklanish kuzatuvi:
    │         'progress' → progress bar
    │         'load'     → ARView yozuvi boshlanadi (timer start)
    │         'error'    → fallback: oddiy rasm + "3D yuklanmadi"
    │
    ▼
[3] Mijoz "📱 Stolga qo'yib ko'rish" bosadi
    │
    ├─ iOS  → AR Quick Look ochiladi (tizim ilovasi), .usdz
    ├─ And. → Scene Viewer ochiladi, .glb
    └─ WebXR→ Sahifa ichida kamera
    │
    ▼
[4] Kamera ochiladi → yuza (stol/pol) aniqlanadi → taom qo'yiladi
    │  Mijoz: barmoq bilan aylantiradi, yaqinlashtiradi, yuradi
    │  ⚡ ar-scale="fixed" → REAL o'lchamda (lagan Ø32 sm = 32 sm)
    │
    ▼
[5] Mijoz AR'dan chiqadi
    │
    ├─ [5.1] POST /api/ar/view/  {dish_id, session_id, duration_sec, mode}
    │         → ARView modeliga yoziladi (async, Celery/thread emas — Redis queue)
    │
    ├─ [5.2] Modal ichida: [🛒 SAVATGA QO'SHISH] tugmasi ko'rinadi
    │         (⚡ AR ko'rgandan keyin darhol buyurtma imkoniyati — konversiya!)
    │
    ▼
[6] Savatga qo'shsa → OrderItem.ar_viewed = True
    │
    ▼
[7] Analitika: A-10 da "AR ko'rgan mijoz cheki: 68 000 vs ko'rmagan: 52 000 (+31%)"
```

### Fallback zanjiri (muhim!)

```
1. To'liq AR (WebXR/QuickLook/SceneViewer)   ← eng yaxshi
   ↓ qo'llab-quvvatlanmasa
2. 3D aylantirish (<model-viewer> AR'siz)     ← yaxshi
   ↓ WebGL yo'q / sekin qurilma
3. 360° rasm karusel (24 kadr)                ← qoniqarli
   ↓ yo'q
4. Oddiy yuqori sifatli rasm                  ← minimal
```

### 3D fayl talablari (qat'iy)

| Parametr | Chegara | Nima uchun |
|---|---|---|
| GLB hajmi | **≤ 3 MB** | 3G da 8 soniyada yuklanadi |
| USDZ hajmi | **≤ 5 MB** | iOS Quick Look limiti |
| Poligon soni | ≤ 60 000 tri | Eski telefonlar |
| Tekstura | ≤ 1024×1024, WebP/KTX2 | Xotira |
| Materiallar | ≤ 4 ta | Render tezligi |
| Siqish | **Draco** (glTF), meshopt | Hajm −70% |
| Real o'lcham | **metrda, aniq** | AR 1:1 chiqishi uchun |
| Markaz nuqta | Model tagi (Y=0) | Stolga to'g'ri qo'yiladi |

---

## M-06 — SAVAT

```
┌─────────────────────────────────────────┐
│ ← Savat                            [✕]  │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │[rsm] Osh (Palov)                    │ │
│ │      + Qo'shimcha go'sht            │ │
│ │      "achchiq qilmang"              │ │
│ │      [−] 2 [+]      140 000 [🗑]   │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │[rsm] Achchiq-chuchuk  [−]1[+] 18000 │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ 💡 Bularni ham oling:                   │
│ [Non 8000] [Choy 5000] [Ayron 12000]   │ ← cross-sell
├─────────────────────────────────────────┤
│ Taomlar:                    158 000     │
│ Xizmat (10%):                15 800     │
│ ─────────────────────────────────────   │
│ JAMI:                       173 800     │
├─────────────────────────────────────────┤
│ Umumiy izoh: [__________________]       │
│                                          │
│ ┌─────────────────────────────────────┐ │
│ │      ✅ BUYURTMA BERISH             │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

| Tugma | Funksiya | Jarayon |
|---|---|---|
| − / + | `updateQty(idx, delta)` | localStorage → jami qayta hisob |
| 🗑 | `removeItem(idx)` | Tasdiq → o'chirish |
| Cross-sell | `addToCart(id)` | Qo'shiladi |
| ✅ Buyurtma | `submitOrder()` | ⬇️ quyida |

### `submitOrder()` — to'liq zanjir

```
[1] submitOrder() bosildi
    │
    ├─ [1.1] Frontend validatsiya:
    │         • savat bo'shmi? → "Savat bo'sh"
    │         • miqdorlar butun sonmi? → Math.ceil()
    │         • summa > 0?
    │
    ├─ [1.2] Tugma bloklanadi (double-submit oldini olish)
    │         idempotency_key = uuid4()  ← ⚡ MUHIM
    │
    ▼
[2] POST /api/orders/create/
    Headers: X-Idempotency-Key: <uuid>
    Body: {
      session_id, table_id,
      items: [{dish_id, qty, modifiers:[], note, ar_viewed}],
      note: "umumiy izoh"
    }
    │
    ▼
[3] Backend: apps/orders/views.py::create_order
    │
    ├─ [3.1] Idempotency tekshiruvi (Redis, TTL 24s)
    │         key mavjud? → mavjud order qaytariladi (dublikat yo'q)
    │
    ├─ [3.2] Validatsiya (serializers.py):
    │         • Table faol va shu restoranga tegishlimi?
    │         • Har dish faol va shu restoranmi? (⚡ tenant tekshiruvi)
    │         • Dish.is_available=True? (stop-list)
    │         • Narx SERVERDA qayta hisoblanadi ⚡ (frontendga ishonilmaydi)
    │         • Modifikatorlar shu taomga tegishlimi?
    │
    ├─ [3.3] Transaksiya:
    │         with transaction.atomic():
    │             order = Order.objects.create(...)
    │             OrderItem.objects.bulk_create([...])
    │             order.total = calculated_total
    │             order.number = next_order_number(restaurant)  # kunlik #001
    │             order.save()
    │
    ├─ [3.4] Post-commit hooks (transaction.on_commit):
    │         ├─ WS → rest_<id>_kds:      {"type":"order.new", order:{...}}
    │         ├─ WS → rest_<id>_waiters:  {"type":"order.new", table:5, ...}
    │         ├─ WS → rest_<id>_admin:    {"type":"order.new", ...}
    │         ├─ WS → guest_<session>:    {"type":"order.created", id, number}
    │         ├─ Telegram push (ofitsiantga)      → queue
    │         ├─ Printer (oshxona cheki)          → queue
    │         └─ Analitika event                  → queue
    │
    ▼
[4] Javob: 201 {order_id, number:"#047", eta_min:18, status:"new"}
    │
    ▼
[5] Frontend:
    ├─ Savat tozalanadi (localStorage)
    ├─ Animatsiya: ✅ "Buyurtmangiz qabul qilindi!"
    └─ redirect → M-08 (buyurtma holati)
```

### ⚠️ Kritik xato holatlari

| Xato | Kod | Foydalanuvchi ko'radi | Tizim harakati |
|---|---|---|---|
| Taom tugagan | 409 | "Osh tugadi. Boshqa tanlang." | Savatdan olib tashlanadi |
| Narx o'zgargan | 409 | "Narxlar yangilandi. Tekshiring." | Savat yangilanadi |
| Internet yo'q | — | "Ulanish yo'q. Qayta urinilmoqda..." | 3× retry, keyin offline queue |
| Server xato | 500 | "Xatolik. Ofitsiantni chaqiring." | Sentry'ga log, tugma qayta faol |
| Dublikat | 200 | (jim) mavjud buyurtma ko'rsatiladi | Idempotency ishladi |

---

## M-08 — BUYURTMA HOLATI (real-time)

```
┌─────────────────────────────────────────┐
│ Buyurtma #047        Stol 5             │
├─────────────────────────────────────────┤
│                                          │
│  ✅────────●────────○────────○           │
│  Qabul  Tayyor-   Tayyor   Berildi      │
│  qilindi lanmoqda                        │
│                                          │
│  ⏱ Taxminan 14 daqiqa qoldi             │
│                                          │
├─────────────────────────────────────────┤
│ Osh (Palov) × 2            140 000      │
│ Achchiq-chuchuk × 1         18 000      │
│ ─────────────────────────────────────   │
│ JAMI                       173 800      │
├─────────────────────────────────────────┤
│ [➕ Yana buyurtma]  [🔔 Chaqiruv]        │
│ [💳 Hisob so'rash]                       │
└─────────────────────────────────────────┘
```

### WebSocket orqali holat yangilanishi

```javascript
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  switch (msg.type) {
    case 'order.status':          // new → cooking → ready → served
      updateProgressBar(msg.status);
      updateETA(msg.eta_min);
      if (msg.status === 'ready') {
        vibrate([200,100,200]);
        showToast("🎉 Buyurtmangiz tayyor!");
        playSound('ready.mp3');
      }
      break;
    case 'order.item_unavailable': // taom tugab qoldi
      showAlert(`${msg.dish_name} tugadi. Ofitsiant keladi.`);
      break;
    case 'bill.ready':
      redirect('/bill/');
      break;
  }
};

// ⚡ WS uzilsa — avtomatik qayta ulanish (exponential backoff)
// + fallback: har 15 soniyada polling GET /api/orders/<id>/status/
```

---

## M-09 — CHAQIRUV

```
┌─────────────────────────────────────────┐
│ Nima kerak?                        [✕]  │
├─────────────────────────────────────────┤
│  ┌───────────┐  ┌───────────┐           │
│  │    🧑‍🍳     │  │    💳     │           │
│  │ Ofitsiant │  │  Hisob    │           │
│  └───────────┘  └───────────┘           │
│  ┌───────────┐  ┌───────────┐           │
│  │    💧     │  │    🧹     │           │
│  │   Suv     │  │ Tozalash  │           │
│  └───────────┘  └───────────┘           │
└─────────────────────────────────────────┘
```

**Zanjir:**
```
Tugma → POST /api/calls/ {table_id, type}
      → Call.objects.create(...)
      → WS → rest_<id>_waiters: {"type":"call.new", table:5, call_type:"water"}
      → Ofitsiant telefonida: 🔔 tovush + vibratsiya + push
      → Mijozga: "Ofitsiant chaqirildi ✓" (30s cooldown, spam oldini olish)
      → Ofitsiant "Bajardim" bossa → Call.resolved=True → mijozga bildirishnoma
```

⚡ **Cooldown:** bir stol 60 soniyada bir marta chaqira oladi (Redis rate-limit).

---

## M-10 — HISOB VA TO'LOV

```
┌─────────────────────────────────────────┐
│ Hisob — Stol 5                          │
├─────────────────────────────────────────┤
│ Osh × 2                     140 000     │
│ Achchiq-chuchuk × 1          18 000     │
│ Choy × 2                     10 000     │
│ ─────────────────────────────────────   │
│ Taomlar                     168 000     │
│ Xizmat 10%                   16 800     │
│ Chegirma (promo)            −10 000     │
│ ═════════════════════════════════════   │
│ JAMI                        174 800     │
├─────────────────────────────────────────┤
│ 👥 [Hisobni bo'lish]                    │
├─────────────────────────────────────────┤
│ To'lov usuli:                            │
│ ( ) 💵 Naqd (ofitsiantga)               │
│ (•) 💳 Payme                             │
│ ( ) 💳 Click                             │
│ ( ) 💳 Uzum                              │
├─────────────────────────────────────────┤
│ 🎁 Bonusdan foydalanish: 12 000 [☐]    │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │        💳 TO'LASH — 174 800         │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### To'lov zanjiri (Payme misolida)

```
[1] "TO'LASH" bosildi
    ▼
[2] POST /api/payments/create/ {order_id, provider:"payme", use_bonus:false}
    ▼
[3] Backend (apps/payments/services.py):
    ├─ Payment.objects.create(status='pending', provider='payme')
    ├─ paytechuz orqali invoice yaratish
    └─ javob: {payment_url: "https://checkout.paycom.uz/..."}
    ▼
[4] Frontend: window.location = payment_url
    ▼
[5] Mijoz Payme ilovasida to'laydi
    ▼
[6] Payme → bizning webhook: POST /api/payments/webhook/payme/
    ├─ Imzo tekshiriladi (⚡ SHART)
    ├─ Idempotency (transaction_id)
    ├─ Payment.status = 'paid'
    ├─ Order.status = 'paid'
    ├─ 🧾 FISKAL CHEK: OFD'ga yuborish (async, retry bilan)
    ├─ 🎁 Bonus hisoblash: Guest.bonus += total × cashback%
    ├─ WS → rest_<id>_cashier, _waiters, _admin
    └─ WS → guest_<session>: {"type":"payment.success"}
    ▼
[7] Mijoz qaytadi → "✅ To'lov qabul qilindi"
    ├─ Fiskal chek ko'rsatiladi (QR + raqam)
    ├─ Telegram'ga chek yuborish taklifi
    ▼
[8] → M-11 (choychaqa) → M-12 (otziv)
```

### ⚠️ To'lov xavfsizligi (qat'iy)

1. **Summa faqat serverda hisoblanadi** — frontenddan kelgan summa **ishonilmaydi**
2. **Webhook imzosi tekshiriladi** — har provayder uchun
3. **Idempotency** — bitta to'lov 2 marta hisoblanmaydi
4. **Timeout** — 15 daqiqada to'lanmasa `expired`
5. **Reconciliation** — kuniga 1 marta provayder bilan solishtirish (cron)
6. **PCI DSS** — karta ma'lumotlari **bizda saqlanmaydi** (faqat provayder)

---

## M-11 — CHOYCHAQA (TIPS) ⚡

```
┌─────────────────────────────────────────┐
│ Xizmat yoqdimi?                          │
│                                          │
│         ┌─────────┐                      │
│         │  [foto] │  Dilshod             │
│         └─────────┘  Sizning ofitsiantingiz│
│                                          │
│  [ 5% ]  [ 10% ]  [ 15% ]  [Boshqa]     │
│   8 740   17 480   26 220                │
│                                          │
│  ┌─────────────────────────────────────┐ │
│  │       💝 CHOYCHAQA BERISH           │ │
│  └─────────────────────────────────────┘ │
│           [O'tkazib yuborish]            │
└─────────────────────────────────────────┘
```

> ⚡ **Bu funksiya strategik muhim:** ofitsiantlar qo'shimcha daromad oladi →
> tizimni **o'zlari targ'ib qiladi** → xodim qarshiligi yo'qoladi (SaaS #1 o'ldiruvchi).

**Zanjir:** `POST /api/tips/` → `Tip(order, staff, amount)` → to'lov →
`Staff.tips_balance += amount` → ofitsiantga push: *"Dilshod, sizga 17 480 so'm choychaqa! 🎉"*

---

## M-12 — OTZIV VA REYTING ⭐

```
┌─────────────────────────────────────────┐
│ Bizni baholang                           │
│                                          │
│      ⭐  ⭐  ⭐  ⭐  ⭐                   │
│                                          │
│  Taom:     ⭐⭐⭐⭐⭐                     │
│  Xizmat:   ⭐⭐⭐⭐⭐                     │
│  Muhit:    ⭐⭐⭐⭐☆                     │
│                                          │
│  Izoh: [_________________________]      │
│                                          │
│  ┌─────────────────────────────────────┐ │
│  │           YUBORISH                  │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### ⭐ Otziv filtri mantiq (juda muhim sotuv argumenti)

```
Yuborildi
   │
   ├─ Baho ≥ 4 ⭐ ?
   │    │
   │    ├─ HA → "Rahmat! 🎉"
   │    │       "Google'da ham baholaysizmi?" [Google'ga o'tish]
   │    │       → Google/Yandex sharh sahifasiga link
   │    │       ⚡ Restoranning ommaviy reytingi KO'TARILADI
   │    │
   │    └─ YO'Q (1-3⭐) → "Uzr so'raymiz. Nima yoqmadi?"
   │            → Faqat ADMIN ko'radi (ichki)
   │            → Adminga darhol push: "❗ Stol 5 dan 2⭐ baho"
   │            → Admin javob yozishi mumkin
   │            ⚡ Ommaviy internetga CHIQMAYDI
   │
   ▼
Review saqlanadi, A-12 da ko'rinadi
```

> 💰 **Sotuv argumenti:** *"Google reytingingiz ko'tariladi, salbiy sharhlar
> internetga chiqmasdan sizga keladi."* — restoran egalari buni juda qadrlaydi.

---

## M-13 — 🤖 AI CHATBOT (yordamchi)

```
┌─────────────────────────────────────────┐
│ 🤖 Yordamchi                       [✕]  │
├─────────────────────────────────────────┤
│                                          │
│  🤖 Salom! Menyu bo'yicha savolingiz    │
│     bormi? Men yordam beraman.          │
│                                          │
│              Achchiq bo'lmagan nima bor? │ 👤
│                                          │
│  🤖 Achchiq bo'lmagan taomlar:          │
│     • Osh (Palov) — 45 000              │
│     • Manti — 38 000                     │
│     • Chuchvara — 32 000                 │
│     [Oshni ko'rish] [Mantini ko'rish]   │
│                                          │
│              Norin nima?                 │ 👤
│                                          │
│  🤖 Norin — an'anaviy o'zbek taomi.     │
│     Qo'lda kesilgan xamir va ot go'shti │
│     bilan, sovuq holda beriladi...      │
│     [🎯 AR'da ko'rish] [🛒 Buyurtma]    │
│                                          │
├─────────────────────────────────────────┤
│ [Savolingizni yozing...]          [➤]   │
└─────────────────────────────────────────┘
```

### AI chatbot arxitekturasi (batafsil — Qism VII)

```
Savol
  │
  ├─ [1] Rate limit (10 savol / 5 daqiqa / mijoz)
  │
  ├─ [2] Kontekst tayyorlash:
  │       • Restoran menyusi (kesilgan: nom, narx, tarkib, teglar)
  │       • Til (uz/ru/en)
  │       • Savat holati
  │       • Cheklov: "faqat menyu haqida javob ber"
  │
  ├─ [3] MCP orqali AI chaqiruvi (Qism VII: 6+ provayder)
  │       Prioritet: arzon → qimmat
  │       1. Gemini Flash    (eng arzon)
  │       2. Haiku 4.5
  │       3. GPT-4o-mini
  │       4. Groq Llama      (tez, arzon)
  │       5. DeepSeek
  │       6. Sonnet          (murakkab savol)
  │       ⚡ Biri ishlamasa → keyingisiga o'tadi (fallback zanjiri)
  │
  ├─ [4] Javob validatsiyasi:
  │       • Menyuda yo'q taom taklif qilmasin
  │       • Narx to'g'rimi (menyudan tekshiriladi)
  │       • Zararli kontent yo'qmi
  │
  ├─ [5] Javobga tugmalar biriktiriladi ([AR], [Buyurtma])
  │
  └─ [6] Xarajat yoziladi: AIUsage(restaurant, provider, tokens, cost)
          → P-05 da ko'rinadi
```

---

# 2. 🧑‍🍳 OFITSIANT SAHIFALARI

## O-01 — KIRISH (PIN)

```
┌─────────────────────────────────────────┐
│         [Restoran logo]                  │
│         Xodim kirishi                    │
│                                          │
│      ┌───┐ ┌───┐ ┌───┐ ┌───┐            │
│      │ ● │ │ ● │ │ ● │ │   │            │
│      └───┘ └───┘ └───┘ └───┘            │
│                                          │
│         [1] [2] [3]                      │
│         [4] [5] [6]                      │
│         [7] [8] [9]                      │
│         [⌫] [0] [✓]                      │
└─────────────────────────────────────────┘
```

**Zanjir:** 4 raqamli PIN → `POST /api/staff/login/` → JWT (24s) →
`localStorage.staff_token` → rolга qarab redirect (waiter→O-02, cook→K-01, cashier→S-01)

⚠️ **Xavfsizlik:** 5 xato → 15 daqiqa blok (Redis); PIN bcrypt bilan hash.

---

## O-02 — BOSH EKRAN (yangi buyurtmalar)

```
┌─────────────────────────────────────────┐
│ 🧑‍🍳 Dilshod          [Smena: 4s 20d]    │
│ Bugun: 23 stol · 4,2 mln · 💝 87 000    │
├─────────────────────────────────────────┤
│ 🔔 3 ta yangi                            │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ 🆕 #047      🪑 STOL 5     2 daq   │ │ ← katta stol raqami
│ │ Osh × 2, Achchiq-chuchuk × 1        │ │
│ │ 💬 "achchiq qilmang"                │ │
│ │ 173 800 so'm                         │ │
│ │ [✅ QABUL QILDIM]                    │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ 🍳 #046      🪑 STOL 12    8 daq   │ │
│ │ Tayyorlanmoqda...                    │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ ✅ #045      🪑 STOL 3     TAYYOR!  │ │ ← yashil, pulsatsiya
│ │ [🍽 OLIB BORDIM]                     │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ [📋 Buyurtma] [🗺 Zal] [🔔2] [📊]       │
└─────────────────────────────────────────┘
```

### Tugmalar zanjiri

| Tugma | Endpoint | Jarayon |
|---|---|---|
| ✅ QABUL QILDIM | `POST /api/orders/<id>/accept/` | status=`accepted`, waiter biriktiriladi → WS: KDS'ga "tayyorlashni boshla", mijozga "qabul qilindi" |
| 🍽 OLIB BORDIM | `POST /api/orders/<id>/serve/` | status=`served` → mijozga "Yoqimli ishtaha!" → stol holati `dining` |
| 🗺 Zal | — | **O-05** |
| 🔔 | — | **O-06** chaqiruvlar |
| 📊 | — | **O-09** statistika |

### ⚡ Real-time bildirishnoma

```javascript
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.type === 'order.new') {
    // ⚡ Faqat MENING stolim bo'lsa
    if (!MY_TABLES.includes(m.table_id) && m.assigned_to !== MY_ID) return;
    playSound('new_order.mp3');
    vibrate([300,100,300]);
    prependOrderCard(m.order);
    updateBadge();
    if (document.hidden) showNotification(`Stol ${m.table_no} — yangi buyurtma`);
  }
  if (m.type === 'order.ready') { /* yashil pulsatsiya + tovush */ }
  if (m.type === 'call.new')    { /* chaqiruv */ }
};
```

---

## O-05 — 2D ZAL PLANI

```
┌─────────────────────────────────────────┐
│ 🗺 Zal — 1-qavat        [1▾]            │
├─────────────────────────────────────────┤
│                                          │
│    ┌───┐      ┌───┐      ┌────┐         │
│    │ 1 │      │ 2 │      │ 3  │         │
│    │🟢 │      │🔵 │      │🟡  │         │
│    └───┘      └───┘      └────┘         │
│                                          │
│    ┌───┐   ╔═════╗      ┌───┐           │
│    │ 4 │   ║  5  ║      │ 6 │           │
│    │🟢 │   ║ 🔴  ║      │🟢 │           │
│    └───┘   ╚═════╝      └───┘           │
│            ↑ TAYYOR!                     │
│         (pulsatsiya)                     │
│                                          │
│  ┌──────────────── BAR ────────────────┐│
│                                          │
├─────────────────────────────────────────┤
│ 🟢 Bo'sh  🔵 Band  🟡 Kutmoqda          │
│ 🔴 Tayyor 🟣 Hisob                       │
└─────────────────────────────────────────┘
```

**Stol rangi mantiq:**
```javascript
function tableColor(t) {
  if (t.has_ready_order)   return 'red';     // 🔴 tayyor — pulsatsiya
  if (t.has_pending_call)  return 'purple';  // 🟣 chaqiruv
  if (t.has_active_order)  return 'yellow';  // 🟡 kutmoqda
  if (t.is_occupied)       return 'blue';    // 🔵 band
  return 'green';                            // 🟢 bo'sh
}
```

**Stol bosilsa:** → **O-03** buyurtma tafsiloti / yangi buyurtma kiritish

> 📌 **v3 da:** shu 2D plan → 2.5D izometrik → to'liq 3D + navigatsiya.
> Ma'lumot modeli (x, y, shakl) bosh kundan 3D uchun tayyor.

---

# 3. 🍳 KDS — OSHXONA MONITORI

## K-01 — BUYURTMALAR TAXTASI

**URL:** `/kds/?token=<kds_token>` (TV brauzerida, doim ochiq)
**Uslub:** dark, katta shrift, 3 metrdan o'qiladigan (`ai agent.mp4` uslubi)

```
┌───────────────────────────────────────────────────────────────────┐
│ 🍳 OSHXONA          14:32          Faol: 7    O'rtacha: 12 daq    │
├──────────────────┬──────────────────┬─────────────────────────────┤
│  🆕 YANGI (3)    │  🍳 TAYYORLANMOQDA│  ✅ TAYYOR (2)              │
├──────────────────┼──────────────────┼─────────────────────────────┤
│ ┌──────────────┐ │ ┌──────────────┐ │ ┌─────────────────────────┐ │
│ │ #047 STOL 5  │ │ │ #046 STOL 12 │ │ │ #045  STOL 3            │ │
│ │ ⏱ 0:47      │ │ │ ⏱ 8:12  🟡  │ │ │ ⏱ 14:03  ✅            │ │
│ ├──────────────┤ │ ├──────────────┤ │ ├─────────────────────────┤ │
│ │ 2× OSH       │ │ │ 1× LAG'MON   │ │ │ 3× SOMSA                │ │
│ │   ⚠️ achchiq │ │ │ 2× SHASHLIK  │ │ │ 1× CHOY                 │ │
│ │     qilmang  │ │ │              │ │ │                         │ │
│ │ 1× SALAT     │ │ │              │ │ │                         │ │
│ ├──────────────┤ │ ├──────────────┤ │ ├─────────────────────────┤ │
│ │[BOSHLASH]    │ │ │[TAYYOR ✓]    │ │ │[BERILDI]                │ │
│ └──────────────┘ │ └──────────────┘ │ └─────────────────────────┘ │
└──────────────────┴──────────────────┴─────────────────────────────┘
```

### Vaqt ranglari (oshpaz uchun bosim)
| Vaqt | Rang | Ma'no |
|---|---|---|
| 0-50% ETA | 🟢 yashil | Normal |
| 50-80% | 🟡 sariq | Shoshiling |
| 80-100% | 🟠 to'q sariq | Kechikmoqda |
| >100% | 🔴 qizil + tovush | **KECHIKDI** |

### Tugmalar

| Tugma | Endpoint | Natija |
|---|---|---|
| BOSHLASH | `POST /api/orders/<id>/cook/` | `cooking`, taymer start → mijozga "Tayyorlanmoqda" |
| TAYYOR ✓ | `POST /api/orders/<id>/ready/` | `ready` → 🔔 ofitsiantga tovush+push → mijozga "Tayyor!" |
| BERILDI | `POST /api/orders/<id>/serve/` | `served` |
| Taom bosilsa | `POST /api/dishes/<id>/stop/` | Stop-list: menyudan yashiriladi (tugagan) |

⚡ **KDS hech qachon yopilmaydi:** WS uzilsa avtomatik ulanadi, offline'da lokal
holat ko'rsatiladi, sahifa har 6 soatda avtomatik yangilanadi (xotira uchun).

---

# 4. 👨‍💼 ADMIN SAHIFALARI

## A-01 — DASHBOARD (real-time)

```
┌───────────────────────────────────────────────────────────────────┐
│ 🏠 Dashboard    Restoran "Registon"      04.09.2026  14:32       │
├───────────────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐      │
│ │ BUGUN   │ │ BUYURTMA│ │ O'RT.CHEK│ │ BAND    │ │ AR      │      │
│ │ 4,8 mln │ │   87    │ │ 55 172  │ │ 18/24   │ │ 143     │      │
│ │ ▲ +12%  │ │ ▲ +8%   │ │ ▲ +23%  │ │  75%    │ │ ▲ +34%  │      │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘      │
├───────────────────────────────────────────────────────────────────┤
│ 📊 Soatlik savdo              │ 🍽 TOP-5 taom                     │
│  ▁▂▃▅▇█▇▅▃▂                   │ 1. Osh          34 ta  1,5 mln   │
│  9 11 13 15 17 19 21          │ 2. Manti        28 ta  1,0 mln   │
│                                │ 3. Shashlik     22 ta  0,9 mln   │
├────────────────────────────────┴──────────────────────────────────┤
│ 🔴 JONLI OQIM                                                     │
│ 14:32  Stol 5   yangi buyurtma  #047      173 800  [ko'rish]     │
│ 14:31  Stol 12  tayyor          #046      245 000                │
│ 14:30  Stol 3   to'landi        #045      98 000                 │
│ 14:29  Stol 8   ⭐⭐ 2 baho     ❗        [javob berish]         │
├───────────────────────────────────────────────────────────────────┤
│ ⚠️ DIQQAT                                                         │
│ • "Lag'mon" tugadi — 3 mijoz so'radi                             │
│ • Stol 7 — 12 daqiqadan beri chaqiruv javobsiz                   │
│ • Ofitsiant Aziz — smena 9 soat (norma 8)                        │
└───────────────────────────────────────────────────────────────────┘
```

⚡ **Real-time:** WS `rest_<id>_admin` — barcha hodisalar jonli.

---

## A-04 — 🎯 3D MODEL BOSHQARUVI (eng muhim admin sahifa)

```
┌───────────────────────────────────────────────────────────────────┐
│ 🎯 3D / AR modellar                                               │
├───────────────────────────────────────────────────────────────────┤
│ Holat: ✅ 34 tayyor  ⏳ 3 jarayonda  ❌ 8 yo'q     [+ Yangi]     │
├───────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────┐  │
│ │ [3D preview]  Osh (Palov)                        ✅ TAYYOR  │  │
│ │               Manba: 📚 Kutubxona (bepul)                    │  │
│ │               O'lcham: 32 sm  |  GLB 2,1 MB  USDZ 3,4 MB    │  │
│ │               👁 143 ko'rish  |  📈 Konversiya 42%           │  │
│ │               [Ko'rish] [Almashtirish] [O'lcham]            │  │
│ └─────────────────────────────────────────────────────────────┘  │
│ ┌─────────────────────────────────────────────────────────────┐  │
│ │ [⏳ 67%]     Norin                             ⏳ JARAYONDA │  │
│ │               Manba: 🤖 AI (rasmdan)                         │  │
│ │               Taxminan 2 daqiqa qoldi                        │  │
│ └─────────────────────────────────────────────────────────────┘  │
│ ┌─────────────────────────────────────────────────────────────┐  │
│ │ [rasm]       Dimlama                            ❌ MODEL YO'Q│  │
│ │              [📚 Kutubxonadan] [🤖 AI yaratish] [📤 Yuklash] │  │
│ └─────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

### "🤖 AI yaratish" tugmasi — to'liq zanjir

```
[1] Admin "🤖 AI yaratish" bosadi
    ▼
[2] Modal: "Taom rasmini yuklang (3-6 ta turli burchakdan yaxshiroq)"
    [rasm yuklash] + o'lcham kiritish: [32] sm
    ▼
[3] POST /api/ar/generate/ {dish_id, images:[...], real_size_cm:32}
    ▼
[4] Backend:
    ├─ [4.1] Tarif tekshiruvi: PRO/PRO+FISKAL bo'lishi kerak
    │         START/FREE → 402 "Tarifni oshiring"
    ├─ [4.2] Limit: PRO = 50 model; oshgan → to'lov taklifi
    ├─ [4.3] Model3DJob.objects.create(status='queued')
    ├─ [4.4] Redis navbatga qo'yish: queue:model3d
    └─ [4.5] javob: 202 {job_id}
    ▼
[5] ⚙️ WORKER (armenu-worker.service) navbatdan oladi
    │
    ├─ [5.1] 📚 KUTUBXONA QIDIRUVI (birinchi navbatda!)
    │         • Nom bo'yicha: "norin" → DishLibrary
    │         • AI embedding bo'yicha (semantik)
    │         • Rasm bo'yicha (CLIP similarity)
    │         TOPILDI? → nusxa olinadi, 0 xarajat, 5 soniya ✅ TUGADI
    │
    ├─ [5.2] Topilmadi → 🤖 AI GENERATSIYA
    │         MCP orqali (Qism VII):
    │         1. Meshy API      (image-to-3d)   ~$0.5
    │         2. ishlamasa → Tripo API         ~$0.8
    │         3. ishlamasa → Rodin API         ~$1.5
    │         → natija: raw .glb
    │
    ├─ [5.3] 🔧 OPTIMIZATSIYA (gltf-transform)
    │         • Draco siqish
    │         • Tekstura → 1024px WebP
    │         • Poligon → ≤60k (simplify)
    │         • O'lcham → real_size_cm ga masshtablash ⚡
    │         • Markaz → Y=0 (model tagi)
    │         • Natija tekshiruvi: ≤3 MB?
    │
    ├─ [5.4] 📱 USDZ konvertatsiya (usd-from-gltf)
    │         → dish_15.usdz (≤5 MB)
    │
    ├─ [5.5] 🖼 Poster render (headless, 800×800 WebP)
    │
    ├─ [5.6] ☁️ CDN'ga yuklash (S3/MinIO + Cloudflare)
    │
    ├─ [5.7] 💾 DishModel3D saqlanadi, status='ready'
    │
    ├─ [5.8] 📚 KUTUBXONAGA QO'SHISH (agar umumiy taom bo'lsa) ⚡
    │         DishLibrary.objects.create(key='norin', ...)
    │         → keyingi restoranlar uchun BEPUL
    │
    └─ [5.9] WS → admin: {"type":"model3d.ready", dish_id:15}
              + Telegram: "✅ Norin 3D modeli tayyor"
    ▼
[6] Admin panelda ✅ TAYYOR ko'rinadi, mijozlar AR'da ko'ra oladi
```

### ⚠️ Xato holatlari

| Xato | Harakat |
|---|---|
| AI provayder ishlamadi | Keyingi provayderga (3 ta zanjir) |
| Hammasi ishlamadi | `status='failed'`, admin xabardor, qo'lda yuklash taklifi |
| Model 3 MB dan katta | Qayta optimizatsiya (agressiv), baribir katta → sifat pasaytiriladi |
| Rasm sifatsiz | "Yaxshiroq rasm yuklang" + tavsiyalar |
| Limit tugagan | To'lov taklifi |

---

## A-05 — STOLLAR VA QR

```
┌───────────────────────────────────────────────────────────────────┐
│ 🪑 Stollar va QR kodlar          [+ Stol]  [📄 Barcha QR — PDF]  │
├───────────────────────────────────────────────────────────────────┤
│ Zal: [1-qavat ▾]                                                  │
├─────┬──────────┬────────┬──────────┬─────────────┬───────────────┤
│ №   │ Zal      │ Sig'im │ Holat    │ QR          │ Amallar        │
├─────┼──────────┼────────┼──────────┼─────────────┼───────────────┤
│ 1   │ 1-qavat  │ 4      │ 🟢 Bo'sh │ [▪▫▪] a3f2..│ [PDF][🔄][✏️] │
│ 2   │ 1-qavat  │ 2      │ 🔵 Band  │ [▪▫▪] 7b1e..│ [PDF][🔄][✏️] │
│ 5   │ 1-qavat  │ 6      │ 🔴 Tayyor│ [▪▫▪] e9c0..│ [PDF][🔄][✏️] │
└─────┴──────────┴────────┴──────────┴─────────────┴───────────────┘
```

### QR generatsiya zanjiri

```
[+ Stol] → POST /api/tables/
   ├─ qr_token = uuid4()          ⚡ HAR STOL NOYOB
   ├─ url = f"https://{domain}/t/{qr_token}"
   ├─ QR rasm generatsiya (qrcode kutubxonasi, ECC=H, logo markazda)
   ├─ PNG (300 DPI) + SVG saqlanadi
   └─ Table saqlanadi

[📄 PDF] → GET /api/tables/qr-pdf/?hall=1&layout=a4_6
   ├─ ReportLab/WeasyPrint bilan PDF
   ├─ Har stol uchun: logo + STOL №(katta) + QR + 3 tilda matn
   ├─ Layout: A4 da 1/2/4/6 ta, yoki stol standi (10×15 sm)
   └─ Yuklab olinadi: qr_codes_1-qavat.pdf

[🔄] → POST /api/tables/<id>/regenerate-qr/
   ├─ ⚠️ Tasdiq: "Eski QR ishlamay qoladi!"
   ├─ qr_token = uuid4() (yangi)
   └─ Eski token 24 soat "grace period" ishlaydi (mijoz ovqatlanayotgan bo'lishi mumkin)
```

---

## A-10 — AR ANALITIKA (sotuv argumentining asosi)

```
┌───────────────────────────────────────────────────────────────────┐
│ 🎯 AR analitika                    [Bu oy ▾]                      │
├───────────────────────────────────────────────────────────────────┤
│ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐            │
│ │ AR KO'RISH    │ │ KONVERSIYA    │ │ CHEK TA'SIRI  │            │
│ │    2 847      │ │    38,4%      │ │   +31%        │            │
│ │   ▲ +34%      │ │   ▲ +5,2pp    │ │  ⚡ ASOSIY    │            │
│ └───────────────┘ └───────────────┘ └───────────────┘            │
├───────────────────────────────────────────────────────────────────┤
│ 💰 AR KO'RGAN vs KO'RMAGAN MIJOZ                                  │
│                                                                    │
│   AR ko'rgan:     ████████████████████ 68 400 so'm               │
│   AR ko'rmagan:   █████████████ 52 100 so'm                       │
│                                          ⚡ +31,3% farq           │
│   ➜ Bu oy AR qo'shimcha keltirdi:  +14 200 000 so'm              │
│   ➜ Tarif to'lovi: 590 000 so'm  →  ROI = 24×                    │
├───────────────────────────────────────────────────────────────────┤
│ TOP AR taomlar                                                     │
│ 1. Osh        487 ko'rish  →  42% buyurtma                        │
│ 2. Shashlik   356 ko'rish  →  51% buyurtma  ⭐ eng yaxshi         │
│ 3. Norin      289 ko'rish  →  28% buyurtma                        │
├───────────────────────────────────────────────────────────────────┤
│ ⚠️ TAVSIYA                                                        │
│ • "Dimlama" 3D modeli yo'q, lekin 89 marta ochilgan → yarating   │
│ • "Lag'mon" AR konversiyasi 12% — model sifati past bo'lishi mumkin│
└───────────────────────────────────────────────────────────────────┘
```

> 💰 Bu sahifa — **sotuvchining eng kuchli quroli**. Restoran egasi
> "AR menga 24× qaytim beryapti" ko'rsa, hech qachon ketmaydi (churn ↓).

---

## A-15 — 🌐 TARJIMA BOSHQARUVI (3 til talab)

```
┌───────────────────────────────────────────────────────────────────┐
│ 🌐 Tarjimalar          [🇺🇿 O'zbek] [🇷🇺 Rus] [🇬🇧 Ingliz]        │
├───────────────────────────────────────────────────────────────────┤
│ Holat: 🇺🇿 100%   🇷🇺 87%   🇬🇧 62%    [🤖 AI bilan to'ldirish]  │
├─────────────────┬──────────────────┬──────────────────────────────┤
│ 🇺🇿 O'zbek      │ 🇷🇺 Rus          │ 🇬🇧 Ingliz                   │
├─────────────────┼──────────────────┼──────────────────────────────┤
│ Osh (Palov)     │ Плов             │ Pilaf                    ✅  │
│ Toshkent oshi.. │ Ташкентский пл.. │ Tashkent-style pilaf...  ✅  │
├─────────────────┼──────────────────┼──────────────────────────────┤
│ Norin           │ Норин            │ [🤖 tarjima qilish]      ⚠️  │
├─────────────────┼──────────────────┼──────────────────────────────┤
│ Dimlama         │ [🤖]         ⚠️  │ [🤖]                     ⚠️  │
└─────────────────┴──────────────────┴──────────────────────────────┘
```

### Tarjima tizimi (har bir harf/matn tarjima qilinadi — talab)

**3 qatlam:**

```
1. INTERFEYS matnlari (statik)
   → Django i18n: locale/uz/LC_MESSAGES/django.po
   → JS: static/i18n/{uz,ru,en}.json
   → 100% qo'lda tarjima qilingan (sifat kafolati)

2. KONTENT matnlari (dinamik — taom nomi, tavsif)
   → DB da 3 ta ustun: name_uz, name_ru, name_en
   → Admin qo'lda kiritadi YOKI 🤖 AI tarjima qiladi
   → AI tarjima "tasdiqlanmagan" belgisi bilan (admin tasdiqlaydi)

3. AI GENERATSIYA (chatbot javoblari)
   → Foydalanuvchi tilida generatsiya qilinadi (tarjima emas)
```

**🤖 AI bilan to'ldirish zanjiri:**
```
[🤖 AI bilan to'ldirish] bosildi
   → POST /api/i18n/auto-translate/ {target_lang:'en'}
   → Worker: bo'sh maydonlarni yig'adi (batch 50 ta)
   → MCP AI: "Quyidagi o'zbek taom nomlarini ingliz tiliga tarjima qil.
              Milliy taomlar uchun transliteratsiya + qisqa tushuntirish ber."
   → Natija: {name_en:"Norin", desc_en:"Traditional hand-cut noodles with horse meat"}
   → is_auto_translated=True bilan saqlanadi
   → Admin panelda ⚠️ belgisi (tasdiqlash uchun)
   → Admin tasdiqlasa → ✅
```

---

# 5. 🔧 SUPER-ADMIN (platforma egasi)

## P-02 — 3D KUTUBXONA BOSHQARUVI ⚡ (asosiy aktiv)

```
┌───────────────────────────────────────────────────────────────────┐
│ 📚 Umumiy 3D kutubxona      312 model   [+ Qo'shish] [📊 Hisobot]│
├───────────────────────────────────────────────────────────────────┤
│ Qidiruv: [osh________]  Kategoriya: [Milliy ▾]                   │
├──────────────┬──────────┬────────┬──────────┬────────────────────┤
│ Model        │ Nom      │ O'lcham│ Ishlatildi│ Sifat             │
├──────────────┼──────────┼────────┼──────────┼────────────────────┤
│ [3D]         │ Osh      │ 32 sm  │ 87 rest. │ ⭐⭐⭐⭐⭐ foto     │
│ [3D]         │ Manti    │ 24 sm  │ 76 rest. │ ⭐⭐⭐⭐ AI        │
│ [3D]         │ Somsa    │ 12 sm  │ 71 rest. │ ⭐⭐⭐⭐⭐ foto     │
│ [3D]         │ Norin    │ 28 sm  │ 43 rest. │ ⭐⭐⭐ AI          │
└──────────────┴──────────┴────────┴──────────┴────────────────────┘

💡 TAVSIYA: "Chuchvara" 34 marta so'ralgan lekin kutubxonada yo'q → yarating
```

**Kutubxona qiymati hisoblagichi:**
```
312 model × o'rtacha 70 000 so'm ishlab chiqarish narxi = 21,8 mln so'm aktiv
Har yangi restoran o'rtacha 38 model kutubxonadan oladi = 2,66 mln so'm tejaydi
```

---

## P-04 — TIZIM SALOMATLIGI (health)

```
┌───────────────────────────────────────────────────────────────────┐
│ ❤️ Tizim salomatligi                            🟢 SOG'LOM        │
├───────────────────────────────────────────────────────────────────┤
│ Web (8060)    🟢 4/4 instans   CPU 34%  RAM 2,1/8 GB  p95 87ms   │
│ WS (8061)     🟢 2/2 instans   3 421 ulanish                      │
│ Worker        🟢 3/3           Navbat: 12   O'rtacha 4,2 s       │
│ PostgreSQL    🟢 Primary+2 replica  Conn 45/200  Lag 0,3s        │
│ Redis         🟢 Cluster 3 node     Xotira 1,2/4 GB              │
│ CDN           🟢 Hit rate 94,2%                                   │
│ AI providers  🟡 Meshy sekin (12s)  Boshqalar normal             │
│ OFD           🟢 Navbat 0   Oxirgi 2s oldin                       │
├───────────────────────────────────────────────────────────────────┤
│ ⚠️ OGOHLANTIRISH                                                  │
│ • Meshy API javob vaqti 12s (normal 4s) → Tripo'ga o'tildi       │
│ • Restoran #47 — 3 kun faol emas → churn xavfi                    │
└───────────────────────────────────────────────────────────────────┘
```

---

**➡️ Keyingi qism:** [03_ARXITEKTURA.md](03_ARXITEKTURA.md) — tizim tubi, masshtablash, fault-tolerance
