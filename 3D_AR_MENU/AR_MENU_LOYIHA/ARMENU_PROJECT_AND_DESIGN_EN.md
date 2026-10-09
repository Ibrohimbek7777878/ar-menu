# ARMENU — PROJECT & DESIGN
### Full project brief + design prompt · single file

> **Version:** 1.0 · **Date:** 2026-09-17
> **Audience:** AI (v0/Lovable/Figma AI) · Cursor · Designer (Figma) · Investor
>
> This file is **self-explanatory** — no other document is required.
> Every section stands alone: take the part you need.

---

## 📑 TABLE OF CONTENTS

| # | Section | Audience |
|---|---|---|
| 1 | Project essence | Everyone |
| 2 | Who uses it (3 roles) | Everyone |
| 3 | Market & business | Investor |
| 4 | Technical foundation (brief) | Cursor, designer |
| 5 | **Design philosophy** | Designer, AI |
| 6 | **Color system** | Designer, Cursor, AI |
| 7 | **Typography** | Designer, Cursor, AI |
| 8 | **Spacing, radius, shadow** | Designer, Cursor |
| 9 | **Cultural accents** | Designer, AI |
| 10 | **Components** | Designer, Cursor |
| 11 | **Screen-by-screen spec** | Everyone |
| 12 | **Motion & feel** | Designer, Cursor |
| 13 | **Ready-made AI prompts** | AI |
| 14 | **CSS for Cursor** | Cursor |
| 15 | Things we never do | Everyone |
| 16 | Checklist | Everyone |

---
---

# 1. PROJECT ESSENCE

## 1.1 In one sentence

> A guest scans the QR code on the restaurant table, **sees the dish in 3D at
> real size on their own table through the phone camera**, and orders it if they
> like it; the waiter sees the table number instantly and brings it over; the
> admin monitors everything in real time.

## 1.2 The problems it solves

```
PROBLEM                                  SOLUTION
───────────────────────────────────────────────────────────────
Guest can't picture the dish          →  Sees it in AR at real size
Tourist doesn't know what "norin" is  →  3D + 3 languages + AI explains
Restaurant pays Yandex 30%            →  Direct ordering, 0%
Tax office requires IKPU/fiscal       →  Fiscal receipt built in
Slow waiters, wrong orders            →  Guest enters it, errors −22%
Owner can't see what sells            →  Real-time analytics
Low average check                     →  AI upsell, +20%
```

## 1.3 User journey (primary scenario)

```
1. Guest sits down at the table
        ↓
2. Scans the QR on the table with the phone camera
        ↓
3. The menu opens — in 3 languages (Uzbek / Russian / English)
        ↓
4. Taps a dish → "View in AR" button
        ↓
5. Camera opens → the dish appears on the table at REAL SIZE
   (a Ø32 cm platter really is 32 cm; rotate it, zoom in)
        ↓
6. Likes it → cart → order
        ↓
7. Waiter's phone: 🔔 "TABLE 5 — new order"
   Kitchen monitor: the order lands on the kanban board
   Admin screen: appears in the live feed
        ↓
8. Cook prepares it → "Ready" → waiter delivers
        ↓
9. Guest pays on the phone (Payme/Click/Uzum) + tip
        ↓
10. Fiscal receipt arrives via Telegram → review requested
```

## 1.4 The name and what it means

**ARMENU** = AR (Augmented Reality) + MENU

- Pronounced: **ar-menyu**
- Reads naturally in Uzbek
- Domain candidates: `armenu.uz` · `menu3d.uz` · `armenu.app`

---
---

# 2. WHO USES IT — 3 ROLES

## 2.1 👤 GUEST

| | |
|---|---|
| **Entry** | Scan the QR — **NO** sign-up |
| **Device** | Phone (PWA — no app install required) |
| **Who** | Local guests · **foreign tourists** · families · young people |
| **Duration** | 5–40 minutes (over the course of the meal) |
| **State** | Hungry, in a hurry, seeing this for the first time |

**What they do:**
- Browse, search and filter the menu (halal, vegan, non-spicy)
- 🎯 **View the dish in AR** — the core differentiator
- Add to cart, place the order
- Track order status (in real time)
- Call a waiter / ask for the bill / ask for water
- Pay, tip, leave a review
- 🤖 Ask the AI chatbot ("what's on the menu that isn't spicy?")

**⚠️ Design implication:** this person is **hungry and impatient**. Every step
must be one tap. Little text, big images.

## 2.2 🧑‍🍳 WAITER

| | |
|---|---|
| **Entry** | 4-digit PIN |
| **Device** | Phone (one-handed, on the move) |
| **Duration** | The whole shift (8 hours) |
| **State** | Busy, noisy environment, needs to read at a glance |

**What they do:**
- 🔔 Receive new-order notifications (sound + vibration)
- 🎯 **See the table number** — the single most important fact, must be LARGE
- Accept the order → deliver it
- See table status on a 2D floor plan
- Respond to guest calls
- Start/end their shift, review their stats
- 💝 Receive tips (the guest tips via QR)

**⚠️ Design implication:** table number **larger than 30px**. It must register
at a glance. Large tap targets (44px+ for fingers).

## 2.3 👨‍💼 ADMIN (restaurant owner/manager)

| | |
|---|---|
| **Entry** | Email + password |
| **Device** | Computer (mainly) + phone |
| **Duration** | 30–60 minutes a day |
| **State** | Supervising, making decisions |

