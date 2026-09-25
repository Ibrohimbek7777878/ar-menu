# TZ — Sotuvchi Do'kon Yaratish (Ideal, Murakkab) — Dropshipping Soddaligida

**Loyiha:** Online Store Guliston — Gipermahalliy Marketplace  
**Modul:** `Shop` + `ShopPage` (Store Builder) — `shops/models.py:16`, `shops/models.py:116`, `web/seller_views.py:203`, `templates/seller/shop.html`, `templates/seller/shop_create.html`, `admin/shop_builder.html`  
**Maqsad:** Har qanday oddiy sotuvchi (texnik bilimsiz) **1 daqiqada** o'zining chiroyli, tayyor dizaynli, to'liq moslashuvchan **online do'konini** yaratsin — xuddi Shopify / Dropshipping dagi kabi: **shablon tanla → mosla → nashr et**, kodsiz, sudrab-tashlashsiz, mutaxassis yordamisiz.  
**Tamoyil:** *Tanlab moslash* — qurish emas. Foydalanuvchi bo'sh sahifadan boshlamaydi, **tayyor professionallar qilgan 3 ta dizayndan birini tanlaydi va faqat o'ziga moslaydi** (nom, rang, rasm, mahsulot filtri).  
**Tillari:** uz / ru / en  
**Versiya:** 2026-09-01 · **Holat:** Ideal TZ (amalga oshirish ketma-ket bosqichlarda, buzilmasdan)

---

## 0. Qisqa Xulosa (30 soniya)

Sotuvchi do'kon yaratishi — **3 qadam, 60 soniya:**

1.  **Nom ber** (`Do'kon nomi*` → `slug` avtomatik) — darhol `Shop` yaratiladi.
2.  **Shablon tanla** — `Minimal` (oq, toza), `Neon` (yashil gradient, futuristik), `Classic` (qora-sariq, ishonchli) — bosing, **darhol jonli preview**.
3.  **Mosla** (ixtiyoriy) — rang, logo, banner, sektsiya qo'sh/o'chir/tartib → **Saqlash** → darhol `/shop/<slug>/` da ko'rinadi, mahsulotlar avtomatik chiqadi.

Qayta kiritish yo'q: mahsulot qo'shsang ham global `catalog` ham o'z do'koningda paydo bo'ladi (dual listing).

---

## 1. Muammo (hozir)

- `seller/shop.html` da maydonlar ko'p, shablon tushunchasi yo'q — foydalanuvchi bo'sh formani ko'rib qo'rqadi.
- `shop_create.html` faqat nom so'raydi, keyin builderga o'tish noaniq — "qayerdan dizayn qilaman?" degan savol.
- `admin/shop_builder.html` da `layout` JSON bor, lekin **preview yo'q**, tartib faqat `up/down` tugma, drag-drop yo'q, rang tanlash yo'q, mobil/desktop toggle yo'q.
- Yangi sotuvchi "dropshipping" dagi kabi **bir klikda tayyor do'kon** ololmaydi — hamma narsani qo'lda yig'ishi kerak.

---

## 2. Maqsad — Ideal Holat

### 2.1 Foydalanuvchi Hikoyasi (User Story)

> **Asal, 24 yosh, Gulistonda non do'koni bor.** U telefonidan `seller/register/` ga kiradi, `Nonvoy Asal` deb yozadi, `Yaratish` ni bosadi → 3 ta chiroyli shablon rasmini ko'radi, `Minimal` ni bosadi → preview da o'z do'koni nomi, 4 ta non rasmi, xaritasi bilan chiqadi → `Jo'natish` → havola `guliston.uz/shop/nonvoy-asal/` ni oladi va darhol Telegram da ulashadi. **Jami 58 soniya.**

### 2.2 Muvaffaqiyat Mezoni (North Star)

- **Vaqt:** Ro'yxatdan o'tishdan nashrgacha o'rtacha **< 90 sekund**.
- **Konversiya:** Ro'yxatdan o'tganlarning **> 85%** i kamida 1 ta shablonni tanlab nashr qiladi.
- **Qo'llab-quvvatlash:** "Qanday dizayn qilaman?" degan murojaat **0 ta**.

---

## 3. Arxitektura — 4 Qatlam

```
[1. YARATISH]  seller/register (nom) + seller/shop_create (nom+majburiy) → Shop.objects.create(slug, owner, is_open=True, lat/lng default)
       ↓
[2. TANLASH]  seller/shop/builder → 3 ta shablon kartasi (Minimal/Neon/Classic) → bosish → ShopPage.template = 'minimal'|'neon'|'classic' + layout = default_layout(template)
       ↓
[3. MOSLASH]  builder → chap: sektsiya ro'yxati + o'ng: preview (mobile/desktop toggle) → har sektsiya props (title, subtitle, text, image, product_filter, limit, color) → ShopPage.layout JSON
       ↓
[4. NASHR]    is_published=True → customer/shop_detail.html:201 da ShopPage.layout render → /shop/<slug>/ jonli
```

