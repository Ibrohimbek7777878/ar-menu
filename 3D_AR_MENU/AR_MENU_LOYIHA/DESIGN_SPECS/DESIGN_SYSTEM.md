# ARMENU — Design System v2.0
> **Lovable.dev Complete Design Specification** | Nuqtadan nuqtagacha, pixel-perfect

---

## ⚠️ MUHIM ESLATMA
Agar bu loyihaning dizaynini ko'rgan kishi "wow, bu ajoyib" demasa — dizayn maqsadga erishmagan. Har bir piksel, har bir animatsiya, har bir rang qasddan tanlangan. Bu hujjatni so'zma-so'z bajaring.

---

## 1. DIZAYN FALSAFASI

### Konsepsiya: "Qorong'u Restoran Menyu"
Tasavvur qiling: Kechqurun moddiy ishlanmagan, premium restoran. Past yorug'lik, marmar stol, taomlar professional suratga olingan. Foydalanuvchi telefon ekranini ko'taradi — va ekran aynan shu atmosferani beradi.

### 3 Tamoyil
1. **Minimal shovqin** — Faqat zarur elementlar. Hech qanday keraksiz chegara, rang, matn yo'q.
2. **Taom birinchi** — Karta maydonining 55%+ i rasm. Taom chiroyli ko'rinishi kerak.
3. **Harakatlar silliq** — Har bir bosish, o'tish, animatsiya 60fps da ishlaydi. Lag yo'q.

---

## 2. RANGLAR (Color Tokens)

### 2.1 Brand Ranglar — O'ZGARTIRMANG
```css
--brand:         #E85D2A;   /* Ember Orange — asosiy CTA */
--brand-hover:   #D14E1F;   /* Hover holati, 10% qoraytirilgan */
--brand-light:   #FF7A48;   /* Light holat, 10% ochroq */
--brand-glow:    rgba(232, 93, 42, 0.35);  /* Glow effekti */
--brand-subtle:  rgba(232, 93, 42, 0.12);  /* Subtle background */

--success:       #10B981;   /* Emerald — AR/3D badge */
--success-glow:  rgba(16, 185, 129, 0.35);
```

### 2.2 Dark Mode (Asosiy tema)
```css
--bg-primary:    #0A0C14;   /* Obsidian — asosiy fon */
--bg-secondary:  #111320;   /* Ikkinchi darajali fon */
--bg-card:       #181D30;   /* Karta foni */
--bg-card-hover: #1E2438;   /* Karta hover foni */
--bg-elevated:   #1A1F33;   /* Ko'tarilgan element */
--bg-overlay:    rgba(10, 12, 20, 0.92); /* Modal overlay */

--text-primary:  #F0F2FF;   /* Asosiy matn — sof oq emas */
--text-secondary:#9BA3C2;   /* Ikkinchi darajali matn */
--text-muted:    #5A6180;   /* Susaytirilgan matn */
--text-brand:    #E85D2A;   /* Brand rangli matn */

--border-subtle: rgba(255, 255, 255, 0.06); /* Nozik chegara */
--border-card:   rgba(255, 255, 255, 0.09); /* Karta chegarasi */
--border-active: rgba(232, 93, 42, 0.45);   /* Aktiv holat chegarasi */
```

### 2.3 Light Mode
```css
--bg-primary:    #F5F5F7;   /* Apple-style light grey */
--bg-secondary:  #FFFFFF;
--bg-card:       #FFFFFF;
--bg-card-hover: #FAFAFA;
--bg-elevated:   #FFFFFF;

--text-primary:  #0A0C14;
--text-secondary:#4A5180;
--text-muted:    #9BA3C2;

--border-subtle: rgba(0, 0, 0, 0.06);
--border-card:   rgba(0, 0, 0, 0.09);
```

### 2.4 Status Ranglari (KDS uchun)
```css
--status-new:       #F59E0B;  /* Amber — yangi buyurtma */
--status-preparing: #3B82F6;  /* Blue — tayyorlanmoqda */
--status-ready:     #10B981;  /* Emerald — tayyor */
--status-served:    #6B7280;  /* Grey — berildi */
```

### 2.5 Glassmorphism Variables
```css
--glass-bg:      rgba(24, 29, 48, 0.72);
--glass-border:  rgba(255, 255, 255, 0.08);
--glass-blur:    blur(20px);
--glass-shadow:  0 8px 32px rgba(0, 0, 0, 0.48);
```

---

## 3. TIPOGRAFIYA

