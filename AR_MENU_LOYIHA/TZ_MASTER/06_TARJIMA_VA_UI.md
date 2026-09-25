# QISM VI — TARJIMA TIZIMI VA UI/UX

---

## 1. 🌐 3 TILLI TIZIM (uz / ru / en)

> Talab: *"3 ta tilda bo'lsin — o'zbek, rus, ingliz. Har bir harf, matn tarjima qilinishi kerak."*

### 1.1 Tarjima qamrovi (100%)

| Nima | Qayerda | Usul | Holat |
|---|---|---|---|
| Tugma, yorliq, xabar (UI) | Django + JS | Statik lug'at | Qo'lda, 100% |
| Xato xabarlari | Backend | Statik lug'at | Qo'lda, 100% |
| Taom nomi, tavsifi | DB (3 ustun) | Admin yoki AI | Aralash |
| Kategoriya nomi | DB (3 ustun) | Admin yoki AI | Aralash |
| Zal nomi | DB (3 ustun) | Admin yoki AI | Aralash |
| Modifikator nomi | DB (3 ustun) | Admin yoki AI | Aralash |
| Allergen/diet teglari | Statik lug'at | Qo'lda | 100% |
| AI chatbot javobi | Real-time | Generatsiya | Avtomatik |
| Email/SMS/Telegram | Shablon | Qo'lda | 100% |
| PDF (QR, chek, hisobot) | Shablon | Qo'lda | 100% |

### 1.2 Uch qatlamli arxitektura