- **Saqlash:** `ShopPage` `shop/models.py:116` (`OneToOne Shop`, `template`, `layout JSON`, `is_published`, `updated_at`). `layout` — `[{"type","title","subtitle","text","image","product_filter","limit","color"}]`
- **Dropshipping prinsipi:** Sotuvchi **bo'sh layout dan boshlamaydi** — shablon tanlash *default_layout()* ni avtomatik to'ldiradi (hero + category_strip + product_grid + map + reviews). Keyin faqat o'chirish/qo'shish.
- **Backward Compatibility:** `Shop` da `is_fast_delivery` kabi maydonlar borligicha qoladi, builder ularni buzmaydi. Eski do'konlarda `ShopPage` yo'q bo'lsa `default_layout()` ko'rsatiladi (`web/views.py:217`).

---

## 4. Shablonlar — 3 ta Tayyor Dizayn (Ideal)

| Kod | Nomi | Uslub | Rang | Qachon |
|-----|------|-------|------|--------|
| `minimal` | Minimal | Oq, toza, Apple Store kabi, ko'p havo | `#ffffff` + `#16a34a` aksent, `Inter` + `Fraunces` | Non, sabzavot, kiyim — universal |
| `neon` | Neon | Qorong'i gradient, neon yashil, glassmorphism | `#0a0a0a` + `#22c55e` neon, `blur 14px` | Elektronika, yoshlar, trend |
| `classic` | Classic | Qora-sariq, ishonchli, bozor | `#1a1a1a` + `#f59e0b` | Qurilish, avto, ulgurji |

**Har shablon — 5 ta sektsiya bilan keladi (default_layout):**

1.  `hero` — sarlavha (do'kon nomi) + subtitle (tavsif) + rasm (banner/image) + CTA `Mahsulotlarni ko'rish` → `#catalog`
2.  `category_strip` — gorizontal kategoriyalar lentasi (Shop.category dan)
3.  `product_grid` — `product_filter` bo'yicha 12 ta mahsulot, `limit` sozlanadigan, `is_fast_delivery` bo'lsa ⚡ belgisi
4.  `map` — `shop.address` + `latitude/longitude` + `Xaritada ochish` (Leaflet)
5.  `reviews` — `Review` dan 6 ta oxirgi sharh

Foydalanuvchi xohlasa `banner`, `cta`, `richtext`, `ar_showcase` ni qo'shadi.

---

## 5. Builder UI — Dropshipping Soddaligi (Ideal)

### 5.1 Sahifa Tuzilishi (`seller/shop_builder.html` ideal)

```
┌─────────────────────────────────────────────────────────────┐
│ [← Do'konim]  Store Builder — Nonvoy Asal   [Saytni ko'rish] [Saqlash] │
├──────────────┬──────────────────────────────┬───────────────┤
│  CHAP        │  O'RTA (PREVIEW)             │  O'NG         │
│  Shablonlar  │  [Mobile | Desktop] toggle   │  Xususiyatlar │
│  ○ Minimal ✓ │  ┌─────────────────────┐     │  Sarlavha: [ ]│
│  ○ Neon      │  │ Hero                │     │  Kichik: [ ]  │
│  ○ Classic   │  │ Kategoriyalar       │     │  Rasm URL: [ ]│
│  ─────────── │  │ Mahsulotlar 12 ta   │     │  Filtr: [ ]   │
│  Sektsiyalar │  │ Xarita              │     │  Limit: [12]  │
│  [hero] ↑↓🗑 │  │ Sharhlar            │     │  Rang: [🎨]   │
│  [product]   │  └─────────────────────┘     │               │
│  [+ Qo'shish]│  Jonli, haqiqiy mahsulotlar  │               │
└──────────────┴──────────────────────────────┴───────────────┘
```

- **Chap:** Shablon kartalari (rasm + nomi, tanlanganda `ring-2 ring-primary`), keyin joriy `layout` ro'yxati (har biri `↑ ↓ 🗑`), pastda `+ Yangi sektsiya` (modal emas, shu yerda inline form).
- **O'rta:** Haqiqiy `customer/shop_detail.html` renderi, `iframe` emas — bir xil `shop_section.html` komponenti, `template` ga qarab CSS o'zgaradi (`minimal: bg-accent`, `neon: bg-gradient-to-br from-primary/20`, `classic: bg-sand`). `Mobile` (390px) / `Desktop` (1280px) toggle — `max-w-[390px]` vs `max-w-6xl`.
- **O'ng:** Tanlangan sektsiya propslari (faqat o'sha sektsiya uchun kerakli maydonlar). Masalan `hero` da `title, subtitle, image`, `product_grid` da `product_filter, limit`.