### 3.1 Shrift
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
/* Google Fonts CDN: https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap */
```

### 3.2 O'lcham Shkala
```css
--text-xs:    11px / line-height: 1.4;  /* Label, badge matn */
--text-sm:    13px / line-height: 1.5;  /* Ikkinchi darajali matn */
--text-base:  15px / line-height: 1.6;  /* Asosiy matn */
--text-md:    17px / line-height: 1.5;  /* Kichik sarlavha */
--text-lg:    20px / line-height: 1.4;  /* Sarlavha */
--text-xl:    24px / line-height: 1.3;  /* Katta sarlavha */
--text-2xl:   30px / line-height: 1.2;  /* Hero sarlavha */
--text-3xl:   38px / line-height: 1.1;  /* KDS raqamlar */
```

### 3.3 Og'irlik (Font Weight)
```css
400 — Regular (tavsif, ikkinchi darajali)
500 — Medium (navigatsiya, label)
600 — SemiBold (taom nomi, narx)
700 — Bold (sarlavhalar, CTA tugmalar)
800 — ExtraBold (hero, muhim raqamlar)
```

### 3.4 Narx Formatlash
```
45 000 so'm   ← UZS format (bo'sh joy bilan)
$15.99        ← USD format
Font-weight: 700, color: var(--brand), font-size: --text-md
```

---

## 4. SPACING VA BORDER RADIUS

### 4.1 Spacing Tizimi (8px asosida)
```css
--space-1:   4px
--space-2:   8px
--space-3:   12px
--space-4:   16px
--space-5:   20px
--space-6:   24px
--space-8:   32px
--space-10:  40px
--space-12:  48px
--space-16:  64px
```

### 4.2 Border Radius
```css
--radius-sm:   8px    /* Input, kichik element */
--radius-md:   12px   /* Badge, chip */
--radius-lg:   16px   /* Karta, modal */
--radius-xl:   20px   /* Katta karta */
--radius-2xl:  24px   /* Tugma */
--radius-full: 9999px /* Pill, yumaloq */
```

### 4.3 Shadow
```css
--shadow-sm:  0 1px 4px rgba(0,0,0,0.20);
--shadow-md:  0 4px 16px rgba(0,0,0,0.30);
--shadow-lg:  0 8px 32px rgba(0,0,0,0.40);
--shadow-xl:  0 16px 48px rgba(0,0,0,0.50);
--shadow-brand: 0 4px 20px rgba(232, 93, 42, 0.40);
--shadow-glow:  0 0 20px rgba(232, 93, 42, 0.25), 0 0 40px rgba(232, 93, 42, 0.10);
```

---

## 5. ANIMATSIYALAR — MUKAMMAL SPESIFIKATSIYA

### 5.1 Animatsiya Falsafasi
Barcha animatsiyalar **maqsadga xizmat qiladi**. Foydalanuvchi nima bo'lyapti degan savolga javob beradi. Hech qanday dekorativ, sabab yo'q animatsiya yo'q.

### 5.2 Easing Funksiyalari
```css
--ease-out:     cubic-bezier(0.0, 0.0, 0.2, 1.0);  /* Tezlikdan sekinlikka */
--ease-in:      cubic-bezier(0.4, 0.0, 1.0, 1.0);  /* Sekinlikdan tezlikka */
--ease-in-out:  cubic-bezier(0.4, 0.0, 0.2, 1.0);  /* Yumshoq ikki tomoni */
--ease-spring:  cubic-bezier(0.34, 1.56, 0.64, 1.0); /* Elastik, sakrash */
--ease-bounce:  cubic-bezier(0.68, -0.55, 0.27, 1.55); /* Kuchli sakrash */
```

### 5.3 Muddatlar
```css
--dur-instant:  80ms    /* Tugma press feedback */
--dur-fast:     150ms   /* Hover holat */
--dur-normal:   250ms   /* Standart o'tish */
--dur-slow:     400ms   /* Modal ochilish */
--dur-slower:   600ms   /* Katta animatsiyalar */
--dur-slowest:  1000ms  /* Sahifa kirish */
```

### 5.4 Animatsiya: Savat Uchishi (animateFlyToCart)
**Nima:** Taom savatga qo'shilganda rasm uchib savat ikonkasiga boради.
**Qachon:** Foydalanuvchi "+" tugmasini bosganida, yoki QuickAdd modal ichida.

```
Jarayon:
1. Taom kartasidagi rasm klon olinadi (position: fixed)
2. Boshlang'ich pozitsiya: kartaning o'rta nuqtasi
3. Parabolik yo'l: ikkita CSS transform (X va Y mustaqil animatsiyalar)
   - X o'qi: linear (to'g'ri chiziq)
   - Y o'qi: ease-in (tushish parabolasi)
