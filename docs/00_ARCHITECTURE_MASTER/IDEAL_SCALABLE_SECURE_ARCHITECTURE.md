# Ideal Scalable Secure Architecture

**Loyiha:** Online Store Guliston / Restaurant 3D AR / 3D Studio  
**Maqsad:** 3 ta mahsulot bir vaqtda ishlaganda data aralashmasin, bir qism yiqilsa boshqasini yiqitmasin, 100+ concurrent orderda qotmasin, keyinchalik katta trafficga bosqichma-bosqich scale qilinsin.  
**Yondashuv:** Senior backend + frontend + software engineer + cybersecurity nuqtai nazaridan ideal target arxitektura.

---

## 1. Asosiy Qaror

Bu loyiha boshida **modular monolith** bo'lib qolishi mumkin, lekin arxitektura **deployable modules** prinsipida chiziladi.

Ya'ni:

- birinchi bosqichda bitta Django core backend ichida yuradi;
- lekin har mahsulotning endpointlari, queue workerlari, cache keylari, DB ownershipi va monitoringi alohida bo'ladi;
- keyinchalik `restaurant`, `marketplace`, `studio3d` alohida servicega ajratilsa, domenlar buzilmaydi.

Noto'g'ri yo'l:

```text
Bitta katta backend
-> hamma view hamma modelni chaqiradi
-> bitta dashboard hamma datani yuklaydi
-> bitta qism sekinlashsa hamma qism sekinlashadi
```

To'g'ri yo'l:

```text
Product entrypoint -> bounded context -> application service -> repository -> DB
                                      -> event/outbox -> queue worker
```

---

## 2. Target Infrastructure

```text
Internet Users
    |
    v
Cloudflare / CDN / WAF / Rate Limit
    |
    v
Nginx / Load Balancer
    |
    +-- restaurant.guliston.local      -> Restaurant Web frontend
    +-- market.guliston.local          -> Marketplace Web/Mobile API
    +-- studio.guliston.local          -> 3D Studio Web
    +-- admin.guliston.local           -> Seller/Admin Panel
    |
    v
Backend Gateway Layer
    |
    +-- Restaurant API routes          -> restaurant module
    +-- Marketplace API routes         -> marketplace/commerce/catalog modules
    +-- Studio API routes              -> studio3d module
    +-- Payment callback routes        -> payments module
    +-- Bot webhook routes             -> notifications module
    |
    v
Core Backend Workers & ASGI Runners
    |
    +-- ASGI / Uvicorn workers         -> non-blocking high-concurrency (1000+ active connections)
    +-- Order workers                  -> order events
    +-- Notification workers           -> Telegram/SMS/push
    +-- Payment workers                -> reconciliation/callback processing
    +-- AI/3D workers                  -> heavy generation/processing (Draco/KTX2)
    +-- Report workers                 -> finance/dashboard aggregation
    |
    v
Database & Cache Connection Pooler
    |
    +-- PgBouncer (Transaction Pooling) -> 1,000 ta client ulanishini 25-30 ta DB ulanishga birlashtirish
    |
    v
Data Layer
    |
    +-- PostgreSQL primary (Declarative Table Partitioning: orders, logs by year/month)
    +-- PostgreSQL read replica (Analytics & heavy reporting)
    +-- Redis (Cluster/Sentinel: cache, session, sliding-window rate limit, pub/sub)
    +-- Object storage (S3/MinIO for media, Draco-compressed 3D GLB models)
    +-- Logs/metrics/traces storage (Prometheus / Grafana / Loki)
```

Muhim qoida: **frontenddan kelgan oddiy request hech qachon Telegram, AI, 3D processing yoki katta reportni sync ichida bajarmaydi. 1,000 ta concurrent so'rov PgBouncersuz to'g'ridan-to'g'ri PostgreSQL ga bormaydi.**

---

## 3. Mahsulot Izolyatsiyasi

Loyihada 3 ta mahsulot bor:

1. **Restaurant 3D/AR & NFC Menu**
2. **Marketplace / Online Store**
3. **3D Studio & Printing**

Ular bir backend engine ishlatsa ham, quyidagi darajalarda ajratiladi.

### 3.1 URL / Domain Izolyatsiyasi

```text
/restaurant/*      -> faqat Restaurant flow
/market/*          -> faqat Marketplace flow
/studio/*          -> faqat Studio flow
/seller/*          -> authenticated seller/admin panel
/api/restaurant/*  -> Restaurant API
/api/market/*      -> Marketplace API
/api/studio/*      -> Studio API
/api/admin/*       -> Admin/Seller API
```