```
┌─────────────────────────────────────────────────────────────┐
│ QATLAM 1 — STATIK INTERFEYS (100% qo'lda tarjima)          │
├─────────────────────────────────────────────────────────────┤
│ Backend:  locale/{uz,ru,en}/LC_MESSAGES/django.po           │
│           {% trans "Buyurtma berish" %}                     │
│           gettext("Savat bo'sh")                            │
│                                                              │
│ Frontend: static/i18n/{uz,ru,en}.json                       │
│           t('cart.empty')  →  "Savat bo'sh"                 │
│                                                              │
│ ⚡ Sifat kafolati: har bir kalit 3 tilda MAVJUD bo'lishi     │
│    SHART. CI'da tekshiriladi — bo'sh bo'lsa build FAIL.     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ QATLAM 2 — DINAMIK KONTENT (DB, 3 ustun)                   │
├─────────────────────────────────────────────────────────────┤
│ Dish.name_uz / name_ru / name_en                            │
│ Dish.desc_uz / desc_ru / desc_en                            │
│                                                              │
│ Fallback: so'ralgan til bo'sh → uz → ru → en → ''           │
│                                                              │
│ 🤖 AI to'ldirish: bo'sh maydonlar avtomatik tarjima         │
│    → tr_auto={"ru":true} belgisi                            │
│    → admin tasdiqlaydi → tr_approved={"ru":true}            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ QATLAM 3 — AI GENERATSIYA (real-time)                       │
├─────────────────────────────────────────────────────────────┤
│ Chatbot javobi foydalanuvchi tilida GENERATSIYA qilinadi    │
│ (tarjima emas — to'g'ridan-to'g'ri o'sha tilda yoziladi)    │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 `static/i18n/uz.json` — namuna (to'liq tuzilma)

```json
{
  "common": {
    "back": "Orqaga", "close": "Yopish", "save": "Saqlash",
    "cancel": "Bekor qilish", "confirm": "Tasdiqlash", "delete": "O'chirish",
    "edit": "Tahrirlash", "add": "Qo'shish", "search": "Qidirish",
    "loading": "Yuklanmoqda...", "error": "Xatolik", "retry": "Qayta urinish",
    "yes": "Ha", "no": "Yo'q", "all": "Hammasi", "sum": "so'm",
    "min": "daqiqa", "gram": "g", "pcs": "ta"
  },
  "menu": {
    "title": "Menyu", "search_placeholder": "Taom qidirish...",
    "no_results": "Hech narsa topilmadi", "category_all": "Hammasi",
    "sold_out": "Tugagan", "hit": "Ommabop", "new": "Yangi",
    "cook_time": "{n} daqiqa", "weight": "{n} g", "calories": "{n} kkal"
  },
  "dish": {
    "ingredients": "Tarkibi", "allergens": "Allergenlar",
    "no_allergens": "Allergen yo'q", "modifiers": "Qo'shimchalar",
    "note_placeholder": "Izoh (masalan: achchiq qilmang)",
    "add_to_cart": "Savatga qo'shish", "view_ar": "AR'da ko'rish",
    "view_3d": "3D ko'rish", "rating": "{n} ({cnt} ta baho)"
  },
  "ar": {
    "button": "📱 Stolga qo'yib ko'rish",
    "loading": "3D model yuklanmoqda...",
    "not_supported": "Qurilmangiz AR'ni qo'llab-quvvatlamaydi",
    "not_supported_hint": "3D ko'rinishda aylantirib ko'rishingiz mumkin",
    "error": "3D model yuklanmadi",
    "instruction": "Telefoningizni stolga qarating",
    "real_size": "Haqiqiy o'lchamda",
    "preparing": "3D model tayyorlanmoqda..."
  },
  "cart": {
    "title": "Savat", "empty": "Savat bo'sh",
    "empty_hint": "Menyudan taom tanlang",
    "subtotal": "Taomlar", "service_fee": "Xizmat ({pct}%)",
    "discount": "Chegirma", "total": "JAMI",
    "note_placeholder": "Umumiy izoh",
    "submit": "Buyurtma berish", "cross_sell": "Bularni ham oling"
  },
  "order": {
    "created": "Buyurtmangiz qabul qilindi!",
    "number": "Buyurtma {n}", "table": "Stol {n}",
    "status_new": "Qabul qilindi", "status_accepted": "Qabul qilindi",
    "status_cooking": "Tayyorlanmoqda", "status_ready": "Tayyor",
    "status_served": "Berildi", "status_paid": "To'landi",
    "eta": "Taxminan {n} daqiqa qoldi",
    "ready_title": "🎉 Buyurtmangiz tayyor!",
    "add_more": "Yana buyurtma", "request_bill": "Hisob so'rash",
    "unavailable": "{dish} tugadi. Ofitsiant keladi."
  },
  "call": {
    "title": "Nima kerak?", "waiter": "Ofitsiant", "bill": "Hisob",
    "water": "Suv", "clean": "Tozalash",
    "sent": "Ofitsiant chaqirildi ✓",
    "cooldown": "Iltimos, biroz kuting",
    "resolved": "Ofitsiant keldi"
  },
  "payment": {
    "title": "To'lov", "method": "To'lov usuli", "cash": "Naqd (ofitsiantga)",
    "payme": "Payme", "click": "Click", "uzum": "Uzum",
    "use_bonus": "Bonusdan foydalanish", "pay": "To'lash — {amount}",
    "success": "✅ To'lov qabul qilindi", "failed": "To'lov amalga oshmadi",
    "split": "Hisobni bo'lish", "receipt": "Chek"
  },
  "tips": {
    "title": "Xizmat yoqdimi?", "waiter_label": "Sizning ofitsiantingiz",
    "give": "💝 Choychaqa berish", "skip": "O'tkazib yuborish",
    "custom": "Boshqa summa", "thanks": "Rahmat! 🎉"
  },
  "review": {
    "title": "Bizni baholang", "food": "Taom", "service": "Xizmat",
    "ambience": "Muhit", "comment_placeholder": "Izohingiz...",
    "submit": "Yuborish", "thanks": "Rahmat! 🎉",
    "google_prompt": "Google'da ham baholaysizmi?",
    "google_button": "Google'ga o'tish",
    "sorry": "Uzr so'raymiz. Nima yoqmadi?"
  },
  "chat": {
    "title": "Yordamchi", "greeting": "Salom! Menyu bo'yicha savolingiz bormi?",
    "placeholder": "Savolingizni yozing...", "thinking": "O'ylayapman...",
    "error": "Kechirasiz, hozir javob bera olmayman. Ofitsiantni chaqiring.",
    "view_dish": "Ko'rish", "order_dish": "Buyurtma"
  },
  "errors": {
    "qr_invalid": "QR kod yaroqsiz. Ofitsiantga murojaat qiling.",
    "restaurant_inactive": "Restoran vaqtincha xizmat ko'rsatmayapti",
    "dish_unavailable": "Bu taom hozir mavjud emas",
    "price_changed": "Narxlar yangilandi. Savatni tekshiring.",
    "network": "Ulanish yo'q. Qayta urinilmoqda...",
    "server": "Xatolik yuz berdi. Ofitsiantni chaqiring.",
    "rate_limited": "Juda ko'p so'rov. Biroz kuting."
  },
  "staff": {
    "login": "Xodim kirishi", "pin": "PIN kod", "wrong_pin": "PIN noto'g'ri",
    "blocked": "Bloklandi. {n} daqiqadan keyin urinib ko'ring.",
    "new_orders": "Yangi buyurtmalar", "my_tables": "Mening stollarim",
    "hall": "Zal", "calls": "Chaqiruvlar", "stats": "Statistika",
    "accept": "✅ Qabul qildim", "serve": "🍽 Olib bordim",
    "shift_start": "Smena boshlash", "shift_end": "Smena tugatish",
    "today": "Bugun", "tables_served": "{n} stol", "tips_earned": "Choychaqa"
  },
  "kds": {
    "title": "Oshxona", "new": "YANGI", "cooking": "TAYYORLANMOQDA",
    "ready": "TAYYOR", "start": "BOSHLASH", "mark_ready": "TAYYOR ✓",
    "served": "BERILDI", "late": "KECHIKDI", "avg_time": "O'rtacha"
  },
  "admin": {
    "dashboard": "Dashboard", "menu": "Menyu", "tables": "Stollar",
    "orders": "Buyurtmalar", "staff": "Xodimlar", "reports": "Hisobotlar",
    "ar_models": "3D/AR modellar", "settings": "Sozlamalar",
    "today_revenue": "Bugungi savdo", "orders_count": "Buyurtma",
    "avg_check": "O'rtacha chek", "tables_busy": "Band stollar",
    "ar_views": "AR ko'rish"
  },
  "diet": {
    "halal": "Halol", "vegetarian": "Vegetarian", "vegan": "Vegan",
    "spicy": "Achchiq", "no_spicy": "Achchiq emas",
    "lactose_free": "Laktozasiz", "gluten_free": "Glutensiz"
  },
  "allergen": {
    "nuts": "Yong'oq", "gluten": "Gluten", "dairy": "Sut mahsulotlari",
    "eggs": "Tuxum", "fish": "Baliq", "shellfish": "Dengiz mahsulotlari",
    "soy": "Soya", "sesame": "Kunjut"
  }
}
```

> ⚡ `ru.json` va `en.json` — **aynan shu tuzilma**, faqat qiymatlar tarjima qilingan.
> CI tekshiruvi: 3 fayl kalitlari **bir xil** bo'lishi shart.

### 1.4 JS tarjima yordamchi

```javascript
// static/guest/js/i18n.js
let TRANSLATIONS = {};
let CURRENT_LANG = 'uz';

