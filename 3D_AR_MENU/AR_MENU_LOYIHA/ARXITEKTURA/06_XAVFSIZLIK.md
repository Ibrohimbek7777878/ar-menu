# ARMENU — TIZIM ARXITEKTURASI
## QISM 6 — XAVFSIZLIK

**Versiya:** 1.0 · **Sana:** 2026-09-08
**Kim uchun:** xavfsizlik muhandisi · backend dasturchi · texnik direktor · auditor
**Asos:** `TZ_MASTER/03_ARXITEKTURA.md` §8, `ARXITEKTURA/05_ISHONCHLILIK.md`

---

## 0. XAVFSIZLIK FALSAFASI

> **Eng katta xavf — ma'lumot sizishi emas, MULTI-TENANT sizishi.**
> Restoran A o'z raqobatchisi restoran B ning buyurtmalarini, narxlarini,
> mijozlarini ko'rsa — bu bitta bug emas, biznesning tugashi.

```
┌──────────────────────────────────────────────────────────────────┐
│                    XAVFSIZLIK QATLAMLARI                          │
├──────────────────────────────────────────────────────────────────┤
│  L0  TARMOQ       Cloudflare WAF · DDoS · faqat 443 · private VPC │
│  L1  TRANSPORT    TLS 1.3 · HSTS · sertifikat pinning (mobil)     │
│  L2  KIRISH       Rate limit · CAPTCHA · bot aniqlash             │
│  L3  AUTH         QR token · PIN · JWT · 2FA TOTP                 │
│  L4  ⚡ TENANT    Middleware → Mixin → Serializer → Test          │
│  L5  AVTORIZATSIYA Rol matritsasi · object-level permission       │
│  L6  VALIDATSIYA  Har kirish nuqtasi · fayl · MIME · magic bytes  │
│  L7  MA'LUMOT     TLS · at-rest shifrlash · PII maskalash         │
│  L8  AUDIT        AuditLog · anomaliya aniqlash · saqlash 5 yil   │
└──────────────────────────────────────────────────────────────────┘

⚡ L4 — boshqa hammasi buzilsa ham L4 ushlab turishi kerak.
```

**3 ta o'zgarmas qoida:**

| # | Qoida | Buzilsa |
|---|---|---|
| 1 | Har DB so'rovi `restaurant_id` bilan chegaralanadi | 🔴 Kompaniya tugaydi |
| 2 | Narx faqat serverda hisoblanadi | 🔴 Moliyaviy zarar |
| 3 | Karta ma'lumoti bizga hech qachon kelmaydi | 🔴 Jinoiy javobgarlik |

---

## 1. TAHDID MODELI (STRIDE)

### 1.1 Aktorlar va ishonch chegaralari

```
┌──────────────────────────── ISHONCHSIZ ZONA ────────────────────────────┐
│                                                                          │
│  👤 Mijoz (auth YO'Q)      🤖 Bot/skaner       😈 Raqobatchi restoran    │
│  ⚠️ Eng katta hujum yuzasi  ⚠️ DDoS, scraping   ⚠️ Ma'lumot o'g'irlash   │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │  🛡 Cloudflare + WAF + rate limit
┌────────────────────────────────▼──────── YARIM ISHONCHLI ────────────────┐
│  🧑‍🍳 Ofitsiant (PIN)      🍳 Oshpaz (KDS)      👨‍💼 Restoran admin       │
│  ⚠️ PIN ulashish           ⚠️ Umumiy qurilma    ⚠️ Ortiqcha huquq        │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │  🛡 JWT + rol + tenant scope
┌────────────────────────────────▼──────── ISHONCHLI ──────────────────────┐
│  🛡 Platforma admin (2FA)   ⚙️ CI/CD          🔧 SRE (SSH kalit)         │
│  ⚠️ Insider tahdid          ⚠️ Supply chain    ⚠️ Kalit o'g'irlanishi    │
└──────────────────────────────────────────────────────────────────────────┘
```

### 1.2 STRIDE tahlili

#### 🎭 S — Spoofing (o'zini boshqa qilib ko'rsatish)