Bir product endpoint boshqa product datani bevosita qaytarmaydi.

### 3.2 Data Izolyatsiyasi

Har core jadvalda ownership maydoni majburiy bo'ladi:

```text
tenant_id
product_scope
shop_id / restaurant_id / studio_id
created_by
```

Minimal qoida:

- Restaurant order `restaurant_id` bilan filterlanadi.
- Marketplace order `shop_id` yoki `seller_id` bilan filterlanadi.
- Studio order `studio_id` yoki `print_workspace_id` bilan filterlanadi.
- Notification `tenant_id + product_scope` bo'yicha ketadi.
- Finance transaction `tenant_id + source_product + source_order_id` bilan yoziladi.

Taqiqlanadi:

```python
Shop.objects.first()
Order.objects.all()
Transaction.objects.filter(status="paid")
```

Majburiy:

```python
Order.objects.for_tenant(tenant_id).filter(product_scope="restaurant")
Transaction.objects.for_tenant(tenant_id).filter(source_product="marketplace")
```

### 3.3 Cache Izolyatsiyasi

Cache keylar product va tenant bilan boshlanadi:

```text
restaurant:{tenant_id}:menu:{version}
restaurant:{tenant_id}:table:{table_id}:bill
market:{tenant_id}:catalog:{category_id}:page:{n}
studio:{tenant_id}:print-order:{order_id}
finance:{tenant_id}:daily-summary:{date}
```

Taqiqlanadi:

```text
products
orders
dashboard
menu
```

Sababi: umumiy cache key data aralashishiga olib keladi.

---

## 4. DDD Bounded Contextlar

Backend target:

```text
services/core_backend/
├── config/
├── entrypoints/
│   ├── http/
│   ├── bots/
│   ├── workers/
│   └── management/
├── modules/
│   ├── identity/
│   ├── tenants/
│   ├── catalog/
│   ├── commerce/
│   ├── restaurant/
│   ├── studio3d/
│   ├── payments/
│   ├── finance/
│   ├── delivery/
│   ├── notifications/
│   ├── ai/
│   └── analytics/
├── shared_kernel/
├── infrastructure/
│   ├── db/
│   ├── cache/
│   ├── queue/
│   ├── storage/
│   ├── security/
│   └── observability/
└── tests/
```

Har modul ichida:

```text
modules/commerce/
├── domain/
├── application/
├── infrastructure/
├── interfaces/
└── tests/
```

Dependency rule:

```text
interfaces -> application -> domain
infrastructure -> application/domain
domain -> hech kimga qaram emas
```

Domain ichida Django, DRF, Telegram, Click/Payme, HTTP, Redis import bo'lmaydi.

---

## 5. Request Fan-Out Oldini Olish

Muammo: bitta sahifa ochilganda hamma endpointlarga request ketib, backendni bosib yuborishi mumkin.

Qoidalar:

### Restaurant Menu

Ruxsat:

```text
GET /api/restaurant/menu
GET /api/restaurant/table-session
POST /api/restaurant/cart/items
POST /api/restaurant/orders
```

Taqiqlanadi:

```text
GET /finance/summary
GET /seller/orders
GET /couriers
GET /admin/dashboard
GET /notifications/all
```

### Seller Dashboard

Dashboard hammasini bir requestda yuklamaydi.

To'g'ri:

```text
GET /api/admin/summary        -> cached KPI
GET /api/admin/orders?page=1  -> paginated
GET /api/admin/alerts         -> lightweight
```

Noto'g'ri:

```text
GET /api/admin/dashboard
-> products + orders + finance + couriers + notifications + analytics + customers
```

### KDS / Waiter

KDS polling bilan DBni urmaydi.

Ideal:

```text
WebSocket/SSE -> only active restaurant orders
Redis pub/sub or channel layer
```

Fallback:

```text
GET /api/restaurant/kds/orders?updated_after=timestamp
```

---

## 6. 1000+ Concurrent User va 6 Yillik Chidamlilik Standarti

1,000 ta faol user bir vaqtda kirganda (peak 300–800 RPS) server osilib qolmasligi va 6 yil davomida uzluksiz ishlashi uchun **shart bo'lgan ishlab chiqarish steki**:

```text
1. Nginx (Edge Caching, TLS Termination, HTTP/2, Static Microcaching)
2. ASGI / Uvicorn Workers (Asinxron non-blocking I/O, har worker 250-500 ulanish)
3. PgBouncer Connection Pooler (Transaction Mode: 1000 client -> 25-30 DB connection)
4. PostgreSQL (Declarative Range Partitioning by Year/Month, B-Tree & GIN indekslar)
5. Redis (In-Memory Sentinel: Kesh, Sessiyalar, Sliding Window Rate Limiting, Pub/Sub)
6. Celery / RQ Workers (Alohida navbatlar: default, orders, notifications, heavy_3d)
7. Cloudflare CDN / MinIO (Draco siqilgan 3D GLB modellari va rasmlar uchun)
8. Database Read-Replica (Katta analitika va kassa hisobotlari asosiy bazani qotirmaydi)
9. Outbox Consumer (SELECT ... FOR UPDATE SKIP LOCKED bilan ziddiyatsiz navbat)
```

Order yaratish flow:

```text
POST /api/restaurant/orders
    |
    v
validate request
    |
    v
DB transaction:
    - create order
    - create order items
    - reserve stock if needed
    - write outbox event OrderCreated
    |
    v
return 201 quickly
    |
    v
background worker:
    - notify kitchen
    - notify Telegram
    - update analytics summary
    - create finance draft if needed
```

Request ichida bajarilmaydi:

- Telegram message
- AI call
- 3D model generation
- PDF generation
- daily finance recalculation
- image processing
- external slow API retry

---

## 7. Failure Isolation

Bir qism yiqilsa boshqasi ishlashi kerak.

### Telegram yiqilsa

Order qabul qilish ishlayveradi.

```text
OrderCreated event -> notification queue
Telegram down -> retry with backoff -> dead letter queue
```

Userga order yaratishda xato chiqmaydi.

### AI provider yiqilsa

Menu, order, payment ishlayveradi.

```text
AI feature disabled/degraded
Core commerce unaffected
```

### Payment provider sekin bo'lsa

Order status `payment_pending` bo'ladi.

```text
Payment callback async
Reconciliation worker
Idempotency key
```

### Finance report sekin bo'lsa

Order yaratish sekinlashmaydi.

```text
Finance summary cached/materialized
Raw transaction append-only
Report worker updates aggregates
```

### 3D processing yiqilsa

Marketplace va Restaurant order flow ishlayveradi.

```text
studio3d queue separate
worker pool separate
timeout separate
```

---

## 8. Queue Va Event Architecture

Sync requestlar faqat tezkor biznes transaction bajaradi. Yon effektlar event orqali ketadi.

```text
OrderCreated
OrderPaid
OrderCancelled
TableCalledWaiter
PaymentSucceeded
PaymentFailed
PrintOrderCreated
ProductImported
DebtPartiallyPaid
```

Outbox pattern (Ziddiyatsiz yuqori yuklama standarti):

```text
DB transaction:
  create business row (Order, Payment, Call)
  create outbox_event row (status='pending', payload={...})

worker (Celery / Background Consumer):
  SELECT * FROM outbox_events 
  WHERE status = 'pending' 
  ORDER BY created_at ASC 
  LIMIT 50 
  FOR UPDATE SKIP LOCKED;  <-- Bir nechta worker parallel ishlaganda navbat qotmaydi!

  publish / process (Telegram, KDS, SMS, Audit)
  mark status = 'processed', processed_at = NOW()
```

Bu nima beradi:

- request 50ms ichida tez qaytadi (non-blocking);
- Telegram yoki tashqi API yiqilsa ham buyurtma yo'qolmaydi;
- 1,000 ta bir vaqtda kelgan buyurtmada workerlar bitta qator ustida urushmaydi (Zero Lock Contention);
- Exponential backoff retry va Dead-Letter Queue (DLQ) bilan xavfsiz audit.

---

## 9. Database Design Talablar

Majburiy indexlar:

```text
orders(tenant_id, product_scope, status, created_at)
orders(tenant_id, shop_id, created_at)
orders(tenant_id, restaurant_id, table_id, status)
order_items(order_id)
products(tenant_id, shop_id, category_id, is_active)
products(tenant_id, rank_score, views)
tables(tenant_id, restaurant_id, hall_id, status)
payments(tenant_id, provider, status, external_id)
finance_transactions(tenant_id, source_product, created_at)
notifications(tenant_id, product_scope, status, created_at)
outbox_events(status, created_at)
```

Query qoidalari:

- list endpoint doim paginated;
- admin dashboard raw table scan qilmaydi;
- `select_related` va `prefetch_related` ishlatiladi;
- `count()` katta jadvalda cache/materialized summary orqali;
- media/model fayllar DBga saqlanmaydi, faqat URL/key saqlanadi.

### 6 Yillik Chidamlilik va Table Partitioning Standarti:

6 yil davomida millionlab qatorlar yig'ilganda ham querylar 50ms tezlikda ishlashi uchun:

1. **Declarative Partitioning (PostgreSQL):**
   - `orders` va `order_items` jadvali `PARTITION BY RANGE (created_at)` qilinadi (har yil/oy uchun alohida partition, masalan `orders_2026_q4`, `orders_2027_q1`).
   - `outbox_events` va `bot_messages` log jadvallari oylik partition qilinadi.
2. **Cold Data Archival (1 yildan eski ma'lumotlar):**
   - 1 yildan oshgan yakunlangan buyurtmalar tranzaksion asosiy indekslardan arxiv (read-only cold storage) jadvaliga ko'chiriladi.
3. **PgBouncer Transaction Pooling:**
   - Har bir backend worker `port 6432` dagi PgBouncer orqali ulanadi. PostgreSQL asosiy portiga (`5432`) to'g'ridan-to'g'ri ulanish faqat migratsiyalar uchun ochiladi.

---

## 10. Frontend Performance Qoidalari

Frontend ham backendni yiqitishi mumkin. Shuning uchun:

- App ochilishi bilan hamma datani fetch qilmaydi.
- Har sahifa o'ziga kerakli datani lazy load qiladi.
- Search debounce bo'ladi.
- Infinite scroll pagination bilan.
- Cart local state + server sync.
- KDS/Waiter live data WebSocket/SSE orqali.
- Images lazy loaded va WebP/AVIF formatda bo'ladi.
- 3D GLB modellari Draco Compression va KTX2 tekstura siqish bilan eksport qilinadi (har bir model maksimal 3 MB). 1,000 ta bir vaqtda kirgan foydalanuvchida server tarmoq kanali toshib ketmasligi uchun Cloudflare Edge Caching orqali tarqatiladi.
- Admin dashboard widgetlari alohida request bilan, cache-friendly.

Taqiqlanadi:

```text
useEffect(() => {
  fetchProducts()
  fetchOrders()
  fetchFinance()
  fetchCouriers()
  fetchTables()
  fetchNotifications()
}, [])
```

To'g'ri:

```text
MenuPage -> menu API
CartPage -> cart API
FinancePage -> finance summary API
KDSPage -> active kitchen stream
```

---

## 11. Security Architecture

### Authentication

- Admin/seller JWT yoki session auth.
- Telegram/TMA flow alohida signed init data orqali.
- Courier login alohida role bilan.
- Payment callbacklar provider signature bilan tekshiriladi.

### Authorization

Har requestda:

```text
user_id
tenant_id
role
product_scope
allowed_shop_ids / restaurant_ids
```

Taqiqlanadi:

```python
if user.is_authenticated:
    return all_orders
```

Majburiy:

```python
if not policy.can_view_order(user, order):
    raise PermissionDenied
```

### Data Leakage Oldini Olish

- Serializerlar boshqa tenant fieldlarini chiqarmaydi.
- QuerySet default manager tenant filter bilan.
- Admin panelda ham tenant/product filter majburiy.
- Logs ichida token, payment card, secret, phone full formatda yozilmaydi.

### Rate Limit (Redis Sliding Window Log Standarti)

1,000 ta bir vaqtda kelgan foydalanuvchi/botlar Redis xotirasini to'ldirmasligi va DDoS xurujlarini qaytarish uchun:

```text
- Algoritm: Redis ZSET asosidagi Sliding Window Log (har IP/Session uchun)
- login/register: 5 req / min (strict)
- order create: 10 req / min per table/session (idempotency key bilan)
- payment callback: provider IP whitelist + HMAC-SHA256 signature tekshiruvi
- telegram webhook: X-Telegram-Bot-Api-Secret-Token majburiy sarlavhasi bilan tekshiriladi
- search: 300ms debounce + 30 req / min
- AI endpoint: token quota based (daily/hourly budget)
```

### CSRF / XSS / CORS

- Seller/admin web CSRF protected.
- API CORS faqat ruxsatli domainlar.
- User content escape qilinadi.
- HTML template ichida raw user input yo'q.
- File upload extension + MIME + size + virus scan.

### Secrets

- `.env` gitga kirmaydi.
- SECRET_KEY doimiy.
- Payment keys, bot tokenlar environment/secret managerda.
- Debug productionda `False`.

---

## 12. Observability

Har production service quyidagini beradi:

```text
request_id
tenant_id
product_scope
user_id nullable
endpoint
latency
status_code
db_query_count
cache_hit/miss
queue_lag
error_code
```

Monitoring:

- API p95/p99 latency
- DB slow query
- Redis memory/hit rate
- queue backlog
- worker failure
- payment callback failure
- Telegram delivery failure
- 5xx rate
- tenant-level traffic anomaly

Alertlar:

```text
POST /orders p95 > 800ms for 5 min
5xx > 1%
queue lag > 60s
payment callback failures > threshold
DB CPU > 80%
disk free < 20%
```

---

## 13. Load Test Talablar

Arxitektura faqat load testdan o'tsa tasdiqlanadi.

Minimal scenario:

```text
Scenario A: 100 concurrent restaurant users
- open menu
- search dish
- add to cart
- create order
- waiter/KDS receive update

Scenario B: 100 marketplace users
- open catalog
- product detail
- cart
- checkout

Scenario C: mixed traffic
- 50 restaurant users
- 30 marketplace users
- 10 seller dashboard users
- 10 studio users

Scenario D: failure
- Telegram down
- payment provider slow
- AI provider timeout
- Redis restart
```

Target:

```text
GET menu/catalog: p95 < 250ms cached
POST order: p95 < 700ms
KDS update delay: < 2s
Dashboard summary: p95 < 800ms cached
Error rate: < 0.5%
No cross-tenant data leak: 0
```

---

## 14. Deployment Strategy

Boshlang'ich production:

```text
1 VPS / server
├── nginx
├── django web workers
├── celery workers
├── redis
├── postgres
└── static/media storage
```

Keyingi scale:

```text
App server 1..N
Dedicated PostgreSQL
Dedicated Redis
Object storage
Read replica
Separate worker nodes
CDN
```

Katta scale:

```text
Separate deployable services:
- restaurant-api
- marketplace-api
- studio-api
- payments-worker
- notifications-worker
- finance-worker
- ai-worker
```

---

## 15. Migration Plan

### Phase 1: Safety Foundation

- tenant/product scope policy yozish;
- default managers yoki repository filter qo'shish;
- cache key namespace standardi;
- endpoint inventory;
- slow query check;
- `.env`, secrets, debug, CORS audit.

### Phase 2: Request Isolation

- frontend page-based fetch;
- dashboard lazy widgets;
- pagination;
- KDS/Waiter active-only endpoints;
- product-specific API namespaces.

### Phase 3: Async Side Effects

- outbox table;
- queue workers;
- Telegram async;
- finance aggregation async;
- payment reconciliation async;
- AI/3D processing separate queue.

### Phase 4: DDD Refactor

- domain/application qatlamlari;
- repository pattern;
- interfaces separation;
- old Django apps compatibility shim;
- tests per module.

### Phase 5: Scale Hardening

- Redis cache;
- DB indexes;
- load tests;
- observability;
- rate limits;
- failure mode tests.

---

## 16. Definition of Done

Arxitektura ideal deb hisoblanishi uchun:

- 3 product data aralashmaydi.
- Har query tenant/product scope bilan yuradi.
- 100 concurrent order load testdan o'tadi.
- Telegram/AI/payment/studio failure order flow'ni yiqitmaydi.
- Dashboard frontend hamma endpointni birdan chaqirmaydi.
- Queue retry va dead letter bor.
- Payment callbacks idempotent.
- Static/media CDN yoki alohida servingda.
- Secrets gitda yo'q.
- Rate limit va permission policy bor.
- Slow query va 5xx monitoring bor.
- Har modulning domain/application/infrastructure/interfaces chegarasi aniq.

---

## 17. Qisqa Xulosa

Ideal yechim faqat papka ko'chirish emas. Ideal yechim:

```text
DDD boundaries
+ product isolation
+ tenant-safe data access
+ async side effects
+ cache strategy
+ DB indexes
+ queue workers
+ frontend lazy loading
+ security policies
+ observability
+ load testing
```

Shu asos bajarilsa, 100 ta user bir vaqtda zakaz qilganda tizim qotib qolmaydi, 3 ta sayt bir-biriga data yoki request bilan xalal bermaydi, bitta tashqi xizmat yiqilsa core order/payment/catalog flow ishlashda davom etadi.