async function loadI18n(lang) {
  CURRENT_LANG = lang;
  const cached = localStorage.getItem(`i18n_${lang}_v${I18N_VERSION}`);
  if (cached) { TRANSLATIONS = JSON.parse(cached); return; }

  const r = await fetch(`/static/i18n/${lang}.json?v=${I18N_VERSION}`);
  TRANSLATIONS = await r.json();
  localStorage.setItem(`i18n_${lang}_v${I18N_VERSION}`, JSON.stringify(TRANSLATIONS));
}

/**
 * t('cart.empty')            → "Savat bo'sh"
 * t('order.eta', {n: 18})    → "Taxminan 18 daqiqa qoldi"
 */
function t(key, params = {}) {
  const val = key.split('.').reduce((o, k) => o?.[k], TRANSLATIONS);
  if (val === undefined) { console.warn(`[i18n] Yo'q: ${key}`); return key; }
  return val.replace(/\{(\w+)\}/g, (_, p) => params[p] ?? `{${p}}`);
}

/** Sahifadagi barcha data-i18n elementlarini tarjima qilish */
function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  root.querySelectorAll('[data-i18n-ph]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPh);
  });
  root.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
  });
  document.documentElement.lang = CURRENT_LANG;
}

/** Til almashtirish (sahifa qayta yuklanmasdan) */
async function switchLang(lang) {
  await loadI18n(lang);
  applyI18n();
  await reloadMenuContent(lang);        // DB kontentini qayta olish
  document.cookie = `armenu_lang=${lang};path=/;max-age=31536000`;
  fetch('/v1/lang/', {method:'POST', body: JSON.stringify({lang})});
}
```

### 1.5 CI tekshiruvi (tarjima to'liqligi)

```python
# tests/test_i18n_completeness.py
import json, pathlib

