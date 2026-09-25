# 🎯 TZ: SOTUVGA TAYYORLASH — DIZAYN VA ISHONCH TUZATISHLARI

**Loyiha:** Online Store Guliston
**Sana:** 2026-09-23
**Asos:** Mijoz sifatida amalga oshirilgan vizual audit (desktop 1280px + mobil 390px, brauzer orqali)
**Maqsad:** Saytni Guliston bo'ylab real mijozlarga ko'rsatish (demo/sotuv) uchun ishonch darajasini oshirish

---

## 1. AUDIT XULOSASI (hujjatlashtirilgan holat)

Umumiy baho: **6.5/10** — funksional to'liq, lekin ishonch beruvchi detallar zaif.

### Tekshirilgan sahifalar:
| Sahifa | URL | Holat |
|---|---|---|
| Bosh sahifa | `/` | Struktura yaxshi, test ma'lumotlari muammosi |
| Katalog | `/catalog/` | 446 mahsulot, ishlaydi |
| Mahsulot | `/product/yogurt-bolalar-10/` | Soxta atributlar + sharh nomuvofiqligi |
| Savat | `/cart/` | ✅ To'liq ishlaydi |
| AR menyu | `/ar/` | Interaktiv 3D ko'rinmaydi |
| Mobil (390px) | — | Layout moslashadi, header tiqilgan |

### Tashxisda aniqlangan raqamlar:
- **291 ta mahsulotda** soxta generik variantlar (1 litr sutga `Og'irligi: 2kg/500g`, futbolkaga `1kg`)
- **290 ta mahsulotda** `reviews_count`/`rating` soxta qiymatda (32 ta sharh yozilgan, real sharh 0 ta)
- **446 ta mahsulot** rasmida stok suv belgilari (watermark) bor
- Footer'da o'rinbosar telefon `+998 90 123 45 67` fallback sifatida chiqyapti

---

## 2. USTUVORLIKLAR VA BAJARILISH REJASI

### 🔴 BLOK-1: Ishonch killerlari (kod + data — hozir tuzatiladi)

| # | Vazifa | Fayl/Qurilma | Qabul mezonlari |
|---|---|---|---|
| 1.1 | **Sharh sinxronlash**: `rating`/`reviews_count` → real `Review` qatorlari bilan hisoblash (290 mahsulot to'g'rilanadi) | `scripts/fix_reviews_sync.py` + `web/views.py` (yangi sharh qo'shilganda allaqachon to'g'ri hisoblanadi) | Hech bir mahsulotda real sharhsan katta raqam chiqmasligi kerak |
| 1.2 | **Soxta variantlarni tozalash**: 291 mahsulotdan generik `Rangi/O'lchami/Og'irligi` variantlarini o'chirish (sotuvchi panelida qayta qo'shishi mumkin) | `scripts/fix_variants_cleanup.py` | Yogurt sahifasida "Rangi/O'lchami" bloki ko'rinmasligi kerak |
| 1.3 | **Placeholder telefon**: footer'da `+998 90 123 45 67` fallback olib tashlanadi — `public_settings.contact_phone` bo'lmasa umuman chiqmaydi | `templates/customer/base_customer.html:148` | Footer'da soxta raqam ko'rinmaydi |
| 1.4 | **Sharh raqami bir xil bo'lishi**: yuqoridagi badge va pastdagi "Sharhlar (N)" bir manbadan o'qishi kerak | `templates/customer/product_detail.html:225` | Ikki joyda bir xil raqam |

### 🟡 BLOK-2: UX yaxshilanishlari (shu sessiyada)