| # | Ssenariy | Ta'sir | 🛡 Himoya |
|---|---|---|---|
| S1 | Hujumchi QR token'ni taxmin qiladi (`/t/abc123`) | Boshqa stol nomidan buyurtma | Token = 22-belgili `secrets.token_urlsafe(16)` (128 bit); rate limit 60/daq/IP; token restoran+stolga bog'langan |
| S2 | Ofitsiant PIN'ini brute-force | Xodim nomidan amal | PIN 6 raqam + bcrypt(cost=12); 5 xato → 15 daq blok (IP+PIN); qurilma fingerprint |
| S3 | JWT token o'g'irlanishi (XSS orqali) | Sessiya egallanishi | `httpOnly` cookie (JS o'qiy olmaydi) + CSP + qisqa TTL (15 daq) + refresh rotatsiyasi |
| S4 | Soxta to'lov webhook (`POST /webhook/payme/`) | Bepul buyurtma | HMAC/Basic imzo tekshiruvi + IP allowlist + provayderdan `check_transaction` tasdiqlash |
| S5 | Boshqa restoran admin'i sifatida kirish | To'liq egallash | Parol + 2FA (platforma admin uchun majburiy) + qurilma tanish |
| S6 | Telegram bot `chat_id` soxtalashtirish | Boshqa restoran bildirishnomasi | Webhook `secret_token` + `chat_id` DB'da bog'langan, payload'dan olinmaydi |
| S7 | Device cookie klonlash (mijoz sessiyasi) | Boshqa mijozning savati | Cookie = imzolangan (`itsdangerous`), IP+UA fingerprint bilan bog'langan; buyurtmadan keyin ahamiyatsiz |

#### ✏️ T — Tampering (ma'lumotni o'zgartirish)

| # | Ssenariy | Ta'sir | 🛡 Himoya |
|---|---|---|---|
| T1 | 🔴 **Klient narxni o'zgartiradi** (`{"price": 1}`) | Moliyaviy zarar | ⚡ **Narx serializer'da `read_only`**; server `Dish.price` dan oladi; klient faqat `dish_id`+`qty` yuboradi |
| T2 | `restaurant_id` ni body'da yuborish | Cross-tenant yozuv | `restaurant_id` **hech qachon** request body'dan olinmaydi — faqat middleware'dan |
| T3 | Buyurtma statusini o'zgartirish (`status: "paid"`) | To'lovsiz taom | Status faqat state-machine orqali; `status` field serializer'da `read_only` |
| T4 | Yuklangan 3D faylga zararli kod | XSS / RCE | MIME + magic bytes + `glTF-validator`; alohida CDN domendan beriladi; `Content-Disposition: attachment` |
| T5 | Chegirma/promokod manipulyatsiyasi | Moliyaviy zarar | Promokod serverda tekshiriladi (mavjudlik, muddat, limit, tenant); klient faqat kod matnini yuboradi |
| T6 | URL parametrida `id` o'zgartirish (IDOR) | Boshqa buyurtmani ko'rish | Object-level permission + tenant scope + `owner_session` tekshiruvi |
| T7 | WS xabar ichida `restaurant_id` almashtirish | Boshqa restoran KDS'iga xabar | Group nomi **serverda** `scope['restaurant_id']` dan quriladi, xabardan emas |
| T8 | Fiskal chek summasini o'zgartirish | Soliq buzilishi | Chek `Order` dan generatsiya qilinadi; `receipt_hash` saqlanadi; OFD javobi solishtiriladi |

#### 🙅 R — Repudiation (rad etish)

| # | Ssenariy | Ta'sir | 🛡 Himoya |
|---|---|---|---|
| R1 | Restoran "biz bu buyurtmani olmadik" deydi | Nizо | `AuditLog`: kim, nima, qachon, IP, UA; WS yetkazish tasdiqlanishi |
| R2 | Xodim "men bekor qilmadim" deydi | Ichki o'g'irlik | Har amal `actor_type` + `actor_id` + `pin_session_id` bilan yoziladi |
| R3 | Mijoz "men to'lamadim" deydi | Chargeback | Provayder `txn_id` + fiskal chek + `AuditLog` |
| R4 | Admin log'ni o'chiradi | Iz yo'qoladi | AuditLog **faqat qo'shiladi** (append-only), `DELETE` huquqi hech kimda yo'q; kunlik WORM S3 eksport |

#### 📢 I — Information Disclosure (ma'lumot sizishi)

| # | Ssenariy | Ta'sir | 🛡 Himoya |
|---|---|---|---|
| I1 | 🔴 **Cross-tenant sizish** (filtr unutildi) | Kompaniya tugaydi | ⚡ 4 qatlamli himoya — §2 |
| I2 | Xato sahifasida stack trace | Ichki tuzilma oshkor | `DEBUG=False`; maxsus 500 sahifa; Sentry'da to'liq, foydalanuvchida `request_id` |
| I3 | API javobida ortiqcha maydon (`cost_price`) | Raqobat sirlari | Serializer'da **oq ro'yxat** (`fields = [...]`), hech qachon `__all__` |
| I4 | Menyu scraping (raqobatchi narxlarni yig'adi) | Biznes zarari | Rate limit + bot aniqlash (Cloudflare) + `robots.txt` + anomal so'rov alerti |
| I5 | S3 bucket ochiq | Barcha 3D/rasm | Bucket private; presigned URL (1 soat); CDN signed URL |
| I6 | Log'da telefon/karta raqami | PII sizishi | ⚡ Log filtri — §5.4 maskalash |
| I7 | Timing attack (PIN tekshiruvi) | PIN taxmini | `secrets.compare_digest` + bcrypt (o'zi doimiy vaqt emas, lekin rate limit qoplaydi) |
| I8 | `.git`, `.env` veb orqali ochiq | To'liq egallash | nginx `location ~ /\.` → 404; deploy'da faqat kerakli fayllar |
| I9 | Xato xabari ma'lumot beradi ("bunday PIN yo'q") | Foydalanuvchi ro'yxati | Umumiy xabar: "PIN yoki xodim topilmadi" |

#### 🚫 D — Denial of Service

| # | Ssenariy | Ta'sir | 🛡 Himoya |
|---|---|---|---|
| D1 | Volumetric DDoS | Xizmat o'chadi | Cloudflare (L3/L4/L7), Under Attack rejimi |
| D2 | Buyurtma spam (1 sessiya, 1000 buyurtma) | DB to'lishi, oshxona bloklanishi | Rate limit 10/daq/sessiya + stol bo'yicha 30/soat + "shubhali" flag |
| D3 | Katta fayl yuklash | Disk to'lishi | `client_max_body_size 50M` + `MAX_UPLOAD_SIZE` + kvota (restoran bo'yicha) |
| D4 | Og'ir so'rov (`?limit=1000000`) | DB bloklanishi | Pagination majburiy (maks 100) + `statement_timeout=10s` |
| D5 | WS ulanish bombardimoni | Daphne to'lishi | Ulanish limiti (IP bo'yicha 10, sessiya bo'yicha 3) + auth majburiy |
| D6 | AI so'rov spam (xarajat hujumi) | 💸 Pul yo'qotish | Rate limit 10/5daq + kunlik xarajat cheki + CB |
| D7 | Regex/ReDoS qidiruvda | CPU 100% | Qidiruv PostgreSQL FTS orqali, regex klientdan qabul qilinmaydi |
| D8 | Zip bomb (3D arxiv) | Disk/RAM | Ochilgan hajm cheki (100 MB), fayl soni cheki |

#### 👑 E — Elevation of Privilege

| # | Ssenariy | Ta'sir | 🛡 Himoya |
|---|---|---|---|
| E1 | Ofitsiant admin API'ga kiradi | Menyu/narx o'zgartirish | Permission klass har view'da; rol JWT ichida, serverda tekshiriladi |
| E2 | Restoran admin platforma admin bo'ladi | Barcha tenantlar | `is_platform_admin` alohida model+2FA; hech qachon API orqali o'zgarmaydi |
| E3 | Mass assignment (`{"role": "admin"}`) | Huquq oshishi | Serializer oq ro'yxati; `role`, `restaurant`, `is_active` — `read_only` |
| E4 | SQL injection → `SET ROLE` | To'liq DB | ORM; `raw()` taqiqlangan (CI linter); parametrlangan so'rov |
| E5 | Deserializatsiya (pickle) | RCE | `pickle` taqiqlangan; navbat payload = JSON + sxema |
| E6 | Bog'liqlik (supply chain) | RCE | `pip-audit` CI'da; `requirements.txt` hash-pinned; Dependabot |
| E7 | Django admin ochiq | To'liq egallash | `/admin/` — IP allowlist + 2FA + boshqa port; production'da o'chirilgan |

---

## 2. ⚡ MULTI-TENANT IZOLYATSIYA — ENG MUHIM BO'LIM

> **Bu bo'lim ARMENU xavfsizligining yuragi.** Boshqa hamma narsa buzilsa
> tuzatish mumkin. Tenant sizishi — mijoz ishonchi qaytmaydi.

### 2.1 4 qatlamli himoya

```
   HTTP so'rov
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐
│  QATLAM 1 — MIDDLEWARE                                           │
│  restaurant_id ANIQLANADI va thread-local'ga yoziladi            │
│  Manba: subdomain | QR token | JWT claim                         │
│  ⛔ HECH QACHON request body/query'dan olinmaydi                 │
│  Aniqlanmasa → 400, so'rov davom etmaydi                         │
└─────────────────────────────┬────────────────────────────────────┘
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  QATLAM 2 — QuerySet MIXIN (majburiy)                            │
│  get_queryset() → .filter(restaurant_id=request.restaurant_id)   │
│  Har ViewSet TenantScopedMixin dan meros oladi                   │
│  Meros olmasa → CI test yiqiladi                                 │
└─────────────────────────────┬────────────────────────────────────┘
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  QATLAM 3 — SERIALIZER (yozuvda)                                 │
│  restaurant — read_only; create()'da serverdan qo'yiladi         │
│  FK maydonlar (dish, table, category) — tenant-scoped queryset   │
│  Boshqa restoran dish_id → validation error                      │
└─────────────────────────────┬────────────────────────────────────┘
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  QATLAM 4 — TEST + CI GATE                                       │
│  Har model uchun cross-tenant test (403/404 shart)               │
│  Har ViewSet mixin'ga egaligi tekshiriladi (introspection)       │
│  ⛔ Test o'tmasa DEPLOY BLOKLANADI                               │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 Qatlam 1 — Middleware

```python
# core/middleware/tenant.py
import threading
from django.http import JsonResponse
from django.core.cache import cache
from apps.tenants.models import Restaurant

_local = threading.local()


def current_restaurant_id():
    """Har joydan (signal, servis, worker) joriy tenant."""
    rid = getattr(_local, 'restaurant_id', None)
    if rid is None:
        raise TenantNotSet("restaurant_id o'rnatilmagan — xavfsizlik xatosi")
    return rid


class TenantMiddleware:
    """
    ⚡ restaurant_id ni ANIQLAYDI. Uch manbadan, prioritet tartibida:
      1. JWT claim  (xodim/admin)        — eng ishonchli
      2. QR token   (mijoz)              — DB'dan qidiriladi
      3. Subdomain  (<slug>.armenu.uz)   — DB'dan qidiriladi

    ⛔ HECH QACHON: request.POST['restaurant_id'], GET['rid'], header
    """
    EXEMPT_PREFIXES = ('/healthz', '/metrics', '/webhook/', '/platform/', '/static/')

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _local.restaurant_id = None
        request.restaurant_id = None
        request.tenant_source = None

        if not any(request.path.startswith(p) for p in self.EXEMPT_PREFIXES):
            rid, source = self._resolve(request)
            if rid is None:
                return JsonResponse(
                    {'error': 'restaurant_not_resolved',
                     'detail': "Restoran aniqlanmadi"}, status=400)
            request.restaurant_id = rid
            request.tenant_source = source
            _local.restaurant_id = rid

        try:
            response = self.get_response(request)
        finally:
            _local.restaurant_id = None          # ⚡ thread reuse xavfi yo'q

        if request.restaurant_id:
            response['X-Tenant-Source'] = request.tenant_source
        return response

    # ---- aniqlash ----
    def _resolve(self, request):
        # 1) JWT (xodim / admin)
        claims = getattr(request, 'auth_claims', None)
        if claims and claims.get('rid'):
            return int(claims['rid']), 'jwt'

        # 2) QR token (mijoz)
        token = request.resolver_match.kwargs.get('token') if request.resolver_match else None
        token = token or request.session.get('qr_token')
        if token:
            rid = self._from_token(token)
            if rid:
                return rid, 'qr_token'

        # 3) Subdomain
        host = request.get_host().split(':')[0]
        parts = host.split('.')
        if len(parts) >= 3 and parts[0] not in ('www', 'api', 'cdn', 'admin'):
            rid = self._from_slug(parts[0])
            if rid:
                return rid, 'subdomain'

        return None, None

    def _from_token(self, token):
        key = f'tenant:token:{token}'
        rid = cache.get(key)
        if rid is None:
            from apps.tenants.models import QrToken
            rid = (QrToken.objects.filter(token=token, is_active=True)
                   .values_list('restaurant_id', flat=True).first())
            cache.set(key, rid or 0, 300)
        return rid or None

    def _from_slug(self, slug):
        key = f'tenant:slug:{slug}'
        rid = cache.get(key)
        if rid is None:
            rid = (Restaurant.objects.filter(slug=slug, is_active=True)
                   .values_list('id', flat=True).first())
            cache.set(key, rid or 0, 300)
        return rid or None
```

**⚠️ Worker uchun ham majburiy:**

```python
# core/queue/worker.py
def execute_job(job):
    """Worker'da ham tenant kontekst o'rnatiladi — signal/servis ishlashi uchun."""
    rid = job.payload.get('restaurant_id')
    _local.restaurant_id = rid
    try:
        return TASKS[job.task_name](**job.payload)
    finally:
        _local.restaurant_id = None      # ⚡ keyingi job boshqa tenant bo'lishi mumkin
```

### 2.3 Qatlam 2 — QuerySet Mixin

```python
# core/mixins.py
from rest_framework.exceptions import PermissionDenied


class TenantScopedMixin:
    """
    ⚡ HAR ViewSet shu mixin'dan meros olishi SHART.
    CI testi mixin'siz ViewSet'ni topsa — deploy bloklanadi.
    """
    tenant_field = 'restaurant_id'       # murakkab yo'l: 'category__restaurant_id'

    def get_queryset(self):
        qs = super().get_queryset()
        rid = getattr(self.request, 'restaurant_id', None)
        if rid is None:
            raise PermissionDenied("Restoran aniqlanmadi")
        return qs.filter(**{self.tenant_field: rid})

    def perform_create(self, serializer):
        # ⚡ restaurant klientdan EMAS — serverdan
        serializer.save(restaurant_id=self.request.restaurant_id)


class TenantScopedManager(models.Manager):
    """Model darajasidagi qo'shimcha himoya (servis kodida ishlatiladi)."""
    def scoped(self):
        return self.filter(restaurant_id=current_restaurant_id())
```

**Model darajasidagi qoida:**

```python
# apps/menu/models.py
class Dish(models.Model):
    # ⚡ Har tenant-scoped modelda BEVOSITA restaurant FK bo'lishi shart
    # (category orqali emas — filtr sodda va indeks samarali bo'lsin)
    restaurant = models.ForeignKey('tenants.Restaurant', on_delete=models.CASCADE,
                                   related_name='dishes', db_index=True)
    category   = models.ForeignKey('menu.Category', on_delete=models.PROTECT)
    name       = models.CharField(max_length=200)
    price      = models.DecimalField(max_digits=12, decimal_places=2)

    objects = TenantScopedManager()

    class Meta:
        # ⚡ Har kompozit indeks restaurant_id bilan boshlanadi
        indexes = [
            models.Index(fields=['restaurant', 'category', 'is_active']),
            models.Index(fields=['restaurant', 'is_available']),
        ]
        constraints = [
            # Kategoriya boshqa restoranga tegishli bo'lishi mumkin emas
            models.UniqueConstraint(fields=['restaurant', 'slug'],
                                    name='uniq_dish_slug_per_restaurant'),
        ]
```

### 2.4 Qatlam 3 — Serializer

```python
# apps/orders/serializers.py
class OrderItemInSerializer(serializers.Serializer):
    dish_id  = serializers.IntegerField()
    qty      = serializers.IntegerField(min_value=1, max_value=50)
    modifiers= serializers.ListField(child=serializers.IntegerField(),
                                     required=False, max_length=20)
    note     = serializers.CharField(max_length=200, required=False, allow_blank=True)
    # ⛔ price YO'Q — klient narx yubora olmaydi


class OrderCreateSerializer(serializers.ModelSerializer):
    items = OrderItemInSerializer(many=True, min_length=1, max_length=50)

    class Meta:
        model = Order
        # ⚡ Oq ro'yxat — hech qachon '__all__'
        fields = ['table_id', 'items', 'comment', 'guest_count']
        # restaurant, status, total, number — serverda

    def validate_table_id(self, value):
        rid = self.context['request'].restaurant_id
        # ⚡ Stol SHU restoranniki ekanini tekshirish
        if not Table.objects.filter(id=value, restaurant_id=rid, is_active=True).exists():
            raise serializers.ValidationError("Stol topilmadi")
        return value

    def validate_items(self, items):
        rid = self.context['request'].restaurant_id
        dish_ids = [i['dish_id'] for i in items]
        # ⚡ BITTA so'rovda: shu restoran + mavjud + stop-listda emas
        valid = dict(Dish.objects
                     .filter(id__in=dish_ids, restaurant_id=rid,
                             is_active=True, is_available=True)
                     .values_list('id', 'price'))
        missing = set(dish_ids) - set(valid)
        if missing:
            raise serializers.ValidationError(
                f"Taom topilmadi yoki mavjud emas: {sorted(missing)}")
        # Modifikatorlar ham shu restorannikimi?
        mod_ids = {m for i in items for m in i.get('modifiers', [])}
        if mod_ids:
            ok = set(Modifier.objects.filter(id__in=mod_ids, restaurant_id=rid)
                     .values_list('id', flat=True))
            if mod_ids - ok:
                raise serializers.ValidationError("Modifikator topilmadi")
        self.context['dish_prices'] = valid
        return items

    def create(self, validated):
        request = self.context['request']
        rid = request.restaurant_id
        prices = self.context['dish_prices']

        with transaction.atomic():
            order = Order.objects.create(
                restaurant_id=rid,                       # ⚡ serverdan
                table_id=validated['table_id'],
                session_key=request.session.session_key,
                status='new',
                comment=validated.get('comment', ''),
            )
            items, total = [], Decimal('0')
            for it in validated['items']:
                # ⚡⚡ NARX SERVERDA — klient qiymati umuman o'qilmaydi
                unit = prices[it['dish_id']]
                mod_sum = modifier_total(it.get('modifiers', []), rid)
                line = (unit + mod_sum) * it['qty']
                total += line
                items.append(OrderItem(
                    order=order, restaurant_id=rid, dish_id=it['dish_id'],
                    qty=it['qty'], unit_price=unit, modifier_price=mod_sum,
                    line_total=line, note=it.get('note', '')[:200],
                ))
            OrderItem.objects.bulk_create(items)
            order.total = total
            order.save(update_fields=['total'])
            publish('order.created', {'order_id': order.id}, restaurant_id=rid)
        return order
```

**FK maydon uchun tenant-scoped queryset:**

```python
# core/fields.py
class TenantPrimaryKeyRelatedField(serializers.PrimaryKeyRelatedField):
    """Faqat joriy restoran obyektlarini qabul qiladi."""
    def get_queryset(self):
        qs = super().get_queryset()
        rid = self.context['request'].restaurant_id
        return qs.filter(restaurant_id=rid)
```

### 2.5 Qatlam 4 — WebSocket izolyatsiyasi

> ⚡ WS — eng ko'p unutiladigan sizish nuqtasi.

```python
# core/ws/consumers.py
class BaseTenantConsumer(AsyncJsonWebsocketConsumer):
    """Group nomi HAR DOIM serverda quriladi."""

    async def connect(self):
        rid = self.scope.get('restaurant_id')          # auth middleware o'rnatgan
        role = self.scope.get('role')
        if not rid or not role:
            await self.close(code=4401)                 # unauthorized
            return
        # ⛔ HECH QACHON: self.scope['url_route']['kwargs']['restaurant_id']
        self.group = f"rest_{rid}_{self.channel_suffix(role)}"
        if not self.role_allowed(role):
            await self.close(code=4403)
            return
        await self.channel_layer.group_add(self.group, self.channel_name)
        await self.accept()

    async def receive_json(self, content):
        # ⚡ Kiruvchi xabardagi restaurant_id BUTUNLAY E'TIBORSIZ qoldiriladi
        content.pop('restaurant_id', None)
        await self.handle(content, restaurant_id=self.scope['restaurant_id'])
```

```python
# core/ws/sender.py
def ws_send(group: str, payload: dict):
    """⚡ Group nomi tekshiriladi — noto'g'ri formatda yuborish mumkin emas."""
    if not re.fullmatch(r'(rest_\d+_(kds|waiters|admin|cashier))|(guest_[a-f0-9]{32})', group):
        raise ValueError(f"Noto'g'ri WS group nomi: {group}")
    async_to_sync(get_channel_layer().group_send)(group, {'type': 'push', **payload})
```

### 2.6 🔴 Qanday buziladi — real misollar

| # | Xato | Kod | Nima bo'ladi | To'g'ri yechim |
|---|---|---|---|---|
| **1** | `get_object_or_404` filtrsiz | `dish = get_object_or_404(Dish, pk=pk)` | Har kim har restoran taomini ko'radi | `get_object_or_404(Dish, pk=pk, restaurant_id=request.restaurant_id)` |
| **2** | ViewSet mixin'siz | `class DishVS(ModelViewSet): queryset = Dish.objects.all()` | To'liq katalog sizadi | `class DishVS(TenantScopedMixin, ModelViewSet)` |
| **3** | Nested serializer FK | `category = PrimaryKeyRelatedField(queryset=Category.objects.all())` | Boshqa restoran kategoriyasiga bog'lash | `TenantPrimaryKeyRelatedField(queryset=Category.objects.all())` |
| **4** | Signal'da tenant yo'q | `@receiver(post_save) def f(instance): Stat.objects.create(...)` | Statistika aralashadi | `restaurant_id=instance.restaurant_id` aniq berish |
| **5** | Worker'da kontekst yo'q | `def task(dish_id): Dish.objects.get(pk=dish_id)` | Fon ishda sizish | `restaurant_id` payload'da majburiy + `_local` o'rnatish |
| **6** | Kesh kaliti tenant'siz | `cache.set(f'menu:{lang}', data)` | 🔴 Restoran A menyusi B ga ko'rinadi | `cache.set(f'menu:{rid}:{lang}', data)` |
| **7** | WS group klientdan | `group = content['room']` | Boshqa restoran KDS'ini eshitish | Group serverda `scope` dan quriladi |
| **8** | Idempotency kalit global | `f'idem:{key}'` | Tenantlar to'qnashadi | `f'idem:{rid}:{key}'` |
| **9** | Raw SQL | `Dish.objects.raw("SELECT * FROM dish WHERE id=%s", [pk])` | Filtr yo'q | Raw taqiqlangan; kerak bo'lsa `WHERE restaurant_id=%s` majburiy |
| **10** | Aggregate filtrsiz | `Order.objects.aggregate(Sum('total'))` | Butun platforma aylanmasi | `.filter(restaurant_id=rid).aggregate(...)` |
| **11** | `related_name` orqali | `restaurant.dishes.all()` ✅ lekin `category.dishes.all()` ⛔ | Kategoriya boshqa restoranniki bo'lsa | Kategoriya ham avval scope qilinadi |
| **12** | Fayl yo'li tenant'siz | `media/3d/{dish_id}.glb` | ID taxmin qilinsa fayl olinadi | `media/3d/{rid}/{uuid}.glb` + presigned URL |
| **13** | Eksport (Excel/PDF) | `qs = Order.objects.filter(date__gte=d)` | Butun platforma hisoboti | Eksport ham `TenantScopedMixin` orqali |
| **14** | Admin autocomplete | DRF `SearchFilter` mixin'siz view'da | Qidiruvda boshqa tenant | Autocomplete ham scoped ViewSet |
| **15** | `select_related` teskari yo'nalish | `OrderItem.objects.select_related('order')` filtrsiz | Barcha buyurtma satrlari | `OrderItem` da ham bevosita `restaurant_id` bor |

### 2.7 CI tekshiruvi

```python
# tests/security/test_tenant_isolation.py
import pytest
from django.apps import apps
from rest_framework.viewsets import GenericViewSet
from core.mixins import TenantScopedMixin

TENANT_MODELS = [m for m in apps.get_models()
                 if any(f.name == 'restaurant' for f in m._meta.fields)]

EXEMPT_VIEWSETS = {'PlatformRestaurantViewSet', 'HealthViewSet'}   # ataylab global


# ─────────────────────────────────────────────────────────────
# TEST 1 — har ViewSet mixin'ga ega (statik introspection)
# ─────────────────────────────────────────────────────────────
def test_all_viewsets_are_tenant_scoped():
    from core.urls_registry import all_viewsets
    bad = []
    for vs in all_viewsets():
        if vs.__name__ in EXEMPT_VIEWSETS:
            continue
        model = getattr(getattr(vs, 'queryset', None), 'model', None)
        if model in TENANT_MODELS and not issubclass(vs, TenantScopedMixin):
            bad.append(vs.__name__)
    assert not bad, f"⛔ TenantScopedMixin yo'q ViewSet'lar: {bad}"


# ─────────────────────────────────────────────────────────────
# TEST 2 — har model uchun cross-tenant kirish 403/404
# ─────────────────────────────────────────────────────────────
@pytest.mark.parametrize('model', TENANT_MODELS, ids=lambda m: m.__name__)
@pytest.mark.django_db
def test_cross_tenant_read_denied(model, api_client, rest_a, rest_b, factory):
    obj_b = factory(model, restaurant=rest_b)
    url = detail_url_for(model, obj_b.pk)
    if url is None:
        pytest.skip(f"{model.__name__} uchun API endpoint yo'q")
    api_client.login_as_admin(rest_a)                # A restorani admini
    resp = api_client.get(url)
    assert resp.status_code in (403, 404), \
        f"🔴 SIZISH: {model.__name__} — A restorani B ning obyektini ko'rdi ({resp.status_code})"


@pytest.mark.parametrize('model', TENANT_MODELS, ids=lambda m: m.__name__)
@pytest.mark.django_db
def test_cross_tenant_write_denied(model, api_client, rest_a, rest_b, factory):
    obj_b = factory(model, restaurant=rest_b)
    url = detail_url_for(model, obj_b.pk)
    if url is None:
        pytest.skip()
    api_client.login_as_admin(rest_a)
    for method in ('patch', 'delete'):
        resp = getattr(api_client, method)(url, {})
        assert resp.status_code in (403, 404), \
            f"🔴 SIZISH: {model.__name__} {method.upper()} ruxsat etildi"


# ─────────────────────────────────────────────────────────────
# TEST 3 — boshqa restoran dish_id bilan buyurtma
# ─────────────────────────────────────────────────────────────
@pytest.mark.django_db
def test_order_with_foreign_dish_rejected(api_client, rest_a, rest_b, dish_factory,
                                          table_factory):
    dish_b = dish_factory(restaurant=rest_b, price=50000)
    table_a = table_factory(restaurant=rest_a)
    api_client.as_guest(rest_a, table_a)
    resp = api_client.post('/v1/orders/', {
        'table_id': table_a.id,
        'items': [{'dish_id': dish_b.id, 'qty': 1}],
    }, format='json')
    assert resp.status_code == 400
    assert 'Taom topilmadi' in str(resp.data)


# ─────────────────────────────────────────────────────────────
# TEST 4 — kesh kalitlari tenant bilan
# ─────────────────────────────────────────────────────────────
def test_cache_keys_contain_tenant():
    """Statik tahlil: cache.set/get chaqiruvlarida rid bo'lishi shart."""
    import ast, pathlib
    bad = []
    for path in pathlib.Path('apps').rglob('*.py'):
        tree = ast.parse(path.read_text())
        for node in ast.walk(tree):
            if (isinstance(node, ast.Call)
                    and isinstance(node.func, ast.Attribute)
                    and node.func.attr in ('set', 'get', 'get_or_set')
                    and getattr(node.func.value, 'id', '') == 'cache'
                    and node.args):
                src = ast.unparse(node.args[0])
                if 'rid' not in src and 'restaurant' not in src and 'global:' not in src:
                    bad.append(f"{path}:{node.lineno} → {src}")
    assert not bad, f"⛔ Tenant'siz kesh kalitlari:\n" + "\n".join(bad)


# ─────────────────────────────────────────────────────────────
# TEST 5 — narx manipulyatsiyasi
# ─────────────────────────────────────────────────────────────
@pytest.mark.django_db
def test_client_cannot_set_price(api_client, rest_a, dish_factory, table_factory):
    dish = dish_factory(restaurant=rest_a, price=Decimal('75000'))
    table = table_factory(restaurant=rest_a)
    api_client.as_guest(rest_a, table)
    resp = api_client.post('/v1/orders/', {
        'table_id': table.id,
        'items': [{'dish_id': dish.id, 'qty': 2, 'price': 1, 'unit_price': 1}],
    }, format='json')
    assert resp.status_code == 201
    order = Order.objects.get(pk=resp.data['id'])
    assert order.total == Decimal('150000'), "🔴 Klient narxni o'zgartira oldi!"


# ─────────────────────────────────────────────────────────────
# TEST 6 — WS group izolyatsiyasi
# ─────────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_ws_cannot_join_foreign_group(rest_a, rest_b):
    comm = WebsocketCommunicator(app, f'/ws/kds/')
    comm.scope['restaurant_id'] = rest_a.id
    comm.scope['role'] = 'cook'
    connected, _ = await comm.connect()
    assert connected
    # B restoraniga xabar yuboramiz — A eshitmasligi kerak
    await ws_send_async(f'rest_{rest_b.id}_kds', {'order_id': 1})
    with pytest.raises(asyncio.TimeoutError):
        await comm.receive_json_from(timeout=1)
```

**CI gate:**

```yaml
# .github/workflows/security.yml
name: Security Gate
on: [push, pull_request]

jobs:
  tenant-isolation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: ⚡ Multi-tenant izolyatsiya testlari
        run: pytest tests/security/test_tenant_isolation.py -x -q --no-header
      - name: Taqiqlangan naqshlar (grep gate)
        run: |
          set -e
          fail=0
          echo "→ objects.all() ViewSet'da"
          ! grep -rn "queryset = .*\.objects\.all()" apps/*/views*.py \
              --include="*.py" | grep -v "TenantScoped" || fail=1
          echo "→ .raw( ishlatilishi"
          ! grep -rn "\.raw(" apps/ --include="*.py" || fail=1
          echo "→ fields = '__all__'"
          ! grep -rn "fields = '__all__'" apps/ --include="*.py" || fail=1
          echo "→ pickle"
          ! grep -rn "import pickle" apps/ core/ --include="*.py" || fail=1
          echo "→ mark_safe / |safe"
          ! grep -rn "mark_safe\|{{.*|safe" apps/ templates/ || fail=1
          exit $fail
      - name: Bog'liqlik audit
        run: pip-audit --strict -r requirements.txt
      - name: Statik tahlil
        run: bandit -r apps/ core/ -ll -x tests
```

### 2.8 Doimiy audit (production'da)

```python
# core/security/tenant_audit.py
"""
Har kecha production DB'da tenant butunligini tekshiradi.
Har qanday anomaliya → 🔴 P1 alert.
"""
CHECKS = [
    # (nom, SQL, kutilgan natija)
    ("dish_category_mismatch", """
        SELECT count(*) FROM menu_dish d
        JOIN menu_category c ON c.id = d.category_id
        WHERE d.restaurant_id <> c.restaurant_id
    """, 0),
    ("orderitem_order_mismatch", """
        SELECT count(*) FROM orders_orderitem oi
        JOIN orders_order o ON o.id = oi.order_id
        WHERE oi.restaurant_id <> o.restaurant_id
    """, 0),
    ("order_table_mismatch", """
        SELECT count(*) FROM orders_order o
        JOIN tenants_table t ON t.id = o.table_id
        WHERE o.restaurant_id <> t.restaurant_id
    """, 0),
    ("payment_order_mismatch", """
        SELECT count(*) FROM payments_transaction p
        JOIN orders_order o ON o.id = p.order_id
        WHERE p.restaurant_id <> o.restaurant_id
    """, 0),
    ("null_restaurant_id", """
        SELECT count(*) FROM menu_dish WHERE restaurant_id IS NULL
    """, 0),
]


def run_audit():
    problems = []
    with connections['report'].cursor() as cur:
        for name, sql, expected in CHECKS:
            cur.execute(sql)
            got = cur.fetchone()[0]
            metrics.gauge('armenu_tenant_audit', 0 if got != expected else 1,
                          labels={'check': name})
            if got != expected:
                problems.append(f"{name}: {got} (kutilgan {expected})")
    if problems:
        alert_oncall("🔴🔴 TENANT BUTUNLIGI BUZILGAN:\n" + "\n".join(problems)
                     + "\nQILISH: 1) deploy to'xtatilsin 2) so'nggi migratsiya/PR "
                       "ko'rib chiqilsin 3) ta'sirlangan yozuvlar aniqlansin",
                     severity='P1')
    return problems
```

**Anomaliya aniqlash (jonli):**

| Signal | Chegara | Ma'nosi |
|---|---|---|
| Bitta sessiya > 3 ta `restaurant_id` bilan so'rov | 5 daq | QR token skanerlash urinishi |
| `403 tenant_denied` > 20/daq bitta IP dan | 1 daq | Cross-tenant zondlash |
| `X-Tenant-Source: subdomain` mismatch JWT bilan | har hodisa | 🔴 Token qayta ishlatish urinishi |
| Bitta IP dan > 50 ta turli `slug` | 10 daq | Tenant ro'yxatini yig'ish |

---

## 3. AUTENTIFIKATSIYA ARXITEKTURASI

### 3.1 4 xil aktor — umumiy ko'rinish

```
┌──────────────┬───────────────┬──────────────┬──────────────┬─────────────┐
│   AKTOR      │   AUTH USULI  │   TOKEN      │  TTL         │  RISK       │
├──────────────┼───────────────┼──────────────┼──────────────┼─────────────┤
│ 👤 Mijoz     │ ⛔ YO'Q        │ device cookie│ 12 soat      │ 🟢 Past     │
│              │ (QR + cookie) │ + session    │              │             │
├──────────────┼───────────────┼──────────────┼──────────────┼─────────────┤
│ 🧑‍🍳 Ofitsiant│ PIN (6 raqam) │ JWT access   │ 15 daq       │ 🟡 O'rta    │
│              │               │ + refresh    │ 12 soat      │             │
├──────────────┼───────────────┼──────────────┼──────────────┼─────────────┤
│ 👨‍💼 Admin    │ Email+parol   │ JWT access   │ 15 daq       │ 🟠 Yuqori   │
│              │               │ + refresh    │ 7 kun        │             │
├──────────────┼───────────────┼──────────────┼──────────────┼─────────────┤
│ 🛡 Platforma │ Parol + 2FA   │ JWT access   │ 10 daq       │ 🔴 Kritik   │
│    admin     │ (TOTP)        │ + refresh    │ 24 soat      │             │
└──────────────┴───────────────┴──────────────┴──────────────┴─────────────┘
```

### 3.2 👤 Mijoz — autentifikatsiyasiz

> **Qaror:** mijozdan ro'yxatdan o'tish **so'ralmaydi**. Bu mahsulot qarori
> (konversiya), lekin xavfsizlik oqibatlari bor va ular boshqariladi.

```
  QR skanerlash                 Server
       │                           │
       ├── GET /t/K7xQm2p9nR ─────▶│
       │                           │ 1) token → (restaurant_id, table_id)
       │                           │ 2) rate limit: 60/daq/IP
       │                           │ 3) session yaratish (Django session, Redis)
       │                           │ 4) device_id cookie (imzolangan, 12 soat)
       │◀── 200 + Set-Cookie ──────┤    httpOnly, Secure, SameSite=Lax
       │    armenu_did=<signed>    │
       │    sessionid=<...>        │
       │                           │
       ├── POST /v1/orders/ ──────▶│ session → (rid, table_id) tekshiriladi
       │   Cookie: sessionid       │ ⛔ Body'dagi rid/table E'TIBORSIZ
```

```python
# apps/guest/auth.py
from itsdangerous import URLSafeTimedSerializer, BadSignature

_signer = URLSafeTimedSerializer(settings.DEVICE_COOKIE_SECRET, salt='armenu-device')
DEVICE_TTL = 12 * 3600


def issue_device_cookie(response, restaurant_id, table_id, request):
    payload = {
        'did': secrets.token_urlsafe(12),
        'rid': restaurant_id,
        'tid': table_id,
        # ⚡ Zaif fingerprint — klonlashni qiyinlashtiradi, lekin UX buzmaydi
        'fp': hashlib.sha256(
            f"{request.META.get('HTTP_USER_AGENT','')}|"
            f"{request.META.get('HTTP_ACCEPT_LANGUAGE','')}".encode()
        ).hexdigest()[:12],
    }
    response.set_cookie(
        'armenu_did', _signer.dumps(payload),
        max_age=DEVICE_TTL, httponly=True, secure=True, samesite='Lax',
        path='/',
    )


def read_device_cookie(request):
    raw = request.COOKIES.get('armenu_did')
    if not raw:
        return None
    try:
        data = _signer.loads(raw, max_age=DEVICE_TTL)
    except BadSignature:
        metrics.inc('armenu_device_cookie_invalid_total')
        return None
    expected_fp = hashlib.sha256(
        f"{request.META.get('HTTP_USER_AGENT','')}|"
        f"{request.META.get('HTTP_ACCEPT_LANGUAGE','')}".encode()
    ).hexdigest()[:12]
    if data.get('fp') != expected_fp:
        # ⚡ Blok qilmaymiz (brauzer yangilanishi mumkin) — faqat belgilaymiz
        data['fp_mismatch'] = True
        metrics.inc('armenu_device_fp_mismatch_total')
    return data
```

| Xususiyat | Qiymat | Sabab |
|---|---|---|
| Token uzunligi | 22 belgi (128 bit entropiya) | Brute-force amaliy jihatdan imkonsiz |
| Cookie TTL | 12 soat | Bitta smena; ertasi kuni yangi sessiya |
| Session backend | Redis (`django.contrib.sessions.backends.cache`) | Tez, avtomatik muddat |
| Revoke | QR token `is_active=False` → barcha shu stol sessiyalari | Restoran admin panelidan |
| Rate limit | 60/daq/IP (QR), 10/daq/sessiya (buyurtma) | §8 |
| ⛔ Nima saqlanmaydi | Ism, telefon, karta, joylashuv | Faqat ixtiyoriy: chek uchun telefon |

**QR token rotatsiyasi:**

```python
# apps/tenants/models.py
class QrToken(models.Model):
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE)
    table      = models.ForeignKey(Table, on_delete=models.CASCADE)
    token      = models.CharField(max_length=32, unique=True, db_index=True,
                                  default=lambda: secrets.token_urlsafe(16))
    is_active  = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    rotated_at = models.DateTimeField(null=True)

    def rotate(self):
        """QR chop etilgan bo'lsa — eski 30 kun ishlaydi (grace)."""
        old = self.token
        self.token = secrets.token_urlsafe(16)
        self.rotated_at = timezone.now()
        self.save()
        QrTokenGrace.objects.create(old_token=old, new=self,
                                    expires_at=timezone.now() + timedelta(days=30))
```

### 3.3 🧑‍🍳 Ofitsiant — PIN + JWT

```
  Ofitsiant planshet              Server
       │                             │
       ├── POST /v1/staff/login/ ───▶│ 1) rate limit: 5/15daq (IP + PIN prefiks)
       │   {pin: "482913",           │ 2) restaurant_id — subdomain'dan
       │    device_id: "tab-03"}     │ 3) bcrypt.checkpw(pin, staff.pin_hash)
       │                             │ 4) staff.is_active + smena tekshiruvi
       │                             │ 5) device allowlist (ixtiyoriy)
       │◀── 200 ─────────────────────┤
       │   access  (15 daq, body)    │  ⚡ access — body'da (SPA ishlatadi)
       │   Set-Cookie: refresh       │  ⚡ refresh — httpOnly cookie
       │   (12 soat, httpOnly)       │
       │                             │
       ├── GET /v1/orders/ ─────────▶│ Authorization: Bearer <access>
       │                             │ claims: {sub, rid, role, sid, exp}
       │                             │
       ├── POST /v1/staff/refresh/ ─▶│ ⚡ Rotatsiya: eski refresh BEKOR qilinadi
       │   Cookie: refresh           │    Qayta ishlatilsa → butun oila revoke
       │◀── yangi access + refresh ──┤
```

```python
# apps/staff/auth.py
import bcrypt, jwt, secrets
from django.core.cache import cache

ACCESS_TTL  = 15 * 60
REFRESH_TTL = 12 * 3600
MAX_PIN_ATTEMPTS = 5
LOCKOUT = 15 * 60


class StaffAuthService:

    def login(self, pin: str, restaurant_id: int, request):
        # 1) Rate limit — IP va restoran bo'yicha
        rl_key = f'pinfail:{restaurant_id}:{client_ip(request)}'
        if int(cache.get(rl_key) or 0) >= MAX_PIN_ATTEMPTS:
            audit(request, 'staff.login.locked', restaurant_id=restaurant_id)
            raise Throttled(detail="Juda ko'p urinish. 15 daqiqadan keyin qayta urining")

        # 2) PIN tekshiruvi — faqat shu restoran xodimlari
        staff = self._find_by_pin(pin, restaurant_id)
        if staff is None:
            cache.set(rl_key, int(cache.get(rl_key) or 0) + 1, LOCKOUT)
            audit(request, 'staff.login.failed', restaurant_id=restaurant_id)
            # ⚡ Umumiy xabar — xodim borligini oshkor qilmaydi
            raise AuthenticationFailed("PIN noto'g'ri")

        cache.delete(rl_key)
        session_id = secrets.token_urlsafe(16)
        access  = self._issue_access(staff, session_id)
        refresh = self._issue_refresh(staff, session_id)
        audit(request, 'staff.login.success', restaurant_id=restaurant_id,
              actor_id=staff.id)
        return access, refresh

    def _find_by_pin(self, pin, restaurant_id):
        """⚠️ bcrypt sekin — barcha xodimni tekshirish qimmat.
        Yechim: PIN'ning HMAC prefiksi bo'yicha indeks."""
        lookup = hmac.new(settings.PIN_LOOKUP_KEY, pin.encode(), 'sha256').hexdigest()[:16]
        candidates = Staff.objects.filter(
            restaurant_id=restaurant_id, pin_lookup=lookup, is_active=True)
        for s in candidates:                      # odatda 0 yoki 1 ta
            if bcrypt.checkpw(pin.encode(), s.pin_hash.encode()):
                return s
        return None

    def _issue_access(self, staff, session_id):
        return jwt.encode({
            'sub': staff.id, 'rid': staff.restaurant_id,
            'role': staff.role, 'sid': session_id, 'typ': 'access',
            'iat': int(time.time()), 'exp': int(time.time()) + ACCESS_TTL,
        }, settings.JWT_SECRET, algorithm='HS256')

    def _issue_refresh(self, staff, session_id, family=None):
        family = family or secrets.token_urlsafe(12)
        token = secrets.token_urlsafe(32)
        cache.set(f'refresh:{token}',
                  {'sub': staff.id, 'rid': staff.restaurant_id,
                   'sid': session_id, 'family': family},
                  REFRESH_TTL)
        cache.sadd(f'refresh_family:{family}', token)
        return token

    def refresh(self, token, request):
        data = cache.get(f'refresh:{token}')
        if not data:
            # ⚡ Ishlatilgan/mavjud bo'lmagan token — o'g'irlik belgisi
            self._revoke_family_by_token(token)
            audit(request, 'staff.refresh.reuse_detected', severity='high')
            raise AuthenticationFailed("Sessiya bekor qilindi")

        cache.delete(f'refresh:{token}')          # ⚡ bir martalik
        staff = Staff.objects.get(pk=data['sub'], is_active=True)
        new_access  = self._issue_access(staff, data['sid'])
        new_refresh = self._issue_refresh(staff, data['sid'], family=data['family'])
        return new_access, new_refresh

    def revoke_all(self, staff_id):
        """Xodim ishdan bo'shatilganda / PIN o'zgarganda."""
        cache.set(f'staff_revoked_after:{staff_id}', int(time.time()), 86400 * 30)
```

**Access token'ni bekor qilish (JWT stateless muammosi):**

```python
# core/auth/jwt_backend.py
def validate_access(token):
    claims = jwt.decode(token, settings.JWT_SECRET, algorithms=['HS256'])
    # ⚡ Qora ro'yxat: 15 daqiqalik oyna uchun Redis lookup (arzon)
    revoked_after = cache.get(f"staff_revoked_after:{claims['sub']}")
    if revoked_after and claims['iat'] < revoked_after:
        raise AuthenticationFailed("Sessiya bekor qilingan")
    if cache.get(f"session_revoked:{claims['sid']}"):
        raise AuthenticationFailed("Sessiya bekor qilingan")
    return claims
```

### 3.4 👨‍💼 Restoran admin — parol + JWT

| Xususiyat | Qiymat |
|---|---|
| Parol siyosati | Min 10 belgi, 3 xil sinf, `HaveIBeenPwned` k-anonymity tekshiruvi |
| Hash | Argon2id (`memory_cost=64MB, time_cost=3, parallelism=4`) |
| Access TTL | 15 daqiqa |
| Refresh TTL | 7 kun (rotatsiya bilan) |
| Rate limit | 5/15daq (IP+email), 20/soat (email) |
| Blok | 5 xato → 15 daq; 15 xato → 24 soat + email xabar |
| Parol tiklash | Bir martalik token, 30 daq, email orqali, eski sessiyalar revoke |
| Parol o'zgarishi | Barcha refresh token revoke + email xabarnoma |
| Sessiya ro'yxati | Admin o'z faol sessiyalarini ko'radi va uzadi (IP, qurilma, vaqt) |
| 2FA | Ixtiyoriy (tavsiya etiladi), majburiy — moliyaviy huquqli admin uchun |

### 3.5 🛡 Platforma admin — 2FA majburiy

```
  Bosqich 1 — parol                    Bosqich 2 — TOTP
  ┌──────────────────────┐             ┌──────────────────────┐
  │ POST /platform/login/│             │ POST /platform/2fa/  │
  │ {email, password}    │             │ {mfa_token, code}    │
  │                      │             │                      │
  │ ✓ Argon2id           │             │ ✓ TOTP (RFC 6238)    │
  │ ✓ IP allowlist       │             │   window ±1 (30s)    │
  │ ✓ rate limit 3/15daq │             │ ✓ code qayta         │
  │                      │             │   ishlatilmaydi      │
  │ → mfa_token (5 daq)  │             │ → access + refresh   │
  └──────────────────────┘             └──────────────────────┘
                                              │
                                       Zaxira: 10 ta bir martalik
                                       recovery kod (Argon2 hash)
```

```python
# apps/platform/auth.py
import pyotp

class PlatformAuthService:
    ACCESS_TTL  = 10 * 60          # ⚡ eng qisqa
    REFRESH_TTL = 24 * 3600
    MFA_TTL     = 5 * 60

    def login_step1(self, email, password, request):
        ip = client_ip(request)
        if not ip_in_allowlist(ip):
            audit(request, 'platform.login.ip_denied', severity='high')
            raise PermissionDenied("IP ruxsat etilmagan")
        if rate_exceeded(f'plogin:{ip}', limit=3, window=900):
            raise Throttled()

        admin = PlatformAdmin.objects.filter(email__iexact=email, is_active=True).first()
        if not admin or not argon2_verify(admin.password_hash, password):
            audit(request, 'platform.login.failed', severity='high')
            raise AuthenticationFailed("Email yoki parol noto'g'ri")

        mfa_token = secrets.token_urlsafe(24)
        cache.set(f'mfa:{mfa_token}', {'admin_id': admin.id, 'ip': ip}, self.MFA_TTL)
        return mfa_token

    def login_step2(self, mfa_token, code, request):
        data = cache.get(f'mfa:{mfa_token}')
        if not data or data['ip'] != client_ip(request):
            raise AuthenticationFailed("Sessiya muddati tugadi")
        admin = PlatformAdmin.objects.get(pk=data['admin_id'])

        # ⚡ Kod qayta ishlatilmasin (replay himoyasi)
        used_key = f'totp_used:{admin.id}:{code}'
        if cache.get(used_key):
            audit(request, 'platform.2fa.replay', severity='critical')
            raise AuthenticationFailed("Kod allaqachon ishlatilgan")

        totp = pyotp.TOTP(decrypt_secret(admin.totp_secret_enc))
        if not totp.verify(code, valid_window=1):
            if not self._check_recovery_code(admin, code):
                audit(request, 'platform.2fa.failed', severity='high')
                raise AuthenticationFailed("Kod noto'g'ri")

        cache.set(used_key, 1, 90)
        cache.delete(f'mfa:{mfa_token}')
        audit(request, 'platform.login.success', severity='info')
        notify_telegram(f"🛡 Platforma admin kirdi: {admin.email} · {client_ip(request)}")
        return self._issue_tokens(admin)
```

### 3.6 Umumiy jadval — TTL / refresh / revoke / rate limit

| Aktor | Access TTL | Refresh TTL | Refresh rotatsiya | Revoke usuli | Login rate limit | Sessiya limiti |
|---|---|---|---|---|---|---|
| Mijoz | — (session) | — | — | QR token `is_active=False` | 60/daq/IP | 3/qurilma |
| Ofitsiant | 15 daq | 12 soat | ✅ (oila revoke) | `revoke_all(staff_id)` | 5/15daq (IP+PIN) | 2 qurilma |
| Oshpaz (KDS) | 60 daq¹ | 24 soat | ✅ | `revoke_all` | 5/15daq | 5 ekran |
| Kassir | 15 daq | 12 soat | ✅ | `revoke_all` | 5/15daq | 2 qurilma |
| Restoran admin | 15 daq | 7 kun | ✅ | Parol o'zgarishi / sessiya uzish | 5/15daq (IP+email) | 5 sessiya |
| Platforma admin | 10 daq | 24 soat | ✅ | Darhol (barcha) | 3/15daq + IP allowlist | 2 sessiya |

¹ *KDS — devor ekranida, doim ochiq turadi; qurilma jismonan oshxonada (past risk).*

---

## 4. AVTORIZATSIYA

### 4.1 Rol matritsasi (5 rol × 22 amal)

| # | Amal | 👤 guest | 🧑‍🍳 waiter | 🍳 cook | 💰 cashier | 👨‍💼 admin | 🛡 platform |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| 1 | Menyu ko'rish | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2 | AR/3D ko'rish | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 3 | Buyurtma yaratish | ✅ | ✅ | ⛔ | ✅ | ✅ | ⛔ |
| 4 | O'z buyurtmasini ko'rish | ✅¹ | ✅ | ✅ | ✅ | ✅ | ⛔² |
| 5 | Barcha buyurtmalarni ko'rish | ⛔ | ✅ | ✅ | ✅ | ✅ | ⛔² |
| 6 | Buyurtmaga qo'shish | ✅¹ | ✅ | ⛔ | ✅ | ✅ | ⛔ |
| 7 | Buyurtma satrini o'chirish | ⛔ | ✅³ | ⛔ | ✅³ | ✅ | ⛔ |
| 8 | Buyurtma statusini o'zgartirish | ⛔ | ✅⁴ | ✅⁵ | ⛔ | ✅ | ⛔ |
| 9 | Buyurtmani bekor qilish | ⛔ | ⛔ | ⛔ | ✅ | ✅ | ⛔ |
| 10 | To'lov qabul qilish (naqd) | ⛔ | ✅ | ⛔ | ✅ | ✅ | ⛔ |
| 11 | Onlayn to'lov boshlash | ✅ | ✅ | ⛔ | ✅ | ✅ | ⛔ |
| 12 | Qaytarish (refund) | ⛔ | ⛔ | ⛔ | ✅⁶ | ✅ | ⛔ |
| 13 | Chegirma qo'llash | ⛔ | ⛔ | ⛔ | ✅⁷ | ✅ | ⛔ |
| 14 | Ofitsiant chaqirish | ✅ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ |
| 15 | Stop-list boshqarish | ⛔ | ⛔ | ✅ | ⛔ | ✅ | ⛔ |
| 16 | Taom yaratish/tahrirlash | ⛔ | ⛔ | ⛔ | ⛔ | ✅ | ⛔ |
| 17 | Narx o'zgartirish | ⛔ | ⛔ | ⛔ | ⛔ | ✅ | ⛔ |
| 18 | 3D model yuklash | ⛔ | ⛔ | ⛔ | ⛔ | ✅ | ✅ |
| 19 | Xodim qo'shish / PIN berish | ⛔ | ⛔ | ⛔ | ⛔ | ✅ | ⛔ |
| 20 | Moliyaviy hisobot | ⛔ | ⛔ | ⛔ | ✅⁸ | ✅ | ⛔² |
| 21 | Restoran sozlamalari | ⛔ | ⛔ | ⛔ | ⛔ | ✅ | ✅ |
| 22 | Restoran yaratish / tarif | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ✅ |
| 23 | AuditLog ko'rish | ⛔ | ⛔ | ⛔ | ⛔ | ✅⁹ | ✅ |
| 24 | Platforma statistikasi | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ✅ |

**Izohlar:**
¹ Faqat o'z sessiyasi · ² ⚡ Platforma admin **mijoz ma'lumotini ko'rmaydi** (faqat agregat) ·
³ Faqat `new`/`confirmed` statusda · ⁴ `confirmed`→`served` · ⁵ `confirmed`→`cooking`→`ready` ·
⁶ Kunlik limit bilan · ⁷ Maks 10%, undan yuqorisi — admin · ⁸ Faqat o'z smenasi ·
⁹ Faqat o'z restorani

### 4.2 Permission klasslari

```python
# core/permissions.py
from rest_framework.permissions import BasePermission

ROLE_MATRIX = {
    'order.create':        {'guest', 'waiter', 'cashier', 'admin'},
    'order.list_all':      {'waiter', 'cook', 'cashier', 'admin'},
    'order.cancel':        {'cashier', 'admin'},
    'order.status.cook':   {'cook', 'admin'},
    'order.status.serve':  {'waiter', 'admin'},
    'payment.cash':        {'waiter', 'cashier', 'admin'},
    'payment.refund':      {'cashier', 'admin'},
    'discount.apply':      {'cashier', 'admin'},
    'menu.write':          {'admin'},
    'menu.stoplist':       {'cook', 'admin'},
    'staff.manage':        {'admin'},
    'report.finance':      {'cashier', 'admin'},
    'settings.restaurant': {'admin', 'platform_admin'},
    'platform.manage':     {'platform_admin'},
    'audit.read':          {'admin', 'platform_admin'},
}


class HasAction(BasePermission):
    """View'da `required_action = 'order.cancel'` deb belgilanadi."""
    message = "Bu amal uchun ruxsat yo'q"

    def has_permission(self, request, view):
        action = getattr(view, 'required_action', None)
        if action is None:
            raise ImproperlyConfigured(f"{view.__class__.__name__}.required_action yo'q")
        role = getattr(request, 'role', 'anonymous')
        allowed = role in ROLE_MATRIX.get(action, set())
        if not allowed:
            audit(request, 'authz.denied', extra={'action': action, 'role': role})
        return allowed


class IsOwnOrderOrStaff(BasePermission):
    """⚡ Object-level: mijoz FAQAT o'z buyurtmasini ko'radi."""
    def has_object_permission(self, request, view, obj):
        # 1) Tenant chegarasi (mixin allaqachon filtrlagan, lekin ikkinchi tekshiruv)
        if obj.restaurant_id != request.restaurant_id:
            audit(request, 'authz.cross_tenant_object', severity='critical',
                  extra={'model': obj.__class__.__name__, 'pk': obj.pk})
            return False
        role = getattr(request, 'role', 'anonymous')
        if role in ('waiter', 'cook', 'cashier', 'admin'):
            return True
        # 2) Mijoz — sessiya mosligini tekshirish
        return obj.session_key == request.session.session_key


class CanChangeOrderStatus(BasePermission):
    """State machine: kim qaysi o'tishni qila oladi."""
    TRANSITIONS = {
        'cook':    {('confirmed', 'cooking'), ('cooking', 'ready')},
        'waiter':  {('ready', 'served'), ('new', 'confirmed')},
        'cashier': {('served', 'paid'), ('new', 'cancelled'), ('confirmed', 'cancelled')},
        'admin':   'ALL',
    }

    def has_object_permission(self, request, view, obj):
        role = request.role
        target = request.data.get('status')
        allowed = self.TRANSITIONS.get(role, set())
        if allowed == 'ALL':
            return True
        return (obj.status, target) in allowed
```

**ViewSet'da qo'llanilishi:**

```python
# apps/orders/views.py
class OrderViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    queryset = Order.objects.select_related('table').prefetch_related('items__dish')
    permission_classes = [HasAction, IsOwnOrderOrStaff]

    @property
    def required_action(self):
        return {'create': 'order.create', 'list': 'order.list_all',
                'retrieve': 'order.list_all', 'destroy': 'order.cancel'}.get(
                    self.action, 'order.list_all')

    def get_queryset(self):
        qs = super().get_queryset()                # ⚡ tenant filtri
        if self.request.role == 'guest':
            qs = qs.filter(session_key=self.request.session.session_key)
        return qs

    @action(detail=True, methods=['post'],
            permission_classes=[HasAction, CanChangeOrderStatus])
    def change_status(self, request, pk=None):
        order = self.get_object()                  # ⚡ object permission ishlaydi
        new_status = request.data['status']
        order.transition_to(new_status, actor=request.actor)
        return Response(OrderSerializer(order).data)
```

---

## 5. MA'LUMOT HIMOYASI

### 5.1 Transit — TLS 1.3

```nginx
# /etc/nginx/snippets/tls.conf
ssl_protocols               TLSv1.2 TLSv1.3;   # 1.0/1.1 o'chirilgan
ssl_prefer_server_ciphers   off;               # TLS 1.3 da klient tanlaydi
ssl_ciphers                 ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305;
ssl_ecdh_curve              X25519:secp384r1;
ssl_session_timeout         1d;
ssl_session_cache           shared:SSL:20m;
ssl_session_tickets         off;               # forward secrecy
ssl_stapling                on;
ssl_stapling_verify         on;

add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header X-Content-Type-Options    "nosniff" always;
add_header X-Frame-Options           "DENY" always;
add_header Referrer-Policy           "strict-origin-when-cross-origin" always;
add_header Permissions-Policy        "camera=(self), microphone=(), geolocation=(), payment=()" always;
add_header Content-Security-Policy   "default-src 'self'; script-src 'self' 'nonce-$request_id' https://cdn.armenu.uz; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://cdn.armenu.uz; model-src 'self' https://cdn.armenu.uz; connect-src 'self' wss://armenu.uz; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests" always;
```

| Yo'nalish | Himoya |
|---|---|
| Brauzer ↔ Cloudflare | TLS 1.3, HSTS preload |
| Cloudflare ↔ origin | TLS 1.2+ (Full Strict), origin sertifikat |
| Web ↔ PostgreSQL | `sslmode=verify-full`, private VPC |
| Web ↔ Redis | TLS + `requirepass`, private VPC |
| Web ↔ S3 | HTTPS, SigV4 |
| Web ↔ to'lov/OFD | TLS 1.2+, ba'zi provayderlarda mTLS |
| Node ↔ node (VPC) | WireGuard tunnel (S3+ bosqichda) |

### 5.2 At-rest — shifrlash

| Qatlam | Nima | Usul | Kalit boshqaruvi |
|---|---|---|---|
| Disk | Butun DB volume | LUKS (dm-crypt, AES-256-XTS) | Kalit boot'da HSM/tpm dan |
| DB — maydon | `totp_secret`, `provider_api_key`, `pin_lookup_key` | `pgcrypto` / ilova darajasida Fernet | `SECRET_KEY_ENCRYPTION` (env, rotatsiya 90 kun) |
| DB — parol | Admin paroli | Argon2id (qaytarilmaydi) | — |
| DB — PIN | Ofitsiant PIN | bcrypt cost=12 + HMAC lookup | `PIN_LOOKUP_KEY` |
| Backup | PG dump/basebackup | `age` (X25519 + ChaCha20-Poly1305) | Ochiq kalit serverda, yopiq kalit offline seyfda |
| S3 media | 3D/rasm | SSE-S3 (AES-256) | AWS/MinIO boshqaradi |
| Log | Arxiv | S3 SSE + WORM (Object Lock) | — |

```python
# core/crypto.py
from cryptography.fernet import Fernet, MultiFernet

def _fernets():
    """⚡ Kalit rotatsiyasi: birinchi kalit shifrlaydi, hammasi ochadi."""
    keys = settings.FIELD_ENCRYPTION_KEYS      # ['yangi', 'eski', ...]
    return MultiFernet([Fernet(k) for k in keys])


class EncryptedTextField(models.TextField):
    """Shaffof shifrlangan maydon."""
    def get_prep_value(self, value):
        if value in (None, ''):
            return value
        return _fernets().encrypt(str(value).encode()).decode()

    def from_db_value(self, value, expression, connection):
        if value in (None, ''):
            return value
        try:
            return _fernets().decrypt(value.encode()).decode()
        except Exception:
            logger.error("Shifrni ochib bo'lmadi — kalit rotatsiyasi tekshirilsin")
            return None
```

### 5.3 PII maydonlari ro'yxati

| # | Maydon | Model | Toifa | Saqlash muddati | Shifrlash | Log'da | Eksport |
|---|---|---|---|---|---|---|---|
| 1 | `phone` | `Order` (chek uchun, ixtiyoriy) | 🟠 PII | 1 yil | ⛔ (indeks kerak) | 🔒 maskalangan | ✅ so'rov bo'yicha |
| 2 | `email` | `RestaurantAdmin`, `PlatformAdmin` | 🟠 PII | Hisob faol + 1 yil | ⛔ | 🔒 maskalangan | ✅ |
| 3 | `full_name` | `Staff` | 🟠 PII | Ishdan bo'shagach 3 yil (mehnat qonuni) | ⛔ | 🔒 | ✅ |
| 4 | `pin_hash` | `Staff` | 🔴 Maxfiy | Faol | bcrypt | ⛔ hech qachon | ⛔ |
| 5 | `password_hash` | `*Admin` | 🔴 Maxfiy | Faol | Argon2id | ⛔ | ⛔ |
| 6 | `totp_secret_enc` | `PlatformAdmin` | 🔴 Maxfiy | Faol | Fernet | ⛔ | ⛔ |
| 7 | `session_key` | `Order` | 🟡 Psevdonim | 90 kun | ⛔ | 🔒 qisqartirilgan | ⛔ |
| 8 | `device_id` | Cookie | 🟡 Psevdonim | 12 soat | Imzolangan | ⛔ | ⛔ |
| 9 | `ip_address` | `AuditLog` | 🟠 PII | 1 yil | ⛔ | ✅ (audit maqsadi) | ✅ |
| 10 | `user_agent` | `AuditLog` | 🟡 | 1 yil | ⛔ | ✅ | ✅ |
| 11 | `telegram_chat_id` | `Restaurant`, `Staff` | 🟠 PII | Faol | ⛔ | 🔒 | ✅ |
| 12 | `card_mask` (`****1234`) | `PaymentTransaction` | 🟡 | 5 yil (moliya) | ⛔ | ✅ (allaqachon maskalangan) | ✅ |
| 13 | `provider_txn_id` | `PaymentTransaction` | 🟡 | 5 yil | ⛔ | ✅ | ✅ |
| 14 | `ai_chat_message` | `AiConversation` | 🟠 PII bo'lishi mumkin | 30 kun | ⛔ | ⛔ | ✅ |
| 15 | `review_text` | `Review` | 🟠 | 3 yil | ⛔ | ⛔ | ✅ |
| 16 | ⛔ **Karta raqami / CVV** | — | 🔴 | **HECH QACHON SAQLANMAYDI** | — | — | — |

### 5.4 Log'da maskalash

```python
# core/logging/filters.py
import re

PATTERNS = [
    # Karta raqami (Luhn'ga qaramay — har 13-19 raqamli ketma-ketlik)
    (re.compile(r'\b(\d{4})[\s\-]?\d{4,11}[\s\-]?(\d{4})\b'), r'\1********\2'),
    # O'zbekiston telefon raqami
    (re.compile(r'\b998(\d{2})(\d{3})(\d{2})(\d{2})\b'), r'998\1***\4'),
    (re.compile(r'\+998[\s\-]?\d{2}[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}'), '+998**_***_**_**'),
    # Email
    (re.compile(r'\b([A-Za-z0-9._%+-]{1,2})[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+)\b'),
     r'\1***@\2'),
    # JWT / Bearer
    (re.compile(r'eyJ[\w\-]+\.[\w\-]+\.[\w\-]+'), '<JWT>'),
    (re.compile(r'(Bearer|Basic)\s+\S+', re.I), r'\1 <REDACTED>'),
    # Sirlar
    (re.compile(r'("?(?:password|pin|secret|api_key|token|authorization)"?\s*[:=]\s*)'
                r'"?[^",}\s]+', re.I), r'\1"<REDACTED>"'),
]

SENSITIVE_KEYS = {'password', 'pin', 'secret', 'token', 'api_key', 'card',
                  'cvv', 'authorization', 'totp', 'refresh'}


class PiiMaskFilter(logging.Filter):
    def filter(self, record):
        if isinstance(record.msg, str):
            for pat, repl in PATTERNS:
                record.msg = pat.sub(repl, record.msg)
        if record.args:
            record.args = tuple(self._mask(a) for a in record.args)
        return True

    def _mask(self, value):
        if isinstance(value, dict):
            return {k: ('<REDACTED>' if k.lower() in SENSITIVE_KEYS else self._mask(v))
                    for k, v in value.items()}
        if isinstance(value, str):
            for pat, repl in PATTERNS:
                value = pat.sub(repl, value)
        return value
```

```python
# config/settings.py
LOGGING = {
    'version': 1,
    'filters': {'pii': {'()': 'core.logging.filters.PiiMaskFilter'}},
    'handlers': {
        'file':   {'class': 'logging.handlers.WatchedFileHandler',
                   'filename': '/srv/armenu/logs/app.log', 'filters': ['pii']},
        'sentry': {'class': 'sentry_sdk.integrations.logging.EventHandler',
                   'filters': ['pii'], 'level': 'ERROR'},
    },
    'root': {'handlers': ['file', 'sentry'], 'level': 'INFO'},
}

# Sentry — qo'shimcha himoya
sentry_sdk.init(
    dsn=env('SENTRY_DSN'),
    send_default_pii=False,               # ⚡ majburiy False
    before_send=strip_pii_from_event,
    traces_sample_rate=0.05,
)
```

---

## 6. TO'LOV XAVFSIZLIGI

### 6.1 PCI DSS — nega bizga to'liq sertifikat kerak emas

```
┌──────────────────────────────────────────────────────────────────┐
│                    ⚡ KARTA MA'LUMOTI OQIMI                       │
│                                                                  │
│   Mijoz brauzeri                                                 │
│        │                                                         │
│        │  1. POST /v1/payments/  {order_id}     ← ARMENU         │
│        ├──────────────────────────────────────▶ (karta YO'Q)     │
│        │                                                         │
│        │  2. 302 → https://checkout.payme.uz/<token>             │
│        │◀──────────────────────────────────────                  │
│        │                                                         │
│        │  3. Karta raqami, CVV, 3DS                               │
│        ├══════════════════════════════════════▶ PAYME (PCI DSS   │
│        │        ⚡ ARMENU BU OQIMDA YO'Q          Level 1)        │
│        │◀══════════════════════════════════════                  │
│        │                                                         │
│        │  4. Redirect → armenu.uz/payment/result/                 │
│        ├──────────────────────────────────────▶ ARMENU           │
│                                                                  │
│   5. Webhook: {txn_id, amount, status, card_mask: "****1234"}    │
│      PAYME ═══════════════════════════════════▶ ARMENU           │
│                        ⚡ faqat MASKA keladi                      │
└──────────────────────────────────────────────────────────────────┘
```

| PCI DSS talab | Bizga tegishlimi | Sabab |
|---|---|---|
| Karta ma'lumotini shifrlab saqlash | ⛔ Yo'q | Umuman saqlamaymiz |
| Karta tarmog'ini segmentlash | ⛔ Yo'q | CDE (Cardholder Data Environment) yo'q |
| Choraklik ASV skanerlash | 🟡 Qisman | To'lov sahifasi bizda emas, lekin redirect bizda |
| **SAQ A** (self-assessment) | ✅ **Ha** | To'liq autsorsing qilingan e-commerce uchun |
| Xavfsiz kod amaliyoti | ✅ Ha | Umumiy talab |
| Kirish nazorati va audit | ✅ Ha | Umumiy talab |
| TLS 1.2+ | ✅ Ha | Umumiy talab |

> **Xulosa:** ARMENU **SAQ A** darajasidagi savdogar. Karta ma'lumoti hech qachon
> bizning tarmoqqa, serverga, log'ga, DBga kirmaydi. To'liq PCI DSS sertifikatsiya
> **kerak emas**, lekin SAQ A yiliga bir marta to'ldiriladi.

**⛔ Qat'iy taqiqlar (CI'da tekshiriladi):**

```python
# tests/security/test_no_card_data.py
FORBIDDEN_FIELDS = ['card_number', 'pan', 'cvv', 'cvc', 'expiry',
                    'card_holder', 'track_data', 'pin_block']

def test_no_card_fields_in_models():
    bad = []
    for model in apps.get_models():
        for f in model._meta.fields:
            if any(x in f.name.lower() for x in FORBIDDEN_FIELDS):
                if f.name == 'card_mask':          # ✅ maska ruxsat
                    continue
                bad.append(f"{model.__name__}.{f.name}")
    assert not bad, f"🔴 PCI: karta maydonlari topildi: {bad}"


def test_no_card_data_in_code():
    """Kod ichida karta ma'lumoti bilan ishlash urinishi."""
    out = subprocess.run(
        ['grep', '-rniE', r'(card_number|pan\s*=|cvv|cvc2|track2)', 'apps/', 'core/'],
        capture_output=True, text=True)
    assert out.returncode != 0, f"🔴 PCI: {out.stdout}"
```

### 6.2 Webhook imzo tekshiruvi

| Provayder | Imzo usuli | Header | Qo'shimcha |
|---|---|---|---|
| **Payme** | HTTP Basic: `Paycom:<merchant_key>` | `Authorization` | JSON-RPC; IP allowlist |
| **Click** | MD5: `click_trans_id + service_id + SECRET_KEY + merchant_trans_id + amount + action + sign_time` | body `sign_string` | Form-encoded |
| **Uzum** | HMAC-SHA256(body, secret) | `X-Signature` | Base64 |

```python
# apps/payments/webhooks.py
import hmac, hashlib, base64, ipaddress

class WebhookVerifier:
    """⚡ Har webhook 4 bosqichdan o'tadi: IP → imzo → replay → summa."""

    @staticmethod
    def verify_payme(request):
        # 1) IP allowlist
        if not ip_allowed(client_ip(request), settings.PAYME_IPS):
            raise WebhookRejected('ip_not_allowed')
        # 2) Basic auth imzosi
        auth = request.headers.get('Authorization', '')
        if not auth.startswith('Basic '):
            raise WebhookRejected('no_auth')
        decoded = base64.b64decode(auth[6:]).decode()
        login, _, key = decoded.partition(':')
        expected = settings.PAYME_MERCHANT_KEY
        # ⚡ Doimiy vaqtli solishtirish — timing attack himoyasi
        if login != 'Paycom' or not hmac.compare_digest(key, expected):
            audit_webhook_failure('payme', 'bad_key', request)
            raise WebhookRejected('bad_signature')
        return json.loads(request.body)

    @staticmethod
    def verify_click(request):
        if not ip_allowed(client_ip(request), settings.CLICK_IPS):
            raise WebhookRejected('ip_not_allowed')
        d = request.POST
        raw = (f"{d['click_trans_id']}{d['service_id']}{settings.CLICK_SECRET_KEY}"
               f"{d['merchant_trans_id']}{d.get('merchant_prepare_id','')}"
               f"{d['amount']}{d['action']}{d['sign_time']}")
        expected = hashlib.md5(raw.encode()).hexdigest()
        if not hmac.compare_digest(expected, d.get('sign_string', '')):
            audit_webhook_failure('click', 'bad_sign', request)
            raise WebhookRejected('bad_signature')
        return d.dict()

    @staticmethod
    def verify_uzum(request):
        if not ip_allowed(client_ip(request), settings.UZUM_IPS):
            raise WebhookRejected('ip_not_allowed')
        sig = request.headers.get('X-Signature', '')
        expected = base64.b64encode(
            hmac.new(settings.UZUM_SECRET.encode(), request.body, hashlib.sha256).digest()
        ).decode()
        if not hmac.compare_digest(expected, sig):
            audit_webhook_failure('uzum', 'bad_hmac', request)
            raise WebhookRejected('bad_signature')
        # 3) Replay: timestamp 5 daqiqadan eski bo'lmasin
        ts = int(request.headers.get('X-Timestamp', 0))
        if abs(time.time() - ts) > 300:
            raise WebhookRejected('stale_request')
        return json.loads(request.body)
```

### 6.3 ⚡ Summa manipulyatsiyasi oldini olish

```python
# apps/payments/services.py
from decimal import Decimal

def create_payment(order_id, provider, request):
    """
    ⚡ Summa HECH QACHON klientdan olinmaydi.
    Klient faqat order_id va provider yuboradi.
    """
    order = Order.objects.select_for_update().get(
        pk=order_id, restaurant_id=request.restaurant_id)     # ⚡ tenant

    if order.status not in ('confirmed', 'served'):
        raise ValidationError("Bu buyurtma uchun to'lov mumkin emas")

    # ⚡ Summa buyurtma satrlaridan QAYTA hisoblanadi (order.total ga ishonmaymiz)
    computed = sum((i.line_total for i in order.items.all()), Decimal('0'))
    computed += order.service_fee_amount
    computed -= order.discount_amount
    if computed != order.total:
        alert_oncall(f"🔴 Buyurtma #{order.id} summasi mos emas: "
                     f"total={order.total}, hisoblangan={computed}", severity='P1')
        raise ValidationError("Buyurtma summasida nomuvofiqlik")

    if computed <= 0 or computed > Decimal('100000000'):      # sanity
        raise ValidationError("Noto'g'ri summa")

    txn = PaymentTransaction.objects.create(
        restaurant_id=order.restaurant_id, order=order,
        provider=provider, amount=computed, status='pending',
        idempotency_key=f'{order.id}:{computed}',
    )
    gateway = get_gateway(provider)
    txn.checkout_url = gateway.create_invoice(txn)             # tiyin/so'm konvertatsiya
    txn.save(update_fields=['checkout_url'])
    return txn


def apply_webhook(provider, data):
    """Webhook kelganda — summa MOS kelishi shart."""
    with transaction.atomic():
        txn = PaymentTransaction.objects.select_for_update().get(
            provider=provider, provider_txn_id=data['txn_id'])

        # ⚡ Idempotency: allaqachon qayta ishlangan bo'lsa — hech narsa qilinmaydi
        if txn.status in ('paid', 'cancelled'):
            return txn

        # ⚡ Summa tekshiruvi — provayder boshqa summa yuborsa REJECT
        remote_amount = Decimal(data['amount']) / 100          # tiyin → so'm
        if remote_amount != txn.amount:
            audit_payment_mismatch(txn, remote_amount)
            alert_oncall(f"🔴 To'lov summasi mos emas! txn={txn.id} "
                         f"kutilgan={txn.amount} kelgan={remote_amount}", severity='P1')
            raise WebhookRejected('amount_mismatch')

        txn.status = 'paid'
        txn.paid_at = timezone.now()
        txn.card_mask = data.get('card_mask', '')[:20]         # faqat maska
        txn.save()
        txn.order.mark_paid()
        publish('payment.paid', {'txn_id': txn.id},
                restaurant_id=txn.restaurant_id)               # → fiskal, WS
    return txn
```

**To'lov xavfsizligi chek-listi:**

| # | Nazorat | Amalga oshirish |
|---|---|---|
| 1 | Summa serverda hisoblanadi | `create_payment` — satrlardan qayta hisob |
| 2 | Klient summa yubora olmaydi | Serializer'da `amount` maydoni yo'q |
| 3 | Webhook summasi solishtiriladi | `apply_webhook` — mos kelmasa reject + P1 |
| 4 | Idempotent | `provider_txn_id` unique + `select_for_update` |
| 5 | Replay himoyasi | Timestamp + ishlatilgan `txn_id` |
| 6 | IP allowlist | Har provayder uchun ro'yxat |
| 7 | Imzo doimiy vaqtli | `hmac.compare_digest` |
| 8 | Tenant chegarasi | `restaurant_id` har so'rovda |
| 9 | Refund limiti | Kunlik summa cheki (rol bo'yicha) |
| 10 | Reconciliation | Har 5 daqiqada `check_transaction` (healer #14) |
| 11 | Har amal audit | `AuditLog` + moliyaviy alohida jurnal |
| 12 | 2× to'lov himoyasi | Buyurtma `paying` da lock (saga S1) |

---

## 7. KIRISH VALIDATSIYASI

### 7.1 Kirish nuqtalari xaritasi

| # | Kirish nuqtasi | Manba | Validatsiya | Risk |
|---|---|---|---|---|
| 1 | QR token (`/t/<token>`) | URL | Regex `^[A-Za-z0-9_-]{20,24}$` + DB lookup + rate limit | 🟠 |
| 2 | Buyurtma API | JSON body | DRF serializer, tenant-scoped FK, min/max | 🔴 |
| 3 | To'lov webhook | Tashqi POST | Imzo + IP + summa + replay | 🔴 |
| 4 | Fayl yuklash (3D) | multipart | MIME + magic + hajm + validator + kvota | 🔴 |
| 5 | Fayl yuklash (rasm) | multipart | Pillow verify + qayta kodlash + EXIF tozalash | 🟠 |
| 6 | Menyu qidiruv | Query string | Uzunlik ≤ 100, PostgreSQL FTS (regex yo'q) | 🟡 |
| 7 | AI chat xabari | JSON | Uzunlik ≤ 500, prompt injection filtri | 🟠 |
| 8 | Admin forma | JSON/form | Serializer + oq ro'yxat | 🟠 |
| 9 | WS xabar | JSON | Sxema + hajm ≤ 16 KB + rate | 🟠 |
| 10 | Telegram webhook | Tashqi POST | `secret_token` header | 🟡 |
| 11 | Til/valyuta parametri | Query/header | Enum (`uz`, `ru`, `en`) | 🟢 |
| 12 | Pagination | Query | `limit ≤ 100`, `offset ≤ 10000` | 🟡 |
| 13 | CSV/Excel import (menyu) | Fayl | Hajm, qator soni, formula injection (`=`,`+`,`-`,`@`) | 🟠 |

### 7.2 Fayl yuklash — 3D model

```python
# apps/ar3d/validators.py
import magic, struct
from django.core.exceptions import ValidationError

ALLOWED_3D = {
    'glb':  {'mime': {'model/gltf-binary', 'application/octet-stream'},
             'magic': b'glTF', 'max_mb': 30},
    'gltf': {'mime': {'model/gltf+json', 'application/json'},
             'magic': b'{', 'max_mb': 10},
    'usdz': {'mime': {'model/vnd.usdz+zip', 'application/zip'},
             'magic': b'PK\x03\x04', 'max_mb': 30},
}
ALLOWED_IMG = {'jpg': 10, 'jpeg': 10, 'png': 10, 'webp': 10}


def validate_3d_file(uploaded, restaurant_id):
    # ─── 1. Kengaytma ───────────────────────────────────────────
    ext = uploaded.name.rsplit('.', 1)[-1].lower()
    if ext not in ALLOWED_3D:
        raise ValidationError(f"Ruxsat etilmagan format: .{ext}")
    spec = ALLOWED_3D[ext]

    # ─── 2. Hajm ────────────────────────────────────────────────
    if uploaded.size > spec['max_mb'] * 1024 * 1024:
        raise ValidationError(f"Fayl {spec['max_mb']} MB dan katta")
    if uploaded.size < 100:
        raise ValidationError("Fayl juda kichik / bo'sh")

    # ─── 3. MIME (kutubxona bilan, kengaytmaga ishonmaymiz) ─────
    head = uploaded.read(8192)
    uploaded.seek(0)
    mime = magic.from_buffer(head, mime=True)
    if mime not in spec['mime']:
        raise ValidationError(f"Fayl turi mos emas: {mime}")

    # ─── 4. ⚡ Magic bytes ──────────────────────────────────────
    if not head.lstrip().startswith(spec['magic']):
        raise ValidationError("Fayl imzosi buzilgan (magic bytes)")

    # ─── 5. GLB tuzilmasi (chunk header) ────────────────────────
    if ext == 'glb':
        magic_, version, length = struct.unpack('<4sII', head[:12])
        if version != 2:
            raise ValidationError("Faqat glTF 2.0 qo'llab-quvvatlanadi")
        if length != uploaded.size:
            raise ValidationError("GLB uzunligi mos emas — fayl buzilgan")

    # ─── 6. USDZ — zip bomb himoyasi ────────────────────────────
    if ext == 'usdz':
        import zipfile
        uploaded.seek(0)
        with zipfile.ZipFile(uploaded) as zf:
            total = sum(i.file_size for i in zf.infolist())
            if total > 200 * 1024 * 1024:
                raise ValidationError("Arxiv ochilganda juda katta (zip bomb)")
            if len(zf.infolist()) > 500:
                raise ValidationError("Arxivda juda ko'p fayl")
            for info in zf.infolist():
                if info.filename.startswith('/') or '..' in info.filename:
                    raise ValidationError("Xavfli fayl yo'li (path traversal)")
        uploaded.seek(0)

    # ─── 7. Restoran kvotasi ────────────────────────────────────
    used = Model3D.objects.filter(restaurant_id=restaurant_id).aggregate(
        s=models.Sum('file_size'))['s'] or 0
    quota = Restaurant.objects.get(pk=restaurant_id).storage_quota_bytes
    if used + uploaded.size > quota:
        raise ValidationError("Saqlash kvotasi tugadi")

    # ─── 8. Chuqur validatsiya — workerda (sandbox) ─────────────
    return True     # gltf-validator worker'da ishlaydi, natija DB'ga yoziladi


def validate_image(uploaded):
    from PIL import Image
    ext = uploaded.name.rsplit('.', 1)[-1].lower()
    if ext not in ALLOWED_IMG:
        raise ValidationError("Faqat JPG, PNG, WEBP")
    if uploaded.size > ALLOWED_IMG[ext] * 1024 * 1024:
        raise ValidationError("Rasm juda katta")
    try:
        img = Image.open(uploaded)
        img.verify()                      # struktura tekshiruvi
        uploaded.seek(0)
        img = Image.open(uploaded)
        if img.width > 8000 or img.height > 8000:
            raise ValidationError("Rasm o'lchami juda katta (decompression bomb)")
    except Exception:
        raise ValidationError("Rasm buzilgan yoki noto'g'ri format")

    # ⚡ Qayta kodlash — EXIF, ICC, yashirin payload olib tashlanadi
    uploaded.seek(0)
    clean = Image.open(uploaded).convert('RGB')
    out = io.BytesIO()
    clean.save(out, format='WEBP', quality=85, method=4)
    out.seek(0)
    return out
```

**Saqlash qoidalari:**

| Qoida | Amalga oshirish |
|---|---|
| Fayl nomi klientdan olinmaydi | `f'{rid}/{uuid4()}.{ext}'` |
| Yo'l tenant bilan bo'linadi | `media/3d/{restaurant_id}/...` |
| Alohida domendan beriladi | `cdn.armenu.uz` (cookie'siz, sandbox) |
| `Content-Type` majburiy | S3 metadata'da, `X-Content-Type-Options: nosniff` |
| Bajariladigan fayl bo'lmaydi | `.html`, `.svg`, `.js` — 3D/rasm yo'lida taqiqlangan |
| Presigned URL | 1 soat, faqat GET |

### 7.3 SQL injection

```python
# ⛔ HECH QACHON
Dish.objects.raw(f"SELECT * FROM menu_dish WHERE name LIKE '%{q}%'")
cursor.execute(f"SELECT * FROM orders WHERE id = {order_id}")
Dish.objects.extra(where=[f"price > {min_price}"])

# ✅ DOIM
Dish.objects.filter(name__icontains=q, restaurant_id=rid)
cursor.execute("SELECT * FROM orders WHERE id = %s AND restaurant_id = %s",
               [order_id, rid])

# ✅ Murakkab so'rov kerak bo'lsa — parametrlangan + tenant majburiy
with connections['read'].cursor() as cur:
    cur.execute("""
        SELECT d.id, d.name, count(oi.id) AS cnt
        FROM menu_dish d
        LEFT JOIN orders_orderitem oi ON oi.dish_id = d.id
        WHERE d.restaurant_id = %s AND oi.created_at >= %s
        GROUP BY d.id ORDER BY cnt DESC LIMIT %s
    """, [rid, since, min(limit, 100)])
```

**CI gate:** `grep -rn "\.raw(\|\.extra(\|cursor.execute(f\"" apps/` → build fail.

### 7.4 XSS va CSP

```python
# Django template — avtomatik escape YOQILGAN (o'zgartirilmaydi)
# ⛔ TAQIQLANGAN:  {{ user_input|safe }}  ·  mark_safe(user_input)
# ✅ HTML kerak bo'lsa — bleach bilan tozalash:

import bleach

ALLOWED_TAGS = ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li']
ALLOWED_ATTRS = {}

def clean_html(raw):
    return bleach.clean(raw, tags=ALLOWED_TAGS, attributes=ALLOWED_ATTRS, strip=True)
```

```javascript
// static/js/render.js — ⛔ innerHTML ishlatilmaydi
// ❌  el.innerHTML = `<div>${dish.name}</div>`;
// ✅
const div = document.createElement('div');
div.textContent = dish.name;            // avtomatik escape
el.appendChild(div);
```

**CSP nonce (inline script kerak bo'lsa):**

```python
# core/middleware/csp.py
class CspNonceMiddleware:
    def __call__(self, request):
        request.csp_nonce = secrets.token_urlsafe(16)
        response = self.get_response(request)
        response['Content-Security-Policy'] = (
            "default-src 'self'; "
            f"script-src 'self' 'nonce-{request.csp_nonce}' https://cdn.armenu.uz; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: blob: https://cdn.armenu.uz; "
            "connect-src 'self' wss://armenu.uz https://cdn.armenu.uz; "
            "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; "
            "form-action 'self'; upgrade-insecure-requests; "
            "report-uri /csp-report/"
        )
        return response
```

### 7.5 CSRF

| Yo'l | Himoya |
|---|---|
| Django forma (admin) | `{% csrf_token %}` + `CsrfViewMiddleware` |
| DRF sessiya auth (mijoz) | `X-CSRFToken` header majburiy |
| DRF JWT auth (xodim) | CSRF kerak emas (Authorization header, cookie emas)... |
| ...lekin refresh cookie | `SameSite=Strict` + `/v1/staff/refresh/` da CSRF token |
| Webhook | CSRF exempt + imzo tekshiruvi (§6.2) |
| WS | `Origin` header tekshiruvi (`AllowedHostsOriginValidator`) |

```python
# config/settings.py
CSRF_COOKIE_SECURE   = True
CSRF_COOKIE_HTTPONLY = False          # JS o'qishi kerak (SPA header uchun)
CSRF_COOKIE_SAMESITE = 'Lax'
CSRF_TRUSTED_ORIGINS = ['https://armenu.uz', 'https://*.armenu.uz']
SESSION_COOKIE_SECURE   = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
```

### 7.6 Prompt injection (AI chat)

```python
# apps/ai/guard.py
INJECTION_PATTERNS = [
    r'ignore\s+(all\s+)?previous\s+instructions',
    r'system\s*:',  r'</?(system|assistant)>',
    r'you\s+are\s+now',  r'oldingi\s+ko[\'’]rsatmalar',
    r'reveal\s+(your\s+)?(prompt|instructions)',
]

def sanitize_ai_input(text: str) -> str:
    if len(text) > 500:
        raise ValidationError("Xabar juda uzun")
    for pat in INJECTION_PATTERNS:
        if re.search(pat, text, re.I):
            metrics.inc('armenu_ai_injection_blocked_total')
            raise ValidationError("So'rov qabul qilinmadi")
    return text.replace('\x00', '').strip()


def build_prompt(user_msg, restaurant_id):
    """⚡ Foydalanuvchi matni ALOHIDA blokda, tizim ko'rsatmasi bilan aralashmaydi.
    AI javobi hech qachon kod sifatida bajarilmaydi va DB so'rovi qurmaydi."""
    return [
        {'role': 'system', 'content': SYSTEM_PROMPT + menu_context(restaurant_id)},
        {'role': 'user',   'content': f'<user_question>{sanitize_ai_input(user_msg)}'
                                      f'</user_question>'},
    ]
```

---

## 8. RATE LIMITING

### 8.1 Limitlar jadvali

| # | Endpoint / amal | Limit | Kalit | Jazо | Daraja |
|---|---|---|---|---|---|
| 1 | `GET /t/<token>` (QR kirish) | 60/daq | IP | 429, 60 s | 🟡 |
| 2 | `GET /v1/menu/` | 120/daq | IP | 429, 60 s | 🟡 |
| 3 | `GET /v1/ar/<id>/` | 200/daq | IP | 429 | 🟢 |
| 4 | `POST /v1/orders/` | 10/daq | session | 429 + shubhali flag | 🟠 |
| 5 | `POST /v1/orders/` (stol bo'yicha) | 30/soat | table_id | 429 + admin xabar | 🟠 |
| 6 | `POST /v1/call-waiter/` | 1/daq | table_id | Jim rad (UI "yuborildi") | 🟢 |
| 7 | `POST /v1/ai/chat/` | 10/5daq | session | 429 + FAQ taklifi | 🟠 |
| 8 | `POST /v1/ai/chat/` (restoran) | 500/soat | restaurant_id | Degraded rejim | 🟠 |
| 9 | `POST /v1/staff/login/` | 5/15daq | IP + PIN prefiks | 15 daq blok | 🔴 |
| 10 | `POST /v1/admin/login/` | 5/15daq | IP + email | 15 daq → 24 soat | 🔴 |
| 11 | `POST /platform/login/` | 3/15daq | IP | 1 soat blok + alert | 🔴 |
| 12 | `POST /v1/payments/` | 5/daq | session | 429 | 🔴 |
| 13 | Webhook (har provayder) | 300/daq | provayder IP | 429 (provayder retry qiladi) | 🟡 |
| 14 | `POST /v1/media/upload/` | 20/soat | restaurant_id | 429 | 🟠 |
| 15 | Admin API (umumiy) | 300/daq | admin_id | 429 | 🟡 |
| 16 | `GET /v1/reports/` | 30/daq | admin_id | 429 | 🟡 |
| 17 | WS ulanish | 10/daq | IP | Ulanish rad (4429) | 🟠 |
| 18 | WS xabar | 60/daq | connection | Xabar tashlanadi | 🟠 |
| 19 | Parol tiklash | 3/soat | email | Jim rad | 🟠 |
| 20 | Eksport (Excel/PDF) | 10/soat | admin_id | 429 | 🟡 |

### 8.2 Redis amalga oshirish

```python
# core/ratelimit.py
"""
Sliding-window rate limiter (Redis sorted set).
Fixed-window'dan aniqroq: chegara atrofida 2× burst bo'lmaydi.
"""
import time
from django.core.cache import caches

_r = caches['default'].client.get_client(write=True)

_SCRIPT = _r.register_script("""
local key   = KEYS[1]
local now   = tonumber(ARGV[1])
local window= tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local id    = ARGV[4]

redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
local count = redis.call('ZCARD', key)
if count >= limit then
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  return {0, count, math.ceil(oldest[2] + window - now)}
end
redis.call('ZADD', key, now, id)
redis.call('EXPIRE', key, window + 1)
return {1, count + 1, 0}
""")


class RateLimit:
    def __init__(self, name, limit, window, penalty=None):
        self.name, self.limit, self.window = name, limit, window
        self.penalty = penalty or window

    def check(self, key_value) -> tuple[bool, int]:
        """(ruxsat, retry_after)"""
        blocked_key = f'rl_block:{self.name}:{key_value}'
        ttl = _r.ttl(blocked_key)
        if ttl and ttl > 0:
            return False, ttl

        key = f'rl:{self.name}:{key_value}'
        now = time.time()
        try:
            ok, count, retry = _SCRIPT(keys=[key],
                                       args=[now, self.window, self.limit,
                                             f'{now}:{secrets.token_hex(4)}'])
        except Exception:
            # ⚡ Redis o'chgan — FAIL-OPEN (xizmat to'xtamasin)
            metrics.inc('armenu_ratelimit_fail_open_total', labels={'name': self.name})
            return True, 0

        if not ok:
            metrics.inc('armenu_ratelimit_hit_total', labels={'name': self.name})
            if self.penalty > self.window:
                _r.setex(blocked_key, self.penalty, 1)
            return False, int(retry)
        return True, 0


LIMITS = {
    'qr':            RateLimit('qr',            60,  60),
    'menu':          RateLimit('menu',         120,  60),
    'order_session': RateLimit('order_session', 10,  60),
    'order_table':   RateLimit('order_table',   30, 3600),
    'ai_chat':       RateLimit('ai_chat',       10,  300),
    'staff_login':   RateLimit('staff_login',    5,  900, penalty=900),
    'admin_login':   RateLimit('admin_login',    5,  900, penalty=900),
    'platform_login':RateLimit('platform_login', 3,  900, penalty=3600),
    'payment':       RateLimit('payment',        5,   60),
    'upload':        RateLimit('upload',        20, 3600),
    'ws_connect':    RateLimit('ws_connect',    10,   60),
}


def rate_limit(name, key_fn):
    """Dekorator: @rate_limit('order_session', lambda r: r.session.session_key)"""
    def deco(view):
        @functools.wraps(view)
        def wrapper(request, *a, **kw):
            ok, retry = LIMITS[name].check(key_fn(request))
            if not ok:
                audit(request, 'ratelimit.exceeded', extra={'limit': name})
                resp = JsonResponse(
                    {'error': 'rate_limited',
                     'detail': f"Juda ko'p so'rov. {retry} soniyadan keyin urining"},
                    status=429)
                resp['Retry-After'] = str(retry)
                return resp
            return view(request, *a, **kw)
        return wrapper
    return deco
```

### 8.3 DDoS himoya (Cloudflare)

| Qatlam | Chora | Sozlama |
|---|---|---|
| L3/L4 | Volumetric DDoS | Cloudflare avtomatik (Anycast) |
| L7 | So'rov toshqini | WAF Managed Rules (OWASP Core) |
| L7 | Bot | Bot Fight Mode; `cf.client.bot` → JS challenge |
| L7 | Firewall Rules | `/platform/*` → faqat UZ + IP allowlist |
| L7 | Rate Limiting Rules | `/v1/orders/` → 20/daq/IP (bizning limitdan yuqori — ikkinchi to'siq) |
| L7 | Under Attack | Insidentda qo'lda yoqiladi (5 s JS challenge) |
| Origin | Cloudflare-only | nginx faqat Cloudflare IP diapazonlarini qabul qiladi |

```nginx
# /etc/nginx/snippets/cloudflare.conf — origin himoyasi
# ⚡ Faqat Cloudflare orqali kelgan trafik qabul qilinadi
set_real_ip_from 173.245.48.0/20;
set_real_ip_from 103.21.244.0/22;
# ... (to'liq ro'yxat cron bilan yangilanadi: ops/cf_ips.sh)
real_ip_header CF-Connecting-IP;

geo $cf_ip { default 0; 173.245.48.0/20 1; 103.21.244.0/22 1; /* ... */ }

server {
    if ($cf_ip = 0) { return 403; }     # Cloudflare'dan tashqari — rad
    ...
}
```

```
# Cloudflare Firewall Rules (dashboard)
1. (http.request.uri.path contains "/platform/") and (ip.geoip.country ne "UZ")
   → Block
2. (http.request.uri.path contains "/webhook/") and not (ip.src in $payment_ips)
   → Block
3. (cf.threat_score gt 30) and (http.request.uri.path contains "/v1/orders/")
   → Managed Challenge
4. (http.user_agent contains "python-requests" or "curl") and
   (http.request.uri.path contains "/v1/menu/")
   → Managed Challenge          # scraping himoyasi
```

---

## 9. AUDIT VA MONITORING

### 9.1 AuditLog modeli

```python
# core/audit/models.py
class AuditLog(models.Model):
    """
    ⚡ FAQAT QO'SHILADI (append-only).
    DELETE/UPDATE huquqi hech kimda yo'q — DB darajasida ham.
    """
    id            = models.BigAutoField(primary_key=True)
    ts            = models.DateTimeField(auto_now_add=True, db_index=True)
    restaurant_id = models.IntegerField(null=True, db_index=True)

    # KIM
    actor_type    = models.CharField(max_length=20)     # guest|waiter|cook|cashier|admin|platform|system
    actor_id      = models.IntegerField(null=True)
    actor_label   = models.CharField(max_length=100, blank=True)   # "Aziz (ofitsiant)"
    session_id    = models.CharField(max_length=64, blank=True)

    # NIMA
    action        = models.CharField(max_length=64, db_index=True)  # 'order.cancel'
    object_type   = models.CharField(max_length=64, blank=True)
    object_id     = models.CharField(max_length=64, blank=True)
    changes       = models.JSONField(default=dict)      # {"status": ["new","cancelled"]}

    # QAYERDAN
    ip            = models.GenericIPAddressField(null=True)
    user_agent    = models.CharField(max_length=300, blank=True)
    request_id    = models.CharField(max_length=36, blank=True)

    # QANDAY
    severity      = models.CharField(max_length=10, default='info')  # info|warn|high|critical
    result        = models.CharField(max_length=10, default='ok')    # ok|denied|error

    class Meta:
        indexes = [
            models.Index(fields=['restaurant_id', '-ts']),
            models.Index(fields=['action', '-ts']),
            models.Index(fields=['actor_type', 'actor_id', '-ts']),
            models.Index(fields=['severity', '-ts'],
                         condition=models.Q(severity__in=['high', 'critical']),
                         name='audit_severe_idx'),
        ]
        # ⚡ Oylik partition (03_MALUMOT_ARXITEKTURASI.md §4)
```

```sql
-- ⚡ DB darajasida o'zgartirishni taqiqlash
REVOKE UPDATE, DELETE, TRUNCATE ON core_auditlog FROM armenu_app;
GRANT  INSERT, SELECT                ON core_auditlog TO   armenu_app;

CREATE RULE audit_no_update AS ON UPDATE TO core_auditlog DO INSTEAD NOTHING;
CREATE RULE audit_no_delete AS ON DELETE TO core_auditlog DO INSTEAD NOTHING;
```

### 9.2 Nima yoziladi

| Toifa | Hodisalar | Severity |
|---|---|---|
| **Auth** | `*.login.success`, `*.login.failed`, `*.login.locked`, `*.logout`, `*.refresh.reuse_detected`, `platform.2fa.replay` | info / high / critical |
| **Buyurtma** | `order.create`, `order.cancel`, `order.status_change`, `order.item_remove` | info / warn |
| **Moliya** | `payment.create`, `payment.paid`, `payment.refund`, `discount.apply`, `payment.mismatch` | info / high |
| **Menyu** | `dish.create`, `dish.update`, `dish.price_change`, `dish.delete`, `stoplist.toggle` | info / warn |
| **Xodim** | `staff.create`, `staff.pin_change`, `staff.deactivate`, `staff.role_change` | warn |
| **Sozlama** | `restaurant.settings_change`, `payment_provider.change`, `ofd.credentials_change` | high |
| **Xavfsizlik** | `authz.denied`, `authz.cross_tenant_object`, `ratelimit.exceeded`, `webhook.rejected`, `file.rejected` | high / critical |
| **Platforma** | `platform.restaurant_create`, `platform.tariff_change`, `platform.impersonate` | high |
| **Ma'lumot** | `data.export`, `data.bulk_delete`, `pii.access` | high |

```python
# core/audit/service.py
def audit(request, action, *, object_type='', object_id='', changes=None,
          severity='info', result='ok', restaurant_id=None, actor_id=None,
          extra=None):
    """Har muhim amalda chaqiriladi. ⚡ Hech qachon xato tashlamaydi."""
    try:
        AuditLog.objects.create(
            restaurant_id=restaurant_id or getattr(request, 'restaurant_id', None),
            actor_type=getattr(request, 'role', 'anonymous'),
            actor_id=actor_id or getattr(getattr(request, 'actor', None), 'id', None),
            actor_label=str(getattr(request, 'actor', '') or '')[:100],
            session_id=(getattr(request, 'session', None) and
                        request.session.session_key or '')[:64],
            action=action, object_type=object_type, object_id=str(object_id)[:64],
            changes=changes or {},
            ip=client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:300],
            request_id=getattr(request, 'request_id', ''),
            severity=severity, result=result,
        )
        if severity in ('high', 'critical'):
            metrics.inc('armenu_audit_severe_total', labels={'action': action})
        if severity == 'critical':
            alert_oncall(f"🔴 Xavfsizlik: {action} · {client_ip(request)}", severity='P1')
    except Exception:
        logger.exception("[AUDIT] yozib bo'lmadi: %s", action)   # ⚡ so'rovni buzmaydi