def test_all_langs_have_same_keys():
    """3 tilda ham AYNAN bir xil kalitlar bo'lishi SHART"""
    base = pathlib.Path('static/i18n')
    uz = flatten(json.load(open(base/'uz.json')))
    ru = flatten(json.load(open(base/'ru.json')))
    en = flatten(json.load(open(base/'en.json')))

    assert set(uz) == set(ru), f"RU yetishmayapti: {set(uz)-set(ru)}"
    assert set(uz) == set(en), f"EN yetishmayapti: {set(uz)-set(en)}"

def test_no_empty_translations():
    for lang in ('uz','ru','en'):
        d = flatten(json.load(open(f'static/i18n/{lang}.json')))
        empty = [k for k, v in d.items() if not v.strip()]
        assert not empty, f"{lang} bo'sh: {empty}"

def test_placeholders_match():
    """{n}, {amount} kabi o'rinbosarlar 3 tilda mos bo'lishi kerak"""
    ...
```

### 1.6 🤖 AI avto-tarjima (admin uchun)

```python
# apps/ai/services/translate.py

TRANSLATE_PROMPT = """Sen professional tarjimonsan. O'zbek restorani menyusini tarjima qilyapsan.

QOIDALAR:
1. Milliy o'zbek taomlari nomini TARJIMA QILMA — transliteratsiya qil.
   Masalan: "Norin" → en: "Norin", ru: "Норин"
2. Tavsifda taom nima ekanini QISQA tushuntir (chet ellik bilmaydi).
3. Umumiy taomlar tarjima qilinadi: "Salat" → "Salad" / "Салат"
4. Ohang: iliq, ishtaha ochadigan, lekin ortiqcha emas.
5. Faqat JSON qaytar, boshqa hech narsa.

Tarjima qilinadigan (o'zbekchadan {target_lang} ga):
{items}

Format:
[{"id": 15, "name": "...", "desc": "..."}]
"""

def auto_translate_dishes(restaurant_id: int, target_lang: str, batch_size: int = 40):
    field_name = f'name_{target_lang}'
    field_desc = f'desc_{target_lang}'

    qs = Dish.objects.filter(restaurant_id=restaurant_id).filter(
        Q(**{f'{field_name}': ''}) | Q(**{f'{field_desc}': ''})
    )[:batch_size]

    if not qs: return {'translated': 0}

    items = [{'id': d.id, 'name': d.name_uz, 'desc': d.desc_uz} for d in qs]

    # ⚡ MCP orqali (Qism VII) — fallback zanjiri bilan
    result = mcp_router.complete(
        task='translate',
        prompt=TRANSLATE_PROMPT.format(target_lang=LANG_NAMES[target_lang],
                                       items=json.dumps(items, ensure_ascii=False)),
        json_mode=True,
        restaurant_id=restaurant_id,
    )

    updated = 0
    for item in result:
        d = next((x for x in qs if x.id == item['id']), None)
        if not d: continue
        if not getattr(d, field_name): setattr(d, field_name, item['name'])
        if not getattr(d, field_desc): setattr(d, field_desc, item['desc'])
        d.tr_auto[target_lang] = True             # ⚡ AI tarjimasi belgisi
        d.tr_approved[target_lang] = False        # admin tasdiqlashi kerak
        d.save()
        updated += 1

    bump_menu_version(restaurant_id)
    return {'translated': updated}
```

---

## 2. 🎨 UI/UX DIZAYN TIZIMI

### 2.1 Dizayn printsiplari

| # | Printsip | Amalda |
|---|---|---|
| 1 | **Taom rasmi — bosh qahramon** | Katta rasm, minimal matn |
| 2 | **3 tegishda buyurtma** | Menyu → taom → savatga → buyurtma |
| 3 | **AR jozibali ko'rinsin** | Tugma ko'zga tashlansin, animatsiya |
| 4 | **Katta tegish maydonlari** | Min 44×44 px (barmoq uchun) |
| 5 | **Tez** | Skeleton loader, optimistik UI |
| 6 | **Ochiq** | Kontrast ≥4,5:1, shrift ≥16px |
| 7 | **Dark + Light** | Ikkalasi ham to'liq |

### 2.2 Rang tizimi (CSS o'zgaruvchilar)

```css
/* static/guest/css/theme.css */