4. Rasm scale: 1.0 → 0.3 (kichrayib boradi)
5. Opacity: 1.0 → 0.0 (so'nadi)
6. Savat ikonkasida: cartBounce animatsiyasi (150ms)
7. Haptic feedback: navigator.vibrate(35) (35ms)

Vaqt:
- Uchish davomiyligi: 480ms
- X easing: linear
- Y easing: cubic-bezier(0.55, 0, 1, 0.45) [parabolik tushish]
- Klon yo'q qilish: animatsiya tugagach
```

### 5.5 Animatsiya: cartBounce (savat ikonkasi)
```css
@keyframes cartBounce {
  0%   { transform: scale(1.0); }
  35%  { transform: scale(1.28) rotate(-8deg); }
  65%  { transform: scale(0.92) rotate(4deg); }
  85%  { transform: scale(1.08) rotate(-2deg); }
  100% { transform: scale(1.0) rotate(0deg); }
}
/* duration: 420ms, easing: ease-out, fill-mode: both */
```

### 5.6 Animatsiya: pulseGlow (AR badge)
```css
@keyframes pulseGlow {
  0%, 100% {
    box-shadow: 0 0 0px 0px rgba(16,185,129,0);
    opacity: 1.0;
  }
  50% {
    box-shadow: 0 0 8px 3px rgba(16,185,129,0.60);
    opacity: 0.85;
  }
}
/* duration: 2.2s, easing: ease-in-out, iteration: infinite */
```

### 5.7 Animatsiya: heroShimmer (hero banner)
```css
@keyframes heroShimmer {
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
}
/* duration: 3s, easing: linear, iteration: infinite */
/* gradient: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%) */
/* background-size: 200% 100% */
```

### 5.8 Animatsiya: cardHoverLift (karta hover)
```css
/* CSS transition orqali, JS kerak emas */
.dish-card {
  transition: transform 200ms var(--ease-out),
              box-shadow 200ms var(--ease-out);
}
.dish-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}
.dish-card:active {
  transform: translateY(-1px) scale(0.985);
  transition-duration: 80ms;
}
```

### 5.9 Animatsiya: Modal Ochilishi
```css
@keyframes modalSlideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
/* duration: 380ms, easing: cubic-bezier(0.32, 0.72, 0, 1) */
/* Bu iOS bottom sheet easing — eng natural ko'rinadi */