```

### 9.3 Saqlash muddatlari

| Ma'lumot | Muddat | Sabab | Keyin |
|---|---|---|---|
| AuditLog — moliyaviy | **5 yil** | Soliq kodeksi | S3 WORM arxiv |
| AuditLog — xavfsizlik (high/critical) | 3 yil | Insident tergovi | S3 arxiv |
| AuditLog — oddiy (info) | 1 yil | Operatsion | Partition drop |
| Fiskal cheklar | 5 yil | Soliq talabi | S3 WORM |
| To'lov tranzaksiyalari | 5 yil | Moliya | Arxiv |
| Buyurtmalar | 3 yil | Biznes analitika | Agregatga aylantiriladi |
| Mijoz sessiyasi | 90 kun | Texnik | O'chiriladi |
| AI suhbat | 30 kun | Sifat nazorati | O'chiriladi |
| Nginx access log | 90 kun | Xavfsizlik | S3 |
| Ilova log | 30 kun | Debug | S3 (90 kun) |
| Metrikalar | 1 yil | Trend | Downsampled |

### 9.4 Shubhali harakat aniqlash

```python
# core/security/anomaly.py
"""Har 5 daqiqada AuditLog'ni tahlil qiladi."""

RULES = [
    # (nom, SQL/ORM, chegara, severity, xabar)
    ('brute_force_pin',
     lambda: AuditLog.objects.filter(action='staff.login.failed',
                                     ts__gte=ago(minutes=15))
             .values('ip').annotate(n=Count('id')).filter(n__gte=15),
     'high', "PIN brute-force urinishi"),

    ('cross_tenant_probing',
     lambda: AuditLog.objects.filter(action='authz.cross_tenant_object',
                                     ts__gte=ago(minutes=10))
             .values('ip').annotate(n=Count('id')).filter(n__gte=3),
     'critical', "🔴 Cross-tenant zondlash"),

    ('token_enumeration',
     lambda: AuditLog.objects.filter(action='qr.token_invalid', ts__gte=ago(minutes=10))
             .values('ip').annotate(n=Count('id')).filter(n__gte=50),
     'high', "QR token taxmin qilish"),

    ('unusual_refund_volume',
     lambda: AuditLog.objects.filter(action='payment.refund', ts__gte=ago(hours=1))
             .values('actor_id', 'restaurant_id').annotate(n=Count('id')).filter(n__gte=10),
     'high', "Ko'p qaytarish — ichki o'g'irlik ehtimoli"),

    ('after_hours_admin',
     lambda: AuditLog.objects.filter(actor_type='admin', ts__gte=ago(minutes=5),
                                     ts__hour__in=[1, 2, 3, 4, 5])
             .exclude(action__startswith='order.'),
     'warn', "Ish vaqtidan tashqari admin faoliyati"),

    ('price_change_burst',
     lambda: AuditLog.objects.filter(action='dish.price_change', ts__gte=ago(minutes=10))
             .values('restaurant_id').annotate(n=Count('id')).filter(n__gte=50),
     'warn', "Ommaviy narx o'zgarishi"),

    ('impersonation',
     lambda: AuditLog.objects.filter(action='platform.impersonate', ts__gte=ago(minutes=5)),
     'high', "Platforma admin restoran nomidan kirdi"),

    ('mass_export',
     lambda: AuditLog.objects.filter(action='data.export', ts__gte=ago(hours=1))
             .values('actor_id').annotate(n=Count('id')).filter(n__gte=20),
     'high', "Ommaviy ma'lumot eksporti"),

    ('new_ip_admin',
     lambda: _admin_new_ip_events(),
     'warn', "Admin yangi IP dan kirdi"),

    ('webhook_signature_failures',
     lambda: AuditLog.objects.filter(action='webhook.rejected', ts__gte=ago(minutes=10))
             .values('ip').annotate(n=Count('id')).filter(n__gte=5),
     'critical', "🔴 Soxta to'lov webhook urinishi"),
]