:root {
  /* Brend (restoran o'zgartirishi mumkin) */
  --brand:        #E85D2A;
  --brand-hover:  #D14E1F;
  --brand-light:  #FFF0EA;

  /* Neytral — LIGHT */
  --bg:           #FFFFFF;
  --bg-soft:      #F7F7F8;
  --bg-card:      #FFFFFF;
  --border:       #E5E5E8;
  --text:         #1A1A1F;
  --text-soft:    #6B6B76;
  --text-muted:   #9B9BA6;

  /* Semantik */
  --success:      #16A34A;
  --warning:      #F59E0B;
  --danger:       #DC2626;
  --info:         #2563EB;

  /* Holat ranglari (stol) */
  --st-free:      #16A34A;
  --st-occupied:  #2563EB;
  --st-waiting:   #F59E0B;
  --st-ready:     #DC2626;
  --st-bill:      #9333EA;

  /* O'lchamlar */
  --r-sm: 8px; --r-md: 12px; --r-lg: 16px; --r-xl: 24px;
  --sp-1: 4px; --sp-2: 8px; --sp-3: 12px; --sp-4: 16px;
  --sp-5: 24px; --sp-6: 32px; --sp-8: 48px;

  --shadow-sm: 0 1px 2px rgba(0,0,0,.05);
  --shadow-md: 0 4px 12px rgba(0,0,0,.08);
  --shadow-lg: 0 12px 32px rgba(0,0,0,.12);
}

/* DARK — tizim sozlamasi */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg:        #0F0F13;
    --bg-soft:   #17171D;
    --bg-card:   #1C1C24;
    --border:    #2A2A35;
    --text:      #F0F0F5;
    --text-soft: #A0A0B0;
    --text-muted:#6B6B7B;
    --brand-light: #2A1810;
    --shadow-sm: 0 1px 2px rgba(0,0,0,.3);
    --shadow-md: 0 4px 12px rgba(0,0,0,.4);
    --shadow-lg: 0 12px 32px rgba(0,0,0,.5);
  }
}

/* DARK — qo'lda tanlangan */
:root[data-theme="dark"] {
  --bg:        #0F0F13;
  --bg-soft:   #17171D;
  --bg-card:   #1C1C24;
  --border:    #2A2A35;
  --text:      #F0F0F5;
  --text-soft: #A0A0B0;
  --text-muted:#6B6B7B;
  --brand-light: #2A1810;
}

