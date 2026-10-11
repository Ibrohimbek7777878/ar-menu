# 6-Year Production Architecture Standard

**Loyiha:** Online Store Guliston / Restaurant 3D AR / 3D Studio  
**Muddat talabi:** eng kamida 6 yil davomida buzilmasdan, kengayishga tayyor, data aralashmaydigan, xavfsiz va boshqariladigan platforma.  
**Maqsad:** bugungi 100 concurrent userni ham, keyingi yillardagi yangi mahsulotlar, ko'proq traffic, mobil ilovalar, sellerlar, restoranlar, payment providerlar va AI/3D workloadlarni ham ko'tara oladigan arxitektura.

---

## 1. Asosiy Prinsip

Bu loyiha **oddiy sayt** emas. Bu 3 ta mahsulotli biznes platforma:

1. Restaurant 3D/AR & NFC Menu
2. Marketplace / Online Store
3. 3D Studio & Printing

6 yilga chidashi uchun loyiha quyidagi prinsip bilan quriladi:

```text
Business-first architecture
+ DDD bounded contexts
+ product isolation
+ tenant isolation
+ event-driven side effects
+ versioned APIs
+ observable production
+ secure-by-default development
+ migration-safe database evolution
```

Eng muhim qaror:

```text
Boshlanish: Modular Monolith
Maqsad: Service-ready Modular Platform
Kelajak: Zarur bo'lsa ayrim modullar alohida servicega ajraladi
```

Microservice bilan darhol boshlash shart emas. Lekin har modul shunday yoziladiki, 2-3 yildan keyin `payments`, `notifications`, `studio3d`, `analytics` kabi og'ir qismlar alohida servicega ajratilganda butun loyiha qayta yozilmaydi.

---

## 2. 6 Yillik Arxitektura Maqsadlari

Platforma quyidagilarni bajarishi shart:

- 100 concurrent orderda qotmaslik.
- 3 ta product bir vaqtda ishlaganda data aralashmasligi.
- Bitta product yoki worker yiqilsa boshqalar ishlashi.
- Payment callback ikki marta kelsa ham pul/order buzilmasligi.
- Telegram, AI, 3D model generation, finance report sekin bo'lsa order flow to'xtamasligi.
- Mobil app eski API bilan ishlayverishi.
- DB migration data yo'qotmasligi.
- Yangi developer kelganda noto'g'ri joyga kod yozib tizimni buzmasligi.
- Security auditdan o'tadigan darajada auth, permission, rate limit, secret management bo'lishi.
- Backupdan real tiklash mumkin bo'lishi.
- Har muammo log/metric/alert orqali ko'rinishi.

---

## 3. Target Root Architecture

```text
online-store-guliston/
├── apps/
│   ├── restaurant_web/              # Restaurant customer/staff web app
│   ├── marketplace_mobile/          # Flutter marketplace mobile app
│   ├── marketplace_web/             # Future marketplace web
│   ├── seller_panel/                # Unified seller/admin panel
│   └── prototypes/                  # Faqat tajriba, production emas
│
├── services/
│   └── core_backend/                # DDD modular Django backend
│       ├── manage.py
│       ├── config/
│       ├── entrypoints/
│       ├── modules/
│       ├── shared_kernel/
│       ├── infrastructure/
│       └── tests/
│
├── packages/
│   ├── api_contracts/               # OpenAPI, DTO schemas, event schemas
│   ├── design_system/               # UI tokens and shared design docs
│   ├── localization/                # uz/ru/en shared translation contracts
│   └── testing_tools/               # load/security/test helpers
│
├── infra/
│   ├── docker/
│   ├── nginx/
│   ├── systemd/
│   ├── deploy/
│   ├── backup/
│   └── monitoring/
│
├── scripts/
│   ├── dev/
│   ├── checks/
│   ├── db/
│   ├── seeds/
│   └── release/
│
├── docs/
│   ├── architecture/
│   ├── domains/
│   ├── products/
│   ├── decisions/
│   ├── runbooks/
│   └── archive/
│
└── README.md
```