def scan():
    for name, query, severity, message in RULES:
        hits = list(query())
        if not hits:
            continue
        metrics.inc('armenu_anomaly_total', labels={'rule': name})
        alert_oncall(
            f"{'🔴' if severity == 'critical' else '🟠'} {message}\n"
            f"Qoida: {name} · Hodisalar: {len(hits)}\n"
            f"Tafsilot: {hits[:5]}\n"
            f"QILISH: /ops/audit/?rule={name} sahifasini oching",
            severity='P1' if severity == 'critical' else 'P2')
```

---

## 10. SIRLAR BOSHQARUVI

### 10.1 Saqlash

```
┌─────────────────────────────────────────────────────────────────┐
│  S0–S2 bosqich:  .env fayl                                      │
│    /srv/armenu/.env  ·  chmod 600  ·  chown armenu:armenu       │
│    systemd: EnvironmentFile=/srv/armenu/.env                    │
│    Git'da: .env.example (qiymatsiz shablon)                     │
│    Backup: ops/secrets.enc (SOPS + age), git repo'da            │
├─────────────────────────────────────────────────────────────────┤
│  S3+ bosqich:  HashiCorp Vault                                  │
│    Dinamik DB credentials (TTL 1 soat)                          │
│    Transit engine (maydon shifrlash)                            │
│    Audit log (kim qaysi sirni o'qidi)                           │
└─────────────────────────────────────────────────────────────────┘
```

### 10.2 Sirlar ro'yxati va rotatsiya

| # | Sir | Qayerda | Rotatsiya | Rotatsiya ta'siri |
|---|---|---|---|---|
| 1 | `SECRET_KEY` (Django) | .env | 90 kun | Barcha sessiya bekor (kechasi) |
| 2 | `JWT_SECRET` | .env | 90 kun | Barcha access token bekor (15 daq) |
| 3 | `DEVICE_COOKIE_SECRET` | .env | 90 kun | Mijoz cookie'lari bekor (qayta skanerlash) |
| 4 | `PIN_LOOKUP_KEY` | .env | ⚠️ 1 yil | Barcha `pin_lookup` qayta hisoblanadi (migratsiya) |
| 5 | `FIELD_ENCRYPTION_KEYS` | .env (ro'yxat) | 90 kun | MultiFernet — eski kalit ochish uchun qoladi |
| 6 | `DB_PASSWORD` | .env / Vault | 90 kun | PgBouncer reload |
| 7 | `REDIS_PASSWORD` | .env | 90 kun | Servis restart |
| 8 | `PAYME_MERCHANT_KEY` | .env | Provayder talabi | Provayder kabinetida sinxron |
| 9 | `CLICK_SECRET_KEY` | .env | Provayder talabi | Sinxron |
| 10 | `UZUM_SECRET` | .env | Provayder talabi | Sinxron |
| 11 | `OFD_API_TOKEN` (×2) | .env | 180 kun | OFD kabinetida |
| 12 | AI API kalitlari (×6) | .env | 90 kun | Provayder kabinetida |
| 13 | `TELEGRAM_BOT_TOKEN` | .env | Kerak bo'lganda | BotFather |
| 14 | `S3_ACCESS_KEY` / `SECRET` | .env | 90 kun | IAM'da yangi kalit → eski o'chirish |
| 15 | `BACKUP_AGE_PRIVATE_KEY` | ⚡ Offline seyf (2 nusxa) | 1 yil | Yangi backuplar yangi kalit bilan |
| 16 | SSH deploy kaliti | CI secret | 90 kun | `authorized_keys` yangilanishi |
| 17 | TLS sertifikat | certbot | 90 kun (avto) | nginx reload |
| 18 | `SENTRY_DSN` | .env | Kerak bo'lganda | — |

```bash
#!/usr/bin/env bash
# ops/secrets/rotate.sh — 90 kunlik rotatsiya
set -euo pipefail
SECRET_NAME=$1
NEW=$(openssl rand -base64 48 | tr -d '\n')

# 1) Yangi qiymatni QO'SHAMIZ (eskisi hali ishlaydi — MultiFernet uslubi)
python ops/secrets/add_key.py "$SECRET_NAME" "$NEW"
sudo systemctl reload armenu

# 2) Grace davri: 24 soat (eski token/sessiya tugashi uchun)
echo "⏳ 24 soat kutiladi (eski kalit bilan yaratilgan tokenlar tugasin)"

# 3) Eskisini olib tashlash (alohida skript, cron bilan +1 kun)
# python ops/secrets/drop_old_key.py "$SECRET_NAME"

# 4) Audit
python manage.py audit_log --action=secret.rotated --object="$SECRET_NAME"
```

### 10.3 Git'ga tushmaslik — pre-commit hook

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.0
    hooks:
      - id: gitleaks

  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.5.0
    hooks:
      - id: detect-secrets
        args: ['--baseline', '.secrets.baseline']

  - repo: local
    hooks:
      - id: no-env-files
        name: "⛔ .env fayllari commit qilinmasin"
        entry: bash -c 'git diff --cached --name-only | grep -E "^\.env$|\.env\.(prod|local)$" && { echo "⛔ .env commit qilinmoqda!"; exit 1; } || exit 0'
        language: system
        pass_filenames: false

      - id: no-hardcoded-secrets
        name: "⛔ Kodda qattiq yozilgan sir"
        entry: bash -c 'grep -rnEi "(SECRET_KEY|API_KEY|PASSWORD|TOKEN)\s*=\s*[\x27\"][A-Za-z0-9+/=_-]{16,}" --include="*.py" apps/ core/ config/ && exit 1 || exit 0'
        language: system
        pass_filenames: false

      - id: tenant-isolation-quick
        name: "⚡ Tenant izolyatsiya tez tekshiruv"
        entry: bash -c 'grep -rn "objects\.all()" apps/*/views*.py | grep -v TenantScoped && exit 1 || exit 0'
        language: system
        pass_filenames: false
```

```gitignore
# .gitignore
.env
.env.*
!.env.example
*.pem
*.key
!*.pub
ops/secrets/*.dec
/srv/
backup/
```

**Agar sir git'ga tushib qolsa:**

```
[1] DARHOL sirni ROTATSIYA qiling (repo tozalashdan OLDIN!)
    → sir allaqachon oshkor; git tarixini tozalash yetarli emas
[2] git filter-repo --invert-paths --path <fayl>
[3] Force push + barcha fork/klonlar haqida xabar
[4] GitHub Support'ga murojaat (kesh tozalash)
[5] AuditLog: kim, qachon, qaysi sirni oshkor qildi
[6] Post-mortem
```

---

## 11. O'ZBEKISTON QONUNCHILIGI

### 11.1 Shaxsiy ma'lumotlar to'g'risidagi qonun (O'RQ-547, 02.07.2019)

| Talab | Modda | ARMENU'da qanday bajariladi |
|---|---|---|
| **Rozilik olish** | 20-modda | QR sahifada birinchi kirishda banner: "Davom etish orqali siz [Maxfiylik siyosati]ga rozilik bildirasiz". Telefon so'ralganda alohida checkbox |
| **Maqsadni ko'rsatish** | 5-modda | Maxfiylik siyosatida: nima, nima uchun, qancha vaqt |
| **Minimallik** | 5-modda | ⚡ Mijozdan ism/telefon **so'ralmaydi**; telefon faqat chek uchun ixtiyoriy |
| **⚡ Lokalizatsiya** | 27¹-modda | 🔴 **Serverlar O'zbekistonda** — DB, backup, log. Uzbektelecom/UZINFOCOM DC |
| **Xavfsizlik choralari** | 24-modda | Shifrlash, kirish nazorati, audit — shu hujjat |
| **Kirish huquqi** | 19-modda | `GET /v1/me/data/` — mijoz o'z ma'lumotini oladi (JSON) |
| **Tuzatish huquqi** | 19-modda | Admin panel / qo'llab-quvvatlash orqali |
| **O'chirish huquqi** | 22-modda | `DELETE /v1/me/data/` — 30 kun ichida bajariladi |
| **Operator ro'yxati** | 7-modda | Davlat personal ma'lumotlar bazalari reyestrida ro'yxatdan o'tish |
| **Buzilish haqida xabar** | 24-modda | Insident → 72 soat ichida vakolatli organga |

```
┌───────────────────────────────────────────────────────────────┐
│  ⚡ MA'LUMOT LOKALIZATSIYASI — ARXITEKTURAVIY MAJBURIYAT      │
│                                                               │
│  ✅ O'ZBEKISTONDA (majburiy):                                 │
│     • PostgreSQL primary + replica                            │
│     • Backup asosiy nusxasi (S3 Toshkent)                     │
│     • Redis (sessiya, PII kesh)                               │
│     • Ilova log (IP, UA)                                      │
│     • AuditLog                                                │
│                                                               │
│  🟡 CHET ELDA (PII'siz bo'lishi shart):                       │
│     • CDN (3D fayl, rasm — shaxsiy ma'lumot yo'q)             │
│     • DR backup nusxasi (⚠️ shifrlangan, kalit UZ'da)         │
│     • Prometheus/Grafana (agregat metrikalar)                 │
│     • AI provayderlar (⚠️ §11.2)                              │
└───────────────────────────────────────────────────────────────┘
```

### 11.2 AI provayderlar va ma'lumot uzatish

> ⚠️ **Muammo:** AI provayderlar (Gemini, Claude, GPT) chet elda. Ularga
> yuborilgan ma'lumot chegara orqali o'tadi.

| Chora | Amalga oshirish |
|---|---|
| PII yuborilmaydi | AI so'roviga faqat: menyu matni + mijoz savoli. ⛔ Telefon, ism, buyurtma tarixi, IP yo'q |
| Anonimlashtirish | `session_key` o'rniga tasodifiy `conversation_id` |
| Rozilik | AI chat birinchi ochilganda: "Savolingiz AI xizmatiga yuboriladi" |
| Saqlanmaslik | Provayder API'da `store=false` / zero-retention rejimi (mavjud bo'lsa) |
| Lokal fallback | pgvector semantik qidiruv — PII umuman chiqmaydi |
| Log | AI so'rov/javob 30 kun, faqat UZ serverida |