body { background: var(--bg); color: var(--text); }
```

### 2.3 Tipografiya

```css
:root {
  --font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  --fs-xs:  12px;   --fs-sm:  14px;   --fs-base: 16px;
  --fs-lg:  18px;   --fs-xl:  20px;   --fs-2xl:  24px;
  --fs-3xl: 32px;   --fs-4xl: 40px;   --fs-5xl:  56px;   /* KDS uchun */
}
```

⚠️ **Kirill va lotin** — ikkalasi ham qo'llab-quvvatlansin (rus tili uchun).

### 2.4 KDS uslubi (oshxona TV) — `ai agent.mp4` ilhomi

```css
/* static/kds/css/kds.css — dark, neon, 3 metrdan o'qiladigan */
.kds {
  --kds-bg:     #08080C;
  --kds-card:   #12121A;
  --kds-border: #1F1F2E;
  --kds-new:    #00E5FF;    /* neon moviy */
  --kds-cook:   #FFB300;    /* neon sariq */
  --kds-ready:  #00E676;    /* neon yashil */
  --kds-late:   #FF1744;    /* neon qizil */
  font-size: 20px;
}
.kds-order-table { font-size: 56px; font-weight: 900; letter-spacing: -1px; }
.kds-order-item  { font-size: 28px; font-weight: 600; }
.kds-timer       { font-size: 32px; font-variant-numeric: tabular-nums; }
.kds-card.late   { animation: pulse-red 1s infinite; box-shadow: 0 0 24px var(--kds-late); }
@keyframes pulse-red { 0%,100%{opacity:1} 50%{opacity:.6} }
```

### 2.5 Komponentlar kutubxonasi

| Komponent | Fayl | Ishlatiladi |
|---|---|---|
| Button (primary/ghost/danger) | `components/button.css` | Hamma joyda |
| Card (dish/order/table) | `components/card.css` | Menyu, KDS |
| Modal (bottom-sheet mobil) | `components/modal.js` | Taom, AR, savat |
| Toast (success/error/info) | `components/toast.js` | Bildirishnoma |
| Skeleton loader | `components/skeleton.css` | Yuklanishda |
| Bottom sheet | `components/sheet.js` | Mobil modal |
| Stepper (−/+) | `components/stepper.js` | Miqdor |
| Rating (yulduz) | `components/rating.js` | Otziv |
| Progress bar | `components/progress.css` | Buyurtma holati |
| Badge | `components/badge.css` | HIT, YANGI, tugagan |
| Tabs | `components/tabs.js` | Kategoriya |
| Empty state | `components/empty.css` | Bo'sh savat |

### 2.6 Animatsiyalar (o'lchovli, ortiqcha emas)

| Hodisa | Animatsiya | Davomiylik |
|---|---|---|
| Savatga qo'shish | Rasm savatga uchadi | 400ms |
| Modal ochilish | Pastdan ko'tarilish + fade | 250ms |
| Buyurtma yuborildi | Checkmark chizilishi | 600ms |
| Tayyor bildirishnoma | Pulsatsiya + vibratsiya | 1s × 3 |
| AR yuklanishi | Aylanuvchi 3D skeleton | — |
| Tugma bosish | Scale 0.97 | 100ms |
| Sahifa o'tishi | Slide | 200ms |

⚠️ `prefers-reduced-motion` hurmat qilinadi.

### 2.7 Mobil moslashuv

| Ekran | Layout |
|---|---|
| < 400px | 1 ustun, bottom-sheet modal |
| 400-768px | 1-2 ustun |
| 768-1024px | 2-3 ustun (planshet) |
| > 1024px | Admin: sidebar + kontent; KDS: 3 ustun |

### 2.8 Ochiqlik (accessibility)

- ✅ Kontrast ≥ 4,5:1 (matn), ≥ 3:1 (katta matn)
- ✅ Klaviatura navigatsiyasi (Tab, Enter, Esc)
- ✅ ARIA yorliqlar (`aria-label`, `role`)
- ✅ Focus ko'rinadigan (`:focus-visible`)
- ✅ Rasm `alt` matni
- ✅ Shrift o'lchamini oshirish buzmaydi (rem)
- ✅ Ekran o'quvchi bilan sinovdan o'tgan

---

## 3. 📱 PWA (ilova o'rniga)

### 3.1 Manifest

```json
{
  "name": "ARMENU",
  "short_name": "ARMENU",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#FFFFFF",
  "theme_color": "#E85D2A",
  "icons": [
    {"src":"/static/icons/192.png","sizes":"192x192","type":"image/png"},
    {"src":"/static/icons/512.png","sizes":"512x512","type":"image/png"},
    {"src":"/static/icons/maskable.png","sizes":"512x512","purpose":"maskable"}
  ]
}
```

### 3.2 Service Worker strategiyalari

| Resurs | Strategiya | TTL |
|---|---|---|
| HTML | Network-first, cache fallback | — |
| CSS/JS | Cache-first, versiyalangan | 1 yil |
| Rasmlar | Cache-first | 7 kun |
| 3D fayllar | Cache-first | 30 kun |
| API menyu | Stale-while-revalidate | 60s |
| API buyurtma | Network-only | — |

### 3.3 Offline rejim

```javascript
// Offline'da nima ishlaydi
✅ Menyu ko'rish (keshdan)
✅ Taom tafsiloti
✅ Savatga qo'shish (localStorage)
✅ 3D ko'rish (kesh bo'lsa)
❌ Buyurtma yuborish → navbatga, internet kelganda yuboriladi
❌ To'lov
❌ Real-time holat
```

---

**➡️ Keyingi qism:** [07_AI_MCP.md](07_AI_MCP.md)