Root papkada faqat kirish fayllari turadi. Kod, docs, infra, scripts aniq joyda bo'ladi.

---

## 4. Backend 6-Year Architecture

```text
services/core_backend/
├── config/
│   ├── settings/
│   ├── urls.py
│   ├── asgi.py
│   ├── wsgi.py
│   ├── celery.py
│   └── logging.py
│
├── entrypoints/
│   ├── http/
│   │   ├── api_v1/
│   │   ├── api_v2/
│   │   └── web/
│   ├── bots/
│   ├── workers/
│   └── management/
│
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
│
├── shared_kernel/
│   ├── ids.py
│   ├── time.py
│   ├── money.py
│   ├── exceptions.py
│   ├── events.py
│   └── permissions.py
│
├── infrastructure/
│   ├── db/
│   ├── cache/
│   ├── queue/
│   ├── storage/
│   ├── security/
│   ├── observability/
│   ├── external_services/
│   └── feature_flags/
│
└── tests/
    ├── unit/
    ├── integration/
    ├── contract/
    ├── security/
    └── load/
```

---

## 5. Har Modul Ichidagi Majburiy Strukturasi

Har bir bounded context bir xil tuziladi:

```text
modules/commerce/
├── domain/
│   ├── entities.py
│   ├── value_objects.py
│   ├── events.py
│   ├── policies.py
│   └── errors.py
│
├── application/
│   ├── commands.py
│   ├── queries.py
│   ├── services.py
│   ├── handlers.py
│   └── ports.py
│
├── infrastructure/
│   ├── models.py
│   ├── repositories.py
│   ├── migrations/
│   ├── admin.py
│   └── adapters.py
│
├── interfaces/
│   ├── api/
│   ├── web/
│   ├── events.py
│   └── serializers.py
│
└── tests/
```

Dependency rule:

```text
interfaces -> application -> domain
infrastructure -> application/domain
domain -> hech kimga qaram emas
```

Taqiqlanadi:

```text
domain -> Django ORM
domain -> DRF
domain -> Telegram
domain -> Click/Payme
domain -> Redis
domain -> requests
```

---

## 6. Bounded Contextlar

### identity

Mas'uliyat:

- user
- auth
- roles
- permissions
- sessions
- JWT/token
- staff/courier/seller identity

### tenants

Mas'uliyat:

- tenant
- shop
- restaurant
- studio workspace
- business profile
- plan/subscription
- branding
- product access

### catalog

Mas'uliyat:

- products
- dishes
- categories
- variants
- bundles
- allergens
- shop templates
- product media metadata

### commerce

Mas'uliyat:

- cart
- checkout
- orders
- order state
- coupons
- wishlist
- repeat order
- stock reservation

### restaurant

Mas'uliyat:

- tables
- halls
- reservations
- waiter calls
- KDS
- live bill
- NFC/QR table session
- restaurant-specific order flow

### studio3d

Mas'uliyat:

- 3D print orders
- print materials
- AR/3D assets
- model processing
- slicer/estimate
- production queue

### payments

Mas'uliyat:

- Click
- Payme
- Uzcard
- cash
- payment callback
- payment status
- idempotency
- reconciliation

### finance

Mas'uliyat:

- cashbox
- transaction ledger
- expense
- debt
- seller balance
- reports
- daily digest
- audit trail

### delivery

Mas'uliyat:

- courier
- delivery address
- maps
- delivery zone
- taxi integration
- ETA

### notifications

Mas'uliyat:

- Telegram bot
- push/SMS/email kelajakda
- webhook
- subscriber
- notification routing
- retry/dead letter

### ai

Mas'uliyat:

- AI copilot
- marketing service
- prompt templates
- provider routing
- AI quota
- AI audit

### analytics

Mas'uliyat:

- rank score
- views
- dashboard aggregates
- operational metrics
- sales analytics