### 11.3 Fiskal talablar

| Talab | Hujjat | ARMENU'da |
|---|---|---|
| Onlayn nazorat-kassa mashinasi (NKM) | VM №943 (2019) | OFD integratsiyasi (UZKASSA / e-POS) |
| Har savdo uchun fiskal chek | Soliq kodeksi 268-modda | Har `payment.paid` → fiskal chek |
| **IKPU** (MXIK) kodi har mahsulotda | VM №1030 | Har `Dish` da `ikpu_code` majburiy maydon; `tasnif.soliq.uz` dan tekshiriladi |
| QR-chek mijozga | VM №943 | Chek QR → Telegram / SMS / ekranda |
| Chekni 5 yil saqlash | Soliq kodeksi | S3 WORM arxiv |
| Chek raqami uzluksiz | OFD talabi | Sequence, bo'shliqsiz; bo'shliq → alert |
| Bekor qilish/qaytarish cheki | VM №943 | `refund` → alohida fiskal hujjat |
| QQS stavkasi | Soliq kodeksi | Har taomda `vat_rate` (0% / 12%), restoran rejimiga qarab |

```python
# apps/fiscal/models.py
class Dish(models.Model):
    ikpu_code = models.CharField(max_length=17, db_index=True,
                                 help_text="MXIK/IKPU kodi — majburiy")
    package_code = models.CharField(max_length=20, blank=True)
    vat_rate  = models.DecimalField(max_digits=4, decimal_places=2, default=12)

    def clean(self):
        # ⚡ Fiskal chek yuborilmasligi uchun IKPU'siz taom sotilmaydi
        if self.is_active and not self.ikpu_code:
            raise ValidationError({'ikpu_code': "IKPU kodi majburiy (soliq talabi)"})
```

