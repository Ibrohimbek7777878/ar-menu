# seller-assets

Klassik Seller/Admin paneli (`backend/templates/base.html` va uning merosxo'rlari) uchun **lokal aktivlar manbasi**.
Oldin bu sahifalar Tailwind'ni brauzerda JIT (`cdn.tailwindcss.com`), Alpine'ni jsdelivr'dan, shriftlar va ikonkalarni
Google Fonts'dan yuklardi. Endi hammasi o'z serverimizdan beriladi. **Natija `backend/static/` ichiga commit qilinadi** —
CI/production'da `npm` kerak emas.

## Qurish

```bash
cd seller-assets
npm ci            # aniq pinlangan versiyalar (package-lock.json)
npm run build     # = build:css + build:vendor
```

| Buyruq | Nima qiladi | Natija |
|---|---|---|
| `npm run build:css` | Tailwind **3.4.17** (CDN ishlatgan versiya) + autoprefixer + cssnano (`colormin`siz) | `backend/static/seller/seller.css`, `backend/static/seller/finance_pdf.css` |
| `npm run build:vendor` | Alpine.js 3.17.5, Inter/Fraunces (woff2), Material Icons (woff2), `fonts.css` | `backend/static/vendor/alpine/`, `backend/static/vendor/fonts/` |

Quyidagilarni o'zgartirganingizda `npm run build:css` ni qayta ishga tushiring va natijani commit qiling:
`backend/templates/**/*.html`, `backend/static/seller/**/*.js` yoki Tailwind sinflari bor Python fayllar
(`finance/views.py`, `payments/views.py` va h.k. — `tailwind.config.js` dagi `content` ro'yxati).
Faqat bazadan / brauzerda dinamik yig'iladigan sinflar kod skanerlanganda ko'rinmaydi — ularni `tailwind.config.js`
dagi `safelist` ga qo'shing.

## Muhim qarorlar

- `tailwind.config.js` dagi `theme`/`darkMode` — `base.html` dagi (`SELLER_ASSETS=cdn` yo'lidagi) `tailwind.config` dan
  **aynan** ko'chirilgan. Dizayn tokenlari o'zgarsa, ikkala joyni birga yangilang.
- `seller.css` `base.html` `<head>` ning **eng oxirida** ulanadi: CDN o'z `<style>` ini ham aynan shu yerga qo'shgan edi
  (kaskad tartibi o'zgarmasligi uchun).
- `cssnano` da `colormin` o'chirilgan: u `rgb(.. / 0.9)` ni `#rrggbbaa` ga aylantirib alfani yaxlitlaydi va sidebar/header
  rangi 1 darajaga o'zgargan edi (CDN bilan piksel-farq).
- `finance_pdf.css` alohida: `seller/finance_pdf.html` Tailwind'ni **maxsus sozlamasiz** ishlatgan (standart tema).
- Shriftlar Google Fonts bilan bayt-bayt bir xil fayllar va **aynan o'sha** `@font-face` e'lonlari (Inter 400/500/600,
  Fraunces 400/600/700 — shuning uchun `font-bold` Inter'da avvalgidek 600 yuzida chiziladi). Ikonka shriftlarida
  `font-display: block` (swap bo'lsa yuklanguncha "shopping_cart" kabi ligatura matni ko'rinib qolardi).

## Zaxira (rollback) — hech narsa o'chirilmagan

`SELLER_ASSETS=cdn` (`.env` yoki admin paneldagi AppSetting `seller_assets`) eski CDN yo'lini qaytaradi; `local` — standart.
Kod o'zgartirish va qayta deploy kerak emas (AppSetting orqali).