---

## 7. Product Va Domain Chegarasi

Product bu UI/business package. Domain esa biznes qoidasi.

Productlar:

```text
restaurant_web
marketplace_mobile
marketplace_web
seller_panel
studio3d_web
```

Domainlar:

```text
catalog
commerce
restaurant
studio3d
payments
finance
delivery
notifications
```

Masalan:

- Restaurant menu `catalog`dan foydalanadi.
- Marketplace ham `catalog`dan foydalanadi.
- Restaurant order `commerce + restaurant` bilan ishlaydi.
- Marketplace order `commerce + delivery` bilan ishlaydi.
- Har ikkalasi `payments` va `finance`ga event orqali ulanadi.

Bu 6 yilga muhim, chunki keyin yangi product qo'shilsa, hamma narsa qayta yozilmaydi.

---

## 8. Data Isolation Standard

Har multi-tenant jadvalda quyidagilar bo'lishi shart:

```text
tenant_id
product_scope
owner_id yoki shop_id/restaurant_id/studio_id
created_at
updated_at
```

Query qoidasi:

```text
No tenant, no query.
No product scope, no cross-product data.
```

Taqiqlanadi:

```python
Order.objects.all()
Shop.objects.first()
Product.objects.filter(is_active=True)
```

Majburiy:

```python
OrderRepository.for_tenant(tenant_id).for_product("restaurant")
ProductRepository.for_tenant(tenant_id).active()
```

6 yillik talab:

- Har yangi model PR reviewda tenant/product ownership tekshiriladi.
- Har yangi endpointda authorization policy test bo'ladi.
- Cross-tenant data leak testlari yoziladi.

---

## 9. API Versioning

Mobil ilova va tashqi integratsiyalar uchun API versiyasiz 6 yil yashamaydi.

```text
/api/v1/restaurant/menu
/api/v1/market/catalog
/api/v1/studio/orders

/api/v2/...
```

Qoidalar:

- `v1` ishlayotgan mobil app bor ekan, birdan buzilmaydi.
- Breaking change faqat yangi versiyada.
- Deprecation muddati kamida 6 oy.
- API contract OpenAPI faylda saqlanadi.
- Contract test CI/CDda ishlaydi.

Taqiqlanadi:

```text
Bugun serializer field nomini o'zgartirib yuborish
Eski mobile appni majburan buzish
```

---

## 10. Database Evolution

6 yil davomida DB ko'p o'zgaradi. Shuning uchun migration qoidalari qat'iy.

Expand-contract pattern:

```text
1. Add new nullable column
2. Deploy code writing both old and new
3. Backfill data
4. Switch reads to new
5. Stop writing old
6. Drop old column only later
```

Taqiqlanadi:

- katta jadvalda blocking migration;
- column rename bilan eski kodni sindirish;
- data migrationni request vaqtida bajarish;
- indexsiz katta query chiqarish.

Majburiy:

- migration rollback plan;
- backup before major migration;
- large migration background job orqali;
- indexlar oldindan yaratiladi;
- migration productionda sinovdan o'tkaziladi.

---

## 11. Event-Driven Side Effects

Core request tez qaytishi kerak. Yon effektlar event orqali yuradi.

Eventlar:

```text
OrderCreated
OrderPaid
OrderCancelled
OrderStatusChanged
PaymentSucceeded
PaymentFailed
TableWaiterCalled
PrintOrderCreated
DebtCreated
DebtPaid
ProductImported
```

Outbox pattern majburiy:

```text
DB transaction:
  business row
  outbox_event row

worker:
  outbox_event -> handler -> processed
```

Bu quyidagilarni oldini oladi:

- Telegram yiqilsa order yo'qolmaydi.
- Payment callback retry bo'lsa duplicate bo'lmaydi.
- Finance report sekin bo'lsa checkout qotmaydi.
- Analytics xato bersa order flow ishlayveradi.

---

## 12. Idempotency