### 11.4 Rozilik olish oqimi

```
  Birinchi QR skanerlash
       │
       ▼
  ┌────────────────────────────────────────────────────┐
  │  📋 Pastdan chiquvchi banner                        │
  │                                                    │
  │  Menyudan foydalanish orqali siz                   │
  │  [Maxfiylik siyosati] va [Foydalanish shartlari]   │
  │  ga rozilik bildirasiz.                            │
  │                                                    │
  │  Biz saqlaymiz: sessiya identifikatori, buyurtma.  │
  │  Biz saqlamaymiz: ism, telefon, karta.             │
  │                                                    │
  │              [Tushunarli]                          │
  └────────────────────────────────────────────────────┘
       │  ✅ bosildi → ConsentLog yoziladi
       ▼
  ┌────────────────────────────────────────────────────┐
  │  Chek uchun telefon (ixtiyoriy, to'lov bosqichida) │
  │  ☐ Chekni Telegram/SMS orqali yuborish uchun       │
  │    telefon raqamimni saqlashga roziman             │
  │    (1 yil saqlanadi)                               │
  └────────────────────────────────────────────────────┘
```

```python
# apps/legal/models.py
class ConsentLog(models.Model):
    """Rozilik dalili — nizо bo'lsa isbot."""
    restaurant_id = models.IntegerField(db_index=True)
    session_key   = models.CharField(max_length=64, db_index=True)
    consent_type  = models.CharField(max_length=32)     # privacy|phone|ai|marketing
    version       = models.CharField(max_length=16)     # siyosat versiyasi
    granted       = models.BooleanField()
    ts            = models.DateTimeField(auto_now_add=True)
    ip            = models.GenericIPAddressField(null=True)
    user_agent    = models.CharField(max_length=300, blank=True)
```