### 5.2 O'zaro Ta'sir (Interaction)

- **Shablon tanlash:** Bosish → `POST template=neon` → `ShopPage.template` yangilanadi, `layout` agar bo'sh bo'lsa `default_layout()` bilan to'ldiriladi, agar bor bo'lsa faqat `template` almashadi (ma'lumot yo'qolmaydi) → `messages.success("Shablon saqlandi")`.
- **Sektsiya qo'shish:** `Turi` select → `Sarlavha` → `Qo'shish` → `layout.append({...})` → `save(update_fields=['layout'])` → preview darhol yangilanadi (HTMX yoki `location.reload()` — MVPda reload yetarli, kelajakda HTMX).
- **Tartib:** `↑`/`↓` → `layout[idx] <-> layout[swap]` → save. Drag-drop (SortableJS) — 2-bosqichda, hozir tugma yetarli, lekin sodda.
- **O'chirish:** `🗑` → `confirm("O'chirish?")` → `layout.pop(idx)` → save.
- **Rang:** `color` input `type="color"` — tanlansa `section.color` saqlanadi, preview da `style="background: {{ section.color }}"`.

### 5.3 Soddalik Qoidalari (Dropshipping UX)

1.  **Bitta ekran, bitta maqsad:** Builderda faqat dizayn — narx, ombor yo'q (u `seller/products` da).
2.  **Bo'sh holat yo'q:** Har doim 5 ta sektsiya bor, o'chirsang ham `+ Qo'shish` bilan qaytarasan.
3.  **Xato yo'q:** `title` bo'sh bo'lsa ham saqlanadi — `section.title|default:"Yangi bo'lim"` ko'rsatiladi.
4.  **Saqlash = Nashr:** `Saqlash` bosish → `is_published=True` avtomatik (alohida `Nashr` tugmasi yo'q — dropshipping dagi kabi `Publish` bir xil).
5.  **Qaytish oson:** `Do'konim` → `seller/shop/` (maydonlar), `Saytni ko'rish` → `/shop/<slug>/` yangi tab.

---

## 6. Ma'lumot Modeli (To'liq)

### 6.1 `Shop` (`shops/models.py:16`) — mavjud, buzilmaydi

| Maydon | Tur | Izoh |
|--------|-----|------|
| `is_fast_delivery` | bool | Tezkor 30 daqiqa badge, shop_card da ⚡ |
| `owner` | FK AdminUser | `seller_required` da `request.tenant_shop` |
| `plan` | basic/pro/business | AI kredit uchun, builderga ta'sir yo'q |

Yangi maydon qo'shilmaydi — builder faqat `ShopPage` da.

### 6.2 `ShopPage` (`shops/models.py:116`) — ideal kengaytma

```python
TEMPLATE_CHOICES = [('minimal','Minimal'),('neon','Neon'),('classic','Classic')]
COLOR_PRESETS = ['#16a34a','#0a0a0a','#f59e0b','#ffffff','#1a1a1a'] # kelajak

class ShopPage(models.Model):
    shop = OneToOneField(Shop, related_name='page', on_delete=CASCADE)
    template = CharField(max_length=20, choices=TEMPLATE_CHOICES, default='minimal')
    layout = JSONField(default=list) # [{"type","title","subtitle","text","image","product_filter","limit","color"}]
    is_published = BooleanField(default=True)
    updated_at = DateTimeField(auto_now=True)
    # Kelajak: custom_css, seo_title, seo_desc
```

`default_layout(self, template)` — `template` ga qarab `hero` rangi o'zgaradi:
- `minimal`: `title=shop.name, subtitle=shop.description, image=''`
- `neon`: `title=shop.name + " — Neon", subtitle="Tez, yorqin, zamonaviy"`
- `classic`: `title=shop.name, subtitle=shop.address`

---

## 7. Funksional Talablar (To'liq Ro'yxat)

### 7.1 Yaratish
- `seller/register/` → `Shop.objects.create(name, slug, owner=user, is_open=True, lat/lng default)` — hozir bor (`seller_views.py:68`), buzilmaydi.
- `seller/shop_create.html` (do'koni yo'q sotuvchi) — hozir `no_shop` bilan katta karta, saqlanadi, lekin **shablon tanlash qo'shiladi** (3 ta kartani ko'rsatish, tanlanganda `shop_create` da `template` POST bilan birga).