6 yillik platformada external callback va retrylar doim bo'ladi.

Idempotency majburiy joylar:

- payment callback
- order create
- checkout submit
- notification send
- finance transaction create
- import jobs
- AI/3D processing jobs

Pattern:

```text
idempotency_key
tenant_id
operation_type
request_hash
result_reference
created_at
expires_at
```

Qoidalar:

- bir xil payment callback ikki marta kelsa bitta payment update bo'ladi;
- bir xil checkout ikki marta submit bo'lsa bitta order yaratiladi;
- worker retry qilsa finance transaction duplicate bo'lmaydi.

---

## 13. Performance Architecture

100 concurrent order uchun minimum:

```text
Nginx
Gunicorn/Uvicorn 4-8 workers
PostgreSQL
Redis
Celery/RQ workers
DB indexes
Pagination
Timeouts
Rate limits
Static/media offload
```

6 yil uchun scale path:

### Stage 1: Single VPS

```text
1 server:
- nginx
- app workers
- redis
- postgres
- celery
```

### Stage 2: Split Data Layer

```text
app server
dedicated postgres
dedicated redis
object storage
```

### Stage 3: Horizontal App Scale

```text
load balancer
app server 1..N
worker server 1..N
postgres primary
read replica
redis cluster/sentinel
```

### Stage 4: Service Extraction

```text
restaurant-api
marketplace-api
studio-api
payments-worker
notifications-worker
analytics-worker
ai-worker
```

Extraction faqat real bottleneck bo'lsa qilinadi, moda uchun emas.

---

## 14. Request Fan-Out Control

Frontend bir sahifa ochilganda hamma endpointni urmaydi.

Noto'g'ri:

```text
App start:
  fetch products
  fetch orders
  fetch finance
  fetch couriers
  fetch tables
  fetch notifications
```

To'g'ri:

```text
MenuPage -> menu endpoint
CartPage -> cart endpoint
CheckoutPage -> checkout endpoint
KDSPage -> active kitchen stream
FinancePage -> cached finance summary
SellerDashboard -> lazy widgets
```

Backend endpointlar ham fan-out qilmaydi:

- `GET /menu` finance hisoblamaydi.
- `POST /orders` Telegramni sync yubormaydi.
- `GET /dashboard` hamma jadvallarni scan qilmaydi.
- `GET /catalog` analyticsni realtime hisoblamaydi.

---

## 15. Cache Strategy

Cache namespacing:

```text
{product}:{tenant_id}:{resource}:{version}
```

Misollar:

```text
restaurant:t1:menu:v42
restaurant:t1:table:15:bill
market:t2:catalog:category:7:page:1
studio:t3:materials:v5
finance:t1:daily-summary:2026-10-11
```

Cache qoidalari:

- cache keyda tenant majburiy;
- cache keyda product scope majburiy;
- public catalog/menu cache qilinadi;
- cart/order/payment sensitive data ehtiyotkorlik bilan;
- invalidation event asosida;
- stale cache acceptable endpointlarda `stale-while-revalidate`.

---

## 16. Database Index Standard

Majburiy indexlar:

```text
orders(tenant_id, product_scope, status, created_at)
orders(tenant_id, restaurant_id, table_id, status)
orders(tenant_id, shop_id, status, created_at)
order_items(order_id)
products(tenant_id, shop_id, category_id, is_active)
products(tenant_id, rank_score, views)
tables(tenant_id, restaurant_id, hall_id, status)
payments(tenant_id, provider, external_id)
payments(tenant_id, status, created_at)
finance_transactions(tenant_id, source_product, created_at)
notifications(tenant_id, product_scope, status, created_at)
outbox_events(status, created_at)
idempotency_keys(tenant_id, operation_type, idempotency_key)
```

Query budget:

```text
GET menu/catalog: max 10 DB queries
POST order: max 15 DB queries
GET dashboard summary: cached, max 5 DB queries
KDS active orders: max 10 DB queries
```