| # | Vazifa | Fayl | Qabul mezonlari |
|---|---|---|---|
| 2.1 | **Mobil header soddalashtirish**: til tanlash (UZ/RU/EN) mobil'da yashiriladi yoki profilga ko'chiriladi; tiqilish kamayadi | `templates/customer/base_customer.html` | 390px da elementlar orasida bo'shliq, burger orqali navigatsiya |
| 2.2 | **AR sahifada interaktiv 3D**: sahifa ochilishi bilan kamida bitta mavjud `.glb` model `<model-viewer>` ichida aylanuvchi holda ko'rinadi | `templates/customer/ar_menu.html` (yoki ar_catalog) | Ochilganda 3D model avtomatik aylanadi, drag bilan buriladi |

### 🟢 BLOK-3: Sotuvchi resurslari talab qiladi (TZ'da qoladi, alohida bajariladi)

| # | Vazifa | Kim | Izoh |
|---|---|---|---|
| 3.1 | **Real mahsulot rasmlari** (suvsiz) | Sotuvchi/fotograf | 446 mahsulot — AI generatsiya yoki real suratga olish. Bu kod bilan yechilmaydi |
| 3.2 | **Haqiqiy aloqa raqami** | CEO | `public_settings.contact_phone` ga admin paneldan kiritiladi |
| 3.3 | **Click/Payme sandbox kalitlari** | CEO | `.env` ga kiritiladi, keyin real to'lov sinovi |
| 3.4 | **Premium dizayn (Apple/Linear uslubi)** | Dizayner | TZ_IDEAL_2026.md §5 bo'yicha keyingi bosqich |

---

## 3. TEXNIK DETALLAR

### 3.1 Sharh sinxronlash algoritmi
```python
# Har bir Product uchun:
agg = product.reviews.aggregate(avg=Avg('rating'), cnt=Count('id'))
product.rating = round(agg['avg'] or 0, 1)   # sharh yo'q → 0
product.reviews_count = agg['cnt'] or 0
product.save(update_fields=['rating', 'reviews_count'])
```
Bu mantiq `web/views.py:333-338` da allaqachon bor (yangi sharh yozilganda) — biz butun bazani bir marta to'g'rilaymiz.

### 3.2 Variant tozalash qoidasi
`Product.variants` JSONField — test seed skriptlari hamma mahsulotga bir xil shablon yozib tashlagan:
- `Rangi: [Oq, Ko'k]` (type: color) — 135 ta
- `O'lchami: [XL, S, L]` (type: size) — 136 ta
- `Og'irligi: [500g, 1kg, 2kg]` (type: weight) — 94 ta
- `Qadoqi` (pack) — 22 ta, `Xotira` (storage) — 7 ta

**Qaror:** hammasi o'chiriladi ( [] bo'shatiladi ), chunki barchasi generik. Sotuvchi paneli orqali real variantlar qo'shiladi.

### 3.3 Mobil header (2.1) yechimi
- `md:` dan kichik ekranlarda til tanlash tugmalari ko'rinmaydi (til URL `?lang=` orqali footer'da ham bor)
- Ikkilamchi nav elementlar (3D Printer badge) mobil'da ixchamlashadi
- Asosiy navigatsiya pastki bar'ga qoladi (allaqachon bor — yaxshi ishlayapti)

### 3.4 AR sahifa (2.2) yechimi
Mavjud resurslar: `media/products/*_3d.glb`, `media/ar/glb/*.glb` — model fayllar bazada bor.
`<model-viewer>` allaqachon loyihada ishlatilgan (product_ar.html). AR katalog sahifasida birinchi 3D modelli mahsulotni hero sifatida avtomatik aylanadigan qilib ko'rsatamiz.

---

## 4. TEST REJASI

Har bir blokdan keyin:
1. `manage.py check` — xatosiz
2. Brauzerda vizual tekshiruv (yogurt sahifasi, footer, mobil 390px, /ar/)
3. `manage.py test` — 21 ta test o'tishi kerak

## 5. TAQIQ practicE
- Hech qanday ma'lumot o'chirishda oldin zaxira hisoblangan (script `before` sonini chiqaradi)
- Migratsiya talab qilinmaydi (data + template o'zgarishlari)
- `.env`, parollar, tokenlar tegilmaydi
