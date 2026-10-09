# FAZA 8 — ADMIN PANEL

**Vazifalar:** V-151 … V-170 · **Muddat:** 1,5 hafta
**Maqsad:** Restoran egasi uchun to'liq boshqaruv paneli — dashboard, hisobotlar,
xodimlar, sozlamalar, brending, tarjima boshqaruvi, eksport.

> ⚠️ FAZA 5 (buyurtma+realtime), FAZA 6 (AR/3D) va FAZA 7 (zal plani) tugagan
> bo'lishi SHART — `Order`, `Dish`, `ARView`, `FloorPlan` modellari kerak.

> ⚡ Butun panel **dark + light** temada, **3 tilda** (`{% trans %}` + `t()`).
> Rang qattiq yozilmaydi — faqat `var(--bg)`, `var(--fg)`, `var(--accent)` va h.k.

---

## V-151 — Admin layout, tema tokenlari va navigatsiya

**Fayl:** `static/admin/css/tokens.css`
```css
/* ⚡ YAGONA rang manbasi — hech qayerda hex yozilmaydi */
:root {
  --bg:        #f5f7fa;
  --surface:   #ffffff;
  --surface-2: #eef1f6;
  --surface-3: #dfe4ec;
  --fg:        #1a1d21;
  --fg-muted:  #6b7280;
  --border:    #d7dce3;
  --accent:    #2f6df6;
  --accent-fg: #ffffff;
  --success:   #16a34a;
  --warning:   #d97706;
  --danger:    #dc2626;
  --info:      #0891b2;
  --shadow:    0 1px 3px rgba(16,24,40,.08);
  --radius:    10px;
}

[data-theme="dark"] {
  --bg:        #0f1115;
  --surface:   #171a21;
  --surface-2: #1e222b;
  --surface-3: #272c37;
  --fg:        #e7eaf0;
  --fg-muted:  #9aa3b2;
  --border:    #2b3140;
  --accent:    #5b8cff;
  --accent-fg: #0f1115;
  --success:   #34d399;
  --warning:   #fbbf24;
  --danger:    #f87171;
  --info:      #38bdf8;
  --shadow:    0 1px 3px rgba(0,0,0,.5);
}

/* Foydalanuvchi tanlamagan bo'lsa — tizim temasi */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #0f1115; --surface: #171a21; --surface-2: #1e222b;
    --surface-3: #272c37; --fg: #e7eaf0; --fg-muted: #9aa3b2;
    --border: #2b3140; --accent: #5b8cff; --accent-fg: #0f1115;
    --success: #34d399; --warning: #fbbf24; --danger: #f87171; --info: #38bdf8;
    --shadow: 0 1px 3px rgba(0,0,0,.5);
  }
}

* { box-sizing: border-box; }
body {
  margin: 0; background: var(--bg); color: var(--fg);
  font: 14px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
a { color: var(--accent); }
.card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); box-shadow: var(--shadow); padding: 14px;
}
.btn {
  padding: 8px 14px; border-radius: 8px; border: 1px solid var(--border);
  background: var(--surface-2); color: var(--fg); cursor: pointer; font-size: 13px;
}
.btn:hover { background: var(--surface-3); }
.btn-primary { background: var(--accent); color: var(--accent-fg); border-color: var(--accent); }
.btn-danger  { color: var(--danger); }
table.grid { width: 100%; border-collapse: collapse; }
table.grid th, table.grid td {
  padding: 9px 10px; border-bottom: 1px solid var(--border); text-align: left;
}
table.grid th { color: var(--fg-muted); font-size: 12px; font-weight: 600; }
table.grid tr:hover td { background: var(--surface-2); }
input, select, textarea {
  padding: 7px 9px; background: var(--bg); color: var(--fg);
  border: 1px solid var(--border); border-radius: 7px; font-size: 13px;
}
.badge {
  display: inline-block; padding: 2px 8px; border-radius: 999px;
  font-size: 11px; background: var(--surface-3); color: var(--fg);
}
.muted { color: var(--fg-muted); }
```

**Fayl:** `templates/admin_panel/base.html`
```html
{% load i18n static %}<!doctype html>
<html lang="{{ LANGUAGE_CODE }}" data-theme="{{ request.COOKIES.theme|default:'' }}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{% block title %}{% trans "Admin" %}{% endblock %} — {{ request.restaurant.name }}</title>
  <link rel="stylesheet" href="{% static 'admin/css/tokens.css' %}?v=1">
  <link rel="stylesheet" href="{% static 'admin/css/layout.css' %}?v=1">
  {% block extra_css %}{% endblock %}
</head>
<body>
<div class="ap-shell">
  <aside class="ap-side" id="ap-side">
    <div class="ap-logo">
      {% if request.restaurant.logo %}<img src="{{ request.restaurant.logo.url }}" alt="">{% endif %}
      <span>{{ request.restaurant.name }}</span>
    </div>
    <nav>
      <a href="{% url 'admin-dashboard' %}">🏠 {% trans "Dashboard" %}</a>
      <a href="{% url 'admin-orders' %}">🧾 {% trans "Buyurtmalar" %}</a>
      <a href="{% url 'admin-menu' %}">🍽 {% trans "Menyu" %}</a>
      <a href="{% url 'admin-models3d' %}">🎯 {% trans "3D / AR" %}</a>
      <a href="{% url 'admin-tables' %}">🪑 {% trans "Stollar va QR" %}</a>
      <a href="{% url 'floorplan-editor' %}">🗺 {% trans "Zal plani" %}</a>
      <a href="{% url 'floorplan-live' %}">🔴 {% trans "Jonli zal" %}</a>
      <a href="{% url 'admin-reports-sales' %}">📊 {% trans "Savdo hisoboti" %}</a>
      <a href="{% url 'admin-reports-dishes' %}">🍲 {% trans "Taomlar hisoboti" %}</a>
      <a href="{% url 'admin-menu-engineering' %}">🧭 {% trans "Menyu-injiniring" %}</a>
      <a href="{% url 'admin-reports-staff' %}">👥 {% trans "Xodimlar hisoboti" %}</a>
      <a href="{% url 'admin-ar-analytics' %}">🎯 {% trans "AR analitika" %}</a>
      <a href="{% url 'admin-staff' %}">🧑‍🍳 {% trans "Xodimlar" %}</a>
      <a href="{% url 'admin-i18n' %}">🌐 {% trans "Tarjimalar" %}</a>
      <a href="{% url 'admin-branding' %}">🎨 {% trans "Brending" %}</a>
      <a href="{% url 'admin-settings' %}">⚙️ {% trans "Sozlamalar" %}</a>
      <a href="{% url 'admin-plan' %}">💳 {% trans "Tarif" %}</a>
    </nav>
  </aside>

  <div class="ap-main">
    <header class="ap-top">
      <button class="btn ap-burger" id="ap-burger" aria-label="{% trans 'Menyu' %}">☰</button>
      <div class="ap-title">{% block heading %}{% endblock %}</div>
      <div class="ap-actions">
        <select id="ap-lang" aria-label="{% trans 'Til' %}">
          {% get_current_language as LANG %}
          <option value="uz" {% if LANG == 'uz' %}selected{% endif %}>🇺🇿 UZ</option>
          <option value="ru" {% if LANG == 'ru' %}selected{% endif %}>🇷🇺 RU</option>
          <option value="en" {% if LANG == 'en' %}selected{% endif %}>🇬🇧 EN</option>
        </select>
        <button class="btn" id="ap-theme" aria-label="{% trans 'Tema' %}">🌓</button>
        <a class="btn" href="{% url 'logout' %}">{% trans "Chiqish" %}</a>
      </div>
    </header>
    <main class="ap-content">{% block content %}{% endblock %}</main>
  </div>
</div>

<script src="{% static 'admin/js/i18n.js' %}?v=1"></script>
<script src="{% static 'admin/js/layout.js' %}?v=1"></script>
{% block extra_js %}{% endblock %}
</body>
</html>
```

**Fayl:** `static/admin/css/layout.css`
```css
.ap-shell { display: grid; grid-template-columns: 232px 1fr; min-height: 100vh; }
.ap-side {
  background: var(--surface); border-right: 1px solid var(--border);
  padding: 12px 8px; position: sticky; top: 0; height: 100vh; overflow-y: auto;
}
.ap-logo { display: flex; align-items: center; gap: 8px; padding: 6px 8px 14px;
           font-weight: 700; color: var(--fg); }
.ap-logo img { width: 28px; height: 28px; border-radius: 6px; object-fit: cover; }
.ap-side nav a {
  display: block; padding: 8px 10px; margin-bottom: 2px; border-radius: 8px;
  color: var(--fg); text-decoration: none; font-size: 13px;
}
.ap-side nav a:hover { background: var(--surface-2); }
.ap-side nav a.active { background: var(--accent); color: var(--accent-fg); }
.ap-top {
  display: flex; align-items: center; gap: 10px; padding: 10px 16px;
  background: var(--surface); border-bottom: 1px solid var(--border);
  position: sticky; top: 0; z-index: 20;
}
.ap-title { font-weight: 600; flex: 1; }
.ap-actions { display: flex; gap: 6px; align-items: center; }
.ap-content { padding: 16px; }
.ap-burger { display: none; }
@media (max-width: 900px) {
  .ap-shell { grid-template-columns: 1fr; }
  .ap-side { position: fixed; left: -240px; z-index: 40; width: 232px;
             transition: left .2s ease; }
  .ap-side.open { left: 0; }
  .ap-burger { display: block; }
  .ap-content { padding: 10px; }
}
```

**Fayl:** `static/admin/js/layout.js`
```javascript
(function () {
  'use strict';
  // Tema
  const root = document.documentElement;
  const btn = document.getElementById('ap-theme');
  function setTheme(v) {
    root.setAttribute('data-theme', v);
    document.cookie = `theme=${v}; path=/; max-age=31536000; samesite=lax`;
  }
  if (btn) btn.addEventListener('click', () => {
    const cur = root.getAttribute('data-theme');
    const sysDark = matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme((cur || (sysDark ? 'dark' : 'light')) === 'dark' ? 'light' : 'dark');
  });

  // Til
  const lang = document.getElementById('ap-lang');
  if (lang) lang.addEventListener('change', () => {
    document.cookie = `django_language=${lang.value}; path=/; max-age=31536000; samesite=lax`;
    location.reload();
  });

  // Mobil menyu
  const burger = document.getElementById('ap-burger');
  const side = document.getElementById('ap-side');
  if (burger && side) burger.addEventListener('click', () => side.classList.toggle('open'));

  // Aktiv havola
  document.querySelectorAll('.ap-side nav a').forEach(a => {
    if (a.getAttribute('href') === location.pathname) a.classList.add('active');
  });
})();
```

**Fayl:** `static/admin/js/i18n.js`
```javascript
(function (w) {
  'use strict';
  w.ARMENU = w.ARMENU || {};
  const lang = (document.cookie.match(/django_language=([^;]+)/) || [])[1] || 'uz';
  let DICT = {};

  function get(path) {
    return path.split('.').reduce((o, k) => (o == null ? null : o[k]), DICT);
  }
  w.ARMENU.lang = lang;
  w.ARMENU.t = function (key, vars) {
    let s = get(key);
    if (s == null) return key;
    if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
    return s;
  };
  w.ARMENU.money = function (n) {
    return new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'ru-RU')
      .format(Math.round(Number(n) || 0));
  };
  w.ARMENU.ready = fetch(`/static/i18n/${lang}.json`)
    .then(r => r.json()).then(d => { DICT = d; return d; })
    .catch(() => ({}));

  // CSRF + fetch yordamchilari
  const csrf = () => (document.cookie.match(/csrftoken=([^;]+)/) || [])[1] || '';
  const json = async (r) => { const d = await r.json().catch(() => ({}));
    if (!r.ok) throw d; return d; };
  w.ARMENU.api = {
    get:  (u) => fetch(u, { credentials: 'same-origin' }).then(json),
    post: (u, b) => fetch(u, { method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf() },
      body: JSON.stringify(b) }).then(json),
    patch: (u, b) => fetch(u, { method: 'PATCH', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf() },
      body: JSON.stringify(b) }).then(json),
    del: (u) => fetch(u, { method: 'DELETE', credentials: 'same-origin',
      headers: { 'X-CSRFToken': csrf() } }).then(r => r.ok)
  };
})(window);
```

✅ **Tekshirish:** `/admin-panel/` ochiladi, 🌓 tugmasi temani almashtiradi va
sahifa yangilangach saqlanib qoladi; til tanlansa butun interfeys tarjima bo'ladi.

---

## V-152 — ⚡ A-01 Dashboard — 5 ta ko'rsatkich kartochkasi (backend)

**Fayl:** `apps/analytics/services/dashboard.py`
```python
from datetime import timedelta
from django.db.models import Sum, Count, Avg, Q
from django.utils import timezone
from django.core.cache import cache


PAID = ('paid', 'served')


def _range_today(tz_now):
    start = tz_now.replace(hour=0, minute=0, second=0, microsecond=0)
    return start, tz_now


def dashboard_kpis(restaurant_id: int) -> dict:
    """
    A-01 uchun 5 ta karta: savdo, buyurtma, o'rtacha chek, band stollar, AR.
    Har biri kechagi shu vaqtgacha bo'lgan ko'rsatkich bilan solishtiriladi.
    """
    key = f'dash:kpi:{restaurant_id}'
    cached = cache.get(key)
    if cached:
        return cached

    from apps.orders.models import Order
    from apps.tables.models import Table
    from apps.ar.models import ARView

    now = timezone.localtime()
    t_start, t_end = _range_today(now)
    y_start = t_start - timedelta(days=1)
    y_end = t_end - timedelta(days=1)

    def agg(a, b):
        return Order.objects.filter(
            restaurant_id=restaurant_id, status__in=PAID,
            created_at__gte=a, created_at__lt=b
        ).aggregate(total=Sum('total'), cnt=Count('id'), avg=Avg('total'))

    cur, prev = agg(t_start, t_end), agg(y_start, y_end)

    tables_total = Table.objects.filter(
        restaurant_id=restaurant_id, is_active=True).count()
    tables_busy = Order.objects.filter(
        restaurant_id=restaurant_id,
        status__in=('new', 'accepted', 'cooking', 'ready')
    ).values('table_id').distinct().count()

    ar_cur = ARView.objects.filter(
        restaurant_id=restaurant_id, created_at__gte=t_start, created_at__lt=t_end).count()
    ar_prev = ARView.objects.filter(
        restaurant_id=restaurant_id, created_at__gte=y_start, created_at__lt=y_end).count()

    def delta(a, b):
        a, b = float(a or 0), float(b or 0)
        if b == 0:
            return None
        return round((a - b) / b * 100, 1)

    data = {
        'revenue':   {'value': int(cur['total'] or 0), 'delta': delta(cur['total'], prev['total'])},
        'orders':    {'value': cur['cnt'] or 0,        'delta': delta(cur['cnt'], prev['cnt'])},
        'avg_check': {'value': int(cur['avg'] or 0),   'delta': delta(cur['avg'], prev['avg'])},
        'tables':    {'value': tables_busy, 'total': tables_total,
                      'pct': round(tables_busy / tables_total * 100) if tables_total else 0},
        'ar_views':  {'value': ar_cur, 'delta': delta(ar_cur, ar_prev)},
        'ts': now.isoformat(),
    }
    cache.set(key, data, 30)      # 30 s — jonli, lekin DB'ni ezmaydi
    return data


def hourly_sales(restaurant_id: int, day=None) -> dict:
    """Soatlik savdo — Chart.js uchun {labels, revenue, orders}."""
    from apps.orders.models import Order
    from django.db.models.functions import TruncHour

    now = timezone.localtime()
    day = day or now.date()
    start = timezone.make_aware(timezone.datetime.combine(
        day, timezone.datetime.min.time()))
    end = start + timedelta(days=1)

    rows = (Order.objects
            .filter(restaurant_id=restaurant_id, status__in=PAID,
                    created_at__gte=start, created_at__lt=end)
            .annotate(h=TruncHour('created_at'))
            .values('h').annotate(total=Sum('total'), cnt=Count('id')))
    by_hour = {timezone.localtime(r['h']).hour: r for r in rows}

    labels, revenue, orders = [], [], []
    for h in range(8, 24):
        labels.append(f'{h:02d}:00')
        r = by_hour.get(h)
        revenue.append(int(r['total']) if r else 0)
        orders.append(r['cnt'] if r else 0)
    return {'labels': labels, 'revenue': revenue, 'orders': orders}


def top_dishes(restaurant_id: int, limit=5, days=1) -> list:
    from apps.orders.models import OrderItem
    since = timezone.localtime() - timedelta(days=days)
    rows = (OrderItem.objects
            .filter(order__restaurant_id=restaurant_id,
                    order__status__in=PAID, order__created_at__gte=since)
            .values('dish_id', 'dish__name_uz', 'dish__name_ru', 'dish__name_en')
            .annotate(qty=Sum('qty'), total=Sum('line_total'))
            .order_by('-qty')[:limit])
    return [{'dish_id': r['dish_id'],
             'name_uz': r['dish__name_uz'], 'name_ru': r['dish__name_ru'],
             'name_en': r['dish__name_en'],
             'qty': r['qty'], 'total': int(r['total'] or 0)} for r in rows]


def attention_items(restaurant_id: int) -> list:
    """⚠️ DIQQAT bloki — stop-list, javobsiz chaqiruv, uzun smena."""
    from apps.menu.models import Dish
    from apps.calls.models import Call

    out = []
    now = timezone.localtime()

    for d in Dish.objects.filter(restaurant_id=restaurant_id,
                                 is_available=False)[:5]:
        out.append({'level': 'warning', 'kind': 'sold_out',
                    'text_key': 'dash.sold_out', 'params': {'dish': d.name_uz}})

    late = Call.objects.filter(
        restaurant_id=restaurant_id, status='pending',
        created_at__lt=now - timedelta(minutes=5)).select_related('table')
    for c in late:
        mins = int((now - c.created_at).total_seconds() // 60)
        out.append({'level': 'danger', 'kind': 'call_late',
                    'text_key': 'dash.call_late',
                    'params': {'table': c.table.number if c.table else '-', 'min': mins}})
    return out[:8]
```

**Fayl:** `apps/analytics/views_dashboard.py`
```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import IsRestaurantAdmin
from apps.analytics.services.dashboard import (
    dashboard_kpis, hourly_sales, top_dishes, attention_items)


class DashboardView(APIView):
    """GET /api/v1/analytics/dashboard/"""
    permission_classes = [IsAuthenticated, IsRestaurantAdmin]

    def get(self, request):
        rid = request.restaurant_id
        return Response({
            'kpis': dashboard_kpis(rid),
            'hourly': hourly_sales(rid),
            'top_dishes': top_dishes(rid),
            'attention': attention_items(rid),
        })
```

✅ **Tekshirish:**
```bash
curl -s -H "Authorization: Bearer $ADMIN_JWT" \
  http://localhost:8060/api/v1/analytics/dashboard/ | python3 -m json.tool | head -20
# {"kpis": {"revenue": {...}, "orders": {...}, ...}}
```

---

## V-153 — ⚡ Dashboard UI + WS jonli oqim (A-01)

**Fayl:** `templates/admin_panel/dashboard.html`
```html
{% extends "admin_panel/base.html" %}
{% load i18n static %}
{% block title %}{% trans "Dashboard" %}{% endblock %}
{% block heading %}🏠 {% trans "Dashboard" %}{% endblock %}

{% block extra_css %}
<style>
  .kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
  .kpi { background: var(--surface); border: 1px solid var(--border);
         border-radius: var(--radius); padding: 12px; }
  .kpi .lbl { font-size: 11px; color: var(--fg-muted); text-transform: uppercase;
              letter-spacing: .04em; }
  .kpi .val { font-size: 24px; font-weight: 700; margin: 4px 0 2px; }
  .kpi .dlt { font-size: 12px; }
  .up   { color: var(--success); }
  .down { color: var(--danger); }
  .row2 { display: grid; grid-template-columns: 2fr 1fr; gap: 12px; margin-top: 12px; }
  .feed { max-height: 300px; overflow-y: auto; }
  .feed div { padding: 6px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
  .feed .tm { color: var(--fg-muted); margin-right: 8px; }
  .attn li { margin-bottom: 5px; font-size: 13px; }
  .attn .danger { color: var(--danger); }
  .attn .warning { color: var(--warning); }
  @media (max-width: 1100px) { .kpis { grid-template-columns: repeat(2, 1fr); }
                               .row2 { grid-template-columns: 1fr; } }
</style>
{% endblock %}

{% block content %}
<div class="kpis">
  <div class="kpi"><div class="lbl">{% trans "Bugun savdo" %}</div>
    <div class="val" id="k-rev">—</div><div class="dlt" id="d-rev"></div></div>
  <div class="kpi"><div class="lbl">{% trans "Buyurtma" %}</div>
    <div class="val" id="k-ord">—</div><div class="dlt" id="d-ord"></div></div>
  <div class="kpi"><div class="lbl">{% trans "O'rtacha chek" %}</div>
    <div class="val" id="k-avg">—</div><div class="dlt" id="d-avg"></div></div>
  <div class="kpi"><div class="lbl">{% trans "Band stollar" %}</div>
    <div class="val" id="k-tbl">—</div><div class="dlt muted" id="d-tbl"></div></div>
  <div class="kpi"><div class="lbl">{% trans "AR ko'rish" %}</div>
    <div class="val" id="k-ar">—</div><div class="dlt" id="d-ar"></div></div>
</div>

<div class="row2">
  <div class="card"><strong>📊 {% trans "Soatlik savdo" %}</strong>
    <canvas id="ch-hourly" height="110"></canvas></div>
  <div class="card"><strong>🍽 {% trans "TOP-5 taom" %}</strong>
    <table class="grid"><tbody id="top-dishes"></tbody></table></div>
</div>

<div class="row2">
  <div class="card"><strong>🔴 {% trans "Jonli oqim" %}</strong>
    <div class="feed" id="feed"></div></div>
  <div class="card"><strong>⚠️ {% trans "Diqqat" %}</strong>
    <ul class="attn" id="attn"></ul></div>
</div>
{% endblock %}

{% block extra_js %}
<script src="{% static 'vendor/chart.umd.min.js' %}"></script>
<script src="{% static 'admin/js/dashboard.js' %}?v=1"></script>
{% endblock %}
```