**What they do:**
- Manage the menu (dishes, prices, images, descriptions in 3 languages)
- 🎯 **3D models** — pick from the library or generate with AI
- Tables and QR codes (a unique QR per table, printable PDF)
- Real-time dashboard (today's sales, orders, occupied tables)
- Reports: sales, dishes, **menu engineering** (which dishes are profitable)
- 📊 **AR analytics** — how much higher the check is for guests who used AR
- Staff, plans, settings

**⚠️ Design implication:** dense information, but never cluttered. Tables +
charts. The most important numbers at the top, large.

## 2.4 Additional screens

| Screen | Who | Device |
|---|---|---|
| 🍳 **KDS** (kitchen) | Cook | TV monitor (readable from 3 metres) |
| 💵 **POS** | Cashier | Tablet/computer |
| 🔧 **Super-admin** | Platform owner | Computer |

---
---

# 3. MARKET & BUSINESS *(for investors)*

## 3.1 Market figures (Uzbekistan, 2026)

| Indicator | Value |
|---|---|
| Food-service businesses | **27,312** |
| Sector revenue (Q1) | **49.8 trn so'm** (+8.2%) |
| International tourists (7 months) | **7.75 m** (+22.6%) |
| Tourist check | 100,000–200,000 so'm (local: 35,000–90,000) |
| Telegram users | 25–27 m (76–85%) |
| **Competitors offering AR/3D menus** | **0** ✅ |

## 3.2 Competition

| Company | Price/month | AR? | Fiscal? |
|---|---|---|---|
| Dastur-xon | 99k / 399k so'm | ❌ | ❌ |
| SmartMenu.uz | ~ | ❌ | ❌ |
| Zoomda | from 1.3 m so'm | ❌ | ❌ |
| iiko | $150–400 | ❌ | ✅ |
| **ARMENU** | **0 – 890k so'm** | ✅ | ✅ |

## 3.3 Pricing plans

| Plan | Monthly | For whom |
|---|---|---|
| 🆓 FREE | 0 | Choyxona (teahouse): 3 tables, 20 dishes, no AR |
| 🟢 START | 199,000 | Café: unlimited tables/dishes, KDS, 3 languages |
| ⭐ **PRO** | **590,000** | **+ AR/3D (50 dishes)**, analytics, payments |
| 🔵 PRO+FISCAL | 890,000 | + OFD fiscal receipts, IKPU |
| 🏢 CHAIN | Contract | 5+ locations |

## 3.4 Core sales arguments (in priority order)

```
1️⃣  "Yandex takes 30% — with us it's 0%. Save 5 m so'm a month"    💰
2️⃣  "Meets the tax fiscal requirement, no separate register needed" 📋
3️⃣  "Average check +20%, table turnover +15%"                       📈
4️⃣  "Tourists see the dish in 3D and order it"                      🌍
5️⃣  "Your Google rating goes up"                                    ⭐
6️⃣  "AR — nobody has it, you'd be first"                            🎯
```

> ⚠️ **AR ranks sixth.** Restaurants buy **for the money**, not for the AR.
> AR is the differentiator and the viral marketing hook.

## 3.5 Financial metrics

| Metric | Value |
|---|---|
| LTV / CAC | **40:1** (industry: 3:1) |
| CAC payback | 1.1 months |
| Gross margin | 73% → 82% |
| Break-even | Month 11 |
| 3-year revenue | ~2.6 bn so'm |

## 3.6 The key asset — the 3D library

A shared 3D library of Uzbek dishes (Osh, Manti, Somsa, Lag'mon…).

| Restaurant # | Content cost | Margin |
|---|---|---|
| 1st | 1,250,000 so'm | 62% |
| 50th | 250,000 so'm | 74% |
| **100th** | **~50,000 so'm** | **85%** |

A competitor could not reproduce this in **2–3 years**.

---
---

# 4. TECHNICAL FOUNDATION *(brief)*

```
Backend      Django 5 + DRF + Channels (WebSocket)
Data         PostgreSQL 16 + pgvector · Redis 7
Frontend     PWA — vanilla JS (NO framework, for speed)
AR/3D        <model-viewer>  →  iOS: USDZ · Android: GLB
3D creation  Meshy / Tripo API (image to 3D)
Payments     paytechuz (Payme + Click + Uzum)
Fiscal       UZKASSA / e-POS (OFD) + IKPU
AI           8 providers via an MCP layer
Languages    Uzbek · Russian · English (100% coverage)
```

**⚡ The 5 laws of AR:**
1. `ar-scale="fixed"` — NOT `auto`
2. Models in **metres** (32 cm = `0.32`)
3. Model base at **Y=0** (sits flat on the table)
4. GLB ≤ 3 MB · USDZ ≤ 5 MB
5. Generation runs **in a worker**, never in a web request

**Performance targets:**

| Metric | Target |
|---|---|
| Menu load (3G) | < 2.5 s |
| API response (p95) | < 250 ms |
| Lighthouse (mobile) | > 90 |
| 3D asset load | < 4 s |

---
---

# 5. 🎨 DESIGN PHILOSOPHY

## 5.1 In one sentence

> **The dish is the hero. The interface is an invisible servant.**
> Premium and refined, with subtle cultural accents — but simple.

## 5.2 Three pillars

```
┌─────────────────────────────────────────────────────────────┐
│  1. FOOD FIRST                                               │
│     Big images, little text. The UI never shows off.         │
│     Every pixel serves showing the dish better.              │
├─────────────────────────────────────────────────────────────┤
│  2. SUBTLE CULTURE                                           │
│     Pattern — as background, at 3–5% opacity.                │
│     Color — terracotta and blue (Uzbekistan's palette).      │
│     Never insistent, it only conveys a "feeling".            │
├─────────────────────────────────────────────────────────────┤
│  3. PREMIUM SIMPLICITY                                       │
│     Dark background, white text, gold accent.                │
│     Generous whitespace. Refined type. Soft motion.          │
│     Looks expensive, stays easy to use.                      │
└─────────────────────────────────────────────────────────────┘
```

## 5.3 Sources of inspiration

| Source | What we take |
|---|---|
| **Apple Store app** | How the product image is presented, whitespace |
| **Airbnb** | Card structure, filters, search |
| **Registon architecture** | Color harmony, symmetry, proportion |
| **Suzani and ganch** | Pattern rhythm (for backgrounds, never foreground) |
| **Michelin restaurant menus** | Typography, hierarchy, refinement |

## 5.4 What this must NOT be

| ❌ Don't | Why |
|---|---|
| Bright, loud patterns (visually noisy) | Distract from the food |
| 5+ colors | Cluttered, looks cheap |
| Gradient buttons (2010 styling) | Dated |
| Too much animation | Feels slow; a hungry person gets irritated |
| Small type (< 14px) | Unreadable — restaurant lighting is dim |
| Long copy | Nobody reads it |
| Stock photos (fake food) | Destroys trust |

---
---

# 6. 🎨 COLOR SYSTEM

## 6.1 Brand colors

```
┌──────────────────────────────────────────────────────────────┐
│  PRIMARY — TERRACOTTA (Uzbek ceramics, the bread tandir)     │
│                                                               │
│  ████  #C75B39   Terracotta 500  — main accent, CTA          │
│  ████  #E07A52   Terracotta 400  — hover                     │
│  ████  #A8452A   Terracotta 600  — active/pressed            │
│  ████  #FBEDE8   Terracotta 50   — light background          │
├──────────────────────────────────────────────────────────────┤
│  SECONDARY — CERAMIC BLUE (the Registon dome)                │
│                                                               │
│  ████  #1B4B73   Ceramic 600     — headings, icons           │
│  ████  #2E6FA3   Ceramic 500     — links                     │
│  ████  #E8F0F7   Ceramic 50      — light background          │
├──────────────────────────────────────────────────────────────┤
│  TERTIARY — GOLD (ganch, embroidery)                         │
│                                                               │
│  ████  #C9A227   Gold 500        — premium badge, HIT        │
│  ████  #E3C158   Gold 400        — stars, ratings            │
└──────────────────────────────────────────────────────────────┘
```

**Why these colors:**

| Color | Source | Feeling |
|---|---|---|
| Terracotta | Tandir, ceramics, bread | Warmth, hospitality, appetite |
| Ceramic blue | Samarqand domes, bowls | Trust, quality, history |
| Gold | Ganch ornament, embroidery | Premium, worth |

> ⚠️ **Terracotta is an appetite color.** The red–orange spectrum is
> well-established in food apps (it's why McDonald's and KFC are red).

## 6.2 Neutral scale

```
LIGHT THEME                         DARK THEME
─────────────────────────────────────────────────────────────
#FDFBF7  bg        (warm white)     #14110E  bg        (warm black)
#F7F3ED  bg-soft   (paper)          #1C1815  bg-soft
#FFFFFF  bg-card                    #241F1B  bg-card
#E8E2D9  border                     #332C26  border
#1A1714  text      (primary)        #F5F1EA  text
#6B6259  text-soft (secondary)      #A89E92  text-soft
#9B9186  text-muted                 #6B6259  text-muted
```

> ⚡ **Note:** not grey (#808080) — **warm** neutral (#6B6259).
> Pure grey reads cold and cheap. Warm neutrals feel premium.

## 6.3 Semantic colors

```
✅  #16A34A  success   — ready, success
⚠️  #D97706  warning   — pending, attention
🔴  #DC2626  danger    — error, overdue
ℹ️  #2E6FA3  info      — information
```

## 6.4 Table status colors *(waiter/admin)*

```
🟢  #16A34A  free       free
🔵  #2E6FA3  occupied   occupied
🟡  #D97706  waiting    waiting
🔴  #DC2626  ready      READY (with pulse)
🟣  #7C3AED  bill       bill requested
```

## 6.5 Color usage rule — 60/30/10

```
60%  Neutral background (bg, bg-card)
30%  Food photography (it brings its own color)
10%  Brand accent (terracotta CTA, blue headings, gold badges)
```

> ⛔ **Never** place two saturated colors side by side.
> One primary action (CTA) per screen.

## 6.6 Contrast (mandatory)

| Element | Minimum contrast |
|---|---|
| Body text | 4.5:1 |
| Large text (18px+) | 3:1 |
| Button text | 4.5:1 |
| Icons | 3:1 |

**Verified pairs:**
```
#1A1714 on #FDFBF7  →  15.8:1  ✅
#6B6259 on #FDFBF7  →   5.2:1  ✅
#FFFFFF on #C75B39  →   4.6:1  ✅
#F5F1EA on #14110E  →  14.9:1  ✅
```

---
---

# 7. 🔤 TYPOGRAPHY

## 7.1 Typefaces

```
PRIMARY:    Inter
            Why: full Latin + Cyrillic, open shapes, built for screens
            Fallback: -apple-system, 'Segoe UI', Roboto, sans-serif

DISPLAY:    Playfair Display  (optional, for a premium feel)
            Only for: restaurant name, large headings
            Why: serif — refinement, the restaurant-menu tradition
            Fallback: Georgia, serif

NUMERALS:   Inter (tabular-nums)
            font-variant-numeric: tabular-nums
            Why: prices align cleanly in a vertical column
```

> ⚠️ **Cyrillic is mandatory.** Every weight must carry Cyrillic glyphs for
> Russian. Inter has them. Playfair Display has them.

## 7.2 Size scale

```
                px      rem     Where
─────────────────────────────────────────────────────────
xs              12      0.75    Labels, captions
sm              14      0.875   Secondary text
base            16      1.0     Body text ⚡ minimum
lg              18      1.125   Dish name (in lists)
xl              20      1.25    Small heading
2xl             24      1.5     Dish name (modal)
3xl             32      2.0     Price (large)
4xl             40      2.5     Screen title
5xl             56      3.5     KDS table number ⚡
```

## 7.3 Weights

```
400  Regular    — body text
500  Medium     — labels, secondary headings
600  Semibold   — dish names, buttons
700  Bold       — prices, headings
800  Extrabold  — KDS table number, large numerals
```

## 7.4 Line height

```
1.2   Headings (tight)
1.5   Body text (comfortable)
1.7   Long descriptions (airy)
```

## 7.5 Practical rules

| Rule | Why |
|---|---|
| Body text **≥ 16px** | Restaurant lighting is dim |
| **≤ 3 sizes** per screen | Keeps the hierarchy legible |
| Headings **≤ 2 lines** | Long headings don't get read |
| Descriptions **≤ 3 lines** (in lists) | Then truncate with "…" |
| Prices in **tabular-nums** | They align in a column |
| **CAPS LOCK** only in labels | Hard to read |

---
---

# 8. 📐 SPACING, RADIUS, SHADOW

## 8.1 Spacing scale (4px base)

```
1   →   4px    inside an icon
2   →   8px    inside an element
3   →  12px    small gap
4   →  16px    standard gap ⚡
5   →  24px    between blocks
6   →  32px    between sections
8   →  48px    large section
10  →  64px    screen top/bottom
```

**Rule:** these values only. 13px, 17px, 22px — **no**.

## 8.2 Corner radius (premium = medium)

```
sm   →   8px    small buttons, tags
md   →  12px    buttons, inputs ⚡ standard
lg   →  16px    cards
xl   →  20px    modals, large cards
2xl  →  28px    top edge of a bottom sheet
full →  999px   avatars, badges, pills
```

> ⚠️ **Premium lives at 8–16px.** 24px+ reads childish. 0–4px reads cold/technical.

## 8.3 Shadows (soft, warm)

```css
/* LIGHT theme — warm shadow (never pure black) */
--shadow-xs:  0 1px 2px  rgba(26,23,20,.04);
--shadow-sm:  0 2px 8px  rgba(26,23,20,.06);
--shadow-md:  0 4px 16px rgba(26,23,20,.08);   /* card */
--shadow-lg:  0 12px 32px rgba(26,23,20,.12);  /* modal */
--shadow-xl:  0 24px 64px rgba(26,23,20,.16);  /* bottom sheet */

/* DARK theme — deeper */
--shadow-md:  0 4px 16px rgba(0,0,0,.4);
--shadow-lg:  0 12px 32px rgba(0,0,0,.5);
```

> ⚡ The shadow color is **never pure black** — `rgba(26,23,20,...)` (warm dark).
> That's what makes it feel premium.

## 8.4 Grid and widths

```
Mobile      < 480px   1 column, 16px gutter
Large phone 480–768   1 column, 20px gutter
Tablet      768–1024  2 columns, 24px gutter
Desktop     > 1024    Admin: 260px sidebar + content
                      Guest: max-width 520px (centered)
```

> ⚡ **The guest interface stays narrow on desktop too** (520px) —
> it's designed for a phone and must not stretch on wide screens.

## 8.5 Touch targets

```
Minimum:     44 × 44 px   (Apple/Google standard)
Comfortable: 48 × 48 px
Primary CTA: 56 px tall  ⚡ ("Buyurtma berish" — Place order)
Spacing between elements: ≥ 8px
```

---
---

# 9. 🕌 CULTURAL ACCENTS *(subtle, never insistent)*

## 9.1 Principle

> Culture is **felt, not seen**.
> A tourist understands "this is Uzbekistan", while the interface stays
> international-grade.

## 9.2 Where it appears

| Element | How | Strength |
|---|---|---|
| **Background pattern** | Islimiy/ganch geometry, SVG | **3–5% opacity** |
| **Dividers** | Fine geometric ornament | 8% opacity |
| **Empty states** | Illustration of a bowl or platter | Line-art style |
| **Loading** | Rotating ganch ornament | Subtle |
| **Category icons** | Line-art dishes | One consistent style |
| **Color** | Terracotta + ceramic blue | Always |

## 9.3 Background pattern — technical spec

```css
/* Islimiy geometric pattern — tiling SVG */
.pattern-bg {
  background-image: url("data:image/svg+xml,...");
  background-size: 120px 120px;
  opacity: 0.04;              /* ⚡ 4% — almost invisible */
  background-repeat: repeat;
  pointer-events: none;
  position: absolute;
  inset: 0;
}
```

**Pattern type:** 8-pointed star (islimiy) or a ganch lattice.
**⛔ Never use:** suzani floral motifs (far too colorful), Arabic calligraphy.

## 9.4 Where it must never appear

```
⛔  Over food photography
⛔  Inside buttons
⛔  Behind text (hurts readability)
⛔  On the KDS screen (the cook needs to read fast)
⛔  In admin tables
```

## 9.5 Language and writing conventions

| Element | Rule |
|---|---|
| National dish names | **Keep the original:** "Norin", "Dimlama" (never translated) |
| Description | Add a **short explanation** for foreign guests |
| Currency | "so'm" (lowercase), space-grouped: `45 000` ⚠️ on-screen format — spaces, not commas |
| Date | `17.09.2026` or `17 sentabr` |
| Time | 24-hour: `14:32` |

**Example (English locale):**
```
Norin
Traditional Uzbek dish — hand-cut noodles with horse meat, served cold
```

---
---

# 10. 🧩 COMPONENTS

## 10.1 Button

```
┌─────────────────────────────────────────────────────────────┐
│  PRIMARY (main action)                                       │
│  ┌───────────────────────────────────┐                      │
│  │      SAVATGA QO'SHISH             │  bg: #C75B39         │
│  └───────────────────────────────────┘  text: #FFFFFF       │
│  height 52px · radius 12px · 600 · 16px                     │
│  hover: #E07A52 · active: #A8452A + scale(.98)              │
├─────────────────────────────────────────────────────────────┤
│  SECONDARY                                                   │
│  ┌───────────────────────────────────┐                      │
│  │           Bekor qilish            │  bg: transparent      │
│  └───────────────────────────────────┘  border: 1.5px       │
│  text: #1A1714 · border: #E8E2D9                            │
├─────────────────────────────────────────────────────────────┤
│  GHOST (tertiary)                                            │
│         Batafsil →                      text + icon only     │
│  text: #2E6FA3                                               │
├─────────────────────────────────────────────────────────────┤
│  🎯 AR BUTTON (special — the most important)                 │
│  ┌───────────────────────────────────┐                      │
│  │  📱  AR'DA KO'RISH                │  no gradient!        │
│  └───────────────────────────────────┘  bg: #1B4B73         │
│  text: #FFFFFF · 1px gold border #C9A227                    │
│  ⚡ subtle pulse (2s, scale 1→1.02→1)                       │
└─────────────────────────────────────────────────────────────┘
```

Primary label: "SAVATGA QO'SHISH" (Add to cart) · Secondary: "Bekor qilish" (Cancel) · Ghost: "Batafsil" (Details) · AR: "AR'DA KO'RISH" (View in AR).

**States:**
```
default   →  base color
hover     →  10% lighter
active    →  10% darker + scale(0.98)
disabled  →  opacity 0.4, cursor not-allowed
loading   →  spinner + label "Yuklanmoqda..." (Loading...)
```

## 10.2 Dish card (the most important component)

```
┌──────────────────────────────────────────────────────────┐
│  ┌────────────┐                                          │
│  │            │   Osh (Palov)                    🎯      │
│  │   IMAGE    │   Tashkent style, lamb                   │
│  │  120×120   │                                          │
│  │            │   ⏱ 20 min   ⚖️ 400 g                    │
│  │  🔥 HIT    │                                          │
│  └────────────┘   45 000 so'm            [+ Savatga]     │
└──────────────────────────────────────────────────────────┘

DIMENSIONS:
  Card:         full width, padding 16px, radius 16px
  Image:        120×120px, radius 12px, object-fit: cover
  Name:         18px / 600 / #1A1714
  Description:  14px / 400 / #6B6259 / max 2 lines
  Meta:         12px / 500 / #9B9186
  Price:        20px / 700 / #1A1714 / tabular-nums
  AR marker:    24×24px, top-right corner
  Badge (HIT):  gold #C9A227, bottom-left of the image

STATES:
  hover       →  shadow-md, transform translateY(-2px)
  sold out    →  grayscale image, "Tugagan" label, button disabled
  has 3D      →  🎯 marker visible (gold)
```

"[+ Savatga]" (+ To cart) · "Tugagan" (Sold out).

## 10.3 Modal / Bottom sheet

```
MOBILE (bottom sheet):
┌──────────────────────────────────────────┐
│              ▬▬▬▬                        │  ← drag handle
├──────────────────────────────────────────┤
│                                          │
│         [LARGE IMAGE 16:9]               │
│                              [🎯 AR]     │
├──────────────────────────────────────────┤
│  Osh (Palov)                             │
│  ⭐ 4.8 (127)          🔥 HIT            │
│                                          │
│  Tashkent-style pilaf, slow-cooked...    │
│  ...                                     │
└──────────────────────────────────────────┘

  Top radius: 28px
  Background: bg-card
  Overlay: rgba(26,23,20,.5) + backdrop-blur(4px)
  Animation: rises from the bottom, 280ms, cubic-bezier(.32,.72,0,1)
  Dismiss: drag down · ✕ · tap the overlay

DESKTOP (centered modal):
  max-width: 560px · radius 20px · shadow-xl
```

## 10.4 Input field

```
┌──────────────────────────────────────────┐
│  Izoh                                    │  ← label 14px/500
│  ┌────────────────────────────────────┐  │
│  │ e.g. achchiq qilmang               │  │  ← placeholder #9B9186
│  └────────────────────────────────────┘  │
│  Max 200 characters                      │  ← helper 12px
└──────────────────────────────────────────┘

  Height: 48px · radius 12px
  Border: 1.5px #E8E2D9
  Focus: border #C75B39 + shadow 0 0 0 3px rgba(199,91,57,.12)
  Error: border #DC2626 + error text in red
```

"Izoh" (Note) · placeholder example "achchiq qilmang" (not spicy, please).

## 10.5 Stepper (quantity)

```
┌─────┐  ┌─────┐  ┌─────┐
│  −  │  │  2  │  │  +  │
└─────┘  └─────┘  └─────┘
 40px     44px     40px

  Radius: 10px · Border: 1.5px #E8E2D9
  Number: 18px / 600 / tabular-nums
  ⚡ Quantity is ALWAYS a whole number: Math.ceil()
  Min 1 · Max 99
  − button: disabled at 1
```

## 10.6 Badge / Tag

```
🔥 HIT          bg #C9A227 · text #FFFFFF
🆕 YANGI        bg #2E6FA3 · text #FFFFFF
🎯 3D           bg #1B4B73 · text #C9A227
🥗 Halol        bg #E8F0F7 · text #1B4B73
🌶 Achchiq      bg #FBEDE8 · text #A8452A
⛔ Tugagan      bg #E8E2D9 · text #6B6259

  Height: 22px · radius full · padding 0 10px
  Type: 11px / 600 / letter-spacing .02em
```

"YANGI" (New) · "Halol" (Halal) · "Achchiq" (Spicy) · "Tugagan" (Sold out).

## 10.7 Toast (notification)

```
┌──────────────────────────────────────────┐
│  ✅  Savatga qo'shildi                   │
└──────────────────────────────────────────┘

  Position: 80px from the bottom (above the cart bar)
  Background: #1A1714 (light) / #F5F1EA (dark)
  Text: inverted color
  Radius: 12px · padding 12px 16px
  Animation: slides up from the bottom + fade, 240ms
  Duration: 2.5s
  Types: ✅ success · ⚠️ warning · 🔴 error · ℹ️ info
```

"Savatga qo'shildi" (Added to cart).

## 10.8 Skeleton (loading)

```
┌──────────────────────────────────────────┐
│  ┌────────┐  ▬▬▬▬▬▬▬▬▬▬▬▬               │
│  │        │  ▬▬▬▬▬▬▬▬                    │
│  │        │                              │
│  │        │  ▬▬▬▬▬        ▬▬▬▬▬▬        │
│  └────────┘                              │
└──────────────────────────────────────────┘

  Color: #F7F3ED → #E8E2D9 shimmer
  Animation: 1.4s linear infinite
  ⚡ Skeletons INSTEAD OF spinners — they feel faster
```

## 10.9 Empty state

```
        ╭───────────────╮
        │   [Piyola     │     ← line-art illustration
        │    drawing]   │        in a national style
        ╰───────────────╯

         Savat bo'sh
    Menyudan taom tanlang

      ┌─────────────────┐
      │   Menyuga o't   │
      └─────────────────┘

  Illustration: 120×120, line art, in #C75B39
  Heading: 18px / 600
  Description: 14px / #6B6259
  ⚡ Every empty state must offer an action button
```

"Savat bo'sh" (Your cart is empty) · "Menyudan taom tanlang" (Pick a dish from the menu) · "Menyuga o't" (Go to menu). Piyola = traditional Uzbek tea bowl.

---
---

# 11. 📱 SCREEN-BY-SCREEN

## 11.1 CUSTOMER — Menu (main screen)

```
┌─────────────────────────────────────────┐
│ ░░ subtle pattern bg 4% ░░              │
│                                         │
│ [Logo]  Registon         [🇺🇿▾] [🌙]   │ ← header, sticky
│         Stol №5                         │
├─────────────────────────────────────────┤
│  🔍  Taom qidirish...                   │ ← search
├─────────────────────────────────────────┤
│ [Hammasi][Milliy][Salat][Ichimlik] →    │ ← categories, horizontal scroll
├─────────────────────────────────────────┤
│ 🏷 [Halol] [Vegan] [Achchiqsiz]        │ ← filter chips
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ [image] Osh (Palov)        🎯    │  │
│  │ 🔥HIT   Tashkent style...        │  │
│  │         45 000 so'm   [+ Savat]  │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ [image] Manti              🎯    │  │
│  │         Hand-folded...           │  │
│  │         38 000 so'm   [+ Savat]  │  │
│  └───────────────────────────────────┘  │
│              ...                        │
├─────────────────────────────────────────┤
│ [🛒 Savat · 2 ta · 83 000]      [🤖]   │ ← sticky bottom bar
│ [🔔 Chaqiruv]                           │
└─────────────────────────────────────────┘
```

UI strings: "Stol №5" (Table no. 5) · "Taom qidirish..." (Search dishes...) · "Hammasi" (All) · "Milliy" (National) · "Salat" (Salads) · "Ichimlik" (Drinks) · "Achchiqsiz" (Not spicy) · "Savat · 2 ta" (Cart · 2 items) · "Chaqiruv" (Call waiter).

**Key details:**
- Header is **sticky**; a shadow appears on scroll
- Categories scroll **horizontally**; the active chip gets a terracotta fill
- The cart bar appears only when the cart has items (slides up from the bottom)
- Images **lazy-load** with skeletons
- Use **virtual scroll** beyond 100 dishes

## 11.2 CUSTOMER — 🎯 AR view (the most important)

```
┌─────────────────────────────────────────┐
│                                    [✕]  │
│                                         │
│         ┌─────────────────┐             │
│         │                 │             │
│         │   3D MODEL      │             │
│         │   (rotating)    │             │
│         │                 │             │
│         └─────────────────┘             │
│                                         │
│      Barmoq bilan aylantiring           │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │   📱  STOLGA QO'YIB KO'RISH       │  │ ← primary CTA
│  └───────────────────────────────────┘  │
│                                         │
│         Haqiqiy o'lchamda               │ ← reassurance line
│                                         │
├─────────────────────────────────────────┤
│  Osh (Palov)              45 000 so'm   │
│  ┌───────────────────────────────────┐  │
│  │      🛒 SAVATGA QO'SHISH          │  │ ← straight after AR
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

UI strings: "Barmoq bilan aylantiring" (Swipe to rotate) · "STOLGA QO'YIB KO'RISH" (Place it on your table) · "Haqiqiy o'lchamda" (At real size).

**States:**
```
1. Loading        →  3D skeleton + progress bar (%)
2. Ready          →  model rotates, AR button enabled
3. AR not         →  "3D ko'rish" (View in 3D) instead of the AR button
   supported          + note: "Qurilmangiz AR'ni qo'llab-quvvatlamaydi"
                      (Your device doesn't support AR)
4. Error          →  plain photo + "3D yuklanmadi" (3D failed to load)
5. In preparation →  "3D model tayyorlanmoqda" (3D model in progress) + photo
```

**⚡ The AR experience (once the camera opens):**
```
iOS     →  AR Quick Look (system app) — USDZ
Android →  Scene Viewer / WebXR — GLB

Instruction text: "Telefoningizni stolga qarating"
                  (Point your phone at the table)
The model appears at true scale (a Ø32 cm platter renders as 32 cm)
The guest rotates it, zooms in, and walks around it
```

## 11.3 CUSTOMER — Cart

```
┌─────────────────────────────────────────┐
│ ←  Savat                           [✕]  │
├─────────────────────────────────────────┤
│  ┌───────────────────────────────────┐  │
│  │ [img] Osh (Palov)                 │  │
│  │       + Extra meat                 │  │
│  │       💬 "achchiq qilmang"         │  │
│  │       [−] 2 [+]    140 000   [🗑]  │  │
│  └───────────────────────────────────┘  │
├─────────────────────────────────────────┤
│  💡 Bularni ham oling                   │ ← cross-sell
│  [Non 8 000] [Choy 5 000] [Ayron 12k]  │
├─────────────────────────────────────────┤
│  Taomlar                   158 000      │
│  Xizmat (10%)               15 800      │
│  ─────────────────────────────────────  │
│  JAMI                      173 800      │ ← 24px/700
├─────────────────────────────────────────┤
│  Umumiy izoh: [__________________]      │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │       ✅  BUYURTMA BERISH          │  │ ← 56px tall
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

UI strings: "Savat" (Cart) · "Bularni ham oling" (Add these too) · "Taomlar" (Dishes) · "Xizmat" (Service charge) · "JAMI" (Total) · "Umumiy izoh" (Order note) · "BUYURTMA BERISH" (Place order).

## 11.4 CUSTOMER — Order status

```
┌─────────────────────────────────────────┐
│  Buyurtma #047           Stol 5         │
├─────────────────────────────────────────┤
│                                         │
│   ●────────●────────○────────○          │ ← progress
│  Qabul  Tayyor-   Tayyor  Berildi       │
│ qilindi lanmoqda                        │
│                                         │
│      ⏱ About 14 minutes left           │
│                                         │
├─────────────────────────────────────────┤
│  Osh (Palov) × 2           140 000      │
│  Achchiq-chuchuk × 1        18 000      │
│  ─────────────────────────────────────  │
│  JAMI                      173 800      │
├─────────────────────────────────────────┤
│  [➕ Yana buyurtma]  [🔔 Chaqiruv]      │
│  [💳 Hisob so'rash]                     │
└─────────────────────────────────────────┘
```

UI strings: "Buyurtma" (Order) · "Qabul qilindi" (Accepted) · "Tayyorlanmoqda" (Cooking) · "Tayyor" (Ready) · "Berildi" (Served) · "Yana buyurtma" (Order more) · "Hisob so'rash" (Request the bill).

**⚡ When the order hits "Tayyor":**
- The progress dot turns green and pulses
- Haptic buzz + sound
- Toast: "🎉 Buyurtmangiz tayyor!" (Your order is ready!)

## 11.5 WAITER — Home screen

```
┌─────────────────────────────────────────┐
│ 🧑‍🍳 Dilshod         Smena: 4h 20m      │
│ Bugun: 23 stol · 4,2 mln · 💝 87 000   │
├─────────────────────────────────────────┤
│  🔔 3 ta yangi                          │
├─────────────────────────────────────────┤
│  ┌───────────────────────────────────┐  │
│  │ 🆕 #047                    2 min  │  │
│  │                                   │  │
│  │      🪑 STOL 5                    │  │ ← 32px/800 ⚡
│  │                                   │  │
│  │ Osh × 2, Achchiq-chuchuk × 1      │  │
│  │ 💬 "achchiq qilmang"              │  │
│  │ 173 800 so'm                      │  │
│  │ ┌───────────────────────────────┐ │  │
│  │ │    ✅ QABUL QILDIM            │ │  │ ← 52px
│  │ └───────────────────────────────┘ │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ ✅ #045       🪑 STOL 3   TAYYOR! │  │ ← green, pulsing
│  │ ┌───────────────────────────────┐ │  │
│  │ │    🍽 OLIB BORDIM             │ │  │
│  │ └───────────────────────────────┘ │  │
│  └───────────────────────────────────┘  │
├─────────────────────────────────────────┤
│ [📋 Buyurtma] [🗺 Zal] [🔔2] [📊]      │ ← tab bar
└─────────────────────────────────────────┘
```

UI strings: "Smena" (Shift) · "Bugun: 23 stol" (Today: 23 tables) · "3 ta yangi" (3 new) · "STOL 5" (Table 5) · "QABUL QILDIM" (I've accepted it) · "OLIB BORDIM" (I've delivered it) · "Zal" (Floor plan).

**⚡ Critical:** the table number is the largest element on the screen.

## 11.6 KDS — Kitchen display (TV)

```
┌───────────────────────────────────────────────────────────────┐
│ 🍳 OSHXONA        14:32       Active: 7     Average: 12 min   │
├──────────────────┬──────────────────┬─────────────────────────┤
│  🆕 YANGI (3)    │ 🍳 TAYYORLANMOQDA│  ✅ TAYYOR (2)          │
├──────────────────┼──────────────────┼─────────────────────────┤
│ ┌──────────────┐ │ ┌──────────────┐ │ ┌─────────────────────┐ │
│ │ #047         │ │ │ #046         │ │ │ #045                │ │
│ │              │ │ │              │ │ │                     │ │
│ │  STOL 5      │ │ │  STOL 12     │ │ │  STOL 3             │ │ ← 56px/800
│ │              │ │ │              │ │ │                     │ │
│ │ ⏱ 0:47      │ │ │ ⏱ 8:12  🟡  │ │ │ ⏱ 14:03  ✅        │ │
│ ├──────────────┤ │ ├──────────────┤ │ ├─────────────────────┤ │
│ │ 2× OSH       │ │ │ 1× LAG'MON   │ │ │ 3× SOMSA            │ │ ← 24px/600
│ │  ⚠️ achchiq  │ │ │ 2× SHASHLIK  │ │ │ 1× CHOY             │ │
│ │    qilmang   │ │ │              │ │ │                     │ │
│ ├──────────────┤ │ ├──────────────┤ │ ├─────────────────────┤ │
│ │ [BOSHLASH]   │ │ │ [TAYYOR ✓]   │ │ │ [BERILDI]           │ │
│ └──────────────┘ │ └──────────────┘ │ └─────────────────────┘ │
└──────────────────┴──────────────────┴─────────────────────────┘
```

UI strings: "OSHXONA" (Kitchen) · "YANGI" (New) · "TAYYORLANMOQDA" (Cooking) · "TAYYOR" (Ready) · "BOSHLASH" (Start) · "BERILDI" (Served).

**KDS-specific rules:**
```
Background:    #0D0B09 (deep dark — built for TV)
Card:          #1A1714
Table number:  56px / 800 / #F5F1EA
Dish:          24px / 600
MUST be legible from 3 metres away

Timer colors:
  0-50% of ETA  🟢 #16A34A
  50-80%        🟡 #D97706
  80-100%       🟠 #EA580C
  >100%         🔴 #DC2626 + pulse + sound

⛔ NO background pattern — it distracts
⛔ Keep animation minimal
```

## 11.7 ADMIN — Dashboard

```
┌───────────────────────────────────────────────────────────────┐
│ 🏠 Dashboard    Registon              17.09.2026  14:32       │
├───────────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│ │ TODAY   │ │ ORDERS  │ │AVG CHECK│ │OCCUPIED │ │   AR    │  │
│ │ 4,8 mln │ │   87    │ │ 55 172  │ │ 18/24   │ │  143    │  │
│ │ ▲ +12%  │ │ ▲ +8%   │ │ ▲ +23%  │ │  75%    │ │ ▲ +34%  │  │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘  │
├───────────────────────────────────────────────────────────────┤
│ 📊 Sales by hour          │ 🍽 TOP 5 dishes                   │
│  ▁▂▃▅▇█▇▅▃▂               │ 1. Osh       34 pcs  1,5 mln      │
│  9 11 13 15 17 19 21      │ 2. Manti     28 pcs  1,0 mln      │
├───────────────────────────┴───────────────────────────────────┤
│ 🔴 LIVE FEED                                                  │
│ 14:32  Table 5   new order      #047    173 800   [view]     │
│ 14:31  Table 12  ready          #046    245 000               │
│ 14:29  Table 8   ⭐⭐ 2-star    ❗      [reply]               │
└───────────────────────────────────────────────────────────────┘
```

**Metric card:**
```
Number:    32px / 700 / tabular-nums
Label:     12px / 500 / #9B9186 / CAPS
Change:    14px / 600 / green (▲) or red (▼)
Surface:   bg-card · radius 16px · shadow-sm
```

## 11.8 ADMIN — AR analytics *(the sales weapon)*

```
┌───────────────────────────────────────────────────────────────┐
│ 🎯 AR analytics                         [This month ▾]       │
├───────────────────────────────────────────────────────────────┤
│ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐        │
│ │  AR VIEWS     │ │  CONVERSION   │ │ CHECK IMPACT  │        │
│ │    2 847      │ │    38,4%      │ │    +31%       │        │
│ └───────────────┘ └───────────────┘ └───────────────┘        │
├───────────────────────────────────────────────────────────────┤
│ 💰 GUESTS WHO USED AR vs THOSE WHO DIDN'T                     │
│                                                                │
│   Used AR:       ████████████████████ 68 400 so'm            │
│   Didn't use AR: █████████████ 52 100 so'm                    │
│                                        ⚡ +31,3% difference   │
│                                                                │
│   ➜ Extra revenue from AR this month:  +14 200 000 so'm       │
│   ➜ Subscription fee: 590 000 so'm  →  ROI = 24×             │
└───────────────────────────────────────────────────────────────┘
```

> 💰 This screen is what **keeps** the restaurant owner subscribed (it drives churn down).

---
---

# 12. ✨ MOTION AND FEEL

## 12.1 Timing and curves

```css
--ease-out:    cubic-bezier(0.16, 1, 0.3, 1);      /* exit */
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);     /* both directions */
--ease-sheet:  cubic-bezier(0.32, 0.72, 0, 1);     /* bottom sheet */

--dur-fast:   120ms   /* button press */
--dur-base:   200ms   /* transition, fade */
--dur-slow:   280ms   /* modal, sheet */
--dur-slower: 400ms   /* fly-to-cart */
```

## 12.2 Core animations

| Event | Animation | Duration |
|---|---|---|
| Button press | `scale(0.98)` | 120ms |
| Card hover | `translateY(-2px)` + shadow | 200ms |
| Modal open | rise from bottom + fade | 280ms |
| Add to cart | image flies into the cart | 400ms |
| Toast | rise from bottom + fade | 240ms |
| Order submitted | ✓ draws itself | 600ms |
| Ready notification | pulse × 3 | 1s |
| Page transition | slide | 200ms |
| 🎯 AR button | subtle pulse (continuous) | 2s |

## 12.3 Rules

```
✅  Every animation has a purpose (it signals a state change)
✅  prefers-reduced-motion is respected
⛔  No two animations at once
⛔  Nothing longer than 400ms (except the AR and cart animations)
⛔  No bounce/elastic easing (it reads as childish)
```

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## 12.4 Haptics

```javascript
Add to cart          →  navigator.vibrate(10)
Order submitted      →  navigator.vibrate([30, 50, 30])
Order ready          →  navigator.vibrate([200, 100, 200])
Error                →  navigator.vibrate([50, 30, 50])
```

---
---

# 13. 🤖 READY-MADE AI PROMPTS

> Copy these and paste them into v0.dev / Lovable / Figma AI / Claude.

## 13.1 General prompt (design system)

```
Design a premium mobile-first restaurant menu app called ARMENU for
Uzbekistan. Customers scan a QR code at their table, browse the menu,
and view dishes in AR (augmented reality) at real size before ordering.

DESIGN DIRECTION:
- Premium and refined, but simple and fast to use
- Food photography is the hero — UI stays quiet and out of the way
- Subtle Uzbek cultural hints, NOT loud ethnic decoration

COLOR SYSTEM:
- Primary: Terracotta #C75B39 (Uzbek ceramics, tandoor bread)
  hover #E07A52, active #A8452A, tint #FBEDE8
- Secondary: Ceramic Blue #1B4B73 (Registan dome)
  light #2E6FA3, tint #E8F0F7
- Accent: Gold #C9A227 (ganch ornament) — for HIT badges, ratings
- Neutrals must be WARM, never cold gray:
  light: bg #FDFBF7, card #FFFFFF, border #E8E2D9,
         text #1A1714, muted #6B6259
  dark:  bg #14110E, card #241F1B, border #332C26,
         text #F5F1EA, muted #A89E92
- Rule 60/30/10: 60% neutral, 30% food photos, 10% brand accent

TYPOGRAPHY:
- Inter (must include Cyrillic for Russian language)
- Optional Playfair Display for restaurant name only
- Body text minimum 16px (restaurants have dim lighting)
- Prices use tabular-nums
- Scale: 12, 14, 16, 18, 20, 24, 32, 40, 56px

SPACING & SHAPE:
- 4px base scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius: buttons 12px, cards 16px, modals 20px, sheets 28px
- Shadows are WARM: rgba(26,23,20,.08), never pure black
- Touch targets minimum 44px, primary CTA 56px tall

CULTURAL LAYER (subtle):
- Islamic geometric pattern (8-pointed star) as background
  at ONLY 4% opacity — barely visible
- Line-art illustrations of Uzbek tableware for empty states
- Never place pattern over food photos, buttons, or text

KEY COMPONENT — DISH CARD:
Horizontal layout: 120×120px image (radius 12px) on the left,
content on the right: dish name 18px/600, description 14px/400
max 2 lines, meta row (time, weight) 12px, then price 20px/700
and "Add to cart" button. A gold 🎯 badge in the top-right corner
marks dishes that have a 3D/AR model.

KEY COMPONENT — AR BUTTON (most important):
Solid Ceramic Blue #1B4B73 background, white text, 1px gold border
#C9A227, NO gradient. Label "📱 View on your table". Subtle pulse
animation (scale 1 → 1.02 → 1 over 2s) to draw attention.

THEMES: Full light and dark mode, both first-class.
LANGUAGES: Uzbek, Russian, English — design must survive
text length changes (Russian is ~20% longer than English).
```

## 13.2 Menu screen prompt

```
Create the main menu screen for ARMENU (mobile, 390×844).

STRUCTURE (top to bottom):
1. Sticky header: restaurant logo + name, table number "Stol №5"
   below it in muted text, language switcher (🇺🇿 flag + chevron)
   and theme toggle on the right. Header gains a soft shadow on scroll.
2. Search bar with magnifier icon, placeholder "Taom qidirish..."
3. Horizontal scrolling category chips. Active chip has terracotta
   background with white text; inactive are outlined.
4. Dietary filter chips row: Halol, Vegan, Achchiqsiz (tinted style)
5. Vertical list of dish cards (see dish card spec)
6. Sticky bottom bar (only visible when cart has items):
   "🛒 Savat · 2 ta · 83 000" as a wide terracotta button,
   plus a small AI chat button 🤖 and a call-waiter button 🔔

DETAILS:
- Background #FDFBF7 with a barely-visible Islamic geometric
  pattern at 4% opacity
- Dish images lazy-load with shimmer skeletons
- Sold-out dishes: grayscale image, "Tugagan" badge, disabled button
- Show both light and dark versions
```

## 13.3 AR screen prompt

```
Create the AR viewing screen for ARMENU (mobile, 390×844).

This is the app's signature feature — it must feel special.

LAYOUT:
- Full-screen dark overlay (#14110E at 96% opacity)
- Close button ✕ top-right
- Centered: a 3D model of a plate of Uzbek pilaf (osh), slowly rotating
- Below it, muted hint text: "Barmoq bilan aylantiring"
- Primary CTA, full width, 56px tall: "📱 STOLGA QO'YIB KO'RISH"
  — Ceramic Blue #1B4B73, white text, 1px gold border #C9A227
- Small reassurance line under the button: "Haqiqiy o'lchamda"
- Bottom section on a card: dish name, price, and a terracotta
  "🛒 SAVATGA QO'SHISH" button

ALSO DESIGN THESE STATES:
1. Loading — 3D skeleton shape with a progress percentage
2. AR not supported — the AR button is replaced by "3D ko'rish",
   with an explanatory line below
3. Error — fallback to a regular photo with "3D yuklanmadi"

The mood is premium and confident, like unveiling a product.
```

## 13.4 Waiter screen prompt

```
Create the waiter's order screen for ARMENU (mobile, 390×844).

CONTEXT: A busy waiter glances at this while walking through a noisy
restaurant. The TABLE NUMBER is the single most important element —
it must be readable in under half a second.

LAYOUT:
1. Compact header: waiter name, shift duration, and a stats line
   "Bugun: 23 stol · 4,2 mln · 💝 87 000"
2. Section label "🔔 3 ta yangi"
3. Order cards, each containing:
   - Order number and elapsed time (small, muted, top row)
   - TABLE NUMBER — 32px, weight 800, with a 🪑 icon (dominant)
   - Dish list in compact form
   - Customer note with a 💬 icon, in a tinted warning box
   - Total price
   - A 52px tall action button ("✅ QABUL QILDIM")
4. Bottom tab bar: Orders / Floor plan / Calls (with badge) / Stats

ORDER STATES:
- New: neutral card, terracotta button
- Cooking: muted card, no button, shows progress
- Ready: green tinted card with a soft pulsing glow,
  green button "🍽 OLIB BORDIM"

Design both light and dark modes. Dark mode is the default for
waiters (they work in dim rooms).
```

## 13.5 KDS screen prompt

```
Create the Kitchen Display System (KDS) screen for ARMENU.
Target: a 1920×1080 TV mounted in a kitchen, read from 3 meters away.

STYLE: Dark, high-contrast, almost industrial. No decoration,
no background patterns, minimal animation. Function over beauty —
but still clean and professional.

LAYOUT:
- Top bar: "🍳 OSHXONA", current time, active order count,
  average preparation time
- Three equal columns: YANGI / TAYYORLANMOQDA / TAYYOR
- Order cards inside each column:
  · Order number, small
  · TABLE NUMBER — 56px, weight 800, the largest element
  · Elapsed timer, 32px, tabular-nums
  · Dish list — 24px, weight 600, quantities prefixed "2×"
  · Customer notes highlighted with ⚠️ in an amber box
  · One large action button per card

COLORS:
- Background #0D0B09, cards #1A1714, text #F5F1EA
- Timer colors by urgency: green → amber → orange → red
- Overdue cards: red border with a slow pulse animation

Everything must be legible from across a kitchen.
```

## 13.6 Admin dashboard prompt

```
Create the admin dashboard for ARMENU (desktop, 1440×900).

CONTEXT: The restaurant owner opens this to see how business is doing
right now. Information density is high but must never feel cluttered.

LAYOUT:
- Left sidebar, 260px: logo, navigation (Dashboard, Menu, Tables,
  Orders, 3D Models, Staff, Reports, Settings), user block at bottom
- Main area:
  1. Page header with restaurant name and current date/time
  2. Row of 5 metric cards: Today's revenue, Orders, Average check,
     Tables occupied, AR views. Each shows a large number (32px/700),
     a small uppercase label, and a green/red change indicator
  3. Two-column section: an hourly revenue bar chart on the left,
     a "Top 5 dishes" list on the right
  4. Live activity feed — a real-time stream of events with
     timestamp, table, event type, amount, and an action link.
     Low-rating reviews are highlighted in red with a "Reply" button

STYLE: Same warm palette as the customer app, but calmer — this is a
working tool. Cards on #FDFBF7 background, white cards, 16px radius,
subtle shadows. Charts use terracotta and ceramic blue.

Design both light and dark modes.
```

---
---

# 14. 💻 CSS FOR CURSOR

> Drop this straight into `static/guest/css/tokens.css`.

```css
/* ═══════════════════════════════════════════════════════════
   ARMENU — DESIGN TOKENS
   ⛔ Never hard-code a color anywhere. Only var().
   ═══════════════════════════════════════════════════════════ */

:root {
  /* ── BRAND ── */
  --brand:          #C75B39;   /* terracotta — primary */
  --brand-hover:    #E07A52;
  --brand-active:   #A8452A;
  --brand-tint:     #FBEDE8;

  --ceramic:        #1B4B73;   /* ceramic blue */
  --ceramic-light:  #2E6FA3;
  --ceramic-tint:   #E8F0F7;

  --gold:           #C9A227;   /* gold */
  --gold-light:     #E3C158;

  /* ── NEUTRALS (warm — NEVER cold gray) ── */
  --bg:             #FDFBF7;
  --bg-soft:        #F7F3ED;
  --bg-card:        #FFFFFF;
  --border:         #E8E2D9;
  --text:           #1A1714;
  --text-soft:      #6B6259;
  --text-muted:     #9B9186;

  /* ── SEMANTIC ── */
  --success:        #16A34A;
  --warning:        #D97706;
  --danger:         #DC2626;
  --info:           #2E6FA3;

  /* ── TABLE STATUS ── */
  --st-free:        #16A34A;
  --st-occupied:    #2E6FA3;
  --st-waiting:     #D97706;
  --st-ready:       #DC2626;
  --st-bill:        #7C3AED;

  /* ── SPACING (4px base) ── */
  --sp-1:   4px;   --sp-2:   8px;   --sp-3:  12px;
  --sp-4:  16px;   --sp-5:  24px;   --sp-6:  32px;
  --sp-8:  48px;   --sp-10: 64px;

  /* ── RADIUS ── */
  --r-sm:    8px;  --r-md:  12px;  --r-lg:  16px;
  --r-xl:   20px;  --r-2xl: 28px;  --r-full: 999px;

  /* ── SHADOWS (warm) ── */
  --shadow-xs: 0 1px 2px  rgba(26,23,20,.04);
  --shadow-sm: 0 2px 8px  rgba(26,23,20,.06);
  --shadow-md: 0 4px 16px rgba(26,23,20,.08);
  --shadow-lg: 0 12px 32px rgba(26,23,20,.12);
  --shadow-xl: 0 24px 64px rgba(26,23,20,.16);

  /* ── TYPOGRAPHY ── */
  --font: 'Inter', -apple-system, BlinkMacSystemFont,
          'Segoe UI', Roboto, sans-serif;
  --font-display: 'Playfair Display', Georgia, serif;

  --fs-xs:  12px;  --fs-sm:  14px;  --fs-base: 16px;
  --fs-lg:  18px;  --fs-xl:  20px;  --fs-2xl:  24px;
  --fs-3xl: 32px;  --fs-4xl: 40px;  --fs-5xl:  56px;

  --lh-tight: 1.2;  --lh-base: 1.5;  --lh-loose: 1.7;

  /* ── MOTION ── */
  --ease-out:    cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --ease-sheet:  cubic-bezier(0.32, 0.72, 0, 1);

  --dur-fast:   120ms;
  --dur-base:   200ms;
  --dur-slow:   280ms;
  --dur-slower: 400ms;
}

/* ── DARK: system preference ── */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg:         #14110E;
    --bg-soft:    #1C1815;
    --bg-card:    #241F1B;
    --border:     #332C26;
    --text:       #F5F1EA;
    --text-soft:  #A89E92;
    --text-muted: #6B6259;
    --brand-tint: #2A1810;
    --ceramic-tint:#111E2A;

    --shadow-xs: 0 1px 2px  rgba(0,0,0,.3);
    --shadow-sm: 0 2px 8px  rgba(0,0,0,.35);
    --shadow-md: 0 4px 16px rgba(0,0,0,.4);
    --shadow-lg: 0 12px 32px rgba(0,0,0,.5);
    --shadow-xl: 0 24px 64px rgba(0,0,0,.6);
  }
}

/* ── DARK: explicitly chosen ── */
:root[data-theme="dark"] {
  --bg:         #14110E;
  --bg-soft:    #1C1815;
  --bg-card:    #241F1B;
  --border:     #332C26;
  --text:       #F5F1EA;
  --text-soft:  #A89E92;
  --text-muted: #6B6259;
  --brand-tint: #2A1810;
  --ceramic-tint:#111E2A;
  --shadow-md: 0 4px 16px rgba(0,0,0,.4);
  --shadow-lg: 0 12px 32px rgba(0,0,0,.5);
}

/* ═══════════════════════════════════════════════════════════
   BASE
   ═══════════════════════════════════════════════════════════ */

* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: var(--font);
  font-size: var(--fs-base);
  line-height: var(--lh-base);
  background: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
  -webkit-tap-highlight-color: transparent;
}

/* Numerals align in a column */
.num, .price, .timer { font-variant-numeric: tabular-nums; }

/* ═══════════════════════════════════════════════════════════
   CULTURAL PATTERN BACKGROUND (4% — barely visible)
   ═══════════════════════════════════════════════════════════ */

.pattern-bg::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cg fill='none' stroke='%23C75B39' stroke-width='1'%3E%3Cpath d='M60 10 L75 35 L105 40 L82 60 L88 90 L60 76 L32 90 L38 60 L15 40 L45 35 Z'/%3E%3Ccircle cx='60' cy='60' r='28'/%3E%3C/g%3E%3C/svg%3E");
  background-size: 120px 120px;
  opacity: .04;
  pointer-events: none;
  z-index: 0;
}

/* ═══════════════════════════════════════════════════════════
   BUTTONS
   ═══════════════════════════════════════════════════════════ */

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  height: 52px;
  padding: 0 var(--sp-5);
  border: none;
  border-radius: var(--r-md);
  font-family: inherit;
  font-size: var(--fs-base);
  font-weight: 600;
  cursor: pointer;
  transition: background var(--dur-base) var(--ease-out),
              transform var(--dur-fast) var(--ease-out);
}

.btn:active { transform: scale(.98); }
.btn:disabled { opacity: .4; cursor: not-allowed; transform: none; }

.btn--primary {
  background: var(--brand);
  color: #FFFFFF;
}
.btn--primary:hover:not(:disabled) { background: var(--brand-hover); }
.btn--primary:active:not(:disabled) { background: var(--brand-active); }

.btn--secondary {
  background: transparent;
  color: var(--text);
  border: 1.5px solid var(--border);
}
.btn--secondary:hover:not(:disabled) { background: var(--bg-soft); }

.btn--ghost {
  background: transparent;
  color: var(--ceramic-light);
  height: auto;
  padding: var(--sp-2) var(--sp-3);
}

/* 🎯 AR button — special treatment */
.btn--ar {
  background: var(--ceramic);
  color: #FFFFFF;
  border: 1px solid var(--gold);
  animation: ar-pulse 2s var(--ease-in-out) infinite;
}
.btn--ar:hover { background: var(--ceramic-light); }

@keyframes ar-pulse {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.02); }
}

.btn--lg { height: 56px; font-size: var(--fs-lg); width: 100%; }

/* ═══════════════════════════════════════════════════════════
   DISH CARD
   ═══════════════════════════════════════════════════════════ */

.dish-card {
  display: flex;
  gap: var(--sp-4);
  padding: var(--sp-4);
  background: var(--bg-card);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-sm);
  transition: box-shadow var(--dur-base) var(--ease-out),
              transform var(--dur-base) var(--ease-out);
  position: relative;
}

.dish-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.dish-card__img {
  width: 120px;
  height: 120px;
  border-radius: var(--r-md);
  object-fit: cover;
  flex-shrink: 0;
  background: var(--bg-soft);
}

.dish-card__body { flex: 1; min-width: 0; }

.dish-card__name {
  font-size: var(--fs-lg);
  font-weight: 600;
  color: var(--text);
  margin: 0 0 var(--sp-1);
}

.dish-card__desc {
  font-size: var(--fs-sm);
  color: var(--text-soft);
  margin: 0 0 var(--sp-2);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.dish-card__meta {
  display: flex;
  gap: var(--sp-3);
  font-size: var(--fs-xs);
  font-weight: 500;
  color: var(--text-muted);
  margin-bottom: var(--sp-3);
}

.dish-card__price {
  font-size: var(--fs-xl);
  font-weight: 700;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}

/* 🎯 3D badge */
.dish-card__ar-badge {
  position: absolute;
  top: var(--sp-3);
  right: var(--sp-3);
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  background: var(--ceramic);
  color: var(--gold);
  border-radius: var(--r-full);
  font-size: 14px;
}

/* Sold-out dish */
.dish-card--sold-out .dish-card__img { filter: grayscale(1); opacity: .6; }
.dish-card--sold-out { opacity: .7; }

/* ═══════════════════════════════════════════════════════════
   BADGES
   ═══════════════════════════════════════════════════════════ */

.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 22px;
  padding: 0 10px;
  border-radius: var(--r-full);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .02em;
}

.badge--hit    { background: var(--gold);         color: #FFFFFF; }
.badge--new    { background: var(--ceramic);      color: #FFFFFF; }
.badge--3d     { background: var(--ceramic);      color: var(--gold); }
.badge--halal  { background: var(--ceramic-tint); color: var(--ceramic); }
.badge--spicy  { background: var(--brand-tint);   color: var(--brand-active); }
.badge--out    { background: var(--border);       color: var(--text-soft); }

/* ═══════════════════════════════════════════════════════════
   BOTTOM SHEET
   ═══════════════════════════════════════════════════════════ */

.sheet {
  position: fixed;
  left: 0; right: 0; bottom: 0;
  background: var(--bg-card);
  border-radius: var(--r-2xl) var(--r-2xl) 0 0;
  box-shadow: var(--shadow-xl);
  max-height: 92vh;
  overflow-y: auto;
  transform: translateY(100%);
  transition: transform var(--dur-slow) var(--ease-sheet);
  z-index: 100;
}
.sheet--open { transform: translateY(0); }

.sheet__handle {
  width: 40px; height: 4px;
  background: var(--border);
  border-radius: var(--r-full);
  margin: var(--sp-3) auto;
}

.sheet__overlay {
  position: fixed; inset: 0;
  background: rgba(26,23,20,.5);
  backdrop-filter: blur(4px);
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--dur-slow) var(--ease-out);
  z-index: 99;
}
.sheet__overlay--open { opacity: 1; pointer-events: auto; }

/* ═══════════════════════════════════════════════════════════
   SKELETON
   ═══════════════════════════════════════════════════════════ */

.skeleton {
  background: linear-gradient(90deg,
    var(--bg-soft) 25%, var(--border) 50%, var(--bg-soft) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s linear infinite;
  border-radius: var(--r-md);
}

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ═══════════════════════════════════════════════════════════
   KDS (kitchen TV) — separate palette
   ═══════════════════════════════════════════════════════════ */

.kds {
  --kds-bg:     #0D0B09;
  --kds-card:   #1A1714;
  --kds-border: #2A241F;
  --kds-text:   #F5F1EA;
  background: var(--kds-bg);
  color: var(--kds-text);
  font-size: 20px;
}

.kds__table-no {
  font-size: var(--fs-5xl);     /* 56px */
  font-weight: 800;
  letter-spacing: -1px;
  line-height: 1;
}

.kds__item {
  font-size: var(--fs-2xl);     /* 24px */
  font-weight: 600;
}

.kds__timer {
  font-size: var(--fs-3xl);     /* 32px */
  font-variant-numeric: tabular-nums;
}

.kds__card--late {
  border: 2px solid var(--danger);
  animation: pulse-late 1.2s var(--ease-in-out) infinite;
}

@keyframes pulse-late {
  0%, 100% { opacity: 1; }
  50%      { opacity: .65; }
}

/* ═══════════════════════════════════════════════════════════
   ACCESSIBILITY
   ═══════════════════════════════════════════════════════════ */

:focus-visible {
  outline: 2px solid var(--brand);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
  }
}

/* Visually hidden, screen-reader only */
.sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0,0,0,0);
  white-space: nowrap;
  border: 0;
}
```

---
---

# 15. ⛔ WHAT NOT TO DO

## 15.1 In design

| ❌ Forbidden | Why |
|---|---|
| Hard-coded color (`#fff`, `red`) | Use `var(--bg-card)` only |
| Spacing outside the 4px scale | 13px, 17px, 22px — no |
| Gradient buttons | 2010 styling, dated |
| Pattern above 8% opacity | Visually noisy, competes with the food |
| Pure gray (#808080) | Cold and cheap-looking. Use warm neutrals |
| Pure black shadow | Use `rgba(26,23,20,...)` |
| Text below 14px | Unreadable in restaurant lighting |
| 2+ primary CTAs on one screen | Confusing, conversion drops |
| Stock photos (fake food) | Destroys trust |
| Emoji instead of icons | Renders differently per platform (KDS excepted) |

## 15.2 In code

| ❌ Forbidden | ✅ Correct |
|---|---|
| `textContent = "Savatga"` | `textContent = t('dish.add_to_cart')` |
| `background: #fff` | `background: var(--bg-card)` |
| `qty = 2.7` | `qty = Math.ceil(2.7)` → 3 |
| Taking the price from the frontend | Price is computed **server-side** |
| `<script src="app.js">` | `<script src="app.js?v=12">` |
| Light theme only | Light **and** dark, both |
| Uzbek only | 3 languages, 100% coverage |

## 15.3 In AR

| ❌ Forbidden | Consequence |
|---|---|
| `ar-scale="auto"` | Model appears at the wrong size |
| Model authored in centimeters | AR breaks — it must be in **meters** |
| Model origin at Y≠0 | Won't sit correctly on the table |
| GLB > 3 MB | Won't load over 3G |
| Generating 3D inside a web request | Timeout, server blocks |

---
---

# 16. ✅ ACCEPTANCE CHECKLIST

## 16.1 The design is done when:

```
COLOR
[ ] Only token colors used (no hard-coded values)
[ ] Light and dark themes — both complete
[ ] Contrast ≥ 4.5:1 (body), ≥ 3:1 (large text)
[ ] 60/30/10 ratio respected

TYPOGRAPHY
[ ] Body text ≥ 16px
[ ] ≤ 3 sizes per screen
[ ] Prices use tabular-nums
[ ] Cyrillic glyphs present (Russian)

SPACING
[ ] 4px scale only
[ ] Touch targets ≥ 44px
[ ] Primary CTA 56px

CULTURAL LAYER
[ ] Pattern ≤ 5% opacity
[ ] Pattern never over food / buttons / text
[ ] No pattern on KDS

COMPONENTS
[ ] 5 states each (default/hover/active/disabled/loading)
[ ] Empty state with an action button
[ ] Skeleton (not a spinner)
[ ] Error state designed

3 LANGUAGES
[ ] Layout survives longer strings (Russian ~20% longer)
[ ] Every string behind a translation key

MOBILE
[ ] Verified at 390×844
[ ] No horizontal scroll
[ ] Bottom-sheet closes by dragging

ACCESSIBILITY
[ ] Keyboard navigation
[ ] :focus-visible is visible
[ ] prefers-reduced-motion honored
[ ] Image alt text

AR (critical)
[ ] ar-scale="fixed"
[ ] Model in meters, base at Y=0
[ ] 4-step fallback (AR→3D→360°→photo)
[ ] Size verified on a phone with a tape measure
```

## 16.2 Quick check (5 minutes)

```bash
# Any hard-coded colors?
grep -rn "#[0-9a-fA-F]\{6\}" static/**/*.css | grep -v tokens.css

# Any hard-coded strings?
grep -rn "textContent\s*=\s*['\"][A-Za-z\u0410-\u044F]" static/**/*.js | grep -v "t("

# All 3 languages complete?
python3 -c "
import json
u=json.load(open('static/i18n/uz.json'))
r=json.load(open('static/i18n/ru.json'))
e=json.load(open('static/i18n/en.json'))
print('OK' if u.keys()==r.keys()==e.keys() else 'KEYS DO NOT MATCH')
"
```

---
---

# 📎 APPENDIX — PROJECT DOCUMENTS

This file is **self-contained**, but if you need to go deeper:

| Document | About | Size |
|---|---|---|
| `ROADMAP/START.md` | Start writing code — the single entry point | 8 KB |
| `ROADMAP/01_FAZALAR/` | 13 phases · 234 tasks · full code | 37,617 lines |
| `ARXITEKTURA/` | System architecture · 9 parts | 19,594 lines |
| `TZ_MASTER/` | Full technical specification (89-page PDF) | 5,852 lines |
| `BOZOR_TAHLIL.md` | Market, competition, fiscalization, tourism | 18 KB |
| `CURSOR_QOLLANMA.md` | Working with Cursor — ready-made prompts | 8 KB |

---

## 🎯 SUMMARY

```
┌──────────────────────────────────────────────────────────────┐
│                                                               │
│   ARMENU — AR menu for restaurants in Uzbekistan             │
│                                                               │
│   DESIGN:  Premium · refined · simple                        │
│            Subtle cultural hints (4% pattern, terracotta+blue)│
│            Food is the hero, the UI stays invisible          │
│                                                               │
│   COLOR:   #C75B39 terracotta · #1B4B73 blue · #C9A227 gold  │
│   TYPE:    Inter (with Cyrillic) · body ≥16px                │
│   RADIUS:  button 12 · card 16 · sheet 28                    │
│   SHADOW:  warm rgba(26,23,20,...) — never pure black        │
│                                                               │
│   3 LANGUAGES · DARK+LIGHT · 44px touch · WCAG AA            │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

**End of document.** · ARMENU v1.0 · 2026-09-17