Har endpoint uchun query count test yoziladi.

---

## 17. Failure Isolation

### Telegram down

```text
Order works
notification queued
retry with backoff
dead letter if failed
```

### Payment provider slow

```text
payment_pending
callback async
reconciliation worker
idempotency
```

### AI provider down

```text
AI feature disabled/degraded
commerce unaffected
```

### Redis down

```text
critical flows degrade gracefully
rate limit/session strategy fallback
no data loss
```

### Worker down

```text
requests still accepted if core DB works
queue backlog alert
worker restart
```

### One product overloaded

```text
product-specific rate limits
separate queue names
separate worker pools
separate cache keys
```

---

## 18. Security Standard

### Auth

- seller/admin secure session yoki JWT;
- courier role alohida;
- TMA signed init data;
- payment callback signature verification;
- webhook secret path/token.

### Authorization

Har requestda:

```text
user_id
tenant_id
role
product_scope
allowed_resource_ids
```

Policy test majburiy:

```text
seller A cannot see seller B orders
restaurant A cannot see restaurant B tables
marketplace order cannot appear in studio dashboard
```

### Rate Limit

```text
login: strict
password reset/OTP: strict
order create: per user/table/session
search: per IP/session + debounce
payment callback: signature + provider allowlist
AI endpoints: quota
file upload: size/type limits
```

### File Upload Security

- extension check;
- MIME check;
- file size limit;
- image/model processing sandbox;
- executable upload blocked;
- media served from separate domain/storage.

### Secrets

- `.env` gitga kirmaydi;
- production secrets secret manager yoki secure env;
- key rotation plan;
- bot/payment keys logga chiqmaydi;
- `DEBUG=False`;
- allowed hosts va CORS strict.

---

## 19. Observability

Har request logda:

```text
request_id
tenant_id
product_scope
user_id nullable
endpoint
status_code
latency_ms
db_query_count
cache_hit_miss
queue_event_id nullable
error_code nullable
```

Metrics:

- API p95/p99 latency
- 5xx rate
- DB slow queries
- DB connection pool usage
- Redis hit rate
- queue backlog
- worker failures
- payment callback failures
- notification delivery failures
- cross-tenant access denied count

Alerts:

```text
POST /orders p95 > 800ms for 5 minutes
5xx rate > 1%
queue lag > 60s
payment callback failure spike
DB CPU > 80%
disk free < 20%
backup failed
```

---

## 20. Backup And Disaster Recovery

6 yilga arxitektura backup/recoverysiz bo'lmaydi.

Talab:

- daily full DB backup;
- hourly WAL/incremental backup imkoniyati;
- media/object storage backup;
- `.env`/secret backup alohida secure joyda;
- restore drill har oy yoki har quarter;
- backup encryption;
- backup retention policy.

Target:

```text
RPO: <= 1 hour
RTO: <= 4 hours
```

RPO: qancha data yo'qolishi mumkin.  
RTO: qancha vaqtda tiklanish kerak.

---

## 21. Release And Feature Flags

Yangi funksiya hamma userga birdan yoqilmaydi.

Feature flag:

```text
tenant_id
product_scope
feature_name
enabled
rollout_percentage
```

Release flow:

```text
dev -> staging -> canary tenant -> 10% rollout -> full rollout
```

Rollback:

- migration safe bo'lishi;
- feature flag bilan o'chirish mumkin;
- worker va web version mos bo'lishi;
- API breaking change qilinmaydi.

---

## 22. Testing Strategy

### Unit Tests

- domain policies
- value objects
- state transitions

### Integration Tests

- DB repositories
- API endpoints
- payment callback
- order create flow

### Contract Tests

- mobile app API contract
- payment provider callback contract
- event schema contract

### Security Tests

- cross-tenant access
- role permission
- rate limit
- upload validation
- webhook signature

### Load Tests

Scenariylar:

```text
100 restaurant users ordering at once
100 marketplace users browsing/ordering
50 restaurant + 30 marketplace + 10 seller + 10 studio mixed traffic
Telegram down
payment slow
AI timeout
Redis restart
```

Acceptance:

```text
GET menu/catalog p95 < 250ms cached
POST order p95 < 700ms
KDS update delay < 2s
Dashboard summary p95 < 800ms cached
Error rate < 0.5%
Cross-tenant leak = 0
```

---

## 23. Frontend 6-Year Standard

Restaurant web:

```text
apps/restaurant_web/src/
├── app/
├── pages/
├── features/
├── entities/
└── shared/
```

Marketplace mobile:

```text
apps/marketplace_mobile/lib/
├── app/
├── features/
├── entities/
└── shared/
```

Frontend qoidalari:

- page-based data fetching;
- lazy routes;
- debounced search;
- pagination/infinite scroll;
- optimistic UI faqat idempotent flowlarda;
- error boundary;
- offline-friendly cart;
- API client versioned;
- shared DTO contractdan foydalanish;
- images/3D assets lazy loaded.

---

## 24. Developer Discipline

6 yilga chidash uchun odamlar ham arxitektura qoidalariga amal qilishi kerak.

Majburiy:

- ADR yozish;
- PR checklist;
- architecture boundary test;
- code ownership;
- generated files gitga kirmasligi;
- docs updated with behavior change;
- API contract updated with endpoint change;
- migration plan for DB changes;
- security review for auth/payment/upload changes.

PR checklist:

```text
Does this query include tenant_id?
Does this endpoint expose only allowed product scope?
Does this create side effects sync?
Does this need an event?
Does this need idempotency?
Does this break old API/mobile app?
Does this need cache invalidation?
Does this need rate limit?
Does this log secrets?
Does this need index?
```

---

## 25. Service Extraction Roadmap

Modular monolithdan servicega ajratish shartlari:

Ajratiladi agar:

- modul traffic bottleneck bo'lsa;
- alohida scaling talab qilsa;
- alohida failure isolation kerak bo'lsa;
- team ownership alohida bo'lsa;
- data boundary aniq bo'lsa.

Ajratilmaydi agar:

- faqat papka tartibli ko'rinishi uchun;
- hali traffic yo'q bo'lsa;
- transaction boundary aniq bo'lmasa;
- monitoring yo'q bo'lsa.

Ajratishga birinchi nomzodlar:

```text
notifications-worker
payments-worker
studio3d-processing-worker
analytics/reporting-worker
ai-worker
```

Core commerce va catalog oxirida ajratiladi, chunki ular markaziy.

---

## 26. 6-Year Definition Of Done

Arxitektura 6 yilga tayyor hisoblanadi, agar:

- Har product URL/API alohida namespacega ega.
- Har tenant query tenant/product scope bilan yuradi.
- Payment/order/notification idempotent.
- Outbox + queue worker bor.
- Telegram/AI/payment/studio failure core flow'ni yiqitmaydi.
- API versioning bor.
- DB migration expand-contract bilan yuradi.
- Cache keylar tenant/product namespace bilan.
- DB indexlar yozilgan va test qilingan.
- Frontend fan-out qilmaydi.
- Load test 100 concurrent orderdan o'tadi.
- Security policy va permission testlar bor.
- Backup/restore drill bor.
- Observability va alertlar bor.
- Feature flag va rollback strategy bor.
- ADR va PR checklist majburiy.

---

## 27. Xulosa

6 yilga yetadigan arxitektura shunday bo'ladi:

```text
Modular Monolith now
Service-ready boundaries always
Async side effects
Strict tenant/product isolation
Versioned APIs
Migration-safe DB
Idempotent payments/orders
Observable production
Secure by default
Load-tested releases
Documented decisions
```

Bu standard bajarilsa, loyiha faqat bugungi 100 userga emas, keyingi yillardagi yangi product, ko'proq tenant, mobil app, AI/3D worker, payment provider va katta trafficga ham tayyor bo'ladi.