**Fayl:** `static/admin/js/dashboard.js`
```javascript
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const A = window.ARMENU;
  let chart = null;

  function delta(el, v, invert) {
    if (v === null || v === undefined) { el.textContent = ''; return; }
    const up = invert ? v < 0 : v > 0;
    el.className = 'dlt ' + (v === 0 ? 'muted' : (up ? 'up' : 'down'));
    el.textContent = (v > 0 ? '▲ +' : (v < 0 ? '▼ ' : '')) + v + '%';
  }

  function renderKpis(k) {
    $('#k-rev').textContent = A.money(k.revenue.value) + ' ' + A.t('common.sum');
    delta($('#d-rev'), k.revenue.delta);
    $('#k-ord').textContent = k.orders.value;
    delta($('#d-ord'), k.orders.delta);
    $('#k-avg').textContent = A.money(k.avg_check.value);
    delta($('#d-avg'), k.avg_check.delta);
    $('#k-tbl').textContent = k.tables.value + '/' + k.tables.total;
    $('#d-tbl').textContent = k.tables.pct + '%';
    $('#k-ar').textContent = k.ar_views.value;
    delta($('#d-ar'), k.ar_views.delta);
  }

  function renderChart(h) {
    const grid = getComputedStyle(document.documentElement)
      .getPropertyValue('--border').trim();
    const fg = getComputedStyle(document.documentElement)
      .getPropertyValue('--fg-muted').trim();
    const acc = getComputedStyle(document.documentElement)
      .getPropertyValue('--accent').trim();
    if (chart) chart.destroy();
    chart = new Chart($('#ch-hourly'), {
      type: 'bar',
      data: { labels: h.labels,
              datasets: [{ label: A.t('dash.revenue'), data: h.revenue,
                           backgroundColor: acc, borderRadius: 4 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false },
                   tooltip: { callbacks: { label: (c) => A.money(c.raw) + ' ' + A.t('common.sum') } } },
        scales: {
          x: { grid: { color: grid }, ticks: { color: fg } },
          y: { grid: { color: grid },
               ticks: { color: fg, callback: (v) => A.money(v) } }
        }
      }
    });
  }

  function renderTop(list) {
    const L = A.lang;
    $('#top-dishes').innerHTML = list.map((d, i) => `
      <tr><td>${i + 1}. ${d['name_' + L] || d.name_uz}</td>
          <td class="muted">${d.qty} ${A.t('common.pcs')}</td>
          <td style="text-align:right">${A.money(d.total)}</td></tr>`).join('')
      || `<tr><td class="muted">${A.t('common.no_data')}</td></tr>`;
  }

  function renderAttn(list) {
    $('#attn').innerHTML = list.map(a =>
      `<li class="${a.level}">${A.t(a.text_key, a.params)}</li>`).join('')
      || `<li class="muted">${A.t('dash.all_ok')}</li>`;
  }

  function pushFeed(type, d) {
    const tm = new Date().toLocaleTimeString(A.lang === 'en' ? 'en-GB' : 'ru-RU',
      { hour: '2-digit', minute: '2-digit' });
    const key = { 'order.created': 'dash.feed_new', 'order.status': 'dash.feed_status',
                  'order.paid': 'dash.feed_paid', 'call.created': 'dash.feed_call',
                  'review.created': 'dash.feed_review' }[type];
    if (!key) return;
    const el = document.createElement('div');
    el.innerHTML = `<span class="tm">${tm}</span>` +
      A.t(key, { table: d.table_number || '-', number: d.number || '',
                 total: A.money(d.total || 0), status: A.t('order.status_' + (d.status || 'new')),
                 stars: d.rating || '' });
    const feed = $('#feed');
    feed.insertBefore(el, feed.firstChild);
    while (feed.children.length > 40) feed.removeChild(feed.lastChild);
  }

  async function load() {
    const d = await A.api.get('/api/v1/analytics/dashboard/');
    renderKpis(d.kpis); renderChart(d.hourly);
    renderTop(d.top_dishes); renderAttn(d.attention);
  }

  function connectWS() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${location.host}/ws/admin/`);
    let retry = 1000;
    ws.onopen = () => { retry = 1000; };
    ws.onmessage = (ev) => {
      let m; try { m = JSON.parse(ev.data); } catch (_) { return; }
      pushFeed(m.type, m.data || {});
      if (['order.created', 'order.paid', 'order.status'].includes(m.type)) {
        clearTimeout(window.__kpiT);
        window.__kpiT = setTimeout(load, 2000);   // debounce
      }
    };
    ws.onclose = () => { retry = Math.min(retry * 2, 15000); setTimeout(connectWS, retry); };
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await A.ready;
    await load();
    connectWS();
    setInterval(load, 60000);
    document.getElementById('ap-theme').addEventListener('click',
      () => setTimeout(load, 50));   // tema o'zgarsa grafik ranglari yangilanadi
  });
})();
```

✅ **Tekshirish:** Dashboard ochiladi → 5 ta karta to'ladi. Boshqa oynadan buyurtma
beriladi → jonli oqimda darhol paydo bo'ladi, 2 s dan keyin kartalar yangilanadi.

---

## V-154 — Buyurtmalar ro'yxati + filtr

**Fayl:** `apps/orders/views_admin.py`
```python
from django.db.models import Q
from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated

from core.mixins import TenantScopedMixin
from apps.accounts.permissions import IsRestaurantAdmin
from apps.orders.models import Order
from apps.orders.serializers_admin import (
    OrderAdminListSerializer, OrderAdminDetailSerializer)


class AdminOrderViewSet(TenantScopedMixin, viewsets.ReadOnlyModelViewSet):
    """
    GET /api/v1/admin/orders/?status=paid&table=5&date_from=&date_to=&q=
    """
    queryset = Order.objects.select_related('table', 'waiter').order_by('-created_at')
    permission_classes = [IsAuthenticated, IsRestaurantAdmin]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['created_at', 'total', 'number']

    def get_serializer_class(self):
        return (OrderAdminListSerializer if self.action == 'list'
                else OrderAdminDetailSerializer)

    def get_queryset(self):
        qs = super().get_queryset()
        p = self.request.query_params
        if p.get('status'):
            qs = qs.filter(status__in=p['status'].split(','))
        if p.get('table'):
            qs = qs.filter(table_id=p['table'])
        if p.get('waiter'):
            qs = qs.filter(waiter_id=p['waiter'])
        if p.get('date_from'):
            qs = qs.filter(created_at__date__gte=p['date_from'])
        if p.get('date_to'):
            qs = qs.filter(created_at__date__lte=p['date_to'])
        if p.get('source'):
            qs = qs.filter(source=p['source'])
        q = (p.get('q') or '').strip()
        if q:
            qs = qs.filter(Q(number__icontains=q) | Q(table__number__icontains=q)
                           | Q(guest_phone__icontains=q))
        return qs
```

**Fayl:** `apps/orders/serializers_admin.py`
```python
from rest_framework import serializers
from apps.orders.models import Order, OrderItem


class OrderAdminListSerializer(serializers.ModelSerializer):
    table_number = serializers.CharField(source='table.number', default='')
    waiter_name = serializers.CharField(source='waiter.full_name', default='')
    items_count = serializers.IntegerField(source='items.count', read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'number', 'status', 'source', 'table_number',
                  'waiter_name', 'guests', 'items_count', 'total',
                  'created_at', 'paid_at']


class OrderItemAdminSerializer(serializers.ModelSerializer):
    dish_name_uz = serializers.CharField(source='dish.name_uz', default='')
    dish_name_ru = serializers.CharField(source='dish.name_ru', default='')
    dish_name_en = serializers.CharField(source='dish.name_en', default='')

    class Meta:
        model = OrderItem
        fields = ['id', 'dish_id', 'dish_name_uz', 'dish_name_ru', 'dish_name_en',
                  'qty', 'price', 'line_total', 'modifiers', 'note', 'status']


class OrderAdminDetailSerializer(OrderAdminListSerializer):
    items = OrderItemAdminSerializer(many=True, read_only=True)
    timeline = serializers.SerializerMethodField()

    class Meta(OrderAdminListSerializer.Meta):
        fields = OrderAdminListSerializer.Meta.fields + [
            'items', 'subtotal', 'service_fee', 'discount', 'note',
            'guest_phone', 'payment_method', 'timeline']

    def get_timeline(self, obj):
        return [{'status': h.status, 'at': h.created_at, 'by': h.actor_name}
                for h in obj.history.all().order_by('created_at')]
```

**Fayl:** `templates/admin_panel/orders.html`
```html
{% extends "admin_panel/base.html" %}
{% load i18n static %}
{% block title %}{% trans "Buyurtmalar" %}{% endblock %}
{% block heading %}🧾 {% trans "Buyurtmalar" %}{% endblock %}
{% block content %}
<div class="card" style="margin-bottom:12px">
  <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:end">
    <div><label class="muted">{% trans "Holat" %}</label><br>
      <select id="f-status">
        <option value="">{% trans "Hammasi" %}</option>
        <option value="new">{% trans "Yangi" %}</option>
        <option value="accepted">{% trans "Qabul qilindi" %}</option>
        <option value="cooking">{% trans "Tayyorlanmoqda" %}</option>
        <option value="ready">{% trans "Tayyor" %}</option>
        <option value="served">{% trans "Berildi" %}</option>
        <option value="paid">{% trans "To'landi" %}</option>
        <option value="cancelled">{% trans "Bekor" %}</option>
      </select></div>
    <div><label class="muted">{% trans "Sana (dan)" %}</label><br>
      <input type="date" id="f-from"></div>
    <div><label class="muted">{% trans "Sana (gacha)" %}</label><br>
      <input type="date" id="f-to"></div>
    <div style="flex:1;min-width:180px"><label class="muted">{% trans "Qidiruv" %}</label><br>
      <input id="f-q" style="width:100%" placeholder="{% trans 'Raqam, stol, telefon' %}"></div>
    <button class="btn btn-primary" id="f-apply">{% trans "Qo'llash" %}</button>
    <button class="btn" id="f-xlsx">📥 Excel</button>
  </div>
</div>

<div class="card">
  <table class="grid">
    <thead><tr>
      <th>#</th><th>{% trans "Vaqt" %}</th><th>{% trans "Stol" %}</th>
      <th>{% trans "Ofitsiant" %}</th><th>{% trans "Taom" %}</th>
      <th>{% trans "Holat" %}</th><th style="text-align:right">{% trans "Jami" %}</th>
    </tr></thead>
    <tbody id="ord-body"></tbody>
  </table>
  <div style="display:flex;gap:8px;justify-content:center;padding:10px">
    <button class="btn" id="pg-prev">←</button>
    <span id="pg-info" class="muted"></span>
    <button class="btn" id="pg-next">→</button>
  </div>
