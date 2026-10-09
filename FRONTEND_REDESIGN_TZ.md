# 📋 TEXNIK TOPSHIRIQ (TZ) — Guliston Frontend To'liq Qayta Yozish
**Versiya:** 1.0 | **Sana:** 2026-10-06 | **Maqom:** TASDIQLASH KUTILMOQDA

---

## 🎯 MAQSAD
Eski frontend'ni butunlay o'chirib, backend bilan 100% mos, Replit prototip dizayniga to'liq mos yangi frontend yozish.

**Asosiy qoidalar:**
- ✅ Backend (models, views, urls) — O'ZGARMAYDI
- ✅ Har bir frontend sahifada backend bor
- ✅ Har bir backend funksiya/tugma frontendda ko'rinadi
- ✅ Rang palitasi: Cream (#F7F3EA), Forest Green (#2F4836), Brown (#8B5E3C)
- ✅ Font: Playfair Display (headings) + Plus Jakarta Sans (body)

---

## 📁 O'CHIRILADIGAN FAYLLAR (Eski frontend)

```
backend/templates/tma/home.html           ← TO'LIQ O'CHIRILADI
backend/templates/tma/cart.html           ← TO'LIQ O'CHIRILADI
backend/templates/tma/checkout.html       ← TO'LIQ O'CHIRILADI
backend/templates/tma/catalog.html        ← TO'LIQ O'CHIRILADI
backend/templates/tma/welcome.html        ← TO'LIQ O'CHIRILADI
backend/templates/tma/find_reservation.html ← TO'LIQ O'CHIRILADI
backend/templates/tma/arrival_confirm.html ← TO'LIQ O'CHIRILADI
backend/templates/tma/table_hub.html      ← TO'LIQ O'CHIRILADI
backend/templates/tma/orders.html         ← TO'LIQ O'CHIRILADI
backend/templates/tma/order_detail.html   ← TO'LIQ O'CHIRILADI
backend/templates/tma/base_tma.html       ← TO'LIQ O'CHIRILADI (qayta yoziladi)
backend/templates/seller/arrival_desk.html    ← TO'LIQ O'CHIRILADI
backend/templates/seller/arrival_timeline.html ← TO'LIQ O'CHIRILADI
backend/templates/seller/arrival_checklist.html ← TO'LIQ O'CHIRILADI
backend/templates/seller/waiter_mobile.html   ← TO'LIQ O'CHIRILADI
backend/templates/restaurant_admin/dashboard.html ← TO'LIQ O'CHIRILADI
backend/templates/restaurant_admin/login.html ← TO'LIQ O'CHIRILADI
```

---

## 🔧 BACKEND CONTEXT — Har bir view nima yuboradi

### `tma_home` → `tma/home.html`
```python
context = {
    'categories': Category queryset,       # Taom toifalari
    'category_groups': [{'category': cat, 'products': list}],  # Guruhlangan mahsulotlar
    'featured_products': Product list,     # Barcha mahsulotlar (max 35)
    'ar_products': Product list,           # 3D modelli mahsulotlar (max 12)
    'cart_count': int,                     # Savattagi umumiy son
    'table': Table object | None,          # Joriy stol
    'table_token': str | None,             # Stol tokeni
    'shop': Shop object,                   # Restoran
    'telegram_bot_username': str,
}
```
**Product maydonlari:** `id, name, price, image.url, description, category.name, has_3d, is_available, unit`

### `tma_cart` → `tma/cart.html`
```python
context = {
    'items': [{'product_id', 'name', 'price', 'quantity', 'subtotal', 'image', 'unit'}],
    'total_amount': Decimal,
    'cart_count': int,
    'shop_name': str,
    'table': Table | None,
    'table_token': str | None,
}
```

### `tma_checkout` → `tma/checkout.html` (GET va POST)
```python
# GET context:
context = {
    'shop': Shop,
    'items': [{'product', 'quantity', 'price', 'subtotal'}],
    'total_amount': Decimal,
    'delivery_fee': Decimal,
    'final_amount': Decimal,
    'table': Table | None,
    'all_tables': Table queryset,
    'table_token': str | None,
    'error': str | None,  # Faqat xato bo'lganda
}
# POST fields qabul qiladi:
# service_type: 'table' | 'pickup' | 'delivery'
# table_id: int (optional)
# table_number_manual: str (optional)
# name: str
# phone: str
# address: str (delivery uchun majburiy)
# payment_method: 'cash' | 'payme' | 'click' | 'uzum'
# notes: str (optional)
# telegram_id: str (optional)
```

### `tma_cart_api` → AJAX endpoint
```
POST /api/cart/
JSON body: { action: 'add'|'decrease'|'remove', product_id: int, quantity: int }
Response: { success: bool, cart_count: int, item_qty: int, total_sum: str }
```

### `tma_catalog` → `tma/catalog.html`
```python
context = {
    'products': Product queryset (max 80),
    'categories': Category queryset,
    'selected_category': int | None,
    'q': str,        # Qidiruv so'zi (GET ?q=)
    'has_3d': bool,  # GET ?has_3d=1
    'cart_count': int,
    'table': Table | None,
    'table_token': str | None,
    'shop': Shop,
}
```

### `tma_table_hub` → `tma/table_hub.html`
```python
# Table bilan stol ekraniga, stol boshqaruvi sahifasi
```

### `tma_orders` → `tma/orders.html`
```python
# Foydalanuvchi buyurtmalari ro'yxati (session'dagi stol bo'yicha)
```

### `tma_order_detail` → `tma/order_detail.html`
```python
# Bitta buyurtma tafsiloti (pk - order id)
```

### `tma_welcome` → `tma/welcome.html`
```python
context = { 'shop': Shop, 'proto_active': 'welcome' }
```

### `tma_arrival_confirm` → `tma/arrival_confirm.html`
```python
context = {
    'shop': Shop,
    'reservation': { 'customer_name', 'code', 'reservation_time', 'guests_count', 'table_number' },
    'proto_active': 'arrival',
}
# POST: code, table → session['tma_table_token'] → redirect '/?table=X&arrived=1'
```

### `tma_find_reservation` → `tma/find_reservation.html`
```python
context = { 'shop': Shop, 'proto_active': 'find' }
```

### `arrival_desk` → `seller/arrival_desk.html`
```python
context = {
    'shop': Shop,
    'reservations': TableReservation queryset (max 10),
    'proto_active': 'desk',
}
```

### `arrival_timeline` → `seller/arrival_timeline.html`
```python
context = { 'shop': Shop, 'proto_active': 'timeline' }
```

### `arrival_checklist` → `seller/arrival_checklist.html`
```python
context = { 'shop': Shop, 'code': str, 'proto_active': 'checklist' }
```

### `waiter_mobile_panel` → `seller/waiter_mobile.html`
```python
context = { 'shop': Shop, 'proto_active': 'waiter' }
```

### `restaurant_admin_dashboard` → `restaurant_admin/dashboard.html`
```python
context = {
    'shop': Shop,
    'tables_count': int,
    'free_tables_count': int,
    'occupied_tables_count': int,
    'today_orders_count': int,
    'today_revenue': float,
    'pending_kds_count': int,
    'products_count': int,
    'ar_dishes_count': int,
    'recent_orders': Order queryset (last 8),
}
```

### `restaurant_admin_login` → `restaurant_admin/login.html`
```python
# POST: username, password → authenticate → login → redirect admin/waiter
```

---

## 🏗️ YANGI BASE TEMPLATE: `tma/base_tma.html`

### CSS O'zgaruvchilar (barcha sahifalarda ishlatiladi)
```css
:root {
  --bg-cream: #F7F3EA;
  --bg-cream-soft: #FAF7F0;
  --bg-card: #FFFFFF;
  --border-cream: #E8E0CF;
  --border-light: #F0EADF;
  --primary-green: #2F4836;
  --primary-green-hover: #24382A;
  --primary-green-light: #EBF1EC;
  --accent-brown: #8B5E3C;
  --accent-terracotta: #B85D19;
  --accent-gold: #C29026;
  --text-dark: #2C2A26;
  --text-muted: #6B6559;
  --text-light: #9E978B;
  --radius-2xl: 24px;
  --radius-xl: 18px;
  --radius-lg: 14px;
  --radius-pill: 9999px;
  --shadow-soft: 0 4px 20px -2px rgba(44,42,38,0.05);
  --shadow-card: 0 10px 30px -4px rgba(44,42,38,0.08);
}
```

### Responsive Breakpoints
| Qurilma | Kenglik | App shell max-width | Tabbar | Desktop nav |
|---------|---------|---------------------|--------|-------------|
| Mobil | < 768px | 100% | Ko'rinadi | Yashirin |
| Tablet | 768–1023px | 960px | Yashirin | Ko'rinadi |
| Desktop | 1024–1399px | 1240px | Yashirin | Ko'rinadi |
| Ultra-wide | 1400px+ | 1360px | Yashirin | Ko'rinadi |

### Block tuzilmasi
```html
{% block title %}{% endblock %}
{% block extra_head %}{% endblock %}  ← Sahifaga xos CSS
{% block content %}{% endblock %}      ← Asosiy kontent
{% block tabbar %}{% endblock %}       ← Override imkoniyati
```

### Desktop Nav (768px+) — `header.gul-desktop-nav`
- Chap: Logo `G` (40×40px, Forest Green) + "Guliston" Playfair + "Oila Dasturxoni" subtext
- O'rta: `Bosh sahifa` | `Dasturxon Menyusi` | `Bron Tekshirish`
- O'ng: `🟢 Ochiq` status + `UZ/RU` pill + `🪑 Stol 03` + `Admin Panel` yashil tugma

### Mobile Tabbar (< 768px) — `nav.gul-tabbar`
- `🏠 Bosh sahifa` → `/`
- `🍽️ Menyu` → `/menu/`
- `🛒 Savat` → `/cart/` (badge: `#gul-cart-badge`)
- `📋 Buyurtmalar` → `/orders/`

### Toast Funksiya (base'da)
```javascript
function showGulToast(message, icon = '✓') { ... }
```

---

## 📄 SAHIFALAR — To'liq texnik spesifikatsiya

---

### SAHIFA 1: `tma/welcome.html` — Kirish ekrani
**URL:** `/` va `/welcome/`  
**View:** `tma_welcome`  
**Dizayn ref:** Replit screenshot — birinchi thumbnail (Guliston — Xush kelibsiz)

#### Tuzilma:
```
[MOBILE ONLY HEADER]  ← class="mobile-header-only" (768px+ da display:none)
  Logo G + "Guliston" + "Oila Dasturxoni"
  Status "🟢 Ochiq" + UZ/RU pill + "Admin ↗" link → /admin/

[HERO]
  H2: "Xush kelibsiz, aziz mehmon." (Playfair Display, 36px)
  P: "Dasturxonimizdan joy oling — stolingizni ulab, sevimli taomlaringizni tanlang."
  
  [BIG PRIMARY BUTTON]
  class="btn-primary-menu" → /menu/
  🍲 "Dasturxon Menyusiga O'tish" →

[SECTION: 01/02 Stolingizga ulaning]
  kicker-dot + "01 / 02 Stolingizga ulaning"
  
  [QR Block] ← Forest Green border
    Icon QR + "Stol ustidagi QR-kodni skanerlang"
    "Kamerangizni stol stendiga qarating va avtomatik ulaning."
    [Tugma] "QR kodni skanerlash" → onclick="startQRScanner()"
    
  [NFC Block]
    "(( 📶 ))" + "Telefoningizni tekkizing"
    "NFC belgisi bo'lgan stol yorlig'iga yaqinlashtiring"
    badge: "Faol"
    
  [Manual Input Block]
    "Stol raqamingizni bilasizmi?"
    Form: method=GET action=/menu/
    Input [# _ _ _] + Submit button →

[RESERVATION CHECK CARD]  ← link → /reservation/find/
  "Broningizni tekshirish"
  "→ Bron kodi yoki telefon raqami bilan"

[PROTO NAV WIDGET] ← floating (< 768px yashirin, > 768px ko'rinadi)
  "🧭 9 ta Sahifa" tugmasi
  Dropdown: 9 ta sahifaga havolalar
```

#### JavaScript:
```javascript
function startQRScanner() {
  // showGulToast() + QR scanner modal
}
```

---

### SAHIFA 2: `tma/home.html` — Taomlar Menyusi
**URL:** `/menu/`  
**View:** `tma_home`  
**Dizayn ref:** Replit screenshot — ikkinchi thumbnail (Xush kelibsiz, aziz mehmon)

#### Backend o'zgaruvchilar ishlatilishi:
```django
{{ table.number }}          ← Stol raqami (Header chip)
{{ shop.name }}             ← Do'kon nomi
{{ cart_count }}            ← Savat badge
{% for cat in categories %} ← Kategoria pills
{% for group in category_groups %} ← Mahsulotlar guruhi
{{ product.id }}            ← addToCart() uchun
{{ product.name }}          ← Karta nomi
{{ product.price }}         ← Narx (so'm formatda)
{{ product.image.url }}     ← Taom rasmi
{{ product.description }}   ← Karta tavsifi
{{ product.has_3d }}        ← "3D" badge ko'rsatish
{{ product.category.name }} ← data-cat atributi
```

#### Tuzilma:
```
[TOP HEADER] ← class="top-header" (768px+ da display:none)
  [Brand Group]
    Krest "G" (44×44, Forest Green gradient)
    H1: "Guliston" (19px bold)
    Span: "OILA DASTURXONI" (10px, brown, uppercase, letter-spacing)
  [Header Actions]
    UZ/RU pill
    "🪑 Stol {{ table.number|default:'03' }}" chip → green border

[HERO BANNER] ← class="hero-banner"
  [Decor stamp] ← rotated circle dashed border, top-right corner
    "GULISTON"
    "RESTORAN"
  [Hero kicker] "⭐ KUNNING TAVSIYASI"
  H2: "Xush kelibsiz,<br>aziz mehmon." (30px Playfair)
  P: "Guliston xonadan joy oling — sevimli taomlaringizni tanlang." (muted)
  [Featured dish box] ← right side, 200px height, cream bg, food image if available
    if product.image: <img>
    else: decorative lines SVG

[SEARCH BOX]
  <input type="text" id="dish-search" placeholder="Taom qidirish...">
  Search icon (SVG)

[CATEGORY PILLS] ← id="category-pills"
  <button onclick="filterMenu('all', this)" class="cat-pill active">Hammasi</button>
  {% for cat in categories %}
  <button onclick="filterMenu('{{ cat.id }}', this)" class="cat-pill">{{ cat.name }}</button>
  {% endfor %}

{% for group in category_groups %}
[SECTION HEADER]
  H3: {{ group.category.name }}
  Span: "{{ group.products|length }} taom"

[DISH GRID] ← 2 col mobile, 3 col 640px+, 4 col 1024px+
  {% for product in group.products %}
  [DISH CARD] data-cat="{{ product.category.id }}"
    [Thumb wrap 130px]
      {% if product.image %}<img src="{{ product.image.url }}">{% endif %}
      {% if product.has_3d %}<span class="badge-3d">3D</span>{% endif %}
      [Add button] onclick="addToCart({{ product.id }}, '{{ product.name }}', {{ product.price }})"
        + (plus icon)
    [Card body]
      H4: {{ product.name }}
      P: {{ product.description|truncatechars:50 }}
      [Price row]
        Strong: {{ product.price }} so'm
        Small: {{ product.unit }}
  {% endfor %}
{% endfor %}
```

#### JavaScript (to'liq cart logikasi):
```javascript
// localStorage saqlash
let cart = JSON.parse(localStorage.getItem('gulCart')) || [];
function saveCart() { localStorage.setItem('gulCart', JSON.stringify(cart)); }

// API orqali backend session'ga ham yozish
function addToCart(productId, name, price) {
  // 1. LocalStorage'ga qo'shish
  // 2. fetch('/api/cart/', {method:'POST', body: JSON.stringify({action:'add', product_id: productId, quantity:1})})
  // 3. Response'dan cart_count olish
  // 4. updateCartUI()
  // 5. showGulToast(name + " savatga qo'shildi", "🍲")
}

function changeQty(productId, delta) { ... }  // Cart drawer ichida
function toggleCartDrawer() { ... }            // Drawer ochish/yopish

// Cart Drawer HTML (id="cartDrawerBackdrop")
// Floating Cart Bar (id="floatingCartBar") — pastdan chiqadigan yashil baner

function updateCartUI() {
  // tabbar badge yangilash (#gul-cart-badge)
  // floatingCartBar ko'rsatish/yashirish
}

function proceedToCheckout() {
  window.location.href = '/checkout/';
}

function filterMenu(category, btn) { ... }
// dish-search input → live filter
```

---

### SAHIFA 3: `tma/cart.html` — Savat
**URL:** `/cart/`  
**View:** `tma_cart`

#### Backend o'zgaruvchilar:
```django
{{ shop_name }}
{{ table.number }}
{% for item in items %}
  {{ item.name }}, {{ item.price }}, {{ item.quantity }}, {{ item.subtotal }}, {{ item.image }}, {{ item.unit }}
{% endfor %}
{{ total_amount }}
{{ cart_count }}
```

#### Tuzilma:
```
[HEADER] class="gul-header" (768px+ da display:none)
  Logo G + "Guliston" + "Savat"
  Stol chip yoki "Yetkazib berish"

[HERO KICKER] "🛒 SIZNING TANLOVINGIZ"
H2: "Savatdagi<br>taomlar."

{% if items %}
[ITEMS LIST]
  {% for item in items %}
  [CART ITEM CARD]
    [Left] Image (if item.image) or Emoji 🍽️
    [Middle]
      H4: {{ item.name }}
      P: {{ item.price }} so'm × {{ item.unit }}
    [Right qty controls]
      [-] form POST /api/cart/ action=decrease
      {{ item.quantity }}
      [+] form POST /api/cart/ action=add
      
  {% endfor %}

[ORDER SUMMARY CARD]
  "Jami taomlar: {{ cart_count }} ta"
  "Taomlar narxi: {{ total_amount }} so'm"
  {% if table %}"Yetkazib berish: Bepul (Stol xizmati)"{% endif %}
  HR
  "Jami to'lov: {{ total_amount }} so'm"

[CHECKOUT BUTTON] → /checkout/
  "Buyurtmani rasmiylashtirish →"

[EMPTY CART STATE] ({% if not items %})
  🍽️ emoji
  "Savat bo'sh"
  "Menyu sahifasiga o'ting va taom tanlang"
  [Tugma] → /menu/

{% else %}
[EMPTY CART]
{% endif %}
```

---

### SAHIFA 4: `tma/checkout.html` — Buyurtma berish
**URL:** `/checkout/`  
**View:** `tma_checkout`

#### POST form maydonlari (barcha backend qabul qilganlarini ko'rsatish):
```
service_type: radio ['table', 'pickup', 'delivery'] — MAJBURIY
table_id: select ({% for t in all_tables %}) — table tanlanganda
table_number_manual: text — qo'lda kiritish
name: text — Ism (stolda ixtiyoriy)
phone: tel — Telefon (delivery majburiy)
address: text — Manzil (delivery majburiy)
payment_method: radio ['cash', 'payme', 'click', 'uzum']
notes: textarea — Izoh
```

#### Tuzilma:
```
[HEADER] gul-header
  Logo + "Buyurtmani rasmiylashtirish"
  Back → /cart/

[SERVICE TYPE SECTION]
  "Xizmat turini tanlang:"
  [Stol] [Olib ketish] [Yetkazib berish] — radio cards

[TABLE SECTION] (service_type=table da ko'rinadi)
  {% if table %}
    "Sizning stolingiz: {{ table.number }}" — info card
  {% else %}
    Select: {% for t in all_tables %}<option>{{ t.number }}</option>{% endfor %}
    OR input[name=table_number_manual]
  {% endif %}

[DELIVERY SECTION] (service_type=delivery da ko'rinadi)
  input[name=address] "Manzil"
  input[name=phone] "Telefon"

[CUSTOMER INFO]
  input[name=name] "Ismingiz (ixtiyoriy)"
  textarea[name=notes] "Oshpazga izoh"

[ORDER SUMMARY]
  {% for item in items %}
  "{{ item.product.name }} × {{ item.quantity }} = {{ item.subtotal }} so'm"
  {% endfor %}
  "Jami: {{ total_amount }} so'm"
  {% if delivery_fee > 0 %}"Yetkazib berish: {{ delivery_fee }} so'm"{% endif %}
  "JAMI TO'LOV: {{ final_amount }} so'm"

[PAYMENT METHOD]
  [💵 Naqd] [📱 Payme] [🔵 Click] [💜 Uzum] — radio cards

{% if error %}
[ERROR BANNER] "{{ error }}"
{% endif %}

[SUBMIT BUTTON]
  <form method="POST"> + {% csrf_token %}
  "Buyurtmani Tasdiqlash →"
```

---

### SAHIFA 5: `tma/find_reservation.html` — Bron Qidirish
**URL:** `/reservation/find/`  
**View:** `tma_find_reservation`

#### Tuzilma:
```
[HEADER] gul-header
  Logo + "Bron Tekshirish"
  Status Ochiq

[HERO]
  Kicker: "🔍 BRONLARINGIZ"
  H2: "Bronlaringiz<br>bor edi?"
  P: "Bron kodi yoki telefon orqali qidiring."

[SEARCH FORM]
  form method="GET" action="/reservation/find/"
  
  Tablar: [Bron kodi bo'yicha] [Telefon bo'yicha]
  
  TAB 1: input[name=code] placeholder="GS-2841" + Search button
  TAB 2: input[name=phone] type=tel placeholder="+998..." + Search button
  
  {% if results %}
  [RESULTS LIST]
    Har bir natija: Ism, Stol, Sana/Vaqt, Mehmonlar soni, Status badge
    "Kelganingizni tasdiqlash →" → /reservation/arrival/?code=XXX
  {% elif searched %}
  [NOT FOUND]
    "Bron topilmadi" + "Qaytadan urinib ko'ring"
  {% endif %}
```

---

### SAHIFA 6: `tma/arrival_confirm.html` — Kelish Tasdiqi
**URL:** `/reservation/arrival/`  
**View:** `tma_arrival_confirm`

#### Backend context:
```django
{{ reservation.customer_name }}
{{ reservation.code }}
{{ reservation.reservation_time }}
{{ reservation.guests_count }}
{{ reservation.table_number }}
```

#### POST action:
```html
<form method="POST">
  {% csrf_token %}
  <input type="hidden" name="code" value="{{ reservation.code }}">
  <input type="hidden" name="table" value="{{ reservation.table_number }}">
  <button type="submit">Kelganimni tasdiqlash</button>
</form>
```

#### Tuzilma:
```
[HEADER] gul-header
  Logo G + "Guliston" + "Oila Dasturxoni"
  Status Ochiq + RU lang btn

[HERO]
  H2: "Siz uchun<br>joy tayyor." (Playfair, 32px)
  P: "Xush kelibsiz, {{ reservation.customer_name }}. Kelganingizni tasdiqlang."
  
  [Help pill] onclick toggle → dropdown tel raqam

[MAIN RESERVATION CARD]
  Avatar: Initials (birinchi 2 harf)
  H3: {{ reservation.customer_name }}
  Badge: {{ reservation.code }}
  
  [Info Rows]
  📅 Sana va Vaqt: {{ reservation.reservation_time }}
  👥 Mehmonlar: {{ reservation.guests_count }} kishi
  🪑 Stol: №{{ reservation.table_number }}

[CONFIRM BUTTON]
  <form method="POST">
  {% csrf_token %}
  <input hidden name="code" value="{{ reservation.code }}">
  <input hidden name="table" value="{{ reservation.table_number }}">
  <button type="submit">✓ Ha, keldim! Stol №{{ reservation.table_number }} tayyor</button>
  </form>

[SECONDARY LINKS]
  "← Bron topilmadimi? Qayta qidirish" → /reservation/find/
  "Menyuni ko'rish →" → /menu/
```

---

### SAHIFA 7: `seller/arrival_desk.html` — Hostess Paneli
**URL:** `/arrival/desk/`  
**View:** `arrival_desk`

#### Backend context:
```django
{{ reservations }}  ← TableReservation queryset (max 10)
{{ shop.name }}
```

#### Tuzilma:
```
[HEADER] gul-header (768px+ da display:none — seller sahifalarida ham!)
  Logo G + "Guliston" + "Kutib Olish Paneli"
  Avatar: Salima (S) + "Smena faol" badge
  
[HERO]
  P: "Assalomu alaykum. Bugungi mehmonlar ro'yxati"
  H2: "Kimni<br>kutyapmiz?" (Playfair)
  
  [Stats Row]
  🟠 {{ reservations.filter(status='pending').count }} kutilmoqda
  🟢 {{ reservations.filter(status='arrived').count }} kelishdi
  📋 Jami: {{ reservations.count }} ta bron

[FILTER TABS]
  [Hammasi] [Kutilmoqda] [Kelishdi] [Bekor qilingan]

[BRON SEARCH]
  input placeholder="Ism yoki bron kodi..."

[RESERVATIONS LIST]
  {% for r in reservations %}
  [RESERVATION CARD]
    Avatar initials (ism birinchi 2 harf)
    H4: {{ r.customer_name|default:"Mehmon" }}
    P: Bron kodi + Stol + Mehmonlar soni + Vaqt
    Status badge: pending=orange | arrived=green
    Tugmalar:
      [Keldi ✓] — form POST (update status) yoki JS fetch
      [Checklist →] → /arrival/checklist/?code=XX
      [Vaqt shkalasi →] → /arrival/timeline/
  {% empty %}
  "Bugun bronlar yo'q"
  {% endfor %}

[NAV LINKS] (sahifa pastida)
  [⏱ Vaqt Shkalasi] → /arrival/timeline/
  [✅ Checklist] → /arrival/checklist/
  [👨‍🍳 Ofitsiant] → /waiter/panel/
```

---

### SAHIFA 8: `seller/arrival_timeline.html` — Vaqt Shkalasi
**URL:** `/arrival/timeline/`  
**View:** `arrival_timeline`

#### Tuzilma:
```
[HEADER] gul-header
  Logo G + "Vaqt Bo'yicha Kuzatuv"
  "UZ" lang + [← Orqaga] → /arrival/desk/

[BANNER]
  "Bugungi navbatni vaqt bo'yicha kuzating"
  Stats: 04 bron · 3 kutilmoqda · 1 keldi

[SECTION HEADER]
  Badge: "Vaqt bo'yicha"
  H2: "Mehmonlar tashrifi"

[FILTER CHIPS]
  [Hammasi] [Kutilmoqda] [Kelishdi] [Bekor] onclick="setFilter()"
  input search

[TIMELINE LIST]
  Har bir vaqt (19:30, 19:45, 20:00, 20:15):
  [TIME LABEL] "19:30"
  [RESERVATION CARD]
    status dot (orange=pending, green=arrived)
    Ism + Stol + Mehmonlar
    [Keldi ✓] tugma
    [Checklist →]

[BOTTOM NAV]
  [← Kutib Olish] [✅ Checklist]
```

---

### SAHIFA 9: `seller/arrival_checklist.html` — Guruh Checklist
**URL:** `/arrival/checklist/`  
**View:** `arrival_checklist`

#### Tuzilma:
```
[HEADER] gul-header
  Logo G + "Guruh Muvofiqlashtirish"
  "Hostess Desk" badge + [← Orqaga] → /arrival/desk/

[HERO]
  H2: "Before they<br>arrive." (Inglizcha, Playfair)
  P: "Uchta kichik tekshiruv. Bitta xushfe'l dasturxon."

[GUEST SELECTOR CAROUSEL]  ← horizontal scroll
  {% for r in reservations %}  ← demo yoki real ma'lumot
  [Guest Pill] g-pill active (birinchi)
    🟢 dot + Muhayyo Karimova + Stol 08
  {% endfor %}

[SELECTED GUEST CARD]
  Avatar MK
  Muhayyo Karimova
  Bron: GS-2841 | 19:30 | 4 kishi | Stol 08

[CHECKLIST SECTION]
  H3: "Guruh uchun tayyorgarlik"
  
  [CHECKLIST ITEM 1] — checkbox + label
    ✅ "Stol yoniga qo'shimcha stul qo'yildi"
    badge: "Stol jihozi"
    
  [CHECKLIST ITEM 2] — checkbox + label
    🎂 "Tug'ilgan kun tort va sham tayyorlandi"
    badge: "Maxsus so'rov"
    
  [CHECKLIST ITEM 3] — checkbox + label
    📋 "Maxsus menyu variantlari muhokama qilindi"
    badge: "Menyu"

  Progress bar: X/3 bajarildi

[ACTION BUTTONS]
  [Tayyor — Mehmonni Kutib Olish →] → stol sahifasiga
  [← Orqaga]
```

---

### SAHIFA 10: `seller/waiter_mobile.html` — Ofitsiant POS
**URL:** `/waiter/panel/`  
**View:** `waiter_mobile_panel`

#### Tuzilma:
```
[HEADER] gul-header
  Logo G + "Ofitsiant Paneli & Mobil POS"
  Staff avatar "S" + "Sardor" + "Smenada" badge

[HERO]
  P: "Assalomu alaykum, Sardor!"
  H2: "Rahbar & Ofitsiant<br>mobil boshqaruvi."
  
  [KPI ROW]
  📊 06 — Biriktirilgan stol
  🔔 2 — Chaqiruv (alert style — orange)
  💰 842k — Joriy tushum

[ACTIVE CALLS SECTION] ← "🔔 Jonli chaqiruvlar (2)"
  Badge: "Tezkor" pulse
  
  [CALL CARD 1]
    [08] badge
    "Stol 08 (Hovli hududi)"
    "Muhayyo Karimova · Hisob-kitob qilishni so'radi"
    [Qabul] tugma onclick="resolveCall(this, '08')"
    
  [CALL CARD 2]
    [04] badge
    "Stol 04 (Hovli hududi)"
    "Nigora I. · Ko'k choy va qo'shimcha non"
    [Qabul] tugma

[TABLES SECTION] ← "Sizning stollaringiz (6)"
  3 col grid:
  [Stol 03] [Stol 05] [Stol 08] — status colored
  [Stol 11] [Stol 12] [Stol 14]

[QUICK ACTIONS]
  [🛒 Buyurtma Qo'shish] → /checkout/
  [📋 Barcha Buyurtmalar] → /orders/
  [🏠 Bosh Sahifa] → /
```

---

### SAHIFA 11: `restaurant_admin/dashboard.html` — Admin Panel
**URL:** `/admin/`  
**View:** `restaurant_admin_dashboard`  
**Muhim: Bu sahifa `base_tma.html` extends QILMAYDI — standalone!**

#### Backend context:
```django
{{ shop.name }}
{{ tables_count }}, {{ free_tables_count }}, {{ occupied_tables_count }}
{{ today_orders_count }}
{{ today_revenue }}
{{ pending_kds_count }}
{{ products_count }}, {{ ar_dishes_count }}
{% for order in recent_orders %}
  {{ order.order_number }}, {{ order.customer_name }}, {{ order.final_amount }},
  {{ order.status }}, {{ order.created_at }}, {{ order.table.number }}
{% endfor %}
```

#### Tuzilma (STANDALONE — extends yo'q):
```html
<!DOCTYPE html>
<html>
<head>
  <!-- CSS variables same as base_tma -->
  <!-- Admin-specific: sidebar layout -->
</head>
<body>

[SIDEBAR] ← 240px, Forest Green bg
  Logo G + "Guliston Admin"
  Nav items:
    [📊 Dashboard] ← active
    [🪑 Stollar]  → seller URLs
    [📋 Buyurtmalar]
    [🍽️ Mahsulotlar]
    [📈 Hisobot]
  
  Bottom: [← Menyuga] + [Chiqish] → /admin/logout/

[MAIN CONTENT]
  [TOP BAR]
    "Boshqaruv Markazi"
    Date + "Mehmon Menyusi ↗" → /menu/
    Avatar

  [KPI CARDS ROW] — 4 card
    🪑 Stollar: {{ tables_count }} | Bepul: {{ free_tables_count }}
    📋 Bugungi: {{ today_orders_count }} buyurtma
    💰 Daromad: {{ today_revenue|floatformat:0 }} so'm
    ⏳ Oshxona: {{ pending_kds_count }} kutmoqda
    🍽️ Mahsulotlar: {{ products_count }} (3D: {{ ar_dishes_count }})

  [RECENT ORDERS TABLE]
    Thead: №, Mijoz, Stol, Summa, Status, Vaqt
    {% for order in recent_orders %}
    Tbody row: {{ order.order_number }} | {{ order.customer_name }} |
              {{ order.table.number|default:"-" }} | {{ order.final_amount }} so'm |
              Status badge | {{ order.created_at|timesince }}
    {% endfor %}

  [FLOOR PLAN TEASER]
    "Zal rejasi"
    Stol statusi: Bepul(green) / Band(orange) / Buyurtma(red)
    
  [FLOATING WIDGET] ← bottom-right
    "🧭 9 ta Sahifa" → dropdown 9 link
```

---

### SAHIFA 12: `restaurant_admin/login.html` — Admin Kirish
**URL:** `/admin/login/`

#### POST form:
```html
<form method="POST">
  {% csrf_token %}
  input[name=username] "Login yoki email"
  input[name=password] type=password "Parol"
  button type=submit "Kirish"
</form>
```

#### Tuzilma:
```
[FULL PAGE CENTERED] — cream bg
  [LOGIN CARD] max-width 420px
    Logo G (64×64) + "Guliston" H1 + "Admin Panel"
    
    {% if messages %}
    [ERROR ALERT] "{{ message }}" — red border
    {% endif %}
    
    form POST
    input: username
    input: password (show/hide toggle)
    button: "Kirish →"
    
    link: "← Mehmon menyusiga qaytish" → /
```

---

### SAHIFA 13: `tma/orders.html` — Buyurtmalar Tarixi
**URL:** `/orders/`  
**View:** `tma_orders`

#### Tuzilma:
```
[HEADER] gul-header
  "← Orqaga" + "Buyurtmalarim"

[HERO]
  H2: "Sizning<br>buyurtmalaringiz."

[ORDERS LIST]
  {% for order in orders %}  (agar DB'dan kelsa)
  [ORDER CARD]
    Order # + Vaqt
    Taomlar soni + Summa
    Status badge
    [Tafsilot →] → /order/{{ order.id }}/
  {% empty %}
  "Buyurtmalar yo'q"
  [Menyuga →] → /menu/
  {% endfor %}
```

---

### SAHIFA 14: `tma/order_detail.html` — Buyurtma Tafsiloti
**URL:** `/order/<pk>/`  
**View:** `tma_order_detail`

#### Tuzilma:
```
[HEADER] gul-header
  "← Buyurtmalar" + "Buyurtma #{{ order.order_number }}"

[STATUS CARD]
  Large status emoji + Status text
  "Buyurtmangiz {{ order.status }} holatida"

[ORDER INFO]
  Vaqt, Stol/Manzil, To'lov usuli

[ITEMS LIST]
  {% for item in order.items.all %}
  {{ item.product_name }} × {{ item.quantity }} = {{ item.total }} so'm
  {% endfor %}

[TOTALS]
  Taomlar: {{ order.total_amount }} so'm
  Yetkazib berish: {{ order.delivery_fee }} so'm
  JAMI: {{ order.final_amount }} so'm

[ACTIONS]
  [← Menyuga qaytish] → /menu/
  [Yangi buyurtma] → /menu/
```

---

## ⚙️ BAJARISH TARTIBI (PRIORITY)

```
1. base_tma.html    ← Hammasi shunga bog'liq (CSS vars, Nav, Tabbar, Toast)
2. welcome.html     ← Kirish ekrani (1-sahifa)
3. home.html        ← Asosiy (2-sahifa) + Cart API integration
4. cart.html        ← Savat (3-sahifa)
5. checkout.html    ← Buyurtma (4-sahifa) — backend POST bilan
6. find_reservation.html  ← (5-sahifa)
7. arrival_confirm.html   ← (6-sahifa) — backend POST bilan
8. arrival_desk.html      ← (7-sahifa)
9. arrival_timeline.html  ← (8-sahifa)
10. arrival_checklist.html ← (9-sahifa)
11. waiter_mobile.html    ← (10-sahifa)
12. dashboard.html (admin)← standalone (11-sahifa)
13. login.html (admin)    ← (12-sahifa)
14. orders.html, order_detail.html ← (13-14-sahifa)
```

---

## 🎨 DIZAYN QOIDALAR (Replit prototipga mos)

### Rang va Fond
- Sahifa foni: `#F7F3EA` (warm cream)
- Karta foni: `#FFFFFF`
- Header/Nav foni: `#FFFFFF` border-bottom `#E8E0CF`
- Primary button: `#2F4836` (forest green), hover `#24382A`
- Accent: `#B85D19` (terracotta) — filter pills active
- Headings: `#2C2A26`
- Muted text: `#6B6559`

### Tipografiya
- H1/H2 headings: `Playfair Display` (italic yoki regular)
- Body, buttons, labels: `Plus Jakarta Sans`
- Logo "G": `Playfair Display, 22-24px`

### Komponent stillari
- Kartalar: `border-radius: 18-24px`, `box-shadow: 0 4px 20px -2px rgba(44,42,38,0.05)`
- Tugmalar pill: `border-radius: 9999px`
- Primary button: `padding: 16px 28px`, `font-weight: 700`
- Input: `border-radius: 14px`, `border: 1px solid #E8E0CF`

### Animation
- Hover: `transition: all 0.15-0.2s ease`
- Button hover: `transform: translateY(-1px)`
- Toast: slide-in from bottom

---

## ✅ TEKSHIRISH RO'YXATI (Implementation After)

- [ ] `/` → Welcome sahifasi to'g'ri ko'rinadi
- [ ] `/menu/` → Mahsulotlar DB'dan keladi
- [ ] `/menu/` → "+" tugma bosilganda `/api/cart/` POST ishlaydi
- [ ] `/menu/` → Savat badge yangilanadi
- [ ] `/cart/` → Session'dagi mahsulotlar ko'rinadi
- [ ] `/checkout/` → POST form ishlaydi, Order yaratiladi
- [ ] `/checkout/` → `service_type=table` va `delivery` ishlaydi
- [ ] `/reservation/find/` → Ko'rinadi
- [ ] `/reservation/arrival/` → POST: session'ga yozib menyuga yo'naltiradi
- [ ] `/arrival/desk/` → Ko'rinadi, bronlar ro'yxati
- [ ] `/arrival/timeline/` → Ko'rinadi
- [ ] `/arrival/checklist/` → Ko'rinadi
- [ ] `/waiter/panel/` → Ko'rinadi
- [ ] `/admin/` → Dashboard KPI ko'rinadi, `recent_orders` table
- [ ] `/admin/login/` → Login POST ishlaydi
- [ ] `/admin/logout/` → Chiqish ishlaydi
- [ ] Desktop 1024px+ → Desktop nav ko'rinadi, tabbar yashirin
- [ ] Tablet 768px+ → Desktop nav ko'rinadi
- [ ] Mobil < 768px → Tabbar ko'rinadi, mobile header ko'rinadi

---

**TZ yozuvchisi:** Antigravity AI  
**Tasdiqlash kerak:** FOYDALANUVCHI  
**Keyingi qadam:** Tasdiqlashdan so'ng barcha fayllarni qayta yozish boshlanadi.