### 7.2 Shablon Tanlash
- `GET seller/shop/builder/` → 3 ta shablon kartasi, joriy `page.template` da `ring-2`, bosganda `POST template=...` → `page.save(update_fields=['template'])`.
- `is_published` har doim `True` (dropshipping: tanlash = nashr).

### 7.3 Moslash
- `POST action=add` → `type,title,subtitle,text,image,product_filter,limit,color` → `layout.append` → save.
- `POST action=up/down/delete` → tartib/o'chirish → save.
- `POST is_published` → checkbox (lekin default `on`, yashirish mumkin).
- Har `POST` dan keyin `redirect('seller_shop_builder')` — preview yangilanadi.

### 7.4 Render
- `web/views.py:201 customer_shop_detail` → `page = ShopPage.objects.filter(shop=shop).first()` → `sections = page.layout or default_layout()` → `{% include "components/shop_section.html" with section %}` — hozir bor, `template` ni ham uzatish kerak (`shop_section.html:5` da `{% if template == 'neon' %}`).

### 7.5 Izolyatsiya va Xavfsizlik
- `seller_required` + `request.tenant_shop` — boshqa do'konni `?shop=ID` bilan ko'rib bo'lmaydi (403 log).
- `ShopPage` faqat `shop=tenant_shop` bo'yicha `get_or_create`.
- `layout` da `script` taglari escape qilinadi (`|escape`).

---

## 8. Nofunksional

- **Tezlik:** Builder sahifasi `< 800ms` (layout 10 ta sektsiya, `select_related` shart emas, JSON kichik).
- **Mobil:** Builderning o'zi ham mobil da ishlaydi (chap menyu pastga tushadi, `grid-cols-1 lg:grid-cols-3`).
- **Offline:** Yo'q — builder onlayn, lekin `is_published=False` bo'lsa ham `shop_detail` da `default_layout` ko'rinadi (bo'sh emas).
- **SEO:** `ShopPage` da kelajakda `seo_title`, `meta_desc` — hozir `shop.name` yetarli.

---

## 9. Interfeys Matnlari (Oddiy Odam Tili)

- `Do'kon sahifasini yig'ish` → `Do'koning dizayni` (sodda)
- `Dizayn shabloni` → `Tayyor dizaynni tanlang`
- `Sektsiyalar (tartib)` → `Bo'limlar`
- `Yangi sektsiya qo'shish` → `+ Bo'lim qo'shish`
- `Turi` → `Qanday bo'lim?`
- `Mahsulot filtri` → `Qaysi mahsulotlar chiqsin? (bo'sh = hammasi)`
- `Holatni saqlash` → `Saqlash`

---

## 10. Qabul Mezonlari (DoD)

```
[ ] Oddiy sotuvchi seller/register/ → seller/shop_create (nom) → builder da 3 ta shablonni ko'radi, birini bosadi → preview darhol o'zgaradi → Saqlash → /shop/<slug>/ da tanlangan dizayn ko'rinadi
[ ] Builder da + Bo'lim qo'shish → product_grid (limit 6) → Saqlash → do'konda 6 ta mahsulot chiqadi
[ ] Tartib ↑ ↓ va o'chirish ishlaydi, preview yangilanadi, ma'lumot yo'qolmaydi
[ ] Do'koni yo'q sotuvchi seller/products da ham builder ga emas, shop_create dagi 3 ta shablondan birini tanlab darhol nashr qila oladi
[ ] Boshqa sotuvchi ?shop=ID bilan kira olmaydi, 404
[ ] Eski do'konlarda ShopPage yo'q bo'lsa default_layout ko'rinadi, 500 yo'q
[ ] Mobile 390px da builder 3 ustun emas, 1 ustun bo'lib pastga tushadi, tugmalar bosiladi
[ ] /shop/<slug>/ da is_fast_delivery bo'lsa ⚡ 30 daqiqa badge chiqadi (shop_card va shop_detail da)
```

---

## 11. Ochiq Savollar

1.  Shablon rasmlari qayerdan? (hozir `minimal/neon/classic` da CSS, kelajakda har shablon uchun 1 ta preview PNG `static/shop_templates/`)
2.  Rangni har sektsiya uchunmi yoki butun do'kon uchunmi? (hozir har sektsiya `color`, kelajakda global `ShopPage.primary_color`)
3.  Drag-drop kerakmi? (hozir ↑↓ yetarli, dropshipping dagi kabi sodda — drag 2-bosqichda SortableJS)

---

*Hujjat ideal va murakkab darajada — amalda M1 da 3 ta shablon + preview, M2 da drag-drop + rang, M3 da SEO + custom CSS ketma-ket qo'shiladi, mavjud `is_fast_delivery` va `Shop` buzilmaydi.*