/* Overlay foni */
@keyframes overlayFadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
/* duration: 250ms, easing: ease-out */
```

### 5.10 Animatsiya: Toast Bildirish
```css
@keyframes toastSlideIn {
  from {
    transform: translateY(-120%) scale(0.92);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1.0);
    opacity: 1;
  }
}
/* Chiqish: */
@keyframes toastSlideOut {
  from {
    transform: translateY(0) scale(1.0);
    opacity: 1;
  }
  to {
    transform: translateY(-120%) scale(0.88);
    opacity: 0;
  }
}
/* Kirish: 250ms ease-out | Chiqish: 200ms ease-in */
```

### 5.11 Animatsiya: Skeleton Loading (yuklanish holati)
```css
@keyframes skeletonWave {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
.skeleton {
  background: linear-gradient(
    90deg,
    var(--bg-card) 25%,
    var(--bg-elevated) 50%,
    var(--bg-card) 75%
  );
  background-size: 800px 100%;
  animation: skeletonWave 1.4s ease-in-out infinite;
  border-radius: var(--radius-md);
}
```

---

## 6. KOMPONENTLAR — TO'LIQ SPESIFIKATSIYA

### 6.1 HEADER

#### Tuzilma
```
[Logo/Restoran nomi]          [Til tugmasi: UZ | RU | EN]
```

#### Vizual
- **Pozitsiya**: `position: sticky; top: 0; z-index: 100`
- **Balandlik**: `56px`
- **Fon**: glassmorphism — `var(--glass-bg)`, `backdrop-filter: var(--glass-blur)`
- **Pastki chegara**: `border-bottom: 1px solid var(--border-subtle)`
- **Padding**: `0 16px`

#### Logo
- Maksimal balandlik: `36px`
- O'ng: restoran nomi `font-size: 15px; font-weight: 700; color: var(--text-primary)`
- Agар logo yo'q bo'lsa: faqat matn

#### Til Almashtirish
- **Holat: Aktiv**: `background: var(--brand-subtle); color: var(--brand); font-weight: 600`
- **Holat: Passiv**: `color: var(--text-muted); font-weight: 400`
- O'lcham: `padding: 4px 10px; border-radius: var(--radius-full); font-size: 12px`
- Oraliq: `4px`
- Animatsiya: `background-color 150ms ease, color 150ms ease`

---

### 6.2 SEARCH BAR

#### Tuzilma
```
[🔍 icon]  [Placeholder: "Taom qidirish..."]  [× tozalash — faqat matn bo'lganda]
```

#### Vizual
- **Fon**: `var(--bg-secondary)`
- **Chegara**: `1px solid var(--border-subtle)`
- **Focus chegara**: `1px solid var(--border-active)`, `box-shadow: 0 0 0 3px var(--brand-subtle)`
- **Border radius**: `var(--radius-full)` — pill shakli
- **Balandlik**: `44px`
- **Padding**: `0 16px 0 44px` (ikonka uchun chapda joy)
- **Margin**: `12px 16px`
- **Animatsiya**: `border-color 150ms ease, box-shadow 150ms ease`

#### Ikonka
- `position: absolute; left: 16px; top: 50%; transform: translateY(-50%)`
- Rang: `var(--text-muted)`, focus holati: `var(--brand)`
- O'lcham: `18px × 18px`

#### Tozalash tugmasi (×)
- `position: absolute; right: 12px; top: 50%; transform: translateY(-50%)`
- Ko'rsatish: `opacity: 0` (bo'sh), `opacity: 1` (matn bor)
- `transition: opacity 150ms ease`
- Rang: `var(--text-muted)`

---

### 6.3 KATEGORIYA SLIDER (Category Tabs)

#### Tuzilma
```
[Barchasi] [🍜 Non-ushta] [🥗 Salat] [🍖 Kabob] → (gorizontal scroll)
```

#### Vizual
- **Konteyner**: `overflow-x: auto; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch`
- **Scrollbar**: `display: none` (yashirin)
- **Padding**: `8px 16px`
- **Gap**: `8px`
- **Pastki chegara**: `1px solid var(--border-subtle)`

#### Har bir Kategoriya Tugmasi
- **Holat: Passiv**:
  - `background: var(--bg-secondary)`
  - `color: var(--text-secondary)`
  - `border: 1px solid var(--border-subtle)`
  - `font-weight: 500`
- **Holat: Aktiv (selected)**:
  - `background: var(--brand)`
  - `color: #FFFFFF`
  - `border-color: var(--brand)`
  - `font-weight: 700`
  - `box-shadow: var(--shadow-brand)`
- **O'lcham**: `padding: 8px 16px; height: 36px; border-radius: var(--radius-full)`
- **Shrift**: `font-size: 13px`
- **Animatsiya**: `background-color 200ms ease, color 200ms ease, box-shadow 200ms ease`
- **Hover** (passiv holat): `background: var(--bg-elevated); color: var(--text-primary)`
- **Press (active)**: `transform: scale(0.96); transition: transform 80ms ease`
- **scroll-snap-align**: `start`

---

### 6.4 TAOM KARTASI (Dish Card) — ENG MUHIM KOMPONENT

#### Layout
```
┌─────────────────────────────┐
│                             │
│         RASM AREA           │  ← 56% balandlik
│         (16:9 ratio)        │
│  [🎯 AR] [⭐ POPULAR]        │  ← badges yuqori o'ng
│                             │
├─────────────────────────────│
│  Taom nomi (2 qator max)    │  ← Pastki qism
│  Tavsif (1 qator, muted)    │
│  ⚖️ 350g   ⭐ 4.8            │
│                             │
│  45 000 so'm         [+]   │  ← Narx + plus tugma
└─────────────────────────────┘
```

#### Karta Vizuali
- **Fon**: `var(--bg-card)`
- **Chegara**: `1px solid var(--border-card)`
- **Border radius**: `var(--radius-xl)` — 20px
- **Shadow**: `var(--shadow-md)`
- **Overflow**: `hidden` — rasm chetga chiqmasin
- **Grid**: `display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 12px`

#### Rasm Qismi
- **Ratio**: `aspect-ratio: 16/10` (16:9 ga yaqin, lekin ozroq balandroq)
- **Rasm**: `object-fit: cover; width: 100%; height: 100%`
- **Placeholder**: `var(--bg-elevated)` gradient skeleton
- **Hover**: `transform: scale(1.04); transition: transform 400ms ease-out`
- **Overflow**: `hidden; border-radius: var(--radius-lg) var(--radius-lg) 0 0`

#### AR/3D Badge
- **Pozitsiya**: `position: absolute; top: 8px; right: 8px`
- **3D mavjud**: `background: var(--success); color: #fff; padding: 3px 8px; border-radius: var(--radius-full); font-size: 10px; font-weight: 700`
- **Matn**: "3D" (qisqa, aniq)
- **Animatsiya**: `pulseGlow` — 2.2s infinite
- **AR qo'llab quvvatlasa**: matn "AR" bo'ladi, rang bir xil

#### Popular Badge
- `background: rgba(232,93,42,0.18); color: var(--brand)`
- `font-size: 10px; font-weight: 600; padding: 2px 7px`
- `border-radius: var(--radius-full)`
- Matn: "🔥 Popular" yoki "✨ Yangi"

#### Matn Qismi
- **Padding**: `10px 12px 12px`
- **Taom nomi**: `font-size: 14px; font-weight: 600; color: var(--text-primary); line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden`
- **Tavsif**: `font-size: 12px; color: var(--text-muted); margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis`
- **Meta (og'irlik + reyting)**: `display: flex; gap: 10px; margin-top: 5px; font-size: 11px; color: var(--text-muted)`

#### Narx + Plus Tugma qatori
- `display: flex; align-items: center; justify-content: space-between; margin-top: 8px`
- **Narx**: `font-size: 15px; font-weight: 700; color: var(--brand)`
- **Plus (+) tugma**: alohida sektsiyada (6.5 da)

#### Hover holati (desktop)
- `transform: translateY(-4px)`
- `box-shadow: var(--shadow-lg)`
- `border-color: var(--border-active)`
- `transition: transform 200ms ease-out, box-shadow 200ms ease-out, border-color 200ms ease`

#### Press holati
- `transform: translateY(-1px) scale(0.985)`
- `transition-duration: 80ms`

---

### 6.5 PLUS (+) TUGMA (Add to Cart)

#### Vizual
- **O'lcham**: `36px × 36px`
- **Shakl**: `border-radius: var(--radius-full)` — doira
- **Fon**: `var(--brand)`
- **Ikonka**: `+` belgisi, `font-size: 20px; font-weight: 300; color: #fff; line-height: 1`
- **Shadow**: `var(--shadow-brand)`

#### Holatlari
- **Default**: `background: var(--brand); transform: scale(1.0)`
- **Hover**: `background: var(--brand-hover); transform: scale(1.08); box-shadow: 0 4px 24px rgba(232,93,42,0.50)`
- **Active (press)**: `transform: scale(0.90); transition: transform 80ms ease`
- **Loading**: `animation: spin 600ms linear infinite` (aylangan nuqta)
- **Success (added)**: `background: var(--success); icon: ✓; animation: cartBounce 420ms ease-out`

#### Animatsiya ketma-ketligi (bosishdan keyin)
```
0ms:    Press → scale(0.90)
80ms:   Release → scale(1.0)
80ms:   animateFlyToCart() boshlanadi
480ms:  Uchish tugaydi → savat badgesi yangilanadi
80ms:   cartBounce boshlanadi (savat ikonkasida)
500ms:  Hammasi tugaydi
```

---

### 6.6 FLOATING DOCK (Pastki Savat Paneli)

#### Tuzilma
```
[🛒 2]  [Non-ushta, Kabob...]  [45 000 so'm →]
```

#### Vizual
- **Pozitsiya**: `position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%)`
- **Kenglik**: `calc(100% - 32px); max-width: 500px`
- **Fon**: `var(--glass-bg)`, `backdrop-filter: var(--glass-blur)`
- **Chegara**: `1px solid var(--border-card)`
- **Border radius**: `var(--radius-full)` — 999px, to'liq yumaloq
- **Padding**: `10px 14px 10px 16px`
- **Shadow**: `var(--shadow-xl), 0 0 0 1px rgba(255,255,255,0.05)`
- **z-index**: `200`

#### Ko'rsatish holatlari
- **Yashirin**: `transform: translateX(-50%) translateY(120%); opacity: 0`
- **Ko'ringan**: `transform: translateX(-50%) translateY(0); opacity: 1`
- **Animatsiya**: `transform 380ms cubic-bezier(0.32, 0.72, 0, 1), opacity 250ms ease`

#### Savat ikonkasi
- `width: 40px; height: 40px; border-radius: var(--radius-full); background: var(--brand)`
- Badge raqami: `position: absolute; top: -4px; right: -4px; background: var(--success); color: #fff; font-size: 10px; font-weight: 700; min-width: 18px; height: 18px; border-radius: var(--radius-full); display: flex; align-items: center; justify-content: center`
- `cartBounce` animatsiyasi: yangi mahsulot qo'shilganda

#### Matn (o'rta qism)
- Asosiy: `font-size: 13px; font-weight: 600; color: var(--text-primary)`
- Taom nomlari: `font-size: 11px; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px`

#### "Ko'rish" tugmasi
- `background: var(--brand); color: #fff; padding: 8px 16px; border-radius: var(--radius-full); font-weight: 700; font-size: 14px`
- Narx: yoniga `→` belgisi

---

### 6.7 TAOM DETAIL MODAL

#### Tuzilma
```
[Overlay: rgba(0,0,0,0.75)]
┌──────────────────────────────┐
│  ─── drag handle ───         │
│                              │
│    [RASM — 280px balandlik]  │
│    [AR/3D tugma — rasm ustida] │
│                              │
│  Taom nomi                   │
│  ⭐ 4.8 · 124 ta baho · 350g │
│  Tavsif (ko'proq/kamroq)     │
│                              │
│  [M] [L] [XL] ← O'lchamlar  │
│                              │
│  Tarkib (allergenlar)        │
│                              │
│  ──────────────              │
│  45 000 so'm   [Savatga +1] │
└──────────────────────────────┘
```

#### Modal Vizuali
- **Pozitsiya**: `position: fixed; bottom: 0; left: 0; right: 0`
- **Max balandlik**: `88vh`
- **Fon**: `var(--bg-card)`
- **Border radius**: `24px 24px 0 0`
- **Overflow**: `auto` (scroll qilsa bo'ladi)
- **Animatsiya**: `modalSlideUp 380ms cubic-bezier(0.32, 0.72, 0, 1)`

#### Drag Handle
- `width: 40px; height: 4px; background: var(--border-card); border-radius: 2px; margin: 12px auto`

#### Rasm
- **Kenglik**: `100%`
- **Balandlik**: `260-300px` (aspect-ratio: 16/10)
- `object-fit: cover; border-radius: var(--radius-lg)`
- `margin: 0 16px; width: calc(100% - 32px)`

#### AR/3D Tugma (rasm ustida)
- `position: absolute; bottom: 12px; right: 28px`
- `background: linear-gradient(135deg, var(--brand) 0%, #FF8A65 100%)`
- `color: #fff; padding: 8px 16px; border-radius: var(--radius-full); font-weight: 700; font-size: 13px`
- `box-shadow: 0 4px 20px rgba(232,93,42,0.50)`
- Matn: "🥽 AR da ko'r" (iOS/Android aniqlanishiga qarab)
- Hover: `transform: scale(1.05); box-shadow: 0 6px 28px rgba(232,93,42,0.65)`

#### O'lcham Tanlash
- **Konteyner**: `display: flex; gap: 8px; padding: 0 16px`
- **Har bir variant**:
  - Default: `padding: 8px 16px; border: 1.5px solid var(--border-card); border-radius: var(--radius-md); font-size: 13px; font-weight: 500; color: var(--text-secondary)`
  - Aktiv: `border-color: var(--brand); background: var(--brand-subtle); color: var(--brand); font-weight: 700`

#### Pastki CTA qatori
- `position: sticky; bottom: 0; background: var(--bg-card); padding: 12px 16px; border-top: 1px solid var(--border-subtle)`
- `display: flex; align-items: center; justify-content: space-between`
- Narx: `font-size: 22px; font-weight: 800; color: var(--brand)`
- Savatga tugma: `flex: 1; margin-left: 16px; height: 52px; background: var(--brand); border-radius: var(--radius-full); font-size: 16px; font-weight: 700; color: #fff; box-shadow: var(--shadow-brand)`
  - Hover: `background: var(--brand-hover); transform: scale(1.02)`
  - Active: `transform: scale(0.98); transition: transform 80ms`

---

### 6.8 AR / 3D MODAL (To'liq Ekran)

#### Tuzilma
```
[X tugma — yuqori chap]  [Taom nomi + narx — yuqori]
┌────────────────────────────────────────────────┐
│                                                │
│          model-viewer (to'liq ekran)           │
│         (3D model aylanadi)                    │
│                                                │
│  [⬡ AR] [↻ 3D] [⊞ 360°] [🖼 Rasm] ← tab     │
│                                                │
│  [━━━━━━━━━━━━━━━━━] ← yuklanish              │
│  28cm × 18cm × 8cm ← o'lcham                  │
│                                                │
│  [     Stolga qo'yib ko'rish (AR)     ]       │
│  [          Savatga qo'shish          ]       │
└────────────────────────────────────────────────┘
```

#### Modal Vizuali
- **Overlay**: `rgba(0,0,0,0.95)` — deyarli qora
- **model-viewer**: `width: 100%; height: 60vh; background: transparent`
- **Animatsiya kirish**: `transform: scale(0.88) translateY(40px) → scale(1) translateY(0)`, `400ms var(--ease-spring)`

#### Yopish Tugmasi (×)
- `position: absolute; top: 16px; left: 16px; z-index: 10`
- `width: 40px; height: 40px; border-radius: var(--radius-full)`
- `background: rgba(255,255,255,0.10); color: #fff; font-size: 18px`
- `backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.15)`
- Hover: `background: rgba(255,255,255,0.18)`

#### Mode Tablar (AR/3D/360°/Rasm)
- `display: flex; gap: 6px; justify-content: center; padding: 8px`
- Har bir tab: `padding: 6px 14px; border-radius: var(--radius-full); font-size: 12px; font-weight: 600`
- Default: `background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.60)`
- Aktiv: `background: var(--brand); color: #fff; box-shadow: var(--shadow-brand)`

#### Yuklanish Progress
- `height: 2px; background: var(--brand); transition: width 200ms ease`
- `width: 0% → 100%` (model yuklanayotganda)

#### Asosiy AR Tugmasi
- `width: calc(100% - 32px); margin: 8px 16px`
- `height: 56px; border-radius: var(--radius-full)`
- `background: linear-gradient(135deg, #E85D2A 0%, #FF8A65 100%)`
- `font-size: 16px; font-weight: 700; color: #fff`
- `box-shadow: 0 4px 28px rgba(232,93,42,0.60), 0 0 60px rgba(232,93,42,0.20)`
- Matn: "🥽 Stolga qo'yib ko'rish" (AR mavjud bo'lsa), "↻ 3D ko'rish" (yo'q bo'lsa)
- Press: `transform: scale(0.97); transition: transform 80ms`

#### Fallback Zanjiri (avtomatik)
```
1. AR tekshiriladi → navigator.xr?.isSessionSupported('immersive-ar')
2. Agar ha → AR tugmasi ko'rinadi, faol
3. Agar yo'q → 3D (model-viewer)
4. Agar GLB yuklanmasa → 360° (24 rasm slider)
5. Agar rasmlar yo'q → oddiy poster rasm
```

---

### 6.9 SAVAT SAHIFASI (Cart Sheet)

#### Tuzilma
```
[Overlay: translucent]
┌──────────────────────────────────┐  ← Bottom sheet
│  ─── drag handle ───             │
│  Savat (2 ta mahsulot)           │
│                                  │
│  [🖼] Non-ushta klassik  [– 2 +] │
│       45 000 so'm                │
│  ─────────────────               │
│  [🖼] Kabob milliy       [– 1 +] │
│       38 000 so'm                │
│                                  │
│  ─────────────────               │
│  Jami:              83 000 so'm  │
│  Xizmat haqi:            0 so'm  │
│  To'lash:           83 000 so'm  │
│                                  │
│  [   Buyurtma berish →  ]       │
└──────────────────────────────────┘
```

#### Savat Elementi Vizuali
- `display: flex; gap: 12px; padding: 12px 16px; align-items: center`
- Rasm: `width: 64px; height: 64px; border-radius: var(--radius-md); object-fit: cover`
- Nomi: `font-size: 14px; font-weight: 600; color: var(--text-primary)`
- Narx: `font-size: 13px; color: var(--brand); font-weight: 600`

#### Miqdor Boshqaruvchi (– n +)
- `display: flex; align-items: center; gap: 8px`
- Minus/Plus: `width: 32px; height: 32px; border-radius: var(--radius-full); background: var(--bg-elevated); color: var(--text-primary); font-size: 18px; font-weight: 300`
  - Hover: `background: var(--brand-subtle); color: var(--brand)`
  - Press: `transform: scale(0.88); transition: transform 80ms`
- Raqam: `font-size: 15px; font-weight: 700; min-width: 24px; text-align: center`

#### Buyurtma Berish Tugmasi
- `width: calc(100% - 32px); height: 56px; border-radius: var(--radius-full)`
- `background: var(--brand); color: #fff; font-size: 16px; font-weight: 700`
- `box-shadow: var(--shadow-brand)`
- Hover: `background: var(--brand-hover); transform: translateY(-2px); box-shadow: 0 6px 30px rgba(232,93,42,0.55)`
- Press: `transform: translateY(0px) scale(0.98)`

---

### 6.10 TOAST BILDIRISH

#### Pozitsiya
- `position: fixed; top: 72px; left: 50%; transform: translateX(-50%)`
- `z-index: 999; pointer-events: none`

#### Vizual
- **Muvaffaqiyat**: `background: var(--success); color: #fff`
- **Xato**: `background: #EF4444; color: #fff`
- **Oddiy**: `background: var(--bg-elevated); color: var(--text-primary)`
- `padding: 10px 18px; border-radius: var(--radius-full); font-size: 13px; font-weight: 600`
- `box-shadow: var(--shadow-lg); backdrop-filter: blur(8px)`
- `display: flex; align-items: center; gap: 8px`

#### Animatsiya
- Kirish: `toastSlideIn 250ms ease-out`
- Yashirin turish: `2500ms`
- Chiqish: `toastSlideOut 200ms ease-in`

---

### 6.11 KDS BOARD (Oshxona Ekrani)

#### Layout
```
[Header: "Oshxona — Registon Lounge" | 14:35:22]

[ Stol 5 — 3 daqiqa ]  [ Stol 3 — 8 daqiqa ]  [ Stol 7 — 1 daqiqa ]
[ ● Non-ushta × 2   ]  [ ● Kabob × 1        ]  [ ● Salat × 3       ]
[ ● Salat × 1       ]  [ ● Shoshilinch!      ]  [                   ]
[  [Boshlash ▶]     ]  [  [Tayyor ✓]         ]  [  [Berildi ✓]      ]
```

#### KDS Karta
- **Yangi (new)**: `border-left: 4px solid var(--status-new); animation: newOrderPulse 2s ease-in-out infinite`
- **Tayyorlanmoqda**: `border-left: 4px solid var(--status-preparing)`
- **Tayyor**: `border-left: 4px solid var(--status-ready); box-shadow: 0 0 20px rgba(16,185,129,0.30)`
- **Berildi**: `opacity: 0.5; filter: grayscale(50%)`
- `font-family: 'JetBrains Mono', monospace` (raqamlar uchun)
- `font-size: 18px` (masofadan o'qilsin)

---

### 6.12 TO'LOV SAHIFASI

#### Payment Method Tugmalar
- **Tanlanmagan**: `border: 2px solid var(--border-card); background: var(--bg-card); color: var(--text-secondary)`
- **Tanlangan**: `border-color: var(--brand); background: var(--brand-subtle); color: var(--brand); font-weight: 700`
- O'lcham: `padding: 14px 20px; border-radius: var(--radius-lg); font-size: 15px`
- Logolar: Payme (ko'k), Click (yashil), Naqd (kulrang) — rasmli

#### To'lash Tugmasi
- `width: 100%; height: 60px; border-radius: var(--radius-full)`
- `background: var(--brand); font-size: 18px; font-weight: 800; color: #fff`
- `box-shadow: var(--shadow-brand)`
- **Loading holati**: `spinner animation` + matn "Kutib turing..."
- **Success holati**: `background: var(--success); matn: "✓ To'lov amalga oshirildi"`
  - `animation: successPop 400ms var(--ease-spring)` (scale 0.8 → 1.1 → 1.0)

---

## 7. RESPONSIVE DIZAYN

### 7.1 Breakpointlar
```css
/* Mobile first — asosiy */
/* xs: 320px */
/* sm: 375px ← iPhone SE */
/* md: 390px ← iPhone 14 */
/* lg: 430px ← iPhone 14 Plus */
/* tablet: 768px */
/* desktop: 1024px */
```

### 7.2 Grid Qoidalari
```css
/* 375px (default mobile): */
.dish-grid {
  grid-template-columns: 1fr 1fr;  /* 2 ustun */
  gap: 10px;
  padding: 0 12px;
}

/* 768px (tablet): */
.dish-grid {
  grid-template-columns: 1fr 1fr 1fr;  /* 3 ustun */
  gap: 16px;
  padding: 0 24px;
}

/* 1024px (desktop): */
.dish-grid {
  max-width: 900px;
  margin: 0 auto;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}
```

### 7.3 Menyu Maksimal Kengligi
```css
.menu-container {
  max-width: 500px;  /* Telefon kabi ko'rinish */
  margin: 0 auto;
}
/* Desktop da markazlashtirilgan, telefon shaklida */
```

---

## 8. DARK/LIGHT MODE

### 8.1 Qoidalar
```css
/* Default: dark mode (restoranlar kechasi ham ishlaydi) */
:root { /* dark mode o'zgaruvchilari */ }

/* Light mode: */
@media (prefers-color-scheme: light) {
  :root { /* light mode o'zgaruvchilari */ }
}

/* Qo'lda tanlash: */
[data-theme="light"] { /* light mode */ }
[data-theme="dark"]  { /* dark mode */ }
```

### 8.2 Toggle Tugmasi
- Header o'ng tomonida, til tugmasidan keyin
- 🌙 (dark) ↔ ☀️ (light)
- `transition: background 300ms ease, color 300ms ease`
- LocalStorage da saqlanadi

---

## 9. HERO BANNER (Yuqori Targ'ibot)

#### Tuzilma
```
┌──────────────────────────────────────┐
│  [Restoran rangli gradient fon]      │
│                                      │
│  "AR Menyu"  ← katta sarlavha        │
│  "Taomni 3D da ko'ring"  ← pastki   │
│                              [shimmer effekti]
└──────────────────────────────────────┘
```

#### Vizual
- **Kenglik**: `100%`
- **Balandlik**: `160px` (default), `200px` (restoran logosi bor bo'lsa)
- **Fon**: `linear-gradient(135deg, var(--brand) 0%, #FF8A65 100%)` yoki restoran `color_primary`
- **Shimmer**: `heroShimmer 3s linear infinite` — nozik oq yorug'lik o'tadi
- Matn: `color: #fff; text-shadow: 0 2px 8px rgba(0,0,0,0.30)`

---

## 10. INTERAKTIVLIK QOIDALARI

### 10.1 Touch Targets (Teginish Hududi)
- Barcha tegiladigan elementlar: **minimum 44×44px**
- Ko'pincha vizual o'lchamdan kattaroq `padding` orqali

### 10.2 Haptic Feedback
```javascript
// Har qanday muhim bosishda:
if (navigator.vibrate) {
  navigator.vibrate(35);  // 35ms — nozik taktil
}
// Xato holat:
navigator.vibrate([50, 30, 50]);  // ikki marta
// Muvaffaqiyat:
navigator.vibrate(15);  // qisqa
```

### 10.3 Loading Holatlari
- Menyu yuklanishi: **Skeleton loading** (shimmer effekti bilan)
- Rasm yuklanishi: `background: var(--bg-elevated)` placeholder → fade in (`opacity 300ms ease`)
- 3D model yuklanishi: Progress bar + foiz

### 10.4 Xato Holatlari
- **Internet yo'q**: Toast "❌ Internet aloqasi yo'q. Qayta urinib ko'ring."
- **Menyu bo'sh**: `empty-state` — katta ikonka + matn + "Yangilash" tugma
- **Rasm yuklanmadi**: `broken-image` ikonkasi, `var(--bg-elevated)` fon

### 10.5 Keyboard Navigation (Desktop)
- Barcha interaktiv elementlar `tabIndex` bilan
- Focus ring: `outline: 2px solid var(--brand); outline-offset: 2px`
- `Escape` → modal yopiladi
- `Enter/Space` → tugma bosiladi

---

## 11. IKONLAR

### 11.1 Ikonka Kutubxonasi
- **Birlamchi**: Lucide Icons (chiziqli, zamonaviy)
- **CDN**: `https://unpkg.com/lucide@latest/dist/umd/lucide.min.js`
- **O'lchamlar**: 16px (kichik), 20px (standart), 24px (katta)

### 11.2 Asosiy Ikonkalar
```
🛒 → ShoppingCart    (savat)
🔍 → Search          (qidirish)
× → X               (yopish)
+ → Plus            (qo'shish)
– → Minus           (kamaytirish)
✓ → Check           (muvaffaqiyat)
🌙 → Moon           (dark mode)
☀️ → Sun            (light mode)
⭐ → Star           (reyting)
⚖️ → Scale          (og'irlik)
```

---

## 12. MIKRO-INTERAKSIYALAR

### Har qanday Tugma
```
Rest → Hover (150ms) → Press (80ms) → Release (150ms) → Rest
```

### Yangi Buyurtma (KDS)
```
0ms:   WebSocket xabari keldi
0ms:   Yangi karta to'liq qoraytirilgan holda paydo bo'ladi
200ms: Karta scale(0) → scale(1.05) (400ms, ease-spring)
600ms: Karta scale(1.05) → scale(1.0) (150ms, ease-out)
0ms:   "Shrill" vibro signal + tovush (agar yoqilgan bo'lsa)
2s:    pulseGlow animatsiyasi karta chegarasida chaqnaydi
```

### Qidiruv
```
Klaviatura urish → 300ms debounce → Filter ishlaydi
Mos kelmagan kartalar: opacity 0.3 + scale(0.96) (200ms ease)
Mos kelganlar: normal ko'rinish
```