---

## 12. XAVFSIZLIK CHEK-LISTI — DEPLOY OLDIDAN (25 punkt)

### 🔧 Konfiguratsiya

| # | Tekshiruv | Buyruq / usul | ✅ |
|---|---|---|---|
| 1 | `DEBUG = False` | `python manage.py diffsettings \| grep DEBUG` | ☐ |
| 2 | `ALLOWED_HOSTS` aniq (`*` emas) | settings ko'rigi | ☐ |
| 3 | `SECRET_KEY` production'ga xos, git'da yo'q | `gitleaks detect` | ☐ |
| 4 | `SECURE_SSL_REDIRECT`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE` = True | `manage.py check --deploy` | ☐ |
| 5 | `SECURE_HSTS_SECONDS ≥ 31536000` + preload | `check --deploy` | ☐ |
| 6 | `/admin/` o'chirilgan yoki IP allowlist + 2FA | nginx config | ☐ |
| 7 | `.env` chmod 600, `.git` veb orqali yopiq | `curl https://armenu.uz/.env` → 404 | ☐ |

### 🔐 Auth va avtorizatsiya

| # | Tekshiruv | ✅ |
|---|---|---|
| 8 | Barcha ViewSet'larda `permission_classes` bor (default `AllowAny` emas) | ☐ |
| 9 | Har ViewSet'da `required_action` belgilangan | ☐ |
| 10 | JWT TTL jadvalga mos (access ≤ 15 daq) | ☐ |
| 11 | Refresh rotatsiya + oila revoke ishlayapti | ☐ |
| 12 | Platforma admin 2FA majburiy | ☐ |