</div>
{% endblock %}
{% block extra_js %}<script src="{% static 'admin/js/orders.js' %}?v=1"></script>{% endblock %}
```

**Fayl:** `static/admin/js/orders.js`
```javascript
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const A = window.ARMENU;
  let page = 1, pages = 1;

  const STATUS_CLASS = {
    new: 'info', accepted: 'info', cooking: 'warning',
    ready: 'success', served: 'success', paid: 'success', cancelled: 'danger'
  };

  function qs() {
    const p = new URLSearchParams({ page: page, page_size: 50 });
    const st = $('#f-status').value; if (st) p.set('status', st);
    const f = $('#f-from').value; if (f) p.set('date_from', f);
    const t = $('#f-to').value; if (t) p.set('date_to', t);
    const q = $('#f-q').value.trim(); if (q) p.set('q', q);
    return p.toString();
  }

  async function load() {
    const d = await A.api.get('/api/v1/admin/orders/?' + qs());
    pages = Math.max(1, Math.ceil((d.count || 0) / 50));
    $('#pg-info').textContent = `${page} / ${pages} · ${d.count || 0}`;
    $('#ord-body').innerHTML = (d.results || []).map(o => `
      <tr style="cursor:pointer" data-id="${o.id}">
        <td><strong>${o.number}</strong></td>
        <td>${new Date(o.created_at).toLocaleString(A.lang === 'en' ? 'en-GB' : 'ru-RU')}</td>
        <td>${o.table_number || '-'}</td>
        <td>${o.waiter_name || '-'}</td>
        <td class="muted">${o.items_count} ${A.t('common.pcs')}</td>
        <td><span class="badge" style="color:var(--${STATUS_CLASS[o.status] || 'info'})">
          ${A.t('order.status_' + o.status)}</span></td>
        <td style="text-align:right">${A.money(o.total)}</td>
      </tr>`).join('') ||
      `<tr><td colspan="7" class="muted">${A.t('common.no_data')}</td></tr>`;
    $('#ord-body').querySelectorAll('tr[data-id]').forEach(tr =>
      tr.addEventListener('click', () => openDetail(tr.dataset.id)));
  }

  async function openDetail(id) {
    const o = await A.api.get(`/api/v1/admin/orders/${id}/`);
    window.showOrderModal(o);           // V-155
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await A.ready;
    $('#f-apply').addEventListener('click', () => { page = 1; load(); });
    $('#f-q').addEventListener('keydown', e => { if (e.key === 'Enter') { page = 1; load(); } });
    $('#pg-prev').addEventListener('click', () => { if (page > 1) { page--; load(); } });
    $('#pg-next').addEventListener('click', () => { if (page < pages) { page++; load(); } });
    $('#f-xlsx').addEventListener('click', () =>
      location.href = '/api/v1/admin/export/orders.xlsx?' + qs());
    load();
  });
})();
```

✅ **Tekshirish:** filtrlar ishlaydi, sahifalash ishlaydi, qator bosilsa modal ochiladi.

---

## V-155 — Buyurtma tafsiloti modali

**Fayl:** `static/admin/js/order_modal.js`
```javascript
(function (w) {
  'use strict';
  const A = w.ARMENU;

  function ensureRoot() {
    let r = document.getElementById('om-root');
    if (r) return r;
    r = document.createElement('div');
    r.id = 'om-root';
    r.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);' +
      'display:none;align-items:center;justify-content:center;z-index:100;padding:12px';
    r.innerHTML = `<div id="om-box" style="background:var(--surface);color:var(--fg);
      border:1px solid var(--border);border-radius:var(--radius);max-width:640px;
      width:100%;max-height:90vh;overflow:auto;padding:16px"></div>`;
    r.addEventListener('click', (e) => { if (e.target === r) hide(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
    document.body.appendChild(r);
    return r;
  }
  function hide() { const r = document.getElementById('om-root'); if (r) r.style.display = 'none'; }

  w.showOrderModal = function (o) {
    const L = A.lang;
    const root = ensureRoot();
    const items = (o.items || []).map(i => `
      <tr><td>${i['dish_name_' + L] || i.dish_name_uz}
            ${i.note ? `<div class="muted" style="font-size:11px">📝 ${i.note}</div>` : ''}
            ${(i.modifiers || []).length ? `<div class="muted" style="font-size:11px">+ ${
              (i.modifiers || []).map(m => m['name_' + L] || m.name_uz).join(', ')}</div>` : ''}</td>
          <td style="text-align:center">${i.qty}</td>
          <td style="text-align:right">${A.money(i.price)}</td>
          <td style="text-align:right">${A.money(i.line_total)}</td></tr>`).join('');

    const timeline = (o.timeline || []).map(h => `
      <li>${new Date(h.at).toLocaleTimeString(L === 'en' ? 'en-GB' : 'ru-RU')} —
          ${A.t('order.status_' + h.status)} ${h.by ? `<span class="muted">(${h.by})</span>` : ''}</li>`).join('');

    document.getElementById('om-box').innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <h3 style="margin:0">${A.t('order.number', { n: o.number })}</h3>
        <button class="btn" onclick="document.getElementById('om-root').style.display='none'">✕</button>
      </div>
      <p class="muted">${A.t('order.table', { n: o.table_number || '-' })} ·
        ${o.waiter_name || '-'} · ${new Date(o.created_at).toLocaleString()}</p>
      <table class="grid"><thead><tr>
        <th>${A.t('common.dish')}</th><th style="text-align:center">${A.t('common.qty')}</th>
        <th style="text-align:right">${A.t('common.price')}</th>
        <th style="text-align:right">${A.t('common.sum_col')}</th>
      </tr></thead><tbody>${items}</tbody></table>
      <table class="grid" style="margin-top:8px"><tbody>
        <tr><td>${A.t('cart.subtotal')}</td><td style="text-align:right">${A.money(o.subtotal)}</td></tr>
        ${o.service_fee ? `<tr><td>${A.t('cart.service_fee', { pct: '' })}</td>
          <td style="text-align:right">${A.money(o.service_fee)}</td></tr>` : ''}
        ${o.discount ? `<tr><td>${A.t('cart.discount')}</td>
          <td style="text-align:right">-${A.money(o.discount)}</td></tr>` : ''}
        <tr><td><strong>${A.t('cart.total')}</strong></td>
            <td style="text-align:right"><strong>${A.money(o.total)}</strong></td></tr>
      </tbody></table>
      ${o.note ? `<p>📝 ${o.note}</p>` : ''}
      <h4>${A.t('order.timeline')}</h4><ul class="muted">${timeline}</ul>
      <div style="display:flex;gap:8px;margin-top:10px">
        <a class="btn" href="/api/v1/admin/orders/${o.id}/receipt.pdf" target="_blank">
          🧾 ${A.t('order.receipt')}</a>
      </div>`;
    root.style.display = 'flex';
  };
})(window);
```

`orders.html` ga qo'shiladi:
```html
<script src="{% static 'admin/js/order_modal.js' %}?v=1"></script>
```

✅ **Tekshirish:** buyurtma bosilsa modal ochiladi, taom qatorlari, modifikatorlar,
izoh, jami va vaqt chizig'i ko'rinadi; Esc yopadi.

---

## V-156 — Savdo hisoboti (kun / hafta / oy)

**Fayl:** `apps/analytics/services/reports.py`
```python
from datetime import timedelta, date
from django.db.models import Sum, Count, Avg, F, DecimalField, ExpressionWrapper
from django.db.models.functions import TruncDay, TruncWeek, TruncMonth, TruncHour
from django.utils import timezone

PAID = ('paid', 'served')
TRUNC = {'day': TruncDay, 'week': TruncWeek, 'month': TruncMonth, 'hour': TruncHour}


def parse_period(params):
    """?period=day|week|month&date_from=&date_to= → (start, end, group)"""
    group = params.get('group', 'day')
    if group not in TRUNC:
        group = 'day'
    today = timezone.localdate()
    df, dt = params.get('date_from'), params.get('date_to')
    if df and dt:
        start, end = date.fromisoformat(df), date.fromisoformat(dt)
    else:
        preset = params.get('period', 'month')
        end = today
        start = {'day': today, 'week': today - timedelta(days=6),
                 'month': today - timedelta(days=29)}.get(preset, today - timedelta(days=29))
    return start, end, group


def sales_report(restaurant_id, start, end, group='day') -> dict:
    from apps.orders.models import Order

    qs = Order.objects.filter(
        restaurant_id=restaurant_id, status__in=PAID,
        created_at__date__gte=start, created_at__date__lte=end)

    rows = (qs.annotate(p=TRUNC[group]('created_at'))
              .values('p')
              .annotate(revenue=Sum('total'), orders=Count('id'),
                        avg_check=Avg('total'), guests=Sum('guests'))
              .order_by('p'))

    totals = qs.aggregate(revenue=Sum('total'), orders=Count('id'),
                          avg_check=Avg('total'), guests=Sum('guests'))

    by_source = list(qs.values('source').annotate(
        revenue=Sum('total'), orders=Count('id')).order_by('-revenue'))
    by_payment = list(qs.exclude(payment_method='').values('payment_method')
                        .annotate(revenue=Sum('total'), orders=Count('id')).order_by('-revenue'))

    # Oldingi teng davr bilan solishtirish
    span = (end - start).days + 1
    prev = Order.objects.filter(
        restaurant_id=restaurant_id, status__in=PAID,
        created_at__date__gte=start - timedelta(days=span),
        created_at__date__lt=start).aggregate(revenue=Sum('total'), orders=Count('id'))

    def d(a, b):
        a, b = float(a or 0), float(b or 0)
        return None if b == 0 else round((a - b) / b * 100, 1)

    return {
        'start': start, 'end': end, 'group': group,
        'series': [{'period': r['p'].date().isoformat() if hasattr(r['p'], 'date') else str(r['p']),
                    'revenue': int(r['revenue'] or 0), 'orders': r['orders'],
                    'avg_check': int(r['avg_check'] or 0),
                    'guests': r['guests'] or 0} for r in rows],
        'totals': {'revenue': int(totals['revenue'] or 0),
                   'orders': totals['orders'] or 0,
                   'avg_check': int(totals['avg_check'] or 0),
                   'guests': totals['guests'] or 0,
                   'revenue_delta': d(totals['revenue'], prev['revenue']),
                   'orders_delta': d(totals['orders'], prev['orders'])},
        'by_source': [{'source': r['source'], 'revenue': int(r['revenue'] or 0),
                       'orders': r['orders']} for r in by_source],
        'by_payment': [{'method': r['payment_method'], 'revenue': int(r['revenue'] or 0),
                        'orders': r['orders']} for r in by_payment],
    }
```

**Fayl:** `apps/analytics/views_reports.py`
```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import IsRestaurantAdmin
from apps.analytics.services.reports import parse_period, sales_report


class SalesReportView(APIView):
    """GET /api/v1/analytics/reports/sales/?period=month&group=day"""
    permission_classes = [IsAuthenticated, IsRestaurantAdmin]

    def get(self, request):
        start, end, group = parse_period(request.query_params)
        return Response(sales_report(request.restaurant_id, start, end, group))
```

**Fayl:** `templates/admin_panel/report_sales.html`
```html
{% extends "admin_panel/base.html" %}
{% load i18n static %}
{% block title %}{% trans "Savdo hisoboti" %}{% endblock %}
{% block heading %}📊 {% trans "Savdo hisoboti" %}{% endblock %}
{% block content %}
<div class="card" style="margin-bottom:12px;display:flex;gap:8px;flex-wrap:wrap;align-items:end">
  <div><label class="muted">{% trans "Davr" %}</label><br>
    <select id="r-period">
      <option value="day">{% trans "Bugun" %}</option>
      <option value="week">{% trans "7 kun" %}</option>
      <option value="month" selected>{% trans "30 kun" %}</option>
    </select></div>
  <div><label class="muted">{% trans "Guruhlash" %}</label><br>
    <select id="r-group">
      <option value="hour">{% trans "Soat" %}</option>
      <option value="day" selected>{% trans "Kun" %}</option>
      <option value="week">{% trans "Hafta" %}</option>
      <option value="month">{% trans "Oy" %}</option>
    </select></div>
  <div><label class="muted">{% trans "dan" %}</label><br><input type="date" id="r-from"></div>
  <div><label class="muted">{% trans "gacha" %}</label><br><input type="date" id="r-to"></div>
  <button class="btn btn-primary" id="r-apply">{% trans "Ko'rsatish" %}</button>
  <button class="btn" id="r-xlsx">📥 Excel</button>
  <button class="btn" id="r-pdf">📄 PDF</button>
</div>

<div class="kpis" style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">
  <div class="card"><div class="muted">{% trans "Savdo" %}</div>
    <div style="font-size:22px;font-weight:700" id="t-rev">—</div><div id="t-revd"></div></div>
  <div class="card"><div class="muted">{% trans "Buyurtma" %}</div>
    <div style="font-size:22px;font-weight:700" id="t-ord">—</div><div id="t-ordd"></div></div>
  <div class="card"><div class="muted">{% trans "O'rtacha chek" %}</div>
    <div style="font-size:22px;font-weight:700" id="t-avg">—</div></div>
  <div class="card"><div class="muted">{% trans "Mehmonlar" %}</div>
    <div style="font-size:22px;font-weight:700" id="t-gst">—</div></div>
</div>

<div class="card" style="margin-top:12px"><canvas id="r-chart" height="90"></canvas></div>

<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
  <div class="card"><strong>{% trans "Manba bo'yicha" %}</strong>
    <table class="grid"><tbody id="t-source"></tbody></table></div>
  <div class="card"><strong>{% trans "To'lov turi bo'yicha" %}</strong>
    <table class="grid"><tbody id="t-payment"></tbody></table></div>
</div>
{% endblock %}
{% block extra_js %}
<script src="{% static 'vendor/chart.umd.min.js' %}"></script>
<script src="{% static 'admin/js/report_sales.js' %}?v=1"></script>
{% endblock %}
```

**Fayl:** `static/admin/js/report_sales.js`
```javascript
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const A = window.ARMENU;
  let chart = null;

  function qs() {
    const p = new URLSearchParams({ period: $('#r-period').value, group: $('#r-group').value });
    if ($('#r-from').value && $('#r-to').value) {
      p.set('date_from', $('#r-from').value); p.set('date_to', $('#r-to').value);
    }
    return p.toString();
  }

  function css(v) {
    return getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  }

  function drawChart(series) {
    if (chart) chart.destroy();
    chart = new Chart($('#r-chart'), {
      type: 'line',
      data: {
        labels: series.map(s => s.period),
        datasets: [
          { label: A.t('dash.revenue'), data: series.map(s => s.revenue),
            borderColor: css('--accent'), backgroundColor: css('--accent'),
            tension: .3, yAxisID: 'y' },
          { label: A.t('dash.orders'), data: series.map(s => s.orders),
            borderColor: css('--warning'), tension: .3, yAxisID: 'y1' }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: css('--fg') } } },
        scales: {
          x: { grid: { color: css('--border') }, ticks: { color: css('--fg-muted') } },
          y: { position: 'left', grid: { color: css('--border') },
               ticks: { color: css('--fg-muted'), callback: v => A.money(v) } },
          y1: { position: 'right', grid: { drawOnChartArea: false },
                ticks: { color: css('--fg-muted') } }
        }
      }
    });
  }

  function delta(el, v) {
    if (v == null) { el.textContent = ''; return; }
    el.style.color = v >= 0 ? css('--success') : css('--danger');
    el.textContent = (v >= 0 ? '▲ +' : '▼ ') + v + '%';
  }

  async function load() {
    const d = await A.api.get('/api/v1/analytics/reports/sales/?' + qs());
    $('#t-rev').textContent = A.money(d.totals.revenue);
    $('#t-ord').textContent = d.totals.orders;
    $('#t-avg').textContent = A.money(d.totals.avg_check);
    $('#t-gst').textContent = d.totals.guests;
    delta($('#t-revd'), d.totals.revenue_delta);
    delta($('#t-ordd'), d.totals.orders_delta);
    drawChart(d.series);
    $('#t-source').innerHTML = d.by_source.map(s =>
      `<tr><td>${A.t('source.' + s.source)}</td><td>${s.orders}</td>
        <td style="text-align:right">${A.money(s.revenue)}</td></tr>`).join('');
    $('#t-payment').innerHTML = d.by_payment.map(s =>
      `<tr><td>${A.t('pay.' + s.method)}</td><td>${s.orders}</td>
        <td style="text-align:right">${A.money(s.revenue)}</td></tr>`).join('');
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await A.ready;
    $('#r-apply').addEventListener('click', load);
    $('#r-xlsx').addEventListener('click', () =>
      location.href = '/api/v1/admin/export/sales.xlsx?' + qs());
    $('#r-pdf').addEventListener('click', () =>
      location.href = '/api/v1/admin/export/sales.pdf?' + qs());
    load();
  });
})();
```

✅ **Tekshirish:** davr o'zgartirilsa grafik va jadvallar yangilanadi;
"30 kun" da o'tgan 30 kun bilan solishtiruv foizi ko'rinadi.

---

## V-157 — Taomlar hisoboti (ABC tahlil)

**`apps/analytics/services/reports.py` ga qo'shiladi:**
```python
def dishes_report(restaurant_id, start, end) -> dict:
    """Taom bo'yicha sotuv + ABC tahlil (Pareto 80/15/5)."""
    from apps.orders.models import OrderItem

    rows = (OrderItem.objects
            .filter(order__restaurant_id=restaurant_id,
                    order__status__in=PAID,
                    order__created_at__date__gte=start,
                    order__created_at__date__lte=end)
            .values('dish_id', 'dish__name_uz', 'dish__name_ru', 'dish__name_en',
                    'dish__cost_price', 'dish__category__name_uz')
            .annotate(qty=Sum('qty'), revenue=Sum('line_total'))
            .order_by('-revenue'))

    items = []
    total_rev = sum(float(r['revenue'] or 0) for r in rows) or 1.0
    running = 0.0
    for r in rows:
        rev = float(r['revenue'] or 0)
        cost = float(r['dish__cost_price'] or 0) * float(r['qty'] or 0)
        running += rev
        share = running / total_rev
        abc = 'A' if share <= 0.80 else ('B' if share <= 0.95 else 'C')
        items.append({
            'dish_id': r['dish_id'],
            'name_uz': r['dish__name_uz'], 'name_ru': r['dish__name_ru'],
            'name_en': r['dish__name_en'],
            'category': r['dish__category__name_uz'] or '',
            'qty': r['qty'] or 0,
            'revenue': int(rev),
            'cost': int(cost),
            'margin': int(rev - cost),
            'margin_pct': round((rev - cost) / rev * 100, 1) if rev else 0,
            'share_pct': round(rev / total_rev * 100, 2),
            'abc': abc,
        })

    return {'start': start, 'end': end, 'total_revenue': int(total_rev),
            'items': items,
            'abc_summary': {
                g: {'count': sum(1 for i in items if i['abc'] == g),
                    'revenue': sum(i['revenue'] for i in items if i['abc'] == g)}
                for g in ('A', 'B', 'C')}}
```

**View:**
```python
class DishesReportView(APIView):
    """GET /api/v1/analytics/reports/dishes/?period=month"""
    permission_classes = [IsAuthenticated, IsRestaurantAdmin]

    def get(self, request):
        from apps.analytics.services.reports import dishes_report
        start, end, _ = parse_period(request.query_params)
        return Response(dishes_report(request.restaurant_id, start, end))
```

**Fayl:** `templates/admin_panel/report_dishes.html`
```html
{% extends "admin_panel/base.html" %}
{% load i18n static %}
{% block title %}{% trans "Taomlar hisoboti" %}{% endblock %}
{% block heading %}🍲 {% trans "Taomlar hisoboti" %}{% endblock %}
{% block content %}
<div class="card" style="margin-bottom:12px;display:flex;gap:8px;align-items:end">
  <div><label class="muted">{% trans "Davr" %}</label><br>
    <select id="d-period">
      <option value="day">{% trans "Bugun" %}</option>
      <option value="week">{% trans "7 kun" %}</option>
      <option value="month" selected>{% trans "30 kun" %}</option>
    </select></div>
  <button class="btn btn-primary" id="d-apply">{% trans "Ko'rsatish" %}</button>
  <button class="btn" id="d-xlsx">📥 Excel</button>
  <span class="muted" id="d-abc"></span>
</div>
<div class="card">
  <table class="grid">
    <thead><tr>
      <th>{% trans "Taom" %}</th><th>{% trans "Kategoriya" %}</th>
      <th style="text-align:right">{% trans "Soni" %}</th>
      <th style="text-align:right">{% trans "Savdo" %}</th>
      <th style="text-align:right">{% trans "Tannarx" %}</th>
      <th style="text-align:right">{% trans "Marja" %}</th>
      <th style="text-align:center">{% trans "Ulush" %}</th>
      <th style="text-align:center">ABC</th>
    </tr></thead>
    <tbody id="d-body"></tbody>
  </table>
</div>
{% endblock %}
{% block extra_js %}
<script>
(function () {
  const $ = s => document.querySelector(s), A = window.ARMENU;
  const CL = { A: 'success', B: 'warning', C: 'danger' };
  async function load() {
    const d = await A.api.get('/api/v1/analytics/reports/dishes/?period=' + $('#d-period').value);
    $('#d-abc').textContent = ['A', 'B', 'C'].map(g =>
      `${g}: ${d.abc_summary[g].count} (${A.money(d.abc_summary[g].revenue)})`).join(' · ');
    $('#d-body').innerHTML = d.items.map(i => `
      <tr><td>${i['name_' + A.lang] || i.name_uz}</td><td class="muted">${i.category}</td>
        <td style="text-align:right">${i.qty}</td>
        <td style="text-align:right">${A.money(i.revenue)}</td>
        <td style="text-align:right" class="muted">${A.money(i.cost)}</td>
        <td style="text-align:right">${A.money(i.margin)} <span class="muted">(${i.margin_pct}%)</span></td>
        <td style="text-align:center" class="muted">${i.share_pct}%</td>
        <td style="text-align:center"><span class="badge"
          style="color:var(--${CL[i.abc]})">${i.abc}</span></td></tr>`).join('')
      || `<tr><td colspan="8" class="muted">${A.t('common.no_data')}</td></tr>`;
  }
  document.addEventListener('DOMContentLoaded', async () => {
    await A.ready;
    $('#d-apply').addEventListener('click', load);
    $('#d-xlsx').addEventListener('click', () =>
      location.href = '/api/v1/admin/export/dishes.xlsx?period=' + $('#d-period').value);
    load();
  });
})();
</script>
{% endblock %}
```

✅ **Tekshirish:** A guruhiga savdoning ~80% i tushadi; marja foizi to'g'ri hisoblanadi.

---

## V-158 — ⚡ MENYU-INJINIRING (4 kvadrant)

Klassik **Kasavana-Smith** modeli: har taom **sotuv soni** (popularity) va
**marja** (profitability) bo'yicha 4 kvadrantga bo'linadi.

| Kvadrant | Sotuv | Marja | Nima qilish |
|---|---|---|---|
| ⭐ **Yulduz** (Star) | yuqori | yuqori | Saqlash, menyuda birinchi o'ringa |
| 🐎 **Ot** (Plowhorse) | yuqori | past | Narxni oshirish yoki tannarxni tushirish |
| 🧩 **Jumboq** (Puzzle) | past | yuqori | Reklama, AR/3D qo'shish, ofitsiant tavsiyasi |
| 🗑 **It** (Dog) | past | past | Menyudan olib tashlash |

**`apps/analytics/services/reports.py` ga qo'shiladi:**
```python
def menu_engineering(restaurant_id, start, end) -> dict:
    """
    ⚡ Kasavana-Smith. Chegara:
      popularity: taom soni >= (70% × o'rtacha ulush)
      profitability: marja (so'mda) >= o'rtacha marja
    """
    from apps.orders.models import OrderItem
    from apps.ar.models import ARView

    rows = list(OrderItem.objects
                .filter(order__restaurant_id=restaurant_id,
                        order__status__in=PAID,
                        order__created_at__date__gte=start,
                        order__created_at__date__lte=end)
                .values('dish_id', 'dish__name_uz', 'dish__name_ru', 'dish__name_en',
                        'dish__price', 'dish__cost_price', 'dish__has_3d')
                .annotate(qty=Sum('qty'), revenue=Sum('line_total')))

    if not rows:
        return {'start': start, 'end': end, 'items': [],
                'quadrants': {k: [] for k in ('star', 'plowhorse', 'puzzle', 'dog')},
                'thresholds': {'qty': 0, 'margin': 0}}

    total_qty = sum(r['qty'] or 0 for r in rows)
    n = len(rows)
    qty_threshold = (total_qty / n) * 0.70          # 70% qoidasi
    margins = []
    for r in rows:
        price = float(r['dish__price'] or 0)
        cost = float(r['dish__cost_price'] or 0)
        r['_margin_unit'] = price - cost
        margins.append(r['_margin_unit'])
    margin_threshold = sum(margins) / len(margins)

    ar_map = dict(ARView.objects.filter(
        restaurant_id=restaurant_id, created_at__date__gte=start,
        created_at__date__lte=end).values_list('dish_id').annotate(c=Count('id')))

    QUAD = {(True, True): 'star', (True, False): 'plowhorse',
            (False, True): 'puzzle', (False, False): 'dog'}
    ACTION = {'star': 'me.action_star', 'plowhorse': 'me.action_plowhorse',
              'puzzle': 'me.action_puzzle', 'dog': 'me.action_dog'}

    items = []
    for r in rows:
        popular = (r['qty'] or 0) >= qty_threshold
        profitable = r['_margin_unit'] >= margin_threshold
        q = QUAD[(popular, profitable)]
        items.append({
            'dish_id': r['dish_id'],
            'name_uz': r['dish__name_uz'], 'name_ru': r['dish__name_ru'],
            'name_en': r['dish__name_en'],
            'qty': r['qty'] or 0,
            'revenue': int(r['revenue'] or 0),
            'margin_unit': int(r['_margin_unit']),
            'margin_total': int(r['_margin_unit'] * (r['qty'] or 0)),
            'has_3d': bool(r['dish__has_3d']),
            'ar_views': ar_map.get(r['dish_id'], 0),
            'quadrant': q,
            'action_key': ACTION[q],
            # ⚡ Jumboq + 3D yo'q → eng foydali tavsiya
            'hint_3d': q == 'puzzle' and not r['dish__has_3d'],
        })

    quadrants = {k: [i for i in items if i['quadrant'] == k]
                 for k in ('star', 'plowhorse', 'puzzle', 'dog')}
    for k in quadrants:
        quadrants[k].sort(key=lambda i: -i['margin_total'])

    return {'start': start, 'end': end, 'items': items, 'quadrants': quadrants,
            'thresholds': {'qty': round(qty_threshold, 1),
                           'margin': int(margin_threshold)}}
```

**View:**
```python
class MenuEngineeringView(APIView):
    """GET /api/v1/analytics/reports/menu-engineering/?period=month"""
    permission_classes = [IsAuthenticated, IsRestaurantAdmin]

    def get(self, request):
        from apps.analytics.services.reports import menu_engineering
        start, end, _ = parse_period(request.query_params)
        return Response(menu_engineering(request.restaurant_id, start, end))
```

**Fayl:** `templates/admin_panel/menu_engineering.html`
```html
{% extends "admin_panel/base.html" %}
{% load i18n static %}
{% block title %}{% trans "Menyu-injiniring" %}{% endblock %}
{% block heading %}🧭 {% trans "Menyu-injiniring" %}{% endblock %}
{% block extra_css %}
<style>
  .me-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .me-q { border-top:3px solid var(--border); }
  .me-q.star      { border-top-color: var(--success); }
  .me-q.plowhorse { border-top-color: var(--info); }
  .me-q.puzzle    { border-top-color: var(--warning); }
  .me-q.dog       { border-top-color: var(--danger); }
  .me-q h3 { margin:6px 0 2px; font-size:15px; }
  .me-q p.act { font-size:12px; color:var(--fg-muted); margin:0 0 8px; }
  @media (max-width:900px){ .me-grid{ grid-template-columns:1fr; } }
</style>
{% endblock %}
{% block content %}
<div class="card" style="margin-bottom:12px;display:flex;gap:8px;align-items:end">
  <div><label class="muted">{% trans "Davr" %}</label><br>
    <select id="me-period">
      <option value="week">{% trans "7 kun" %}</option>
      <option value="month" selected>{% trans "30 kun" %}</option>
    </select></div>
  <button class="btn btn-primary" id="me-apply">{% trans "Hisoblash" %}</button>
  <span class="muted" id="me-thr"></span>
</div>

<div class="card" style="margin-bottom:12px">
  <canvas id="me-scatter" height="110"></canvas>
</div>

<div class="me-grid">
  <div class="card me-q star"><h3>⭐ {% trans "Yulduz" %}</h3>
    <p class="act">{% trans "Yuqori sotuv + yuqori marja → saqlang, birinchi o'ringa qo'ying" %}</p>
    <table class="grid"><tbody id="q-star"></tbody></table></div>
  <div class="card me-q plowhorse"><h3>🐎 {% trans "Ot" %}</h3>
    <p class="act">{% trans "Yuqori sotuv + past marja → narxni oshiring yoki tannarxni tushiring" %}</p>
    <table class="grid"><tbody id="q-plowhorse"></tbody></table></div>
  <div class="card me-q puzzle"><h3>🧩 {% trans "Jumboq" %}</h3>
    <p class="act">{% trans "Past sotuv + yuqori marja → reklama, 3D/AR qo'shing, ofitsiant tavsiya qilsin" %}</p>
    <table class="grid"><tbody id="q-puzzle"></tbody></table></div>
  <div class="card me-q dog"><h3>🗑 {% trans "It" %}</h3>
    <p class="act">{% trans "Past sotuv + past marja → menyudan olib tashlashni ko'rib chiqing" %}</p>
    <table class="grid"><tbody id="q-dog"></tbody></table></div>
</div>
{% endblock %}
{% block extra_js %}
<script src="{% static 'vendor/chart.umd.min.js' %}"></script>
<script src="{% static 'admin/js/menu_engineering.js' %}?v=1"></script>
{% endblock %}
```

**Fayl:** `static/admin/js/menu_engineering.js`
```javascript
(function () {
  'use strict';
  const $ = s => document.querySelector(s), A = window.ARMENU;
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const COLOR = { star: '--success', plowhorse: '--info', puzzle: '--warning', dog: '--danger' };
  let chart = null;

  function fillQuadrant(key, list) {
    $('#q-' + key).innerHTML = list.map(i => `
      <tr><td>${i['name_' + A.lang] || i.name_uz}
            ${i.hint_3d ? `<span class="badge" style="color:var(--warning)">
              🎯 ${A.t('me.add_3d')}</span>` : ''}</td>
          <td style="text-align:right">${i.qty} ${A.t('common.pcs')}</td>
          <td style="text-align:right">${A.money(i.margin_total)}</td></tr>`).join('')
      || `<tr><td class="muted">${A.t('common.no_data')}</td></tr>`;
  }

  function scatter(d) {
    if (chart) chart.destroy();
    const sets = Object.keys(COLOR).map(k => ({
      label: A.t('me.' + k),
      data: d.quadrants[k].map(i => ({ x: i.qty, y: i.margin_unit,
                                       n: i['name_' + A.lang] || i.name_uz })),
      backgroundColor: css(COLOR[k]), pointRadius: 6
    }));
    chart = new Chart($('#me-scatter'), {
      type: 'scatter',
      data: { datasets: sets },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: css('--fg') } },
          tooltip: { callbacks: { label: c =>
            `${c.raw.n}: ${c.raw.x} ${A.t('common.pcs')}, ${A.money(c.raw.y)}` } }
        },
        scales: {
          x: { title: { display: true, text: A.t('me.axis_qty'), color: css('--fg-muted') },
               grid: { color: css('--border') }, ticks: { color: css('--fg-muted') } },
          y: { title: { display: true, text: A.t('me.axis_margin'), color: css('--fg-muted') },
               grid: { color: css('--border') },
               ticks: { color: css('--fg-muted'), callback: v => A.money(v) } }
        }
      }
    });
  }

  async function load() {
    const d = await A.api.get(
      '/api/v1/analytics/reports/menu-engineering/?period=' + $('#me-period').value);
    $('#me-thr').textContent = A.t('me.thresholds',
      { qty: d.thresholds.qty, margin: A.money(d.thresholds.margin) });
    ['star', 'plowhorse', 'puzzle', 'dog'].forEach(k => fillQuadrant(k, d.quadrants[k]));
    scatter(d);
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await A.ready;
    $('#me-apply').addEventListener('click', load);
    load();
  });
})();
```

`i18n` ga `me` bloki (3 tilda):
```json
"me": {
  "star": "Yulduz", "plowhorse": "Ot", "puzzle": "Jumboq", "dog": "It",
  "axis_qty": "Sotuv soni", "axis_margin": "Marja (1 dona)",
  "add_3d": "3D qo'shing", "thresholds": "Chegara: {qty} ta / {margin}"
}
```
```json
"me": {
  "star": "Звезда", "plowhorse": "Рабочая лошадка", "puzzle": "Загадка", "dog": "Собака",
  "axis_qty": "Количество продаж", "axis_margin": "Маржа (за шт.)",
  "add_3d": "Добавьте 3D", "thresholds": "Порог: {qty} шт / {margin}"
}
```
```json
"me": {
  "star": "Star", "plowhorse": "Plowhorse", "puzzle": "Puzzle", "dog": "Dog",
  "axis_qty": "Units sold", "axis_margin": "Margin (per unit)",
  "add_3d": "Add 3D", "thresholds": "Threshold: {qty} pcs / {margin}"
}
```

✅ **Test:** `tests/test_menu_engineering.py`
```python
from datetime import timedelta
from django.utils import timezone
from apps.analytics.services.reports import menu_engineering


def test_quadrants_split(db, restaurant, make_sold_dish):
    today = timezone.localdate()
    make_sold_dish(restaurant, name='Osh', price=50000, cost=20000, qty=100)      # star
    make_sold_dish(restaurant, name='Non', price=5000, cost=4500, qty=120)        # plowhorse
    make_sold_dish(restaurant, name='Steyk', price=180000, cost=90000, qty=3)     # puzzle
    make_sold_dish(restaurant, name='Kompot', price=8000, cost=7000, qty=2)       # dog

    d = menu_engineering(restaurant.id, today - timedelta(days=1), today)
    names = {q: {i['name_uz'] for i in d['quadrants'][q]} for q in d['quadrants']}
    assert 'Osh' in names['star']
    assert 'Non' in names['plowhorse']
    assert 'Steyk' in names['puzzle']
    assert 'Kompot' in names['dog']


def test_empty_period_no_crash(db, restaurant):
    today = timezone.localdate()
    d = menu_engineering(restaurant.id, today, today)
    assert d['items'] == []
```

✅ **Tekshirish:** 4 kvadrant to'ladi, scatter grafik chiziladi, "Jumboq" da
3D yo'q taomlarda `🎯 3D qo'shing` belgisi chiqadi.

---

## V-159 — Xodimlar hisoboti

**`apps/analytics/services/reports.py` ga qo'shiladi:**
```python
def staff_report(restaurant_id, start, end) -> dict:
    """Ofitsiant kesimida: buyurtma, savdo, o'rtacha chek, xizmat vaqti, reyting."""
    from apps.orders.models import Order
    from apps.reviews.models import Review
    from django.db.models import Avg, F, DurationField, ExpressionWrapper

    qs = (Order.objects
          .filter(restaurant_id=restaurant_id, status__in=PAID,
                  created_at__date__gte=start, created_at__date__lte=end,
                  waiter__isnull=False)
          .annotate(serve_time=ExpressionWrapper(
              F('served_at') - F('created_at'), output_field=DurationField())))

    rows = (qs.values('waiter_id', 'waiter__full_name', 'waiter__role')
              .annotate(orders=Count('id'), revenue=Sum('total'),
                        avg_check=Avg('total'), guests=Sum('guests'),
                        avg_serve=Avg('serve_time'))
              .order_by('-revenue'))

    ratings = dict(Review.objects
                   .filter(restaurant_id=restaurant_id,
                           created_at__date__gte=start, created_at__date__lte=end,
                           order__waiter__isnull=False)
                   .values_list('order__waiter_id')
                   .annotate(r=Avg('rating')))

    items = []
    for r in rows:
        serve = r['avg_serve']
        items.append({
            'waiter_id': r['waiter_id'],
            'name': r['waiter__full_name'] or '-',
            'role': r['waiter__role'],
            'orders': r['orders'],
            'revenue': int(r['revenue'] or 0),
            'avg_check': int(r['avg_check'] or 0),
            'guests': r['guests'] or 0,
            'avg_serve_min': round(serve.total_seconds() / 60, 1) if serve else None,
            'rating': round(float(ratings.get(r['waiter_id']) or 0), 2) or None,
        })
    return {'start': start, 'end': end, 'items': items,
            'total_revenue': sum(i['revenue'] for i in items)}
```

**View + sahifa:** `templates/admin_panel/report_staff.html`
```html
{% extends "admin_panel/base.html" %}
{% load i18n static %}
{% block title %}{% trans "Xodimlar hisoboti" %}{% endblock %}
{% block heading %}👥 {% trans "Xodimlar hisoboti" %}{% endblock %}
{% block content %}
<div class="card" style="margin-bottom:12px;display:flex;gap:8px;align-items:end">
  <div><label class="muted">{% trans "Davr" %}</label><br>
    <select id="s-period">
      <option value="day">{% trans "Bugun" %}</option>
      <option value="week">{% trans "7 kun" %}</option>
      <option value="month" selected>{% trans "30 kun" %}</option>
    </select></div>
  <button class="btn btn-primary" id="s-apply">{% trans "Ko'rsatish" %}</button>
  <button class="btn" id="s-xlsx">📥 Excel</button>
</div>
<div class="card">
  <table class="grid">
    <thead><tr>
      <th>{% trans "Xodim" %}</th><th>{% trans "Rol" %}</th>
      <th style="text-align:right">{% trans "Buyurtma" %}</th>
      <th style="text-align:right">{% trans "Savdo" %}</th>
      <th style="text-align:right">{% trans "O'rt. chek" %}</th>
      <th style="text-align:right">{% trans "Mehmon" %}</th>
      <th style="text-align:right">{% trans "O'rt. xizmat" %}</th>
      <th style="text-align:center">{% trans "Reyting" %}</th>
    </tr></thead>
    <tbody id="s-body"></tbody>
  </table>
</div>
{% endblock %}
{% block extra_js %}
<script>
(function () {
  const $ = s => document.querySelector(s), A = window.ARMENU;
  async function load() {
    const d = await A.api.get('/api/v1/analytics/reports/staff/?period=' + $('#s-period').value);
    $('#s-body').innerHTML = d.items.map(i => `
      <tr><td>${i.name}</td><td class="muted">${A.t('role.' + i.role)}</td>
        <td style="text-align:right">${i.orders}</td>
        <td style="text-align:right">${A.money(i.revenue)}</td>
        <td style="text-align:right">${A.money(i.avg_check)}</td>
        <td style="text-align:right">${i.guests}</td>
        <td style="text-align:right">${i.avg_serve_min != null
          ? i.avg_serve_min + ' ' + A.t('common.min') : '—'}</td>
        <td style="text-align:center">${i.rating ? '⭐ ' + i.rating : '—'}</td></tr>`).join('')
      || `<tr><td colspan="8" class="muted">${A.t('common.no_data')}</td></tr>`;
  }
  document.addEventListener('DOMContentLoaded', async () => {
    await A.ready;
    $('#s-apply').addEventListener('click', load);
    $('#s-xlsx').addEventListener('click', () =>
      location.href = '/api/v1/admin/export/staff.xlsx?period=' + $('#s-period').value);
    load();
  });
})();
</script>
{% endblock %}
```

✅ **Tekshirish:** ofitsiantlar savdo bo'yicha tartiblangan; o'rtacha xizmat
vaqti daqiqada; reyting otzivlardan olinadi.

---

## V-160 — Excel / PDF eksport

**Fayl:** `apps/analytics/export.py`
```python
import io
from datetime import datetime

from django.http import HttpResponse
from django.utils import timezone
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill
from openpyxl.utils import get_column_letter


HEADER_FILL = PatternFill('solid', fgColor='2F6DF6')
HEADER_FONT = Font(color='FFFFFF', bold=True)


def _sheet(wb, title, headers, rows, widths=None):
    ws = wb.create_sheet(title[:31]) if wb.sheetnames != ['Sheet'] else wb.active
    ws.title = title[:31]
    ws.append(headers)
    for c in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=c)
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.alignment = Alignment(horizontal='center')
    for r in rows:
        ws.append(r)
    for i, w in enumerate(widths or [18] * len(headers), start=1):
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.freeze_panes = 'A2'
    return ws


def xlsx_response(wb, filename):
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    resp = HttpResponse(
        buf.read(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    resp['Content-Disposition'] = f'attachment; filename="{filename}"'
    return resp


def export_sales_xlsx(report, restaurant_name):
    wb = Workbook()
    _sheet(wb, 'Savdo',
           ['Davr', 'Savdo', 'Buyurtma', "O'rt. chek", 'Mehmon'],
           [[s['period'], s['revenue'], s['orders'], s['avg_check'], s['guests']]
            for s in report['series']],
           [16, 16, 12, 14, 10])
    t = report['totals']
    _sheet(wb, 'Jami',
           ['Ko\'rsatkich', 'Qiymat'],
           [['Savdo', t['revenue']], ['Buyurtma', t['orders']],
            ['O\'rtacha chek', t['avg_check']], ['Mehmonlar', t['guests']]],
           [22, 18])
    _sheet(wb, 'Manba', ['Manba', 'Buyurtma', 'Savdo'],
           [[s['source'], s['orders'], s['revenue']] for s in report['by_source']])
    return xlsx_response(
        wb, f'savdo_{report["start"]}_{report["end"]}.xlsx')


def export_dishes_xlsx(report):
    wb = Workbook()
    _sheet(wb, 'Taomlar',
           ['Taom', 'Kategoriya', 'Soni', 'Savdo', 'Tannarx', 'Marja', 'Marja %', 'ABC'],
           [[i['name_uz'], i['category'], i['qty'], i['revenue'], i['cost'],
             i['margin'], i['margin_pct'], i['abc']] for i in report['items']],
           [28, 18, 10, 16, 14, 14, 10, 6])
    return xlsx_response(wb, f'taomlar_{report["start"]}_{report["end"]}.xlsx')


def export_staff_xlsx(report):
    wb = Workbook()
    _sheet(wb, 'Xodimlar',
           ['Xodim', 'Rol', 'Buyurtma', 'Savdo', "O'rt. chek", 'Mehmon',
            "O'rt. xizmat (daq)", 'Reyting'],
           [[i['name'], i['role'], i['orders'], i['revenue'], i['avg_check'],
             i['guests'], i['avg_serve_min'] or '', i['rating'] or '']
            for i in report['items']],
           [24, 14, 12, 16, 14, 10, 18, 10])
    return xlsx_response(wb, f'xodimlar_{report["start"]}_{report["end"]}.xlsx')


def export_orders_xlsx(orders_qs):
    wb = Workbook()
    rows = []
    for o in orders_qs.select_related('table', 'waiter')[:20000]:
        rows.append([o.number, timezone.localtime(o.created_at).strftime('%Y-%m-%d %H:%M'),
                     o.table.number if o.table_id else '',
                     o.waiter.full_name if o.waiter_id else '',
                     o.status, o.source, int(o.subtotal or 0),
                     int(o.discount or 0), int(o.total or 0), o.payment_method or ''])
    _sheet(wb, 'Buyurtmalar',
           ['№', 'Vaqt', 'Stol', 'Ofitsiant', 'Holat', 'Manba',
            'Taomlar', 'Chegirma', 'Jami', "To'lov"],
           rows, [12, 18, 8, 20, 14, 12, 14, 12, 14, 14])
    return xlsx_response(wb, f'buyurtmalar_{timezone.localdate()}.xlsx')


# ---------- PDF (WeasyPrint) ----------
def export_pdf(template_name, context, filename):
    from django.template.loader import render_to_string
    from weasyprint import HTML

    html = render_to_string(template_name, context)
    pdf = HTML(string=html, base_url='/').write_pdf()
    resp = HttpResponse(pdf, content_type='application/pdf')
    resp['Content-Disposition'] = f'attachment; filename="{filename}"'
    return resp
```

**Fayl:** `templates/admin_panel/pdf/sales_report.html`
```html
{% load i18n %}<!doctype html>
<html><head><meta charset="utf-8">
<style>
  @page { size: A4; margin: 14mm; }
  body { font-family: "DejaVu Sans", sans-serif; font-size: 11px; color: #111; }
  h1 { font-size: 17px; margin: 0 0 2px; }
  .sub { color: #666; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  th, td { border: 1px solid #ccc; padding: 5px 6px; text-align: left; }
  th { background: #eef1f6; }
  td.n { text-align: right; }
  .tot { font-weight: bold; background: #f7f9fc; }
</style></head>
<body>
  <h1>{{ restaurant.name }} — {% trans "Savdo hisoboti" %}</h1>
  <div class="sub">{{ report.start }} … {{ report.end }} ·
    {% trans "Yaratildi" %}: {{ now|date:"d.m.Y H:i" }}</div>

  <table>
    <tr class="tot"><td>{% trans "Jami savdo" %}</td>
      <td class="n">{{ report.totals.revenue|floatformat:0 }}</td></tr>
    <tr><td>{% trans "Buyurtmalar" %}</td><td class="n">{{ report.totals.orders }}</td></tr>
    <tr><td>{% trans "O'rtacha chek" %}</td>
      <td class="n">{{ report.totals.avg_check|floatformat:0 }}</td></tr>
    <tr><td>{% trans "Mehmonlar" %}</td><td class="n">{{ report.totals.guests }}</td></tr>
  </table>

  <table>
    <thead><tr><th>{% trans "Davr" %}</th><th>{% trans "Savdo" %}</th>
      <th>{% trans "Buyurtma" %}</th><th>{% trans "O'rt. chek" %}</th></tr></thead>
    <tbody>
      {% for s in report.series %}
      <tr><td>{{ s.period }}</td><td class="n">{{ s.revenue }}</td>
          <td class="n">{{ s.orders }}</td><td class="n">{{ s.avg_check }}</td></tr>
      {% endfor %}
    </tbody>
  </table>
</body></html>
```

**Fayl:** `apps/analytics/views_export.py`
```python
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import IsRestaurantAdmin
from apps.analytics.services.reports import (
    parse_period, sales_report, dishes_report, staff_report)
from apps.analytics import export as X


class _Base(APIView):
    permission_classes = [IsAuthenticated, IsRestaurantAdmin]


class SalesXlsxView(_Base):
    def get(self, request):
        s, e, g = parse_period(request.query_params)
        return X.export_sales_xlsx(
            sales_report(request.restaurant_id, s, e, g), request.restaurant.name)


class SalesPdfView(_Base):
    def get(self, request):
        s, e, g = parse_period(request.query_params)
        rep = sales_report(request.restaurant_id, s, e, g)
        return X.export_pdf('admin_panel/pdf/sales_report.html',
                            {'report': rep, 'restaurant': request.restaurant,
                             'now': timezone.localtime()},
                            f'savdo_{s}_{e}.pdf')


class DishesXlsxView(_Base):
    def get(self, request):
        s, e, _ = parse_period(request.query_params)
        return X.export_dishes_xlsx(dishes_report(request.restaurant_id, s, e))


class StaffXlsxView(_Base):
    def get(self, request):
        s, e, _ = parse_period(request.query_params)
        return X.export_staff_xlsx(staff_report(request.restaurant_id, s, e))


class OrdersXlsxView(_Base):
    def get(self, request):
        from apps.orders.views_admin import AdminOrderViewSet
        vs = AdminOrderViewSet()
        vs.request, vs.action, vs.kwargs = request, 'list', {}
        return X.export_orders_xlsx(vs.get_queryset())
```

✅ **Tekshirish:**
```bash
curl -s -H "Authorization: Bearer $ADMIN_JWT" \
  -o /tmp/savdo.xlsx "http://localhost:8060/api/v1/admin/export/sales.xlsx?period=month"
file /tmp/savdo.xlsx   # Microsoft Excel 2007+
curl -s -H "Authorization: Bearer $ADMIN_JWT" \
  -o /tmp/savdo.pdf "http://localhost:8060/api/v1/admin/export/sales.pdf?period=month"
file /tmp/savdo.pdf    # PDF document
```

---

## V-161 — Xodimlar CRUD (rol, PIN, holat)

**Fayl:** `apps/accounts/serializers_staff.py`
```python
import random
from rest_framework import serializers
from django.contrib.auth.hashers import make_password

from apps.accounts.models import StaffUser

ROLES = ('waiter', 'cook', 'cashier', 'manager', 'admin')


class StaffSerializer(serializers.ModelSerializer):
    pin = serializers.CharField(write_only=True, required=False, allow_blank=True,
                                min_length=4, max_length=6)
    pin_preview = serializers.SerializerMethodField()

    class Meta:
        model = StaffUser
        fields = ['id', 'full_name', 'phone', 'role', 'is_active',
                  'pin', 'pin_preview', 'hired_at', 'created_at']
        read_only_fields = ['created_at']

    def get_pin_preview(self, obj):
        return '••••' if obj.pin_hash else ''

    def validate_role(self, v):
        if v not in ROLES:
            raise serializers.ValidationError(f'Rol {ROLES} dan biri bo\'lishi kerak')
        return v

    def validate_phone(self, v):
        # ⚡ Telefon standarti: 998XXXXXXXXX
        digits = ''.join(ch for ch in (v or '') if ch.isdigit())
        if digits and not (len(digits) == 12 and digits.startswith('998')):
            raise serializers.ValidationError('Format: 998XXXXXXXXX')
        return digits

    def _apply_pin(self, instance, pin, rid):
        if not pin:
            return
        # ⚡ PIN restoran ichida NOYOB bo'lishi shart (login shu bilan)
        for u in StaffUser.objects.filter(restaurant_id=rid, is_active=True
                                          ).exclude(pk=instance.pk):
            if u.check_pin(pin):
                raise serializers.ValidationError({'pin': 'Bu PIN band'})
        instance.set_pin(pin)

    def create(self, validated):
        pin = validated.pop('pin', '') or f'{random.randint(1000, 9999)}'
        rid = self.context['request'].restaurant_id
        obj = StaffUser(restaurant_id=rid, **validated)
        self._apply_pin(obj, pin, rid)
        obj.save()
        obj._generated_pin = pin
        return obj

    def update(self, instance, validated):
        pin = validated.pop('pin', '')
        for k, v in validated.items():
            setattr(instance, k, v)
        self._apply_pin(instance, pin, self.context['request'].restaurant_id)
        instance.save()
        return instance

    def to_representation(self, obj):
        d = super().to_representation(obj)
        if getattr(obj, '_generated_pin', None):
            d['generated_pin'] = obj._generated_pin   # faqat yaratishda 1 marta
        return d
```

**Fayl:** `apps/accounts/views_staff.py`
```python
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from core.mixins import TenantScopedMixin, SoftDeleteMixin
from core.exceptions import PlanLimit
from apps.accounts.permissions import IsRestaurantAdmin
from apps.accounts.models import StaffUser
from apps.accounts.serializers_staff import StaffSerializer


class StaffViewSet(TenantScopedMixin, SoftDeleteMixin, viewsets.ModelViewSet):
    """/api/v1/admin/staff/"""
    queryset = StaffUser.objects.order_by('role', 'full_name')
    serializer_class = StaffSerializer
    permission_classes = [IsAuthenticated, IsRestaurantAdmin]

    def get_queryset(self):
        qs = super().get_queryset()
        p = self.request.query_params
        if p.get('role'):
            qs = qs.filter(role=p['role'])
        if p.get('active') in ('0', '1'):
            qs = qs.filter(is_active=p['active'] == '1')
        return qs

    def perform_create(self, serializer):
        # ⚡ Tarif limiti
        r = self.request.restaurant
        used = StaffUser.objects.filter(restaurant_id=r.id, is_active=True).count()
        limit = r.plan_limits.get('staff', 999)
        if used >= limit:
            raise PlanLimit({'staff_limit': limit, 'used': used})
        serializer.save()

    @action(detail=True, methods=['post'])
    def reset_pin(self, request, pk=None):
        import random
        obj = self.get_object()
        pin = f'{random.randint(1000, 9999)}'
        obj.set_pin(pin)
        obj.save(update_fields=['pin_hash'])
        return Response({'pin': pin}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def toggle(self, request, pk=None):
        obj = self.get_object()
        obj.is_active = not obj.is_active
        obj.save(update_fields=['is_active'])
        return Response({'is_active': obj.is_active})
```

**Fayl:** `templates/admin_panel/staff.html`
```html
{% extends "admin_panel/base.html" %}
{% load i18n static %}
{% block title %}{% trans "Xodimlar" %}{% endblock %}
{% block heading %}🧑‍🍳 {% trans "Xodimlar" %}{% endblock %}
{% block content %}
<div class="card" style="margin-bottom:12px;display:flex;gap:8px;align-items:end">
  <div><label class="muted">{% trans "Rol" %}</label><br>
    <select id="st-role">
      <option value="">{% trans "Hammasi" %}</option>
      <option value="waiter">{% trans "Ofitsiant" %}</option>
      <option value="cook">{% trans "Oshpaz" %}</option>
      <option value="cashier">{% trans "Kassir" %}</option>
      <option value="manager">{% trans "Menejer" %}</option>
      <option value="admin">{% trans "Administrator" %}</option>
    </select></div>
  <button class="btn btn-primary" id="st-new">➕ {% trans "Yangi xodim" %}</button>
</div>
<div class="card">
  <table class="grid">
    <thead><tr><th>{% trans "Ism" %}</th><th>{% trans "Telefon" %}</th>
      <th>{% trans "Rol" %}</th><th>PIN</th><th>{% trans "Holat" %}</th><th></th></tr></thead>
    <tbody id="st-body"></tbody>
  </table>
</div>

<div id="st-modal" style="position:fixed;inset:0;background:rgba(0,0,0,.5);
  display:none;align-items:center;justify-content:center;z-index:100;padding:12px">
  <div class="card" style="max-width:420px;width:100%">
    <h3 id="st-title" style="margin-top:0"></h3>
    <div><label class="muted">{% trans "To'liq ism" %}</label><br>
      <input id="st-name" style="width:100%"></div>
    <div style="margin-top:8px"><label class="muted">{% trans "Telefon" %}</label><br>
      <input id="st-phone" style="width:100%" placeholder="998901234567"></div>
    <div style="margin-top:8px"><label class="muted">{% trans "Rol" %}</label><br>
      <select id="st-role2" style="width:100%">
        <option value="waiter">{% trans "Ofitsiant" %}</option>
        <option value="cook">{% trans "Oshpaz" %}</option>
        <option value="cashier">{% trans "Kassir" %}</option>
        <option value="manager">{% trans "Menejer" %}</option>
        <option value="admin">{% trans "Administrator" %}</option>
      </select></div>
    <div style="margin-top:8px"><label class="muted">
      {% trans "PIN (bo'sh qoldirilsa avtomatik)" %}</label><br>
      <input id="st-pin" style="width:100%" maxlength="6" inputmode="numeric"></div>
    <div id="st-err" style="color:var(--danger);font-size:12px;margin-top:6px"></div>
    <div style="display:flex;gap:8px;margin-top:12px">
      <button class="btn btn-primary" id="st-save">{% trans "Saqlash" %}</button>
      <button class="btn" id="st-cancel">{% trans "Bekor qilish" %}</button>
    </div>
  </div>
</div>
{% endblock %}
{% block extra_js %}<script src="{% static 'admin/js/staff.js' %}?v=1"></script>{% endblock %}
```

**Fayl:** `static/admin/js/staff.js`
```javascript
(function () {
  'use strict';
  const $ = s => document.querySelector(s), A = window.ARMENU;
  let editId = null;

  function fmtPhone(p) {
    if (!p || p.length !== 12) return p || '—';
    return `+${p.slice(0,3)} ${p.slice(3,5)} ${p.slice(5,8)} ${p.slice(8,10)} ${p.slice(10)}`;
  }

  async function load() {
    const role = $('#st-role').value;
    const d = await A.api.get('/api/v1/admin/staff/' + (role ? '?role=' + role : ''));
    $('#st-body').innerHTML = (d.results || d).map(s => `
      <tr><td>${s.full_name}</td><td>${fmtPhone(s.phone)}</td>
        <td>${A.t('role.' + s.role)}</td><td class="muted">${s.pin_preview || '—'}</td>
        <td><span class="badge" style="color:var(--${s.is_active ? 'success' : 'danger'})">
          ${s.is_active ? A.t('common.active') : A.t('common.inactive')}</span></td>
        <td style="text-align:right;white-space:nowrap">
          <button class="btn" data-edit="${s.id}">✏️</button>
          <button class="btn" data-pin="${s.id}">🔑</button>
          <button class="btn" data-tog="${s.id}">${s.is_active ? '⏸' : '▶️'}</button>
        </td></tr>`).join('');

    $('#st-body').querySelectorAll('[data-edit]').forEach(b =>
      b.addEventListener('click', () => openEdit((d.results || d)
        .find(x => x.id == b.dataset.edit))));
    $('#st-body').querySelectorAll('[data-pin]').forEach(b =>
      b.addEventListener('click', async () => {
        const r = await A.api.post(`/api/v1/admin/staff/${b.dataset.pin}/reset_pin/`, {});
        alert(A.t('staff.new_pin', { pin: r.pin }));
      }));
    $('#st-body').querySelectorAll('[data-tog]').forEach(b =>
      b.addEventListener('click', async () => {
        await A.api.post(`/api/v1/admin/staff/${b.dataset.tog}/toggle/`, {});
        load();
      }));
  }

  function openEdit(s) {
    editId = s ? s.id : null;
    $('#st-title').textContent = s ? A.t('staff.edit') : A.t('staff.new');
    $('#st-name').value = s ? s.full_name : '';
    $('#st-phone').value = s ? s.phone : '';
    $('#st-role2').value = s ? s.role : 'waiter';
    $('#st-pin').value = '';
    $('#st-err').textContent = '';
    $('#st-modal').style.display = 'flex';
  }

  async function save() {
    const body = {
      full_name: $('#st-name').value.trim(),
      phone: $('#st-phone').value.replace(/\D/g, ''),
      role: $('#st-role2').value,
    };
    const pin = $('#st-pin').value.trim();
    if (pin) body.pin = pin;
    try {
      const r = editId
        ? await A.api.patch(`/api/v1/admin/staff/${editId}/`, body)
        : await A.api.post('/api/v1/admin/staff/', body);
      if (r.generated_pin) alert(A.t('staff.new_pin', { pin: r.generated_pin }));
      $('#st-modal').style.display = 'none';
      load();
    } catch (e) {
      $('#st-err').textContent = e.error ? e.error.message : JSON.stringify(e);
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await A.ready;
    $('#st-role').addEventListener('change', load);
    $('#st-new').addEventListener('click', () => openEdit(null));
    $('#st-save').addEventListener('click', save);
    $('#st-cancel').addEventListener('click', () => $('#st-modal').style.display = 'none');
    load();
  });
})();
```

✅ **Test:** `tests/test_staff_crud.py`
```python
def test_duplicate_pin_rejected(api_client, admin_user, restaurant):
    api_client.force_authenticate(admin_user)
    r1 = api_client.post('/api/v1/admin/staff/',
                         {'full_name': 'Aziz', 'role': 'waiter', 'pin': '1234'}, format='json')
    assert r1.status_code == 201
    r2 = api_client.post('/api/v1/admin/staff/',
                         {'full_name': 'Bobur', 'role': 'cook', 'pin': '1234'}, format='json')
    assert r2.status_code == 400


def test_phone_normalized(api_client, admin_user):
    api_client.force_authenticate(admin_user)
    r = api_client.post('/api/v1/admin/staff/',
                        {'full_name': 'X', 'role': 'waiter',
                         'phone': '+998 90 123 45 67'}, format='json')
    assert r.data['phone'] == '998901234567'


def test_delete_is_soft(api_client, admin_user, restaurant):
    from apps.accounts.models import StaffUser
    api_client.force_authenticate(admin_user)
    r = api_client.post('/api/v1/admin/staff/',
                        {'full_name': 'Y', 'role': 'cook'}, format='json')
    api_client.delete(f'/api/v1/admin/staff/{r.data["id"]}/')
    assert StaffUser.objects.filter(id=r.data['id'], is_active=False).exists()
```

✅ **Tekshirish:** yangi xodim yaratilsa PIN bir marta ko'rsatiladi; PIN takrorlansa xato.

---

## V-162 — Sozlamalar sahifasi

**Fayl:** `apps/tenants/serializers_settings.py`
```python
from rest_framework import serializers
from apps.tenants.models import Restaurant

WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']


class RestaurantSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Restaurant
        fields = [
            'name', 'slug', 'phone', 'city', 'address',
            'currency', 'service_fee_pct', 'default_lang', 'enabled_langs',
            'work_hours', 'timezone',
            'order_auto_accept', 'require_guest_phone', 'allow_guest_call',
            'kds_enabled', 'tips_enabled', 'reviews_enabled', 'chatbot_enabled',
            'ar_enabled', 'menu_version',
        ]
        read_only_fields = ['slug', 'menu_version']

    def validate_service_fee_pct(self, v):
        if not (0 <= float(v) <= 30):
            raise serializers.ValidationError('0 … 30 % oralig\'ida bo\'lsin')
        return v

    def validate_enabled_langs(self, v):
        allowed = {'uz', 'ru', 'en'}
        if not isinstance(v, list) or not v:
            raise serializers.ValidationError('Kamida 1 ta til tanlang')
        bad = set(v) - allowed
        if bad:
            raise serializers.ValidationError(f'Noma\'lum til: {bad}')
        return v

    def validate_work_hours(self, v):
        """{"mon": ["09:00","23:00"], ...} yoki {"mon": null} = dam olish"""
        if not isinstance(v, dict):
            raise serializers.ValidationError('obyekt bo\'lishi kerak')
        for day, val in v.items():
            if day not in WEEKDAYS:
                raise serializers.ValidationError(f'Noma\'lum kun: {day}')
            if val is None:
                continue
            if not (isinstance(val, list) and len(val) == 2):
                raise serializers.ValidationError(f'{day}: ["HH:MM","HH:MM"] kutildi')
            for t in val:
                h, _, m = str(t).partition(':')
                if not (h.isdigit() and m.isdigit() and 0 <= int(h) <= 23 and 0 <= int(m) <= 59):
                    raise serializers.ValidationError(f'{day}: vaqt formati HH:MM')
        return v

    def update(self, instance, validated):
        obj = super().update(instance, validated)
        from core.cache import bump_menu_version
        bump_menu_version(obj.id)      # ⚡ sozlama o'zgarsa menyu keshi eskiradi
        return obj
```

**Fayl:** `apps/tenants/views_settings.py`
```python
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import IsRestaurantAdmin
from apps.tenants.serializers_settings import RestaurantSettingsSerializer


class RestaurantSettingsView(RetrieveUpdateAPIView):
    """GET/PATCH /api/v1/admin/settings/"""
    serializer_class = RestaurantSettingsSerializer
    permission_classes = [IsAuthenticated, IsRestaurantAdmin]

    def get_object(self):
        return self.request.restaurant
```

**Fayl:** `templates/admin_panel/settings.html`
```html
{% extends "admin_panel/base.html" %}
{% load i18n static %}
{% block title %}{% trans "Sozlamalar" %}{% endblock %}
{% block heading %}⚙️ {% trans "Sozlamalar" %}{% endblock %}
{% block content %}
<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
  <div class="card">
    <h3 style="margin-top:0">{% trans "Asosiy" %}</h3>
    <div><label class="muted">{% trans "Restoran nomi" %}</label><br>
      <input id="s-name" style="width:100%"></div>
    <div style="margin-top:8px"><label class="muted">{% trans "Telefon" %}</label><br>
      <input id="s-phone" style="width:100%"></div>
    <div style="margin-top:8px"><label class="muted">{% trans "Manzil" %}</label><br>
      <input id="s-address" style="width:100%"></div>
    <div style="margin-top:8px"><label class="muted">{% trans "Xizmat haqi (%)" %}</label><br>
      <input type="number" id="s-fee" min="0" max="30" step="0.5" style="width:100%"></div>
  </div>

  <div class="card">
    <h3 style="margin-top:0">{% trans "Tillar" %}</h3>
    <label><input type="checkbox" class="s-lang" value="uz"> 🇺🇿 O'zbek</label><br>
    <label><input type="checkbox" class="s-lang" value="ru"> 🇷🇺 Русский</label><br>
    <label><input type="checkbox" class="s-lang" value="en"> 🇬🇧 English</label>
    <div style="margin-top:8px"><label class="muted">{% trans "Asosiy til" %}</label><br>
      <select id="s-deflang" style="width:100%">
        <option value="uz">O'zbek</option><option value="ru">Русский</option>
        <option value="en">English</option></select></div>
  </div>

  <div class="card">
    <h3 style="margin-top:0">{% trans "Ish vaqti" %}</h3>
    <table class="grid" id="s-hours"></table>
  </div>

  <div class="card">
    <h3 style="margin-top:0">{% trans "Funksiyalar" %}</h3>
    <label><input type="checkbox" id="s-autoaccept"> {% trans "Buyurtmani avto-qabul qilish" %}</label><br>
    <label><input type="checkbox" id="s-phone-req"> {% trans "Mijoz telefonini so'rash" %}</label><br>
    <label><input type="checkbox" id="s-call"> {% trans "Ofitsiant chaqirish" %}</label><br>
    <label><input type="checkbox" id="s-kds"> {% trans "Oshxona monitori (KDS)" %}</label><br>
    <label><input type="checkbox" id="s-tips"> {% trans "Choychaqa (tips)" %}</label><br>
    <label><input type="checkbox" id="s-reviews"> {% trans "Otziv va reyting" %}</label><br>
    <label><input type="checkbox" id="s-chatbot"> {% trans "AI chatbot" %}</label><br>
    <label><input type="checkbox" id="s-ar"> {% trans "AR / 3D ko'rish" %}</label>
  </div>
</div>

<div style="margin-top:12px;display:flex;gap:8px;align-items:center">
  <button class="btn btn-primary" id="s-save">💾 {% trans "Saqlash" %}</button>
  <span id="s-status" class="muted"></span>
</div>
{% endblock %}
{% block extra_js %}<script src="{% static 'admin/js/settings.js' %}?v=1"></script>{% endblock %}
```

**Fayl:** `static/admin/js/settings.js`
```javascript
(function () {
  'use strict';
  const $ = s => document.querySelector(s), A = window.ARMENU;
  const DAYS = ['mon','tue','wed','thu','fri','sat','sun'];
  const URL = '/api/v1/admin/settings/';

  function renderHours(wh) {
    $('#s-hours').innerHTML = DAYS.map(d => {
      const v = wh[d];
      return `<tr><td>${A.t('day.' + d)}</td>
        <td><input type="time" data-d="${d}" data-i="0" value="${v ? v[0] : '09:00'}"></td>
        <td><input type="time" data-d="${d}" data-i="1" value="${v ? v[1] : '23:00'}"></td>
        <td><label><input type="checkbox" data-off="${d}" ${v ? '' : 'checked'}>
          ${A.t('day.off')}</label></td></tr>`;
    }).join('');
  }

  function collectHours() {
    const wh = {};
    DAYS.forEach(d => {
      const off = $(`[data-off="${d}"]`).checked;
      if (off) { wh[d] = null; return; }
      wh[d] = [$(`[data-d="${d}"][data-i="0"]`).value,
               $(`[data-d="${d}"][data-i="1"]`).value];
    });
    return wh;
  }

  async function load() {
    const d = await A.api.get(URL);
    $('#s-name').value = d.name || '';
    $('#s-phone').value = d.phone || '';
    $('#s-address').value = d.address || '';
    $('#s-fee').value = d.service_fee_pct || 0;
    $('#s-deflang').value = d.default_lang || 'uz';
    document.querySelectorAll('.s-lang').forEach(c =>
      c.checked = (d.enabled_langs || ['uz']).includes(c.value));
    renderHours(d.work_hours || {});
    const map = { 's-autoaccept': 'order_auto_accept', 's-phone-req': 'require_guest_phone',
      's-call': 'allow_guest_call', 's-kds': 'kds_enabled', 's-tips': 'tips_enabled',
      's-reviews': 'reviews_enabled', 's-chatbot': 'chatbot_enabled', 's-ar': 'ar_enabled' };
    for (const id in map) $('#' + id).checked = !!d[map[id]];
  }

  async function save() {
    const langs = Array.from(document.querySelectorAll('.s-lang:checked')).map(c => c.value);
    if (!langs.length) { $('#s-status').textContent = '⛔ ' + A.t('settings.need_lang'); return; }
    const body = {
      name: $('#s-name').value.trim(),
      phone: $('#s-phone').value.replace(/\D/g, ''),
      address: $('#s-address').value.trim(),
      service_fee_pct: parseFloat($('#s-fee').value) || 0,
      enabled_langs: langs,
      default_lang: $('#s-deflang').value,
      work_hours: collectHours(),
      order_auto_accept: $('#s-autoaccept').checked,
      require_guest_phone: $('#s-phone-req').checked,
      allow_guest_call: $('#s-call').checked,
      kds_enabled: $('#s-kds').checked,
      tips_enabled: $('#s-tips').checked,
      reviews_enabled: $('#s-reviews').checked,
      chatbot_enabled: $('#s-chatbot').checked,
      ar_enabled: $('#s-ar').checked,
    };
    $('#s-status').textContent = A.t('common.loading');
    try {
      await A.api.patch(URL, body);
      $('#s-status').textContent = '✅ ' + A.t('common.saved');
    } catch (e) {
      $('#s-status').textContent = '⛔ ' + JSON.stringify(e);
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await A.ready; await load();
    $('#s-save').addEventListener('click', save);
  });
})();
```

✅ **Tekshirish:** sozlama saqlangach `menu_version` oshadi (mijoz keshi yangilanadi);
barcha tillar o'chirilsa xato beradi.

---

## V-163 — Brending (logo + rang + shrift)

**Fayl:** `apps/tenants/views_branding.py`
```python
import io
from PIL import Image

from django.core.files.base import ContentFile
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError

from apps.accounts.permissions import IsRestaurantAdmin

MAX_LOGO_BYTES = 2 * 1024 * 1024
ALLOWED_FORMATS = {'PNG', 'JPEG', 'WEBP'}
HEX = set('0123456789abcdefABCDEF')
FONTS = {'system', 'inter', 'manrope', 'golos', 'roboto'}


def _hex_ok(v):
    return (isinstance(v, str) and len(v) == 7 and v[0] == '#'
            and all(c in HEX for c in v[1:]))


class BrandingView(APIView):
    """
    GET   /api/v1/admin/branding/
    PATCH /api/v1/admin/branding/           (ranglar, shrift)
    POST  /api/v1/admin/branding/logo/      (multipart)
    """
    permission_classes = [IsAuthenticated, IsRestaurantAdmin]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        r = request.restaurant
        return Response({
            'logo': r.logo.url if r.logo else None,
            'cover': r.cover.url if r.cover else None,
            'brand_color': r.brand_color or '#2f6df6',
            'brand_color_dark': r.brand_color_dark or '#5b8cff',
            'font': r.brand_font or 'system',
            'show_powered_by': r.show_powered_by,
        })

    def patch(self, request):
        r = request.restaurant
        d = request.data
        fields = []
        for key, attr in (('brand_color', 'brand_color'),
                          ('brand_color_dark', 'brand_color_dark')):
            if key in d:
                if not _hex_ok(d[key]):
                    raise ValidationError({key: '#RRGGBB formatida bo\'lsin'})
                setattr(r, attr, d[key]); fields.append(attr)
        if 'font' in d:
            if d['font'] not in FONTS:
                raise ValidationError({'font': f'{sorted(FONTS)} dan biri'})
            r.brand_font = d['font']; fields.append('brand_font')
        if 'show_powered_by' in d:
            # ⚡ Faqat Pro+ tarifda o'chirish mumkin
            want = str(d['show_powered_by']).lower() in ('1', 'true', 'yes')
            if not want and r.plan not in ('pro', 'premium'):
                from core.exceptions import PlanLimit
                raise PlanLimit({'feature': 'white_label'})
            r.show_powered_by = want; fields.append('show_powered_by')
        if fields:
            r.save(update_fields=fields)
            from core.cache import bump_menu_version
            bump_menu_version(r.id)
        return self.get(request)


class BrandingLogoView(APIView):
    permission_classes = [IsAuthenticated, IsRestaurantAdmin]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        f = request.FILES.get('file')
        kind = request.data.get('kind', 'logo')
        if kind not in ('logo', 'cover'):
            raise ValidationError({'kind': 'logo yoki cover'})
        if not f:
            raise ValidationError({'file': 'fayl yuborilmadi'})
        if f.size > MAX_LOGO_BYTES:
            raise ValidationError({'file': 'maksimum 2 MB'})

        try:
            img = Image.open(f)
            img.verify()
            f.seek(0)
            img = Image.open(f)
        except Exception:
            raise ValidationError({'file': 'rasm o\'qilmadi'})
        if img.format not in ALLOWED_FORMATS:
            raise ValidationError({'file': 'faqat PNG / JPEG / WEBP'})

        # ⚡ Qayta kodlash — EXIF va zararli metadata tashlanadi
        img = img.convert('RGBA' if img.mode in ('RGBA', 'LA') else 'RGB')
        max_side = 512 if kind == 'logo' else 1600
        img.thumbnail((max_side, max_side), Image.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format='WEBP', quality=88, method=5)

        r = request.restaurant
        field = getattr(r, kind)
        field.save(f'{kind}_{r.slug}.webp', ContentFile(buf.getvalue()), save=True)
        from core.cache import bump_menu_version
        bump_menu_version(r.id)
        return Response({'url': field.url, 'kind': kind})
```

**Fayl:** `templates/admin_panel/branding.html`
```html
{% extends "admin_panel/base.html" %}
{% load i18n static %}
{% block title %}{% trans "Brending" %}{% endblock %}
{% block heading %}🎨 {% trans "Brending" %}{% endblock %}
{% block content %}
<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
  <div class="card">
    <h3 style="margin-top:0">{% trans "Logo" %}</h3>
    <img id="b-logo" alt="" style="max-width:140px;max-height:140px;
      border-radius:10px;border:1px solid var(--border);background:var(--surface-2)">
    <div style="margin-top:8px">
      <input type="file" id="b-logo-file" accept="image/png,image/jpeg,image/webp">
      <p class="muted" style="font-size:12px">{% trans "PNG / JPEG / WEBP, maks 2 MB" %}</p>
    </div>
  </div>

  <div class="card">
    <h3 style="margin-top:0">{% trans "Muqova" %}</h3>
    <img id="b-cover" alt="" style="max-width:100%;max-height:140px;object-fit:cover;
      border-radius:10px;border:1px solid var(--border);background:var(--surface-2)">
    <div style="margin-top:8px">
      <input type="file" id="b-cover-file" accept="image/png,image/jpeg,image/webp">
    </div>
  </div>

  <div class="card">
    <h3 style="margin-top:0">{% trans "Ranglar" %}</h3>
    <div><label class="muted">{% trans "Asosiy rang (light tema)" %}</label><br>
      <input type="color" id="b-color"> <span id="b-color-hex" class="muted"></span></div>
    <div style="margin-top:8px"><label class="muted">{% trans "Asosiy rang (dark tema)" %}</label><br>
      <input type="color" id="b-color-dark"> <span id="b-color-dark-hex" class="muted"></span></div>
    <div style="margin-top:8px"><label class="muted">{% trans "Shrift" %}</label><br>
      <select id="b-font">
        <option value="system">{% trans "Tizim shrifti" %}</option>
        <option value="inter">Inter</option><option value="manrope">Manrope</option>
        <option value="golos">Golos Text</option><option value="roboto">Roboto</option>
      </select></div>
    <div style="margin-top:8px">
      <label><input type="checkbox" id="b-powered">
        {% trans "«ARMENU tomonidan» yozuvini ko'rsatish" %}</label>
      <p class="muted" style="font-size:12px">{% trans "O'chirish — Pro tarifdan" %}</p>
    </div>
    <button class="btn btn-primary" id="b-save" style="margin-top:10px">
      💾 {% trans "Saqlash" %}</button>
    <span id="b-status" class="muted"></span>
  </div>

  <div class="card">
    <h3 style="margin-top:0">{% trans "Ko'rinish" %}</h3>
    <div id="b-preview" style="border:1px solid var(--border);border-radius:10px;
      padding:14px;background:var(--surface-2)">
      <div style="display:flex;gap:10px;align-items:center">
        <img id="b-prev-logo" style="width:40px;height:40px;border-radius:8px;object-fit:cover">
        <strong id="b-prev-name">{{ request.restaurant.name }}</strong>
      </div>
      <button id="b-prev-btn" style="margin-top:10px;padding:9px 14px;border:none;
        border-radius:8px;color:#fff;font-weight:600">
        {% trans "Buyurtma berish" %}</button>
    </div>
  </div>
</div>
{% endblock %}
{% block extra_js %}
<script>
(function () {
  const $ = s => document.querySelector(s), A = window.ARMENU;
  const URL = '/api/v1/admin/branding/';

  function preview() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    const c = dark ? $('#b-color-dark').value : $('#b-color').value;
    $('#b-prev-btn').style.background = c;
    $('#b-color-hex').textContent = $('#b-color').value;
    $('#b-color-dark-hex').textContent = $('#b-color-dark').value;
  }

  async function load() {
    const d = await A.api.get(URL);
    if (d.logo) { $('#b-logo').src = d.logo; $('#b-prev-logo').src = d.logo; }
    if (d.cover) $('#b-cover').src = d.cover;
    $('#b-color').value = d.brand_color;
    $('#b-color-dark').value = d.brand_color_dark;
    $('#b-font').value = d.font;
    $('#b-powered').checked = d.show_powered_by;
    preview();
  }

  async function upload(kind, input) {
    const f = input.files[0]; if (!f) return;
    const fd = new FormData(); fd.append('file', f); fd.append('kind', kind);
    const csrf = (document.cookie.match(/csrftoken=([^;]+)/) || [])[1] || '';
    const r = await fetch(URL + 'logo/', { method: 'POST', body: fd,
      credentials: 'same-origin', headers: { 'X-CSRFToken': csrf } });
    const d = await r.json();
    if (!r.ok) { $('#b-status').textContent = '⛔ ' + JSON.stringify(d); return; }
    $('#b-' + kind).src = d.url + '?t=' + Date.now();
    if (kind === 'logo') $('#b-prev-logo').src = d.url + '?t=' + Date.now();
    $('#b-status').textContent = '✅ ' + A.t('common.saved');
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await A.ready; await load();
    ['b-color', 'b-color-dark'].forEach(id =>
      $('#' + id).addEventListener('input', preview));
    $('#b-logo-file').addEventListener('change', e => upload('logo', e.target));
    $('#b-cover-file').addEventListener('change', e => upload('cover', e.target));
    $('#b-save').addEventListener('click', async () => {
      try {
        await A.api.patch(URL, {
          brand_color: $('#b-color').value,
          brand_color_dark: $('#b-color-dark').value,
          font: $('#b-font').value,
          show_powered_by: $('#b-powered').checked
        });
        $('#b-status').textContent = '✅ ' + A.t('common.saved');
      } catch (e) {
        $('#b-status').textContent = '⛔ ' + (e.error ? e.error.message : JSON.stringify(e));
      }
    });
  });
})();
</script>
{% endblock %}
```

✅ **Test:** `tests/test_branding.py`
```python
import io
from PIL import Image


def _png(size=(64, 64)):
    buf = io.BytesIO()
    Image.new('RGB', size, (200, 30, 30)).save(buf, format='PNG')
    buf.seek(0); buf.name = 'logo.png'
    return buf


def test_logo_reencoded_to_webp(api_client, admin_user, restaurant):
    api_client.force_authenticate(admin_user)
    r = api_client.post('/api/v1/admin/branding/logo/',
                        {'file': _png(), 'kind': 'logo'}, format='multipart')
    assert r.status_code == 200
    assert r.data['url'].endswith('.webp')


def test_bad_color_rejected(api_client, admin_user):
    api_client.force_authenticate(admin_user)
    r = api_client.patch('/api/v1/admin/branding/',
                         {'brand_color': 'red'}, format='json')
    assert r.status_code == 400


def test_white_label_requires_pro(api_client, admin_user, restaurant):
    restaurant.plan = 'start'; restaurant.save()
    api_client.force_authenticate(admin_user)
    r = api_client.patch('/api/v1/admin/branding/',
                         {'show_powered_by': False}, format='json')
    assert r.status_code == 402
```

✅ **Tekshirish:** logo yuklangach WEBP ga aylanadi va menyuda ko'rinadi;
Start tarifda "powered by" o'chirilmaydi (402).

---

## V-164 — ⚡ A-15 Tarjima boshqaruvi (3 ustunli jadval)

**Fayl:** `apps/i18n_admin/services.py`
```python
"""Restoran kontenti (taom, kategoriya, modifikator, zal) tarjima holati."""

TRANSLATABLE = [
    # (model_path, kod, tarjima qilinadigan maydonlar)
    ('apps.menu.models.Dish',      'dish',     ['name', 'desc']),
    ('apps.menu.models.Category',  'category', ['name']),
    ('apps.menu.models.Modifier',  'modifier', ['name']),
    ('apps.tables.models.FloorPlan', 'floorplan', ['name']),
]
LANGS = ['uz', 'ru', 'en']


def _model(path):
    from django.apps import apps as dj
    mod, _, cls = path.rpartition('.')
    from importlib import import_module
    return getattr(import_module(mod), cls)


def collect_rows(restaurant_id, entity=None, only_missing=False, lang=None):
    """3 ustunli jadval uchun qatorlar."""
    rows = []
    for path, code, fields in TRANSLATABLE:
        if entity and entity != code:
            continue
        Model = _model(path)
        qs = Model.objects.filter(restaurant_id=restaurant_id)
        if hasattr(Model, 'is_active'):
            qs = qs.filter(is_active=True)
        for obj in qs.order_by('id'):
            auto = getattr(obj, 'tr_auto', {}) or {}
            approved = getattr(obj, 'tr_approved', {}) or {}
            for f in fields:
                values = {L: (getattr(obj, f'{f}_{L}', '') or '') for L in LANGS}
                missing = [L for L in LANGS if not values[L]]
                if only_missing and not missing:
                    continue
                if lang and values.get(lang):
                    continue
                rows.append({
                    'entity': code, 'object_id': obj.id, 'field': f,
                    'label': getattr(obj, f'{f}_uz', '') or f'#{obj.id}',
                    'values': values,
                    'missing': missing,
                    'auto': {L: bool(auto.get(f'{f}_{L}')) for L in LANGS},
                    'approved': {L: bool(approved.get(f'{f}_{L}')) for L in LANGS},
                })
    return rows


def coverage(restaurant_id) -> dict:
    """Har til uchun to'ldirilganlik foizi (A-15 yuqorisidagi holat qatori)."""
    rows = collect_rows(restaurant_id)
    total = len(rows) or 1
    return {L: round(sum(1 for r in rows if r['values'][L]) / total * 100)
            for L in LANGS} | {'total_fields': len(rows)}


def apply_translation(restaurant_id, entity, object_id, field, lang, value,
                      is_auto=False, approved=False):
    """Bitta maydonni yozadi + auto/approved belgisini yangilaydi."""
    from django.db import transaction
    path = next(p for p, c, _ in TRANSLATABLE if c == entity)
    Model = _model(path)
    with transaction.atomic():
        obj = Model.objects.select_for_update().get(
            id=object_id, restaurant_id=restaurant_id)   # ⚡ tenant tekshiruvi
        setattr(obj, f'{field}_{lang}', value)
        key = f'{field}_{lang}'
        if hasattr(obj, 'tr_auto'):
            d = dict(obj.tr_auto or {})
            if is_auto:
                d[key] = True
            else:
                d.pop(key, None)
            obj.tr_auto = d
        if hasattr(obj, 'tr_approved'):
            a = dict(obj.tr_approved or {})
            if approved:
                a[key] = True
            else:
                a.pop(key, None)
            obj.tr_approved = a
        obj.save()
    from core.cache import bump_menu_version
    bump_menu_version(restaurant_id)
    return obj
```

**Fayl:** `apps/i18n_admin/views.py`
```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError

from apps.accounts.permissions import IsRestaurantAdmin
from apps.i18n_admin.services import collect_rows, coverage, apply_translation, LANGS


class TranslationListView(APIView):
    """GET /api/v1/admin/i18n/?entity=dish&only_missing=1"""
    permission_classes = [IsAuthenticated, IsRestaurantAdmin]

    def get(self, request):
        rid = request.restaurant_id
        p = request.query_params
        rows = collect_rows(rid, entity=p.get('entity') or None,
                            only_missing=p.get('only_missing') == '1',
                            lang=p.get('lang') or None)
        return Response({'coverage': coverage(rid), 'rows': rows[:1000],
                         'total': len(rows)})


class TranslationSaveView(APIView):
    """POST /api/v1/admin/i18n/save/ — qo'lda tahrir yoki AI natijasini tasdiqlash"""
    permission_classes = [IsAuthenticated, IsRestaurantAdmin]

    def post(self, request):
        d = request.data
        for k in ('entity', 'object_id', 'field', 'lang'):
            if k not in d:
                raise ValidationError({k: 'majburiy'})
        if d['lang'] not in LANGS:
            raise ValidationError({'lang': f'{LANGS} dan biri'})
        apply_translation(request.restaurant_id, d['entity'], int(d['object_id']),
                          d['field'], d['lang'], (d.get('value') or '').strip()[:2000],
                          is_auto=False, approved=bool(d.get('approved', True)))
        return Response({'ok': True})
```

**Fayl:** `templates/admin_panel/i18n.html`
```html
{% extends "admin_panel/base.html" %}
{% load i18n static %}
{% block title %}{% trans "Tarjimalar" %}{% endblock %}
{% block heading %}🌐 {% trans "Tarjima boshqaruvi" %}{% endblock %}
{% block extra_css %}
<style>
  .tr-cell textarea { width:100%; min-height:38px; resize:vertical; }
  .tr-auto { border-left:3px solid var(--warning) !important; }
  .tr-bar { display:flex; gap:14px; align-items:center; flex-wrap:wrap; }
  .tr-bar b { font-size:13px; }
</style>
{% endblock %}
{% block content %}
<div class="card tr-bar" style="margin-bottom:12px">
  <span>{% trans "Holat" %}:</span>
  <b>🇺🇿 <span id="cov-uz">—</span>%</b>
  <b>🇷🇺 <span id="cov-ru">—</span>%</b>
  <b>🇬🇧 <span id="cov-en">—</span>%</b>
  <select id="tr-entity">
    <option value="">{% trans "Hammasi" %}</option>
    <option value="dish">{% trans "Taomlar" %}</option>
    <option value="category">{% trans "Kategoriyalar" %}</option>
    <option value="modifier">{% trans "Modifikatorlar" %}</option>
    <option value="floorplan">{% trans "Zallar" %}</option>
  </select>
  <label><input type="checkbox" id="tr-missing"> {% trans "Faqat bo'sh" %}</label>
  <button class="btn" id="tr-reload">{% trans "Yangilash" %}</button>
  <span style="flex:1"></span>
  <select id="tr-target">
    <option value="ru">🇷🇺 {% trans "Rus" %}</option>
    <option value="en">🇬🇧 {% trans "Ingliz" %}</option>
    <option value="uz">🇺🇿 {% trans "O'zbek" %}</option>
  </select>
  <button class="btn btn-primary" id="tr-ai">🤖 {% trans "AI bilan to'ldirish" %}</button>
</div>

<div class="card">
  <table class="grid">
    <thead><tr>
      <th style="width:16%">{% trans "Obyekt" %}</th>
      <th style="width:28%">🇺🇿 {% trans "O'zbek" %}</th>
      <th style="width:28%">🇷🇺 {% trans "Rus" %}</th>
      <th style="width:28%">🇬🇧 {% trans "Ingliz" %}</th>
    </tr></thead>
    <tbody id="tr-body"></tbody>
  </table>
</div>
<div id="tr-status" class="muted" style="padding:8px"></div>
{% endblock %}
{% block extra_js %}<script src="{% static 'admin/js/i18n_admin.js' %}?v=1"></script>{% endblock %}
```

**Fayl:** `static/admin/js/i18n_admin.js`
```javascript
(function () {
  'use strict';
  const $ = s => document.querySelector(s), A = window.ARMENU;
  const LANGS = ['uz', 'ru', 'en'];

  function cell(r, L) {
    const val = r.values[L] || '';
    const cls = r.auto[L] && !r.approved[L] ? 'tr-cell tr-auto' : 'tr-cell';
    const mark = r.auto[L] && !r.approved[L] ? '⚠️' : (val ? '✅' : '');
    return `<td class="${cls}">
      <textarea data-e="${r.entity}" data-o="${r.object_id}"
        data-f="${r.field}" data-l="${L}">${val.replace(/</g, '&lt;')}</textarea>
      <div style="font-size:11px;color:var(--fg-muted)">${mark}</div></td>`;
  }

  async function load() {
    const p = new URLSearchParams();
    if ($('#tr-entity').value) p.set('entity', $('#tr-entity').value);
    if ($('#tr-missing').checked) p.set('only_missing', '1');
    const d = await A.api.get('/api/v1/admin/i18n/?' + p.toString());
    LANGS.forEach(L => $('#cov-' + L).textContent = d.coverage[L]);
    $('#tr-body').innerHTML = d.rows.map(r => `
      <tr><td><div>${r.label}</div>
        <div class="muted" style="font-size:11px">${A.t('i18n.' + r.entity)} · ${r.field}</div></td>
        ${LANGS.map(L => cell(r, L)).join('')}</tr>`).join('')
      || `<tr><td colspan="4" class="muted">${A.t('common.no_data')}</td></tr>`;

    $('#tr-body').querySelectorAll('textarea').forEach(ta => {
      ta.addEventListener('change', async () => {
        ta.disabled = true;
        try {
          await A.api.post('/api/v1/admin/i18n/save/', {
            entity: ta.dataset.e, object_id: ta.dataset.o,
            field: ta.dataset.f, lang: ta.dataset.l,
            value: ta.value, approved: true
          });
          ta.parentElement.classList.remove('tr-auto');
          ta.nextElementSibling.textContent = '✅';
        } catch (e) {
          ta.nextElementSibling.textContent = '⛔';
        }
        ta.disabled = false;
      });
    });
    $('#tr-status').textContent = A.t('i18n.rows', { n: d.total });
  }

  async function aiFill() {
    const lang = $('#tr-target').value;
    $('#tr-ai').disabled = true;
    $('#tr-status').textContent = A.t('i18n.ai_running');
    try {
      const r = await A.api.post('/api/v1/admin/i18n/auto-translate/',
        { target_lang: lang, entity: $('#tr-entity').value || null });
      $('#tr-status').textContent = A.t('i18n.ai_done',
        { n: r.translated, failed: r.failed });
      await load();
    } catch (e) {
      $('#tr-status').textContent = '⛔ ' + (e.error ? e.error.message : JSON.stringify(e));
    }
    $('#tr-ai').disabled = false;
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await A.ready;
    $('#tr-reload').addEventListener('click', load);
    $('#tr-entity').addEventListener('change', load);
    $('#tr-missing').addEventListener('change', load);
    $('#tr-ai').addEventListener('click', aiFill);
    load();
  });
})();
```

> ⚡ `🤖 AI bilan to'ldirish` tugmasining backend'i — **V-165**.

✅ **Tekshirish:** jadval 3 ustunda ochiladi; matn tahrirlanib fokusdan chiqilsa
avtomatik saqlanadi; AI tarjimasi (⚠️ sariq chiziq) tasdiqlangach ✅ bo'ladi.

---

## V-165 — ⚡ "🤖 AI bilan to'ldirish" — navbat + progress

> ⚠️ **MUHIM:** MCP qatlami (`apps.ai`) **FAZA 9** da yoziladi. Bu yerda faqat
> **navbatga qo'yish**, **progress kuzatish** va **natijani ko'rsatish** bor.
> `apps.ai` hali yo'q bo'lsa — tugma "FAZA 9 dan keyin faollashadi" holatida qoladi
> (endpoint 501 qaytaradi, UI buni chiroyli ko'rsatadi). Kodda aniq izoh qo'yilgan.

**Fayl:** `apps/i18n_admin/tasks.py`
```python
"""
Avto-tarjima navbati.

⚡ Ish taqsimoti:
  - BU FAZA (8): bo'sh maydonlarni yig'ish, Job yaratish, progress, WS.
  - FAZA 9 (V-185): `apps.ai.services.translate.translate_batch` yoziladi va
    shu yerdagi `_translate_batch()` uni chaqiradi.
Agar apps.ai hali mavjud bo'lmasa — AI_AVAILABLE=False va navbat 501 bilan rad etiladi.
"""
import logging

from core.queue import enqueue
from core.ws import ws_send, g_admin
from apps.i18n_admin.services import collect_rows, apply_translation, LANGS

log = logging.getLogger('i18n.auto')

BATCH = 50


def ai_available() -> bool:
    """FAZA 9 tugagach True bo'ladi."""
    try:
        from apps.ai.services.translate import translate_batch  # noqa: F401
        return True
    except Exception:
        return False


def queue_auto_translate(restaurant_id: int, target_lang: str, entity=None) -> dict:
    """Bo'sh maydonlarni yig'ib navbatga qo'yadi. Job ID qaytaradi."""
    if target_lang not in LANGS:
        raise ValueError('lang')

    rows = [r for r in collect_rows(restaurant_id, entity=entity)
            if not r['values'][target_lang] and r['values']['uz']]
    if not rows:
        return {'job_id': None, 'pending': 0, 'detail': 'nothing_to_translate'}

    payload_rows = [{'entity': r['entity'], 'object_id': r['object_id'],
                     'field': r['field'], 'source': r['values']['uz']} for r in rows]

    job_id = enqueue('ai', 'auto_translate',
                     restaurant_id=restaurant_id, target_lang=target_lang,
                     rows=payload_rows)
    ws_send(g_admin(restaurant_id), 'i18n.queued',
            {'job_id': job_id, 'pending': len(payload_rows), 'lang': target_lang})
    log.info(f'[i18n] navbat job#{job_id} rest={restaurant_id} '
             f'lang={target_lang} rows={len(payload_rows)}')
    return {'job_id': job_id, 'pending': len(payload_rows)}


def _translate_batch(rows, target_lang, restaurant_id):
    """
    ⚡ FAZA 9 (V-185) dagi MCP servisi chaqiriladi.
    Qaytaradi: {index: 'tarjima matni'}
    """
    from apps.ai.services.translate import translate_batch
    return translate_batch([r['source'] for r in rows],
                           source_lang='uz', target_lang=target_lang,
                           restaurant_id=restaurant_id)


def run_auto_translate(job):
    """Worker chaqiradi (core/worker.py — 'ai' navbati)."""
    p = job.payload
    rid, lang, rows = p['restaurant_id'], p['target_lang'], p['rows']
    done = failed = 0
    total = len(rows)

    for start in range(0, total, BATCH):
        chunk = rows[start:start + BATCH]
        try:
            result = _translate_batch(chunk, lang, rid)
        except Exception as e:
            log.warning(f'[i18n] batch xato: {e}')
            failed += len(chunk)
            result = {}
        for i, r in enumerate(chunk):
            text = (result or {}).get(i) or (result or {}).get(str(i))
            if not text:
                failed += 1
                continue
            try:
                apply_translation(rid, r['entity'], r['object_id'], r['field'],
                                  lang, text.strip()[:2000],
                                  is_auto=True, approved=False)   # ⚠️ tasdiqlanmagan
                done += 1
            except Exception as e:
                log.warning(f'[i18n] saqlash xato {r}: {e}')
                failed += 1

        ws_send(g_admin(rid), 'i18n.progress', {
            'job_id': job.id, 'done': done, 'failed': failed, 'total': total,
            'pct': round((done + failed) / total * 100) if total else 100})

    ws_send(g_admin(rid), 'i18n.done',
            {'job_id': job.id, 'translated': done, 'failed': failed, 'lang': lang})
    log.info(f'[i18n] job#{job.id} tugadi: {done} ok, {failed} xato')
    return {'translated': done, 'failed': failed}
```

**Worker ro'yxatiga qo'shiladi** — `core/worker.py`:
```python
JOB_HANDLERS = {
    # ... mavjud handlerlar ...
    'auto_translate': 'apps.i18n_admin.tasks.run_auto_translate',
}
```

**Fayl:** `apps/i18n_admin/views_auto.py`
```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError

from apps.accounts.permissions import IsRestaurantAdmin
from apps.i18n_admin.tasks import queue_auto_translate, ai_available
from apps.i18n_admin.services import LANGS


class AutoTranslateView(APIView):
    """
    POST /api/v1/admin/i18n/auto-translate/  {target_lang, entity?}
    GET  /api/v1/admin/i18n/auto-translate/?job_id=N   — progress
    """
    permission_classes = [IsAuthenticated, IsRestaurantAdmin]

    def post(self, request):
        if not ai_available():
            # ⚡ FAZA 9 tugamaguncha — aniq va tushunarli javob
            return Response({'error': {
                'code': 'AI_NOT_READY',
                'message_uz': "AI qatlami hali ulanmagan (FAZA 9 dan keyin faollashadi)",
                'message_ru': "Слой AI ещё не подключён (активируется после ФАЗЫ 9)",
                'message_en': 'AI layer is not connected yet (enabled after PHASE 9)',
            }}, status=501)

        lang = request.data.get('target_lang')
        if lang not in LANGS:
            raise ValidationError({'target_lang': f'{LANGS} dan biri'})
        entity = request.data.get('entity') or None
        if not request.restaurant.has_feature('chatbot'):
            from core.exceptions import PlanLimit
            raise PlanLimit({'feature': 'ai_translate'})
        return Response(queue_auto_translate(request.restaurant_id, lang, entity))

    def get(self, request):
        from core.models_job import Job
        jid = request.query_params.get('job_id')
        if not jid:
            raise ValidationError({'job_id': 'majburiy'})
        job = Job.objects.filter(id=jid, queue='ai').first()
        if not job or job.payload.get('restaurant_id') != request.restaurant_id:
            return Response({'detail': 'topilmadi'}, status=404)
        return Response({'status': job.status, 'result': job.result,
                         'error': job.error})
```

**UI — `static/admin/js/i18n_admin.js` dagi `aiFill()` almashtiriladi:**
```javascript
  let aiJob = null;

  function setProgress(p) {
    $('#tr-status').innerHTML = p == null ? '' :
      `<div style="background:var(--surface-3);height:8px;border-radius:4px;
        max-width:320px"><div style="width:${p.pct}%;height:8px;border-radius:4px;
        background:var(--accent)"></div></div>
       <span>${A.t('i18n.ai_progress',
         { done: p.done, failed: p.failed, total: p.total })}</span>`;
  }

  async function aiFill() {
    const lang = $('#tr-target').value;
    $('#tr-ai').disabled = true;
    $('#tr-status').textContent = A.t('i18n.ai_running');
    try {
      const r = await A.api.post('/api/v1/admin/i18n/auto-translate/',
        { target_lang: lang, entity: $('#tr-entity').value || null });
      if (!r.job_id) {
        $('#tr-status').textContent = A.t('i18n.nothing_to_translate');
        $('#tr-ai').disabled = false;
        return;
      }
      aiJob = r.job_id;
      setProgress({ done: 0, failed: 0, total: r.pending, pct: 0 });
    } catch (e) {
      // ⚡ FAZA 9 gacha — 501 AI_NOT_READY
      const msg = e.error ? (e.error['message_' + A.lang] || e.error.message_uz)
                          : JSON.stringify(e);
      $('#tr-status').textContent = '⏳ ' + msg;
      $('#tr-ai').disabled = false;
    }
  }

  function connectWS() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${location.host}/ws/admin/`);
    let retry = 1000;
    ws.onopen = () => { retry = 1000; };
    ws.onmessage = (ev) => {
      let m; try { m = JSON.parse(ev.data); } catch (_) { return; }
      const d = m.data || {};
      if (d.job_id !== aiJob) return;
      if (m.type === 'i18n.progress') setProgress(d);
      if (m.type === 'i18n.done') {
        setProgress(null);
        $('#tr-status').textContent = A.t('i18n.ai_done',
          { n: d.translated, failed: d.failed });
        $('#tr-ai').disabled = false;
        aiJob = null;
        load();                       // ⚡ jadval yangilanadi
      }
    };
    ws.onclose = () => { retry = Math.min(retry * 2, 15000); setTimeout(connectWS, retry); };
  }
```
`DOMContentLoaded` ichida `connectWS();` chaqiriladi.

`i18n` kalitlari (3 tilda):
```json
"i18n": {
  "dish": "Taom", "category": "Kategoriya", "modifier": "Modifikator",
  "floorplan": "Zal", "rows": "{n} ta maydon",
  "ai_running": "AI navbatga qo'yilmoqda...",
  "ai_progress": "{done} tarjima qilindi, {failed} xato ({total} dan)",
  "ai_done": "✅ {n} ta tarjima qilindi ({failed} xato). Tasdiqlashni unutmang ⚠️",
  "nothing_to_translate": "Bo'sh maydon yo'q — hammasi to'ldirilgan ✅"
}
```
```json
"i18n": {
  "dish": "Блюдо", "category": "Категория", "modifier": "Модификатор",
  "floorplan": "Зал", "rows": "{n} полей",
  "ai_running": "AI ставится в очередь...",
  "ai_progress": "{done} переведено, {failed} ошибок (из {total})",
  "ai_done": "✅ Переведено {n} ({failed} ошибок). Не забудьте подтвердить ⚠️",
  "nothing_to_translate": "Пустых полей нет — всё заполнено ✅"
}
```
```json
"i18n": {
  "dish": "Dish", "category": "Category", "modifier": "Modifier",
  "floorplan": "Floor", "rows": "{n} fields",
  "ai_running": "Queueing AI job...",
  "ai_progress": "{done} translated, {failed} failed (of {total})",
  "ai_done": "✅ {n} translated ({failed} failed). Remember to approve ⚠️",
  "nothing_to_translate": "No empty fields — all filled ✅"
}
```

✅ **Test:** `tests/test_auto_translate_queue.py`
```python
def test_returns_501_when_ai_missing(api_client, admin_user, monkeypatch):
    import apps.i18n_admin.views_auto as V
    monkeypatch.setattr(V, 'ai_available', lambda: False)
    api_client.force_authenticate(admin_user)
    r = api_client.post('/api/v1/admin/i18n/auto-translate/',
                        {'target_lang': 'en'}, format='json')
    assert r.status_code == 501
    assert r.data['error']['code'] == 'AI_NOT_READY'


def test_queues_only_empty_fields(db, restaurant, monkeypatch):
    from apps.menu.models import Dish, Category
    from apps.i18n_admin.tasks import queue_auto_translate
    c = Category.objects.create(restaurant=restaurant, name_uz='Asosiy')
    Dish.objects.create(restaurant=restaurant, category=c, name_uz='Osh',
                        name_en='Pilaf', price=45000)
    Dish.objects.create(restaurant=restaurant, category=c, name_uz='Norin',
                        price=52000)
    captured = {}
    monkeypatch.setattr('apps.i18n_admin.tasks.enqueue',
                        lambda q, t, **kw: captured.update(kw) or 7)
    res = queue_auto_translate(restaurant.id, 'en')
    assert res['job_id'] == 7
    sources = {r['source'] for r in captured['rows']}
    assert 'Norin' in sources and 'Osh' not in sources   # Osh'da en bor


def test_result_marked_unapproved(db, restaurant, monkeypatch):
    from apps.menu.models import Dish, Category
    from apps.i18n_admin import tasks
    from core.models_job import Job
    c = Category.objects.create(restaurant=restaurant, name_uz='Asosiy')
    d = Dish.objects.create(restaurant=restaurant, category=c,
                            name_uz='Norin', price=52000)
    monkeypatch.setattr(tasks, '_translate_batch', lambda rows, l, r: {0: 'Norin'})
    job = Job.objects.create(queue='ai', type='auto_translate', payload={
        'restaurant_id': restaurant.id, 'target_lang': 'en',
        'rows': [{'entity': 'dish', 'object_id': d.id,
                  'field': 'name', 'source': 'Norin'}]})
    out = tasks.run_auto_translate(job)
    d.refresh_from_db()
    assert out['translated'] == 1
    assert d.name_en == 'Norin'
    assert d.tr_auto.get('name_en') is True
    assert not d.tr_approved.get('name_en')      # ⚠️ admin tasdiqlashi kerak
```

✅ **Tekshirish:**
```bash
# FAZA 9 gacha:
curl -s -X POST -H "Authorization: Bearer $ADMIN_JWT" -H 'Content-Type: application/json' \
  -d '{"target_lang":"en"}' \
  http://localhost:8060/api/v1/admin/i18n/auto-translate/
# {"error":{"code":"AI_NOT_READY", ...}}  ← 501, KUTILGAN
```
UI da tugma bosilsa "⏳ AI qatlami hali ulanmagan (FAZA 9 dan keyin faollashadi)".

---

## V-166 — Tarif va to'lov sahifasi

**Fayl:** `apps/billing/plans.py`
```python
"""⚡ Tarif ta'riflari — yagona manba. Kodda boshqa joyda limit yozilmaydi."""

PLANS = {
    'start': {
        'name_uz': 'Start', 'name_ru': 'Старт', 'name_en': 'Start',
        'price_uzs': 290_000,
        'limits': {'dishes': 60, 'tables': 15, 'staff': 8,
                   'models_3d': 10, 'ai_daily_usd': 0.5, 'floorplans': 1},
        'features': ['menu', 'qr', 'orders', 'kds', 'reports_basic'],
    },
    'pro': {
        'name_uz': 'Pro', 'name_ru': 'Про', 'name_en': 'Pro',
        'price_uzs': 590_000,
        'limits': {'dishes': 250, 'tables': 60, 'staff': 30,
                   'models_3d': 60, 'ai_daily_usd': 2.0, 'floorplans': 4},
        'features': ['menu', 'qr', 'orders', 'kds', 'reports_basic', 'ar_3d',
                     'chatbot', 'menu_engineering', 'floorplan', 'white_label',
                     'export', 'tips'],
    },
    'premium': {
        'name_uz': 'Premium', 'name_ru': 'Премиум', 'name_en': 'Premium',
        'price_uzs': 990_000,
        'limits': {'dishes': 9999, 'tables': 300, 'staff': 200,
                   'models_3d': 400, 'ai_daily_usd': 6.0, 'floorplans': 20},
        'features': ['menu', 'qr', 'orders', 'kds', 'reports_basic', 'ar_3d',
                     'chatbot', 'menu_engineering', 'floorplan', 'white_label',
                     'export', 'tips', 'loyalty', 'api', 'multi_branch',
                     'priority_support'],
    },
}
ORDER = ['start', 'pro', 'premium']


def plan_limits(plan: str) -> dict:
    return PLANS.get(plan, PLANS['start'])['limits']


def has_feature(plan: str, feature: str) -> bool:
    return feature in PLANS.get(plan, PLANS['start'])['features']


def current_usage(restaurant_id) -> dict:
    from apps.menu.models import Dish
    from apps.tables.models import Table, FloorPlan
    from apps.accounts.models import StaffUser
    from apps.ar.models import Model3D
    return {
        'dishes': Dish.objects.filter(restaurant_id=restaurant_id, is_active=True).count(),
        'tables': Table.objects.filter(restaurant_id=restaurant_id, is_active=True).count(),
        'staff': StaffUser.objects.filter(restaurant_id=restaurant_id, is_active=True).count(),
        'models_3d': Model3D.objects.filter(restaurant_id=restaurant_id,
                                            status='ready').count(),
        'floorplans': FloorPlan.objects.filter(restaurant_id=restaurant_id,
                                               is_active=True).count(),
    }
```

`Restaurant` modeliga xossalar (`apps/tenants/models.py`):
```python
    @property
    def plan_limits(self):
        from apps.billing.plans import plan_limits
        return plan_limits(self.plan)

    def has_feature(self, name):
        from apps.billing.plans import has_feature
        return has_feature(self.plan, name)
```

**Fayl:** `apps/billing/views_plan.py`
```python
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import IsRestaurantAdmin
from apps.billing.plans import PLANS, ORDER, current_usage


class PlanView(APIView):
    """GET /api/v1/admin/plan/"""
    permission_classes = [IsAuthenticated, IsRestaurantAdmin]

    def get(self, request):
        r = request.restaurant
        usage = current_usage(r.id)
        limits = r.plan_limits
        return Response({
            'current': r.plan,
            'paid_until': r.paid_until,
            'days_left': (r.paid_until - timezone.localdate()).days if r.paid_until else None,
            'usage': [{'key': k, 'used': usage.get(k, 0), 'limit': limits.get(k, 0),
                       'pct': min(100, round(usage.get(k, 0) / limits[k] * 100))
                              if limits.get(k) else 0}
                      for k in ('dishes', 'tables', 'staff', 'models_3d', 'floorplans')],
            'plans': [{'key': k, **PLANS[k]} for k in ORDER],
        })
```

**Fayl:** `templates/admin_panel/plan.html`
```html
{% extends "admin_panel/base.html" %}
{% load i18n static %}
{% block title %}{% trans "Tarif" %}{% endblock %}
{% block heading %}💳 {% trans "Tarif va limitlar" %}{% endblock %}
{% block content %}
<div class="card" style="margin-bottom:12px">
  <h3 style="margin-top:0">{% trans "Joriy tarif" %}: <span id="p-cur">—</span></h3>
  <p class="muted" id="p-until"></p>
  <table class="grid"><tbody id="p-usage"></tbody></table>
</div>
<div id="p-plans" style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px"></div>
{% endblock %}
{% block extra_js %}
<script>
(function () {
  const $ = s => document.querySelector(s), A = window.ARMENU;
  document.addEventListener('DOMContentLoaded', async () => {
    await A.ready;
    const d = await A.api.get('/api/v1/admin/plan/');
    $('#p-cur').textContent = d.plans.find(p => p.key === d.current)['name_' + A.lang];
    $('#p-until').textContent = d.paid_until
      ? A.t('plan.paid_until', { date: d.paid_until, days: d.days_left }) : '';
    $('#p-usage').innerHTML = d.usage.map(u => `
      <tr><td>${A.t('plan.limit_' + u.key)}</td>
        <td style="width:55%"><div style="background:var(--surface-3);height:8px;
          border-radius:4px"><div style="width:${u.pct}%;height:8px;border-radius:4px;
          background:var(--${u.pct >= 90 ? 'danger' : (u.pct >= 70 ? 'warning' : 'success')})">
          </div></div></td>
        <td style="text-align:right">${u.used} / ${u.limit}</td></tr>`).join('');
    $('#p-plans').innerHTML = d.plans.map(p => `
      <div class="card" style="${p.key === d.current
        ? 'border-color:var(--accent);border-width:2px' : ''}">
        <h3 style="margin-top:0">${p['name_' + A.lang]}</h3>
        <div style="font-size:22px;font-weight:700">${A.money(p.price_uzs)}
          <span class="muted" style="font-size:13px">${A.t('plan.per_month')}</span></div>
        <ul class="muted" style="padding-left:18px;font-size:13px">
          ${p.features.map(f => `<li>${A.t('feature.' + f)}</li>`).join('')}</ul>
        ${p.key === d.current
          ? `<span class="badge">${A.t('plan.current')}</span>`
          : `<a class="btn btn-primary" href="/admin-panel/plan/upgrade/${p.key}/">
              ${A.t('plan.choose')}</a>`}
      </div>`).join('');
  });
})();
</script>
{% endblock %}
```

✅ **Test:** `tests/test_plan_limits.py`
```python
import pytest
from apps.billing.plans import plan_limits, has_feature


def test_start_has_no_ar():
    assert not has_feature('start', 'ar_3d')
    assert has_feature('pro', 'ar_3d')


def test_limits_grow_with_plan():
    assert plan_limits('start')['dishes'] < plan_limits('pro')['dishes'] \
        < plan_limits('premium')['dishes']


def test_staff_limit_enforced(api_client, admin_user, restaurant):
    restaurant.plan = 'start'; restaurant.save()
    api_client.force_authenticate(admin_user)
    limit = plan_limits('start')['staff']
    for i in range(limit + 2):
        r = api_client.post('/api/v1/admin/staff/',
                            {'full_name': f'X{i}', 'role': 'waiter'}, format='json')
        if r.status_code == 402:
            break
    assert r.status_code == 402
```

✅ **Tekshirish:** limit chizig'i 90% dan oshsa qizil bo'ladi; limit tugagach
yangi xodim qo'shilmaydi (402 PLAN_LIMIT).

---
## V-167 — Ma'lumot eksporti (to'liq, GDPR-uslub)

Restoran o'z ma'lumotini **to'liq** olib chiqishi mumkin — vendor lock-in yo'q.

**Fayl:** `apps/tenants/export_data.py`
```python
"""
⚡ To'liq ma'lumot eksporti: menyu + buyurtmalar + mijozlar + sozlamalar.
Katta bo'lishi mumkin — shuning uchun navbatda bajariladi va ZIP fayl beriladi.
"""
import io
import json
import zipfile
import logging
from decimal import Decimal
from datetime import date, datetime

from django.core.files.base import ContentFile
from django.utils import timezone

log = logging.getLogger('tenants.export')


class _Enc(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            return float(o)
        if isinstance(o, (datetime, date)):
            return o.isoformat()
        return super().default(o)


def _dump(qs, fields):
    return [{f: getattr(o, f, None) for f in fields} for o in qs.iterator(chunk_size=500)]


def build_export(restaurant_id: int, include_guests=True) -> dict:
    """Barcha ma'lumotni dict ko'rinishida yig'adi."""
    from apps.tenants.models import Restaurant
    from apps.menu.models import Dish, Category, Modifier
    from apps.tables.models import Table, FloorPlan
    from apps.orders.models import Order, OrderItem
    from apps.accounts.models import StaffUser
    from apps.reviews.models import Review

    r = Restaurant.objects.get(id=restaurant_id)

    data = {
        'meta': {
            'exported_at': timezone.now().isoformat(),
            'schema': 1,
            'restaurant_slug': r.slug,
            'generator': 'ARMENU',
        },
        'restaurant': {
            'name': r.name, 'slug': r.slug, 'phone': r.phone, 'city': r.city,
            'address': r.address, 'currency': r.currency, 'plan': r.plan,
            'service_fee_pct': float(r.service_fee_pct or 0),
            'enabled_langs': r.enabled_langs, 'work_hours': r.work_hours,
        },
        'categories': _dump(Category.objects.filter(restaurant_id=restaurant_id),
                            ['id', 'name_uz', 'name_ru', 'name_en', 'sort', 'is_active']),
        'dishes': _dump(Dish.objects.filter(restaurant_id=restaurant_id),
                        ['id', 'category_id', 'name_uz', 'name_ru', 'name_en',
                         'desc_uz', 'desc_ru', 'desc_en', 'price', 'cost_price',
                         'weight_g', 'calories', 'cook_min', 'diet_tags',
                         'allergens', 'is_available', 'is_active', 'has_3d']),
        'modifiers': _dump(Modifier.objects.filter(restaurant_id=restaurant_id),
                           ['id', 'dish_id', 'name_uz', 'name_ru', 'name_en',
                            'price_delta', 'is_active']),
        'tables': _dump(Table.objects.filter(restaurant_id=restaurant_id),
                        ['id', 'number', 'seats', 'zone', 'is_active']),
        'floorplans': [{'id': p.id, 'name_uz': p.name_uz, 'floor': p.floor,
                        'plan_json': p.plan_json}
                       for p in FloorPlan.objects.filter(restaurant_id=restaurant_id)],
        'staff': _dump(StaffUser.objects.filter(restaurant_id=restaurant_id),
                       ['id', 'full_name', 'role', 'is_active', 'hired_at']),
        'reviews': _dump(Review.objects.filter(restaurant_id=restaurant_id),
                         ['id', 'order_id', 'rating', 'text', 'created_at']),
    }

    # Buyurtmalar — eng katta blok
    orders = []
    items_by_order = {}
    for it in OrderItem.objects.filter(order__restaurant_id=restaurant_id
                                       ).iterator(chunk_size=1000):
        items_by_order.setdefault(it.order_id, []).append({
            'dish_id': it.dish_id, 'qty': it.qty, 'price': it.price,
            'line_total': it.line_total, 'modifiers': it.modifiers, 'note': it.note})
    for o in Order.objects.filter(restaurant_id=restaurant_id
                                  ).iterator(chunk_size=500):
        row = {'id': o.id, 'number': o.number, 'status': o.status,
               'source': o.source, 'table_id': o.table_id, 'waiter_id': o.waiter_id,
               'guests': o.guests, 'subtotal': o.subtotal, 'service_fee': o.service_fee,
               'discount': o.discount, 'total': o.total,
               'payment_method': o.payment_method,
               'created_at': o.created_at, 'paid_at': o.paid_at,
               'items': items_by_order.get(o.id, [])}
        if include_guests:
            row['guest_phone'] = o.guest_phone
        orders.append(row)
    data['orders'] = orders

    # ⚡ Shaxsiy ma'lumot: telefon raqamlari alohida faylda ajratiladi
    if include_guests:
        phones = sorted({o['guest_phone'] for o in orders if o.get('guest_phone')})
        data['guests'] = [{'phone': p} for p in phones]
    return data


def build_zip(restaurant_id: int, include_guests=True) -> bytes:
    """JSON + Excel'ni bitta ZIP ga yig'adi."""
    from apps.analytics import export as X
    from openpyxl import Workbook

    data = build_export(restaurant_id, include_guests)

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('armenu_export.json', json.dumps(data, cls=_Enc,
                                                    ensure_ascii=False, indent=1))
        z.writestr('README.txt',
                   "ARMENU ma'lumot eksporti\n"
                   f"Sana: {data['meta']['exported_at']}\n"
                   f"Restoran: {data['restaurant']['name']}\n\n"
                   "armenu_export.json — barcha ma'lumot (mashina o'qiydigan)\n"
                   "menyu.xlsx, buyurtmalar.xlsx — odam o'qiydigan jadval\n")

        # Menyu Excel
        wb = Workbook()
        X._sheet(wb, 'Menyu',
                 ['ID', 'Kategoriya', 'Nomi (uz)', 'Nomi (ru)', 'Nomi (en)',
                  'Narx', 'Tannarx', 'Mavjud'],
                 [[d['id'], d['category_id'], d['name_uz'], d['name_ru'],
                   d['name_en'], d['price'], d['cost_price'], d['is_available']]
                  for d in data['dishes']])
        mbuf = io.BytesIO(); wb.save(mbuf)
        z.writestr('menyu.xlsx', mbuf.getvalue())

        # Buyurtmalar Excel
        wb2 = Workbook()
        X._sheet(wb2, 'Buyurtmalar',
                 ['№', 'Sana', 'Holat', 'Stol', 'Taomlar', 'Chegirma', 'Jami'],
                 [[o['number'], str(o['created_at'])[:19], o['status'],
                   o['table_id'], o['subtotal'], o['discount'], o['total']]
                  for o in data['orders']])
        obuf = io.BytesIO(); wb2.save(obuf)
        z.writestr('buyurtmalar.xlsx', obuf.getvalue())

    buf.seek(0)
    return buf.read()


def run_full_export(job):
    """Worker ('analytics' navbati) — natijani DataExport modeliga yozadi."""
    from apps.tenants.models import DataExport
    from core.ws import ws_send, g_admin

    rid = job.payload['restaurant_id']
    exp = DataExport.objects.get(id=job.payload['export_id'])
    try:
        blob = build_zip(rid, include_guests=job.payload.get('include_guests', True))
        exp.file.save(f'armenu_export_{rid}_{timezone.localdate()}.zip',
                      ContentFile(blob), save=False)
        exp.size_bytes = len(blob)
        exp.status = 'ready'
        exp.save()
        ws_send(g_admin(rid), 'export.ready',
                {'export_id': exp.id, 'url': exp.file.url, 'size': exp.size_bytes})
        log.info(f'[export] rest={rid} tayyor {exp.size_bytes} bayt')
        return {'export_id': exp.id, 'size': exp.size_bytes}
    except Exception as e:
        exp.status = 'failed'
        exp.error = str(e)[:500]
        exp.save(update_fields=['status', 'error'])
        ws_send(g_admin(rid), 'export.failed', {'export_id': exp.id, 'error': exp.error})
        raise
```

**Model** — `apps/tenants/models.py` ga qo'shiladi:
```python
class DataExport(TenantModel):
    STATUS = [('pending', 'Navbatda'), ('ready', 'Tayyor'), ('failed', 'Xato')]
    status = models.CharField(max_length=20, choices=STATUS, default='pending',
                              db_index=True)
    file = models.FileField(upload_to='exports/%Y/%m/', null=True, blank=True)
    size_bytes = models.BigIntegerField(default=0)
    include_guests = models.BooleanField(default=True)
    error = models.TextField(blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
```

**Fayl:** `apps/tenants/views_export.py`
```python
from datetime import timedelta

from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from core.queue import enqueue
from apps.accounts.permissions import IsRestaurantAdmin
from apps.tenants.models import DataExport


class DataExportView(APIView):
    """
    POST /api/v1/admin/export/full/    — navbatga qo'yadi
    GET  /api/v1/admin/export/full/    — oxirgi 10 ta eksport
    """
    permission_classes = [IsAuthenticated, IsRestaurantAdmin]

    def post(self, request):
        rid = request.restaurant_id
        # ⚡ Kuniga 3 martadan ko'p emas — DB'ni himoya qilish
        today = timezone.localdate()
        recent = DataExport.objects.filter(
            restaurant_id=rid, created_at__date=today).count()
        if recent >= 3:
            return Response({'error': {'code': 'RATE_LIMITED',
                                       'message_uz': 'Kuniga 3 marta eksport qilish mumkin',
                                       'message_ru': 'Не более 3 экспортов в день',
                                       'message_en': 'Max 3 exports per day'}}, status=429)

        exp = DataExport.objects.create(
            restaurant_id=rid,
            include_guests=bool(request.data.get('include_guests', True)),
            expires_at=timezone.now() + timedelta(days=7))
        job_id = enqueue('analytics', 'full_export',
                         restaurant_id=rid, export_id=exp.id,
                         include_guests=exp.include_guests)
        return Response({'export_id': exp.id, 'job_id': job_id,
                         'status': exp.status}, status=202)

    def get(self, request):
        rows = DataExport.objects.filter(
            restaurant_id=request.restaurant_id)[:10]
        return Response([{
            'id': e.id, 'status': e.status, 'size_bytes': e.size_bytes,
            'url': e.file.url if e.file else None,
            'created_at': e.created_at, 'expires_at': e.expires_at,
            'error': e.error} for e in rows])
```

`core/worker.py` handler:
```python
JOB_HANDLERS['full_export'] = 'apps.tenants.export_data.run_full_export'
```

**Sozlamalar sahifasiga blok qo'shiladi** (`templates/admin_panel/settings.html`):
```html
<div class="card" style="margin-top:12px">
  <h3 style="margin-top:0">📦 {% trans "Ma'lumot eksporti" %}</h3>
  <p class="muted" style="font-size:13px">
    {% trans "Menyu, buyurtmalar, mijozlar va sozlamalarni ZIP (JSON + Excel) ko'rinishida yuklab oling. Ma'lumot to'liq sizniki." %}
  </p>
  <label><input type="checkbox" id="e-guests" checked>
    {% trans "Mijoz telefon raqamlarini ham qo'shish" %}</label><br>
  <button class="btn btn-primary" id="e-run" style="margin-top:8px">
    📦 {% trans "Eksport yaratish" %}</button>
  <span id="e-status" class="muted"></span>
  <table class="grid" style="margin-top:10px"><tbody id="e-list"></tbody></table>
</div>
```

`static/admin/js/settings.js` oxiriga:
```javascript
  async function loadExports() {
    const rows = await A.api.get('/api/v1/admin/export/full/');
    $('#e-list').innerHTML = rows.map(e => `
      <tr><td>${new Date(e.created_at).toLocaleString()}</td>
        <td>${A.t('export.' + e.status)}</td>
        <td>${e.size_bytes ? (e.size_bytes / 1048576).toFixed(1) + ' MB' : '—'}</td>
        <td style="text-align:right">${e.url
          ? `<a class="btn" href="${e.url}">⬇️ ${A.t('common.download')}</a>` : ''}</td>
      </tr>`).join('');
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const btn = document.getElementById('e-run');
    if (!btn) return;
    await A.ready;
    loadExports();
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      $('#e-status').textContent = A.t('export.queued');
      try {
        await A.api.post('/api/v1/admin/export/full/',
          { include_guests: $('#e-guests').checked });
        const poll = setInterval(async () => {
          const rows = await A.api.get('/api/v1/admin/export/full/');
          if (rows[0] && rows[0].status !== 'pending') {
            clearInterval(poll);
            btn.disabled = false;
            $('#e-status').textContent = rows[0].status === 'ready'
              ? '✅ ' + A.t('export.ready') : '⛔ ' + (rows[0].error || '');
            loadExports();
          }
        }, 3000);
      } catch (e) {
        btn.disabled = false;
        $('#e-status').textContent = '⛔ ' + (e.error
          ? e.error['message_' + A.lang] : JSON.stringify(e));
      }
    });
  });
```

✅ **Test:** `tests/test_data_export.py`
```python
import io
import json
import zipfile


def test_export_contains_all_sections(db, restaurant, make_order):
    from apps.tenants.export_data import build_zip
    make_order(restaurant, total=120000, status='paid')
    blob = build_zip(restaurant.id)
    with zipfile.ZipFile(io.BytesIO(blob)) as z:
        names = set(z.namelist())
        assert {'armenu_export.json', 'menyu.xlsx',
                'buyurtmalar.xlsx', 'README.txt'} <= names
        data = json.loads(z.read('armenu_export.json'))
    for key in ('restaurant', 'categories', 'dishes', 'tables', 'orders', 'staff'):
        assert key in data
    assert len(data['orders']) == 1


def test_guests_excluded_when_opted_out(db, restaurant, make_order):
    from apps.tenants.export_data import build_export
    make_order(restaurant, total=1000, status='paid', guest_phone='998901112233')
    d = build_export(restaurant.id, include_guests=False)
    assert 'guests' not in d
    assert 'guest_phone' not in d['orders'][0]


def test_rate_limited_after_3(api_client, admin_user, restaurant):
    api_client.force_authenticate(admin_user)
    for _ in range(3):
        assert api_client.post('/api/v1/admin/export/full/', {}, format='json').status_code == 202
    assert api_client.post('/api/v1/admin/export/full/', {}, format='json').status_code == 429
```

✅ **Tekshirish:** "Eksport yaratish" bosilsa 202 qaytadi, worker ZIP tayyorlaydi,
ro'yxatda ⬇️ havola paydo bo'ladi; ZIP ichida JSON + 2 ta Excel + README bor.

---

## V-168 — Mobil moslashuv (telefonda admin panel)

**Fayl:** `static/admin/css/mobile.css`
```css
/* ⚡ Admin panel telefonda: sidebar → burger, jadval → karta, 44px tegish */

@media (max-width: 900px) {
  /* Sidebar overlay */
  .ap-side::after {
    content: ''; position: fixed; inset: 0; background: rgba(0,0,0,.45);
    opacity: 0; pointer-events: none; transition: opacity .2s; z-index: -1;
  }
  .ap-side.open::after { opacity: 1; pointer-events: auto; }
  .ap-side nav a { padding: 12px 12px; font-size: 15px; }   /* 44px+ */

  /* Tegish maydonlari — Apple/Google tavsiyasi: min 44×44 */
  .btn, .ap-top select, input, select, textarea {
    min-height: 44px; font-size: 16px;    /* 16px — iOS zoom qilmasin */
  }
  .btn { padding: 11px 14px; }

  /* KPI kartalar — 2 ustun */
  .kpis { grid-template-columns: repeat(2, 1fr) !important; }
  .kpi .val { font-size: 20px; }

  /* ⚡ Jadval → karta ko'rinish */
  table.grid.cards thead { display: none; }
  table.grid.cards tr {
    display: block; margin-bottom: 10px; padding: 10px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius);
  }
  table.grid.cards td {
    display: flex; justify-content: space-between; gap: 10px;
    border: none; padding: 5px 0; text-align: right;
  }
  table.grid.cards td::before {
    content: attr(data-label); color: var(--fg-muted);
    font-size: 12px; text-align: left; flex: 0 0 42%;
  }
  table.grid.cards td:first-child { font-weight: 600; }

  /* Gorizontal aylanadigan jadvallar (karta bo'lmaganlari) */
  .table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .table-scroll table { min-width: 620px; }

  /* Grid'lar 1 ustunga */
  .row2, .me-grid, .fp-wrap { grid-template-columns: 1fr !important; }

  /* Modal to'liq ekran */
  #om-root > div, #st-modal > div { max-width: 100% !important; max-height: 100vh;
                                    border-radius: 0; }
  .ap-content { padding: 8px; }
  h1 { font-size: 18px; }
}

@media (max-width: 480px) {
  .kpis { grid-template-columns: 1fr !important; }
}
```

`base.html` `<head>` ga qo'shiladi:
```html
<link rel="stylesheet" href="{% static 'admin/css/mobile.css' %}?v=1">
```

**`static/admin/js/layout.js` ga qo'shiladi** — jadvalni avtomatik kartaga aylantirish:
```javascript
  /* ⚡ Mobil: har <td> ga sarlavha yorlig'ini yozadi (CSS ::before uchun) */
  function labelizeTables() {
    document.querySelectorAll('table.grid').forEach(tbl => {
      const heads = Array.from(tbl.querySelectorAll('thead th'))
        .map(th => th.textContent.trim());
      if (!heads.length) return;
      tbl.classList.add('cards');
      tbl.querySelectorAll('tbody tr').forEach(tr => {
        Array.from(tr.children).forEach((td, i) => {
          if (heads[i]) td.setAttribute('data-label', heads[i]);
        });
      });
    });
  }
  labelizeTables();
  // Dinamik yuklangan jadvallar uchun
  new MutationObserver(() => labelizeTables())
    .observe(document.body, { childList: true, subtree: true });

  /* Sidebar tashqarisiga bosilsa yopiladi */
  document.addEventListener('click', (e) => {
    const side = document.getElementById('ap-side');
    const burger = document.getElementById('ap-burger');
    if (!side || !side.classList.contains('open')) return;
    if (!side.contains(e.target) && e.target !== burger) side.classList.remove('open');
  });

  /* Havola bosilsa mobil menyu yopiladi */
  document.querySelectorAll('.ap-side nav a').forEach(a =>
    a.addEventListener('click', () =>
      document.getElementById('ap-side').classList.remove('open')));
```

✅ **Test:** `tests/test_admin_mobile.py` (Playwright)
```python
import pytest

pytestmark = pytest.mark.playwright


def test_mobile_sidebar_and_cards(page, admin_session_url):
    page.set_viewport_size({'width': 390, 'height': 844})   # iPhone 14
    page.goto(admin_session_url + '/admin-panel/orders/')

    # Sidebar yashirin, burger ko'rinadi
    assert not page.locator('#ap-side').evaluate(
        "el => el.getBoundingClientRect().left >= 0")
    page.click('#ap-burger')
    assert page.locator('#ap-side.open').count() == 1

    # Jadval karta ko'rinishida
    page.click('#ap-burger')
    page.wait_for_selector('table.grid.cards tbody tr')
    label = page.locator('table.grid.cards tbody tr td').first
    assert label.get_attribute('data-label')

    # Tegish maydoni >= 44px
    h = page.locator('.btn').first.bounding_box()['height']
    assert h >= 44

    # Gorizontal skroll YO'Q
    assert page.evaluate(
        "document.documentElement.scrollWidth <= window.innerWidth + 1")
```

✅ **Tekshirish:** telefonda (390px) sidebar burger orqali ochiladi, jadvallar
karta ko'rinishida, gorizontal skroll yo'q, tugmalar barmoq bilan bosiladi.

---

## V-169 — Admin bildirishnomalari

**Fayl:** `apps/analytics/services/alerts.py`
```python
"""
⚡ Admin diqqatiga muhtoj hodisalar. Ikki yo'l bilan yetkaziladi:
  1. WS 'admin.alert' — darhol (jonli oqim)
  2. attention_items() — sahifa yangilanganda (V-152)
Har alert 'kind:key' bo'yicha deduplikatsiya qilinadi (kesh, TTL).
"""
import logging
from datetime import timedelta

from django.core.cache import cache
from django.utils import timezone

from core.ws import ws_send, g_admin

log = logging.getLogger('analytics.alerts')

DEDUP_TTL = {
    'low_review': 0,          # har otziv uchun alohida — dedup yo'q
    'sold_out': 1800,         # 30 daq
    'call_late': 300,         # 5 daq
    'order_late': 600,        # 10 daq
}
LEVEL = {'low_review': 'danger', 'sold_out': 'warning',
         'call_late': 'danger', 'order_late': 'warning'}


def push_alert(restaurant_id: int, kind: str, key: str, params: dict):
    """Dedup bilan WS ga yuboradi."""
    ttl = DEDUP_TTL.get(kind, 300)
    if ttl:
        ck = f'alert:{restaurant_id}:{kind}:{key}'
        if cache.get(ck):
            return False
        cache.set(ck, 1, ttl)
    ws_send(g_admin(restaurant_id), 'admin.alert', {
        'kind': kind, 'level': LEVEL.get(kind, 'info'),
        'text_key': f'alert.{kind}', 'params': params,
        'at': timezone.now().isoformat()})
    log.info(f'[alert] rest={restaurant_id} {kind} {params}')
    return True


# ---------- Signal'lar ----------
def on_review_created(review):
    """⭐ Past reyting (1-2) → darhol admin'ga."""
    if review.rating and review.rating <= 2:
        push_alert(review.restaurant_id, 'low_review', str(review.id), {
            'stars': review.rating,
            'table': review.order.table.number if (review.order_id and
                                                   review.order.table_id) else '-',
            'text': (review.text or '')[:120]})


def on_dish_sold_out(dish):
    """🚫 Taom stop-listga tushdi."""
    push_alert(dish.restaurant_id, 'sold_out', str(dish.id),
               {'dish': dish.name_uz})


# ---------- Davriy tekshiruv (cron / worker) ----------
def scan_late_events(restaurant_id: int) -> int:
    """Javobsiz chaqiruv va kechikkan buyurtmalarni topadi. Cron: har 2 daqiqa."""
    from apps.calls.models import Call
    from apps.orders.models import Order

    now = timezone.now()
    sent = 0

    for c in Call.objects.filter(
            restaurant_id=restaurant_id, status='pending',
            created_at__lt=now - timedelta(minutes=5)).select_related('table'):
        mins = int((now - c.created_at).total_seconds() // 60)
        if push_alert(restaurant_id, 'call_late', str(c.id),
                      {'table': c.table.number if c.table_id else '-', 'min': mins}):
            sent += 1

    for o in Order.objects.filter(
            restaurant_id=restaurant_id, status__in=('new', 'accepted', 'cooking'),
            created_at__lt=now - timedelta(minutes=30)).select_related('table'):
        mins = int((now - o.created_at).total_seconds() // 60)
        if push_alert(restaurant_id, 'order_late', str(o.id),
                      {'number': o.number,
                       'table': o.table.number if o.table_id else '-',
                       'min': mins}):
            sent += 1
    return sent


def scan_all_restaurants() -> int:
    from apps.tenants.models import Restaurant
    total = 0
    for rid in Restaurant.objects.filter(is_active=True).values_list('id', flat=True):
        try:
            total += scan_late_events(rid)
        except Exception as e:
            log.warning(f'[alert] rest={rid} skan xato: {e}')
    return total
```

**Fayl:** `apps/analytics/management/commands/scan_alerts.py`
```python
from django.core.management.base import BaseCommand

from apps.analytics.services.alerts import scan_all_restaurants


class Command(BaseCommand):
    help = "Kechikkan chaqiruv/buyurtmalarni skanerlab admin'ga alert yuboradi"

    def handle(self, *args, **opts):
        n = scan_all_restaurants()
        self.stdout.write(self.style.SUCCESS(f'{n} ta alert yuborildi'))
```

**Cron** (`deploy/cron.d/armenu`):
```
*/2 * * * * armenu cd /srv/armenu && venv/bin/python manage.py scan_alerts >> /var/log/armenu/alerts.log 2>&1
```

**Signal'lar** — `apps/analytics/signals.py`:
```python
from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.reviews.models import Review
from apps.menu.models import Dish
from apps.analytics.services.alerts import on_review_created, on_dish_sold_out


@receiver(post_save, sender=Review)
def _review(sender, instance, created, **kwargs):
    if created:
        transaction.on_commit(lambda: on_review_created(instance))


@receiver(post_save, sender=Dish)
def _dish(sender, instance, created, update_fields=None, **kwargs):
    # Faqat is_available False ga o'zgarganda
    if created or instance.is_available:
        return
    if update_fields and 'is_available' not in update_fields:
        return
    transaction.on_commit(lambda: on_dish_sold_out(instance))
```

**Dashboard UI'ga qo'shiladi** — `static/admin/js/dashboard.js`:
```javascript
  const ALERT_ICON = { low_review: '⭐', sold_out: '🚫',
                       call_late: '🔔', order_late: '🐢' };

  function pushAlert(d) {
    const box = document.getElementById('attn');
    const li = document.createElement('li');
    li.className = d.level;
    li.innerHTML = `${ALERT_ICON[d.kind] || '⚠️'} ${A.t(d.text_key, d.params)}`;
    box.insertBefore(li, box.firstChild);
    while (box.children.length > 12) box.removeChild(box.lastChild);

    // ⚡ Kritik alert — tovushli signal (faqat foydalanuvchi ruxsat bergan bo'lsa)
    if (d.level === 'danger') {
      try {
        const a = document.getElementById('alert-sound');
        if (a) { a.currentTime = 0; a.play().catch(() => {}); }
      } catch (_) {}
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(A.t('alert.title'), { body: A.t(d.text_key, d.params) });
      }
    }
  }
```
`ws.onmessage` ichiga:
```javascript
      if (m.type === 'admin.alert') { pushAlert(m.data || {}); return; }
```
`dashboard.html` ga:
```html
<audio id="alert-sound" preload="auto" src="{% static 'admin/snd/alert.mp3' %}"></audio>
<button class="btn" id="notif-on" style="margin-top:8px">
  🔔 {% trans "Brauzer bildirishnomasini yoqish" %}</button>
<script>
document.getElementById('notif-on').addEventListener('click', () => {
  if ('Notification' in window) Notification.requestPermission();
});
</script>
```

`alert` kalitlari (3 tilda):
```json
"alert": {
  "title": "ARMENU — diqqat",
  "low_review": "⭐{stars} baho — Stol {table}: «{text}»",
  "sold_out": "«{dish}» tugadi (stop-list)",
  "call_late": "Stol {table} — chaqiruv {min} daqiqadan beri javobsiz",
  "order_late": "Buyurtma {number} (Stol {table}) — {min} daqiqadan beri tayyor emas"
}
```
```json
"alert": {
  "title": "ARMENU — внимание",
  "low_review": "Оценка ⭐{stars} — Стол {table}: «{text}»",
  "sold_out": "«{dish}» закончилось (стоп-лист)",
  "call_late": "Стол {table} — вызов без ответа {min} мин",
  "order_late": "Заказ {number} (Стол {table}) — не готов {min} мин"
}
```
```json
"alert": {
  "title": "ARMENU — attention",
  "low_review": "⭐{stars} rating — Table {table}: \"{text}\"",
  "sold_out": "\"{dish}\" is sold out (86'd)",
  "call_late": "Table {table} — call unanswered for {min} min",
  "order_late": "Order {number} (Table {table}) — not ready for {min} min"
}
```

✅ **Test:** `tests/test_alerts.py`
```python
from datetime import timedelta
from django.utils import timezone


def test_low_review_triggers_alert(db, restaurant, monkeypatch, make_order):
    from apps.analytics.services import alerts
    sent = []
    monkeypatch.setattr(alerts, 'ws_send', lambda g, t, d: sent.append((t, d)))
    from apps.reviews.models import Review
    o = make_order(restaurant, total=1000, status='paid')
    r = Review.objects.create(restaurant=restaurant, order=o, rating=2, text='Sovuq')
    alerts.on_review_created(r)
    assert sent and sent[0][1]['kind'] == 'low_review'


def test_dedup_prevents_spam(db, restaurant, monkeypatch):
    from apps.analytics.services import alerts
    sent = []
    monkeypatch.setattr(alerts, 'ws_send', lambda g, t, d: sent.append(d))
    assert alerts.push_alert(restaurant.id, 'call_late', '1', {'table': '5'})
    assert not alerts.push_alert(restaurant.id, 'call_late', '1', {'table': '5'})
    assert len(sent) == 1


def test_late_call_detected(db, restaurant, monkeypatch, make_table):
    from apps.analytics.services import alerts
    from apps.calls.models import Call
    sent = []
    monkeypatch.setattr(alerts, 'ws_send', lambda g, t, d: sent.append(d))
    t = make_table(restaurant, number='7')
    c = Call.objects.create(restaurant=restaurant, table=t, kind='waiter',
                            status='pending')
    Call.objects.filter(id=c.id).update(
        created_at=timezone.now() - timedelta(minutes=9))
    assert alerts.scan_late_events(restaurant.id) == 1
    assert sent[0]['kind'] == 'call_late'
    assert sent[0]['params']['min'] >= 9
```

✅ **Tekshirish:**
```bash
python manage.py scan_alerts
# "2 ta alert yuborildi"
```
Dashboard ochiq bo'lsa — "⚠️ DIQQAT" blokida darhol paydo bo'ladi.

---

## V-170 — FAZA 8 testlari

**Fayl:** `tests/test_admin_reports.py`
```python
from datetime import timedelta

import pytest
from django.utils import timezone

from apps.analytics.services.dashboard import dashboard_kpis, hourly_sales, top_dishes
from apps.analytics.services.reports import sales_report, dishes_report, staff_report


@pytest.fixture
def sales_fixture(db, restaurant, make_order):
    """Bugun 3 ta to'langan buyurtma: 100k + 200k + 300k = 600k"""
    for total in (100_000, 200_000, 300_000):
        make_order(restaurant, total=total, status='paid')
    make_order(restaurant, total=999_000, status='cancelled')   # hisobga KIRMAYDI
    return restaurant


def test_kpi_revenue_excludes_cancelled(sales_fixture):
    k = dashboard_kpis(sales_fixture.id)
    assert k['revenue']['value'] == 600_000
    assert k['orders']['value'] == 3
    assert k['avg_check']['value'] == 200_000


def test_sales_report_totals_match(sales_fixture):
    today = timezone.localdate()
    rep = sales_report(sales_fixture.id, today, today, 'day')
    assert rep['totals']['revenue'] == 600_000
    assert sum(s['revenue'] for s in rep['series']) == 600_000


def test_hourly_has_16_slots(sales_fixture):
    h = hourly_sales(sales_fixture.id)
    assert len(h['labels']) == len(h['revenue']) == 16     # 08:00 … 23:00


def test_abc_shares_sum_to_100(db, restaurant, make_sold_dish):
    today = timezone.localdate()
    make_sold_dish(restaurant, name='A', price=100000, cost=40000, qty=50)
    make_sold_dish(restaurant, name='B', price=20000, cost=9000, qty=30)
    make_sold_dish(restaurant, name='C', price=5000, cost=4000, qty=5)
    rep = dishes_report(restaurant.id, today - timedelta(days=1), today)
    assert round(sum(i['share_pct'] for i in rep['items'])) == 100
    assert rep['items'][0]['abc'] == 'A'


def test_margin_calculation(db, restaurant, make_sold_dish):
    today = timezone.localdate()
    make_sold_dish(restaurant, name='Osh', price=50000, cost=20000, qty=10)
    rep = dishes_report(restaurant.id, today - timedelta(days=1), today)
    i = rep['items'][0]
    assert i['revenue'] == 500_000
    assert i['cost'] == 200_000
    assert i['margin'] == 300_000
    assert i['margin_pct'] == 60.0


def test_staff_report_orders_counted(db, restaurant, make_order, make_staff):
    today = timezone.localdate()
    w = make_staff(restaurant, role='waiter', name='Aziz')
    make_order(restaurant, total=150_000, status='paid', waiter=w)
    make_order(restaurant, total=250_000, status='paid', waiter=w)
    rep = staff_report(restaurant.id, today, today)
    row = next(i for i in rep['items'] if i['waiter_id'] == w.id)
    assert row['orders'] == 2 and row['revenue'] == 400_000
```

**Fayl:** `tests/test_admin_cross_tenant.py`
```python
import pytest

ADMIN_ENDPOINTS = [
    '/api/v1/analytics/dashboard/',
    '/api/v1/analytics/reports/sales/',
    '/api/v1/analytics/reports/dishes/',
    '/api/v1/analytics/reports/staff/',
    '/api/v1/analytics/reports/menu-engineering/',
    '/api/v1/admin/orders/',
    '/api/v1/admin/staff/',
    '/api/v1/admin/settings/',
    '/api/v1/admin/branding/',
    '/api/v1/admin/i18n/',
    '/api/v1/admin/plan/',
]


@pytest.mark.parametrize('url', ADMIN_ENDPOINTS)
def test_anonymous_denied(api_client, url):
    r = api_client.get(url)
    assert r.status_code in (401, 403)


@pytest.mark.parametrize('url', ADMIN_ENDPOINTS)
def test_waiter_cannot_access_admin(api_client, waiter_user, url):
    api_client.force_authenticate(waiter_user)
    r = api_client.get(url)
    assert r.status_code == 403


def test_other_restaurant_data_invisible(api_client, admin_user, restaurant2,
                                         make_order):
    """⚡ Eng muhim test: begona restoran ma'lumoti KO'RINMASLIGI shart."""
    make_order(restaurant2, total=777_000, status='paid')
    api_client.force_authenticate(admin_user)

    r = api_client.get('/api/v1/admin/orders/')
    assert all(o['total'] != 777_000 for o in r.data['results'])

    k = api_client.get('/api/v1/analytics/dashboard/')
    assert k.data['kpis']['revenue']['value'] == 0


def test_cannot_edit_foreign_staff(api_client, admin_user, restaurant2):
    from apps.accounts.models import StaffUser
    s = StaffUser.objects.create(restaurant=restaurant2, full_name='Begona',
                                 role='waiter')
    api_client.force_authenticate(admin_user)
    r = api_client.patch(f'/api/v1/admin/staff/{s.id}/',
                         {'full_name': 'Hack'}, format='json')
    assert r.status_code == 404


def test_cannot_translate_foreign_dish(api_client, admin_user, restaurant2):
    from apps.menu.models import Dish, Category
    c = Category.objects.create(restaurant=restaurant2, name_uz='X')
    d = Dish.objects.create(restaurant=restaurant2, category=c,
                            name_uz='Begona taom', price=1000)
    api_client.force_authenticate(admin_user)
    r = api_client.post('/api/v1/admin/i18n/save/', {
        'entity': 'dish', 'object_id': d.id, 'field': 'name',
        'lang': 'en', 'value': 'Hacked'}, format='json')
    assert r.status_code in (400, 404)
    d.refresh_from_db()
    assert d.name_en != 'Hacked'
```

**Fayl:** `tests/test_admin_export_format.py`
```python
import io

from openpyxl import load_workbook


def test_sales_xlsx_structure(api_client, admin_user, make_order, restaurant):
    make_order(restaurant, total=100_000, status='paid')
    api_client.force_authenticate(admin_user)
    r = api_client.get('/api/v1/admin/export/sales.xlsx?period=month')
    assert r.status_code == 200
    assert r['Content-Type'].startswith(
        'application/vnd.openxmlformats-officedocument')
    wb = load_workbook(io.BytesIO(b''.join(r.streaming_content
                                           if r.streaming else [r.content])))
    assert 'Savdo' in wb.sheetnames and 'Jami' in wb.sheetnames
    ws = wb['Savdo']
    assert [c.value for c in ws[1]][:3] == ['Davr', 'Savdo', 'Buyurtma']
    assert ws.freeze_panes == 'A2'


def test_dishes_xlsx_has_abc_column(api_client, admin_user, restaurant,
                                    make_sold_dish):
    make_sold_dish(restaurant, name='Osh', price=50000, cost=20000, qty=5)
    api_client.force_authenticate(admin_user)
    r = api_client.get('/api/v1/admin/export/dishes.xlsx?period=month')
    wb = load_workbook(io.BytesIO(r.content))
    assert [c.value for c in wb.active[1]][-1] == 'ABC'


def test_pdf_is_real_pdf(api_client, admin_user, restaurant, make_order):
    make_order(restaurant, total=50_000, status='paid')
    api_client.force_authenticate(admin_user)
    r = api_client.get('/api/v1/admin/export/sales.pdf?period=month')
    assert r.status_code == 200
    assert r['Content-Type'] == 'application/pdf'
    assert r.content[:4] == b'%PDF'
```

**Fayl:** `tests/test_i18n_admin.py`
```python
def test_coverage_counts_filled_fields(db, restaurant):
    from apps.menu.models import Dish, Category
    from apps.i18n_admin.services import coverage
    c = Category.objects.create(restaurant=restaurant, name_uz='Asosiy',
                                name_ru='Основные', name_en='Main')
    Dish.objects.create(restaurant=restaurant, category=c, name_uz='Osh',
                        name_ru='Плов', name_en='Pilaf', price=45000)
    cov = coverage(restaurant.id)
    assert cov['uz'] == 100
    assert cov['en'] < 100      # desc_en bo'sh


def test_only_missing_filter(db, restaurant):
    from apps.menu.models import Dish, Category
    from apps.i18n_admin.services import collect_rows
    c = Category.objects.create(restaurant=restaurant, name_uz='A',
                                name_ru='A', name_en='A')
    Dish.objects.create(restaurant=restaurant, category=c, name_uz='Norin',
                        price=52000)
    rows = collect_rows(restaurant.id, only_missing=True)
    assert all(r['missing'] for r in rows)
    assert any(r['label'] == 'Norin' for r in rows)


def test_save_marks_approved(api_client, admin_user, restaurant):
    from apps.menu.models import Dish, Category
    c = Category.objects.create(restaurant=restaurant, name_uz='A')
    d = Dish.objects.create(restaurant=restaurant, category=c,
                            name_uz='Norin', price=52000)
    api_client.force_authenticate(admin_user)
    r = api_client.post('/api/v1/admin/i18n/save/', {
        'entity': 'dish', 'object_id': d.id, 'field': 'name',
        'lang': 'en', 'value': 'Norin (hand-cut noodles)'}, format='json')
    assert r.status_code == 200
    d.refresh_from_db()
    assert d.name_en.startswith('Norin')
    assert d.tr_approved.get('name_en') is True
    assert not d.tr_auto.get('name_en')


def test_menu_version_bumped_on_save(api_client, admin_user, restaurant):
    from apps.menu.models import Dish, Category
    c = Category.objects.create(restaurant=restaurant, name_uz='A')
    d = Dish.objects.create(restaurant=restaurant, category=c, name_uz='X', price=1)
    before = restaurant.menu_version
    api_client.force_authenticate(admin_user)
    api_client.post('/api/v1/admin/i18n/save/', {
        'entity': 'dish', 'object_id': d.id, 'field': 'name',
        'lang': 'ru', 'value': 'Икс'}, format='json')
    restaurant.refresh_from_db()
    assert restaurant.menu_version > before
```

✅ **Tekshirish:**
```bash
pytest tests/test_admin_reports.py tests/test_admin_cross_tenant.py \
       tests/test_admin_export_format.py tests/test_i18n_admin.py \
       tests/test_staff_crud.py tests/test_branding.py \
       tests/test_plan_limits.py tests/test_menu_engineering.py \
       tests/test_data_export.py tests/test_alerts.py \
       tests/test_auto_translate_queue.py -q
# 45 passed
```

**3 tilda to'liqlik CI tekshiruvi** — `tests/test_i18n_completeness.py`:
```python
import json
from pathlib import Path

LANGS = ['uz', 'ru', 'en']


def _flat(d, prefix=''):
    out = {}
    for k, v in d.items():
        key = f'{prefix}{k}'
        if isinstance(v, dict):
            out.update(_flat(v, key + '.'))
        else:
            out[key] = v
    return out


def test_all_langs_have_same_keys():
    """⚡ CI bloklaydi: har kalit 3 tilda MAVJUD va BO'SH EMAS bo'lishi shart."""
    base = Path('static/i18n')
    data = {L: _flat(json.loads((base / f'{L}.json').read_text(encoding='utf-8')))
            for L in LANGS}
    ref = set(data['uz'])
    for L in ('ru', 'en'):
        missing = ref - set(data[L])
        extra = set(data[L]) - ref
        assert not missing, f'{L}.json da yo\'q: {sorted(missing)[:10]}'
        assert not extra, f'{L}.json da ortiqcha: {sorted(extra)[:10]}'
    for L in LANGS:
        empty = [k for k, v in data[L].items() if not str(v).strip()]
        assert not empty, f'{L}.json da bo\'sh: {empty[:10]}'
```

---

# ✅ FAZA 8 QABULI

```
[ ] Admin layout: sidebar + burger + tema + til almashtirgich ishlaydi
[ ] Dark VA Light tema — barcha sahifada to'g'ri (hex qattiq yozilmagan)
[ ] Dashboard 5 ta KPI kartochkasi to'g'ri hisoblaydi (bekor qilingan HISOBGA KIRMAYDI)
[ ] Soatlik savdo grafigi (Chart.js) chiziladi, tema o'zgarsa ranglar yangilanadi
[ ] TOP-5 taom ko'rinadi
[ ] Jonli oqim WS orqali real vaqtda to'ladi
[ ] Buyurtmalar ro'yxati: holat/sana/qidiruv filtri + sahifalash
[ ] Buyurtma tafsiloti modali (taomlar, modifikator, izoh, vaqt chizig'i)
[ ] Savdo hisoboti: kun/hafta/oy + oldingi davr bilan solishtirish
[ ] Taomlar hisoboti: marja + ABC tahlil (ulushlar yig'indisi 100%)
[ ] ⚡ Menyu-injiniring: 4 kvadrant (Yulduz/Ot/Jumboq/It) + scatter grafik
[ ] ⚡ "Jumboq" da 3D yo'q taomga "🎯 3D qo'shing" tavsiyasi chiqadi
[ ] Xodimlar hisoboti: savdo, o'rtacha chek, xizmat vaqti, reyting
[ ] Excel eksport (savdo/taomlar/xodimlar/buyurtmalar) — freeze panes bilan
[ ] PDF eksport haqiqiy PDF (%PDF sarlavhasi)
[ ] Xodimlar CRUD: rol, PIN (noyob), yoqish/o'chirish, tarif limiti
[ ] Sozlamalar: ish vaqti, xizmat haqi, tillar, funksiya kalitlari
[ ] Brending: logo WEBP ga qayta kodlanadi, rang + shrift, jonli oldindan ko'rish
[ ] ⚡ Tarjima jadvali 3 ustunda, inline tahrir, ⚠️ tasdiqlanmagan belgisi
[ ] ⚡ "AI bilan to'ldirish" navbatga qo'yadi + progress (FAZA 9 gacha 501)
[ ] Tarif sahifasi: limitlar progress-bar, 3 tarif taqqoslash
[ ] To'liq ma'lumot eksporti ZIP (JSON + 2 Excel + README), kuniga 3 marta
[ ] Mobil: 390px da burger, jadval→karta, 44px tegish, gorizontal skroll YO'Q
[ ] Bildirishnomalar: past reyting, stop-list, kechikkan chaqiruv/buyurtma (dedup bilan)
[ ] ⚡ Cross-tenant test: begona restoran ma'lumoti HECH QAYERDA ko'rinmaydi
[ ] 3 til to'liqligi CI testi o'tadi (bo'sh kalit yo'q)
[ ] pytest tests/ -q → o'tadi
```

**Yakuniy:**
```bash
python manage.py collectstatic --noinput
pytest tests/ -q
git add -A && git commit -m "FAZA 8 tugadi: admin panel (dashboard, hisobotlar, tarjima, eksport)"
python3 ROADMAP/03_HOLAT/update_progress.py V-170 ok "FAZA 8 tugadi"
```

**➡️ Keyingi:** `FAZA_09_AI_MCP.md`