### ⚡ Multi-tenant

| # | Tekshiruv | ✅ |
|---|---|---|
| 13 | `pytest tests/security/test_tenant_isolation.py` — 100% o'tdi | ☐ |
| 14 | Barcha kesh kalitlarida `restaurant_id` bor | ☐ |
| 15 | WS group nomlari serverda quriladi | ☐ |
| 16 | Tenant audit skripti 0 anomaliya qaytardi | ☐ |

### 💳 To'lov va fiskal

| # | Tekshiruv | ✅ |
|---|---|---|
| 17 | Karta maydonlari yo'q (`test_no_card_data` o'tdi) | ☐ |
| 18 | Webhook imzo + IP allowlist barcha 3 provayderda | ☐ |
| 19 | Summa serverda hisoblanadi (`test_client_cannot_set_price` o'tdi) | ☐ |
| 20 | Har taomda IKPU kodi bor | ☐ |

### 🛡 Umumiy

| # | Tekshiruv | ✅ |
|---|---|---|
| 21 | `pip-audit` — 0 ta yuqori/kritik zaiflik | ☐ |
| 22 | `bandit -r apps/ core/ -ll` — 0 ta yuqori | ☐ |
| 23 | Rate limit barcha kritik endpointlarda | ☐ |
| 24 | Log'da PII yo'q (namuna log 10 qator qo'lda tekshirildi) | ☐ |
| 25 | Backup shifrlangan + tiklash sinovi so'nggi 7 kunda o'tgan | ☐ |

```bash
#!/usr/bin/env bash
# ops/security/preflight.sh — deploy oldidan avtomatik tekshiruv
set -e
echo "═══ ARMENU Xavfsizlik Preflight ═══"
python manage.py check --deploy --fail-level WARNING
pytest tests/security/ -q --no-header
gitleaks detect --no-git --redact
pip-audit --strict -r requirements.txt
bandit -r apps/ core/ -ll -q -x tests
python manage.py tenant_audit --fail-on-anomaly
curl -sf -o /dev/null -w '%{http_code}' https://armenu.uz/.env | grep -q 404
python manage.py backup_verify --max-age-days=7
echo "✅ Barcha tekshiruvlar o'tdi — deploy'ga ruxsat"
```

---

## 13. INSIDENTGA JAVOB

### 13.1 Darajalar

| Daraja | Ta'rif | Misol | Javob vaqti | Kim |
|---|---|---|---|---|
| 🔴 **P1** | Ma'lumot sizishi / to'liq to'xtash / moliyaviy zarar | Cross-tenant sizish, DB egallanishi, to'lov manipulyatsiyasi | **15 daqiqa** (24/7) | Texnik direktor + SRE + backend lead |
| 🟠 **P2** | Jiddiy degradatsiya / potensial sizish | Auth chetlab o'tish urinishi, PII log'da, provayder yiqilishi | **1 soat** (ish vaqti), 4 soat (tunda) | SRE + backend |
| 🟡 **P3** | Cheklangan ta'sir | Rate limit chetlab o'tish, XSS (self), zaiflik topildi | **24 soat** | Backend |
| 🟢 **P4** | Ta'sirsiz / profilaktik | Eskirgan kutubxona, konfiguratsiya tavsiyasi | **7 kun** | Navbatdagi sprint |

### 13.2 Javob rejasi (P1 namunasi — cross-tenant sizish)

```
╔═══════════════════════════════════════════════════════════════════╗
║  T+0    ANIQLASH                                                  ║
║    Manba: anomaly scan / mijoz shikoyati / audit skript           ║
║    → #incident kanali ochiladi, incident commander tayinlanadi     ║
╠═══════════════════════════════════════════════════════════════════╣
║  T+5m   TIYISH (containment) — ⚡ ENG MUHIM BOSQICH               ║
║    □ Ta'sirlangan endpoint O'CHIRILADI (feature flag)             ║
║      $ python manage.py flag off <endpoint>                       ║
║    □ Zarur bo'lsa butun API read-only rejimga                     ║
║      $ redis-cli SET armenu:readonly_mode 1 EX 3600               ║
║    □ Shubhali sessiyalar/tokenlar revoke                          ║
║    □ Hujumchi IP Cloudflare'da bloklanadi                         ║
║    ⛔ HECH NARSA O'CHIRILMAYDI — dalillar saqlanadi               ║
╠═══════════════════════════════════════════════════════════════════╣
║  T+15m  BAHOLASH                                                  ║
║    □ Qancha yozuv ta'sirlangan?  (AuditLog + nginx access log)    ║
║    □ Qaysi restoranlar?  Qanday ma'lumot?                         ║
║    □ Haqiqatan sizdimi yoki faqat urinish?                        ║
║    □ Dalillarni nusxalash: log snapshot → alohida S3 bucket       ║
╠═══════════════════════════════════════════════════════════════════╣
║  T+30m  ALOQA                                                     ║
║    □ Ichki: butun jamoa + investorlar (agar jiddiy)               ║
║    □ Ta'sirlangan restoranlar: aniq nima sizdi, nima qildik       ║
║    □ Status sahifa yangilanadi                                    ║
║    □ ⚠️ 72 soat ichida: vakolatli organ (PM qonuni 24-modda)      ║
╠═══════════════════════════════════════════════════════════════════╣
║  T+2h   TUZATISH                                                  ║
║    □ Sabab topildi (kod / konfiguratsiya / migratsiya)            ║
║    □ Fix + test (regressiya testi MAJBURIY)                       ║
║    □ Canary deploy → to'liq deploy                                ║
║    □ Feature flag qaytariladi                                     ║
╠═══════════════════════════════════════════════════════════════════╣
║  T+24h  TIKLANISH VA TASDIQLASH                                   ║
║    □ Tenant audit skripti 0 anomaliya                             ║
║    □ Kengaytirilgan monitoring 7 kun                              ║
║    □ Ta'sirlangan mijozlarga yakuniy xabar                        ║
╠═══════════════════════════════════════════════════════════════════╣
║  T+72h  POST-MORTEM (aybsiz — blameless)                          ║
╚═══════════════════════════════════════════════════════════════════╝
```

### 13.3 Aloqa matritsasi

| Kim | Qachon xabar beriladi | Kanal | Kim xabar beradi |
|---|---|---|---|
| Incident commander | Darhol | PagerDuty / qo'ng'iroq | Avtomatik alert |
| SRE navbatchi | Darhol (P1/P2) | Telegram + qo'ng'iroq | Avtomatik |
| Backend lead | P1: darhol, P2: 1 soat | Telegram | IC |
| Texnik direktor | P1: darhol | Qo'ng'iroq | IC |
| Bosh direktor | P1 (ma'lumot sizishi) | Qo'ng'iroq | Texnik direktor |
| Ta'sirlangan restoranlar | 30 daq ichida | Telegram + email + qo'ng'iroq | Qo'llab-quvvatlash |
| Barcha mijozlar | Agar keng ta'sir | Status sahifa + email | Marketing |
| Vakolatli organ | 72 soat ichida (PM sizishi) | Rasmiy xat | Yuridik |
| To'lov provayderi | To'lovga tegishli bo'lsa | Provayder kanali | Texnik direktor |

### 13.4 Post-mortem shabloni

```markdown
# Insident hisoboti — INC-2026-NN

**Sana:** · **Daraja:** P_ · **Davomiylik:** _ daqiqa
**Incident commander:** · **Ta'sirlangan xizmat:**

## 1. Qisqacha (2-3 jumla)
## 2. Ta'sir
   - Ta'sirlangan restoranlar / foydalanuvchilar:
   - Sizgan ma'lumot (bo'lsa):
   - Moliyaviy zarar:
   - Error budget sarfi:
## 3. Vaqt chizig'i (UTC)
   | Vaqt | Hodisa | Kim |
## 4. Ildiz sabab (5 marta "nega")
## 5. Nima yaxshi ishladi
## 6. Nima yomon ishladi
## 7. Omad (bexosdan qutulib qolgan joylar)
## 8. Harakat rejasi
   | # | Harakat | Turi (oldini olish/aniqlash/yumshatish) | Kim | Muddat | Ticket |
## 9. Regressiya testi
   - [ ] Shu bug'ni qaytadan ushlaydigan test yozildi va CI'ga qo'shildi

⚡ Aybsiz (blameless): odam emas, TIZIM aybdor. Odam xato qila olgan bo'lsa —
tizim uni to'xtatishi kerak edi.
```

---

## 14. XULOSA — XAVFSIZLIK QISQACHA

```
┌──────────────────────────────────────────────────────────────────┐
│  ⚡ 5 TA ENG MUHIM QAROR                                         │
├──────────────────────────────────────────────────────────────────┤
│  1. MULTI-TENANT — 4 qatlam (middleware→mixin→serializer→test)   │
│     + kunlik DB butunlik auditi + CI gate. Deploy bloklanadi.    │
│                                                                  │
│  2. NARX FAQAT SERVERDA — klient dish_id+qty yuboradi, xolos.    │
│     Webhook summasi ham solishtiriladi.                          │
│                                                                  │
│  3. KARTA MA'LUMOTI BIZGA KELMAYDI — redirect, PCI SAQ A.        │
│     CI kod ichida karta maydonini topsa build yiqiladi.          │
│                                                                  │
│  4. MIJOZ AUTH'SIZ, LEKIN MINIMAL MA'LUMOT — ism, telefon,       │
│     joylashuv so'ralmaydi. Sizadigan narsa yo'q.                 │
│                                                                  │
│  5. AUDITLOG APPEND-ONLY — DB darajasida UPDATE/DELETE taqiq.    │
│     Hech kim izini yashira olmaydi.                              │
└──────────────────────────────────────────────────────────────────┘
```

**Raqamlarda:**

| Ko'rsatkich | Qiymat |
|---|---|
| STRIDE tahdid ssenariylari | 44 |
| Multi-tenant himoya qatlamlari | 4 + kunlik audit |
| Ma'lum sizish naqshlari (kataloglangan) | 15 |
| Autentifikatsiya aktorlari | 4 |
| Rol × amal matritsasi | 6 × 24 |
| Rate limit qoidalari | 20 |
| PII maydonlari (kataloglangan) | 16 |
| Sirlar (rotatsiya jadvali bilan) | 18 |
| Anomaliya aniqlash qoidalari | 10 |
| Deploy oldidan chek-list | 25 punkt |
| CI xavfsizlik gate'lari | 8 |

---

**➡️ Keyingi:** `07_INTEGRATSIYALAR.md`
