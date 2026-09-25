# ONLINE STORE GULISTON --- MASTER TECHNICAL SPECIFICATION & IMPLEMENTATION TZ

**Hujjat turi:** Master TZ / Production Upgrade + Feature Specification\
**Versiya:** 7.0\
**Sana:** 2026-08-17\
**Loyiha:** Online Store Guliston --- Local Commerce OS\
**Asos:** HANDOFF.MD v5 + TECHNICAL_SPECIFICATION v6 +
production-hardening audit\
**Maqsad:** mavjud ishlaydigan MVPni buzmasdan, xavfsiz,
production-ready, scalable va biznesga tayyor lokal e-commerce
ekotizimiga aylantirish.

------------------------------------------------------------------------

# 0. AI CODING AGENT UCHUN MAJBURIY QOIDALAR

Bu hujjat AI coding agentga berilganda agent quyidagi qoidalarni **savol
bermasdan, mavjud kodni tekshirib, o'zi qaror qilib** bajarishi kerak.

## 0.1. Asosiy qoida

Mavjud loyihani noldan qayta yozma. Avval mavjud kod bazasini audit qil,
ishlayotgan funksiyalarni aniqlab ol, keyin bosqichma-bosqich
refactor/migration qil.

Mavjud quyidagi funksiyalarni buzish mumkin emas:

-   customer web
-   catalog
-   search
-   cart
-   checkout
-   orders
-   order tracking
-   nearby stores
-   map
-   courier panel
-   admin panel
-   Telegram notifications
-   UZ/RU/EN
-   offline/PWA
-   reviews
-   existing payment preparation

Agar mavjud implementatsiya yangi TZga zid bo'lsa, backward-compatible
migration qil yoki xavfsiz replacement qil. Ishlayotgan feature'ni
o'chirib yuborishdan oldin uning replacementi to'liq ishlashi shart.

## 0.2. Savol bermaslik

Agent:

-   "Qaysi variantni tanlay?"
-   "Qaysi provider?"
-   "Qaysi database?"
-   "Qaysi architecture?"
-   "Keyin nima qilay?"

kabi savollar bilan ishni to'xtatmasin.

Bu TZda ko'rsatilgan default qarorlarni ishlatsin.

Faqat real texnik blok bo'lsa, xavfsiz default bilan davom etsin va
`IMPLEMENTATION_NOTES.md`ga qaror yozsin.

## 0.3. Har bir o'zgarishdan oldin

1.  Repository strukturani tekshir.
2.  Git statusni tekshir.
3.  Mavjud migrationsni tekshir.
4.  Existing models/views/services/URLsni tekshir.
5.  Existing testsni ishga tushir.
6.  Qaysi funksiyalar ishlayotganini aniqlash.
7.  Keyin kichik logical commitlar bilan implement qil.

## 0.4. Har feature uchun majburiy

Har yangi feature quyidagilar bilan tugashi kerak:

-   model/migration
-   serializer/form validation
-   service layer
-   permission
-   API/UI
-   unit test
-   integration test
-   security test kerak bo'lsa security test
-   OpenAPI documentation
-   changelog
-   rollback/migration consideration

## 0.5. Secretlar

Hech qachon:

-   Telegram token
-   Django SECRET_KEY
-   database password
-   payment API key
-   AI API key
-   S3 secret
-   JWT secret

kodga yozilmasin.

Faqat environment/secret manager.

Oldin oshkor qilingan Telegram token **compromised** deb hisoblanadi.
Uni revoke/rotate qilish majburiy.

------------------------------------------------------------------------

# 1. LOYIHA VIZYONI

Online Store Guliston oddiy marketplace emas.

U quyidagi uchta asosiy tizimni birlashtiradigan **Local Commerce
Operating System** bo'ladi:

1.  Customer Marketplace
2.  Seller Commerce OS
3.  Delivery OS

Ularning ustida:

-   AI layer
-   CRM
-   Analytics
-   Payment
-   Maps
-   AR/3D
-   Mobile/PWA
-   Notification
-   Security/Risk

ishlaydi.

## 1.1. Asosiy positioning

Platforma "eng katta marketplace" bo'lishga urinmaydi.

Asosiy positioning:

> Guliston va keyinchalik boshqa O'zbekiston shaharlaridagi eng foydali,
> tez, ishonchli va AI yordamida boshqariladigan lokal commerce
> platformasi.

Asosiy ustunliklar:

-   lokal assortiment
-   real stock
-   30--120 minutlik zonal delivery
-   yaqin do'kon
-   pickup
-   past seller commission
-   UZ/RU/EN
-   Telegram-first communication
-   AI search
-   AI seller copilot
-   AI marketing
-   fair organic ranking
-   hybrid delivery
-   real ETA
-   verification
-   loyalty/referral
-   premium mahsulotlar uchun AR/3D

------------------------------------------------------------------------

# 2. MAVJUD MVP HOLATI

Mavjud loyiha Django 6 + DRF + SimpleJWT + SQLite asosida qurilgan.

Mavjud asosiy app'lar:

-   web
-   accounts
-   products
-   orders
-   shops
-   categories
-   couriers
-   notifications
-   payments
-   maps

Mavjud UI:

-   Django Templates
-   Tailwind CDN
-   Alpine.js
-   Leaflet
-   responsive mobile-first interface

Mavjud funksiyalar:

-   customer home/catalog
-   search
-   quick buy
-   nearby stores
-   repeat order
-   cart
-   checkout
-   order tracking
-   map
-   courier panel
-   admin panel
-   Telegram notifications
-   UZ/RU/EN
-   service worker/offline cache
-   reviews
-   payment preparation

MVPda demo ma'lumotlar va mavjud ishlaydigan flowlar saqlanadi.

------------------------------------------------------------------------

# 3. MUHIM MUAMMOLAR VA ULARNI YOPISH

## P0 --- darhol

### 3.1. Exposed Telegram token

Oldingi hujjatda Telegram token ochiq bo'lgan.

Majburiy:

1.  BotFather orqali eski tokenni revoke.
2.  Yangi token olish.
3.  Barcha source/config/history ichidan eski tokenni olib tashlash.
4.  `.env`ga yangi token.
5.  `.env.example`ga faqat: `TELEGRAM_BOT_TOKEN=`
6.  Git history secret scan.
7.  CI secret scanning.
8.  Production secret rotation policy.

Eski tokenni hech qachon qayta ishlatma.

### 3.2. Default admin credential

`admin/admin1234` kabi credentiallar productionda bo'lmasin.

Majburiy:

-   default superuser yaratmaslik
-   bootstrap admin bir martalik secure setup orqali
-   kuchli password
-   password hashing
-   login rate-limit
-   optional 2FA
-   admin session timeout
-   audit log

### 3.3. DEBUG

Production:

``` text
DEBUG=False
```

### 3.4. Database

SQLite faqat development/MVP uchun.

Production:

-   PostgreSQL 16+
-   connection pooling
-   indexes
-   transactions
-   constraints
-   backup
-   restore drill

### 3.5. Storage

Local media production storage bo'lmasin.

S3-compatible:

-   Cloudflare R2
-   AWS S3
-   MinIO

Provider adapter bilan.

------------------------------------------------------------------------

# 4. TARGET ARCHITECTURE

``` text
Customer Web/PWA
Flutter Customer App
Seller Web/Admin
Courier PWA/App
Admin Console
        |
        v
      Nginx
        |
        v
   Django + DRF
        |
  -------------------------
  |     |      |          |
Postgres Redis  Celery   Storage
  |     |      |          |
  -------------------------
        |
  Domain Services
        |
  -----------------------------
  | Payment | Delivery | AI    |
  | Search  | CRM      | Risk  |
  -----------------------------
        |
 External Providers
```

## 4.1. Layerlar

### Presentation

-   Django Templates
-   DRF API
-   Flutter
-   PWA

### Application

-   OrderService
-   CheckoutService
-   PaymentService
-   DeliveryService
-   InventoryService
-   SearchService
-   AIService
-   CRMService
-   NotificationService

### Domain

-   order state machine
-   inventory reservation
-   payment state
-   delivery state
-   permissions
-   pricing
-   seller quality

### Infrastructure

-   PostgreSQL
-   Redis
-   Celery
-   S3
-   Nginx
-   monitoring
-   backups

------------------------------------------------------------------------

# 5. CODE ARCHITECTURE REFACTOR

Mavjud `web/views.py` katta bo'lsa, uni birdan buzmasdan bo'lib chiq.

Target:

``` text
web/
  views/
    customer.py
    catalog.py
    search.py
    cart.py
    checkout.py
    orders.py
    tracking.py
    auth.py

services/
  order_service.py
  checkout_service.py
  payment_service.py
  inventory_service.py
  delivery_service.py
  notification_service.py
  search_service.py
  ai_service.py
  crm_service.py

selectors/
  products.py
  shops.py
  orders.py
  analytics.py

permissions/
  customer.py
  seller.py
  courier.py
  admin.py

api/
  serializers/
  views/
  urls/
```

Views request/response bilan shug'ullansin.

Biznes logic service layerda bo'lsin.

DB read optimization selector/query layerda bo'lsin.

------------------------------------------------------------------------

# 6. AUTHENTICATION VA ACCOUNT

Qo'llab-quvvatlanadi:

-   phone OTP
-   Telegram
-   email
-   JWT API
-   secure web session

## 6.1. OTP

Majburiy:

-   OTP expiration
-   one-time use
-   attempt limit
-   resend cooldown
-   IP/device rate-limit
-   phone rate-limit
-   brute-force protection
-   audit
-   anti-enumeration response

## 6.2. Customer

Customer:

-   phone
-   name
-   locale
-   addresses
-   default address
-   Telegram chat id
-   total orders
-   total spent
-   loyalty
-   referral
-   consent
-   risk score

## 6.3. Admin/Seller roles

Roles:

-   platform_admin
-   finance_admin
-   moderator
-   support
-   shop_owner
-   manager
-   operator
-   packer
-   courier

Seller user faqat o'z shopiga tegishli objectlarni ko'ra/o'zgartira
oladi.

Object-level permission majburiy.

------------------------------------------------------------------------

# 7. SHOP MODEL

Shop:

-   name
-   slug
-   logo
-   cover
-   address
-   latitude
-   longitude
-   working hours
-   working days
-   min order
-   delivery zones
-   commission rate
-   free delivery threshold
-   rating
-   verified status
-   plan
-   plan expiry
-   acceptance rate
-   cancellation rate
-   preparation time
-   stock accuracy
-   delivery SLA
-   quality score

Seller verification:

-   identity/business verification
-   contact verification
-   bank/payment info verification
-   moderation status
-   document status
-   suspension status

------------------------------------------------------------------------

# 8. PRODUCT CATALOG

Product:

-   shop
-   SKU
-   barcode
-   name
-   slug
-   description
-   price
-   old price
-   unit
-   stock
-   category
-   brand
-   tags
-   images
-   ingredients
-   nutrition
-   variants
-   dimensions
-   weight
-   volume
-   3D assets
-   AR status
-   moderation status
-   active status

Variant:

-   color
-   size
-   weight
-   volume
-   SKU
-   price delta
-   stock

## 8.1. Stock

Stock oddiy integer bilan cheklanmasin.

Target:

``` text
available
reserved
sold
```

Reservation:

-   order
-   product
-   quantity
-   expires_at
-   status

Checkout paytida transaction + locking ishlatiladi.

Oversellingga yo'l qo'yilmaydi.

------------------------------------------------------------------------

# 9. ORDER STATE MACHINE

Order status:

``` text
pending
confirmed
preparing
ready
out_for_delivery
delivered
cancelled
```

Har transition policy bilan boshqariladi.

Masalan:

-   delivered -\> preparing: taqiqlanadi
-   cancelled -\> delivered: taqiqlanadi
-   out_for_delivery -\> cancelled: maxsus cancellation workflow

Har status o'zgarishi:

-   actor
-   old_status
-   new_status
-   reason
-   timestamp
-   IP/device kerak bo'lsa

bilan audit qilinadi.

------------------------------------------------------------------------

# 10. MULTI-SHOP CART

MVP:

-   cart shop bo'yicha ajratiladi
-   har shop alohida checkout

Keyingi bosqich:

-   split checkout
-   alohida delivery
-   alohida payment
-   unified customer order view

Multi-shop checkout paytida:

-   stock
-   min order
-   delivery zone
-   delivery fee
-   shop availability

serverda qayta tekshiriladi.

------------------------------------------------------------------------

# 11. CHECKOUT

Checkout maksimal 3 asosiy ekrandan oshmasin:

1.  Address + delivery
2.  Payment
3.  Confirmation

Server quote:

-   subtotal
-   discount
-   delivery fee
-   taxes/fees agar mavjud bo'lsa
-   final total
-   ETA

Client yuborgan totalga ishonilmaydi.

------------------------------------------------------------------------

# 12. PAYMENT ARCHITECTURE

Interface:

``` python
class PaymentProvider:
    code: str

    def create_payment(...):
        ...

    def verify_callback(...):
        ...

    def get_status(...):
        ...

    def refund(...):
        ...
```

Providerlar:

-   mock
-   click
-   payme
-   uzum
-   cash

Payment flow:

``` text
Order pending
  -> Payment pending
  -> Provider
  -> Callback
  -> Signature verify
  -> Amount verify
  -> Order verify
  -> Idempotency
  -> Paid
  -> Order confirmed
```

Majburiy:

-   signature validation
-   amount validation
-   merchant transaction uniqueness
-   replay protection
-   idempotency
-   timeout
-   reconciliation
-   refund approval
-   audit log

Karta ma'lumoti platformada saqlanmaydi.

------------------------------------------------------------------------

# 13. DELIVERY OS

Delivery modeli hybrid:

### Own courier

-   central zones
-   repeat orders
-   brand control
-   low cost

### External provider

-   peak hours
-   far zones
-   courier shortage
-   new city launch

Provider adapter:

``` text
DeliveryProvider
  ├── InternalCourier
  └── ExternalAggregator
```

## 13.1. Delivery fee

Formula:

``` text
base_fee
+ distance_fee
+ peak_fee
+ weight_fee
- discount
```

Quote server-side.

Userga checkoutdan oldin aniq ko'rsatiladi.

## 13.2. Dispatch

Score:

-   online
-   zone
-   distance
-   capacity
-   acceptance rate
-   current load
-   on-time rate

Top courierlarga sequential offer.

Timeout -\> next courier.

Admin/manual dispatcher override.

------------------------------------------------------------------------

# 14. DELIVERY PROOF

Deliveryni tasdiqlash:

-   OTP
-   photo
-   signature

variantlaridan biri.

Failed delivery:

-   reason
-   customer contact
-   retry
-   return
-   refund

workflow.

------------------------------------------------------------------------

# 15. MAPS VA LOCATION PRIVACY

Stack:

-   Leaflet
-   OpenStreetMap
-   OSRM MVP

Productionda tile/geocoding policy va rate limits tekshiriladi.

Features:

-   nearby stores
-   route
-   delivery zone
-   courier realtime
-   saved addresses
-   entrance/floor/apartment
-   delivery note

Privacy:

-   customer exact coordinate faqat assigned courierga
-   courier location faqat delivery davomida
-   retention policy
-   adaptive GPS interval
-   consent

------------------------------------------------------------------------

# 16. SEARCH ENGINE

Search:

1.  exact
2.  synonym
3.  keyword/BM25
4.  filters
5.  hybrid embedding
6.  ranking

Natural language query parser:

``` text
"Menga 10 minggacha uyimga yaqin yaxshi non top"
```

JSON:

``` json
{
  "query": "non",
  "max_price": 10000,
  "near_user": true,
  "sort": "relevance_distance_quality"
}
```

Narx/stock DBdan olinadi.

------------------------------------------------------------------------

# 17. ORGANIC RANKING

Default scoring:

``` text
relevance             35%
availability          15%
service_quality       15%
rating_quality        10%
delivery_score        10%
content_quality       10%
promotion              5%
```

Lekin scoring konfiguratsiyalanuvchi bo'lsin va A/B test qilinsin.

Qo'shimcha quality signals:

-   seller cancellation rate
-   stock accuracy
-   return rate
-   verified reviews
-   preparation time
-   delivery SLA
-   content freshness

Pro subscription organik rankingni yashirin sotib olmasin.

------------------------------------------------------------------------

# 18. SPONSORED ADS

Sponsored natija:

-   maksimum 1--3
-   "Reklama" belgisi
-   organikdan vizual ajratilgan
-   impression
-   click
-   conversion
-   budget
-   spend
-   campaign status

Past quality yoki stock yo'q seller reklama qilolmasligi mumkin.

------------------------------------------------------------------------

# 19. REVIEWS VA TRUST

Review faqat verified purchase bo'lsa kuchliroq ko'rsatiladi.

Review:

-   rating
-   text
-   photo
-   order
-   product
-   seller
-   verified status
-   moderation status

Fraud review detection:

-   duplicate text
-   abnormal frequency
-   same device/account patterns
-   seller/customer collusion signal

Q&A ham qo'shiladi.

------------------------------------------------------------------------

# 20. CRM

Customer segmentlar:

-   new
-   active
-   inactive
-   VIP
-   at-risk
-   high-value

Triggerlar:

-   abandoned cart
-   reorder
-   birthday
-   price drop
-   back in stock
-   loyalty milestone

Consent management majburiy.

------------------------------------------------------------------------

# 21. REFERRAL VA LOYALTY

Referral:

-   inviter reward
-   invited user reward
-   anti-abuse
-   max reward
-   expiry

Loyalty:

-   points
-   level
-   cashback
-   redemption rules

Anti-fraud:

-   same phone
-   same device
-   suspicious account graph
-   repeated coupon usage
-   self-referral

------------------------------------------------------------------------

# 22. AI ARCHITECTURE

AI har bir requestda chaqirilmaydi.

Pipeline:

``` text
Rule/FAQ
  ↓
Intent Router
  ↓
Cache
  ↓
Tool
  ↓
Template response
  ↓
LLM fallback
  ↓
Human handoff
```

Provider adapter:

-   primary text model
-   fallback model
-   embedding provider
-   image provider
-   moderation provider
-   speech provider

Model names environment variable orqali boshqariladi.

------------------------------------------------------------------------

# 23. AI CHATBOT

Customer:

-   product search
-   comparison
-   add to cart
-   order status
-   delivery ETA
-   promo
-   repeat order
-   help
-   operator handoff

Seller:

-   sales analytics
-   product copy
-   translation
-   poster
-   campaign creation
-   stock insight

Courier:

-   tasks
-   route
-   status

Admin:

-   KPI
-   moderation queue
-   report

------------------------------------------------------------------------

# 24. AI AGENT SECURITY

Har state-changing action:

``` text
intent
→ role
→ permission
→ tool allowlist
→ preview
→ explicit confirmation
→ idempotency key
→ server validation
→ transaction
→ audit
```

Exception:

-   add_to_cart user settingga ko'ra confirmation talab qilmasligi
    mumkin.

High-risk:

-   refund
-   payout
-   delete
-   price change
-   stock bulk change
-   role change

doim confirmation + permission + audit.

AI hech qachon:

-   DB dump
-   secret
-   API key
-   system prompt
-   boshqa seller private data

bermasin.

------------------------------------------------------------------------

# 25. PROMPT INJECTION DEFENSE

AI input ishonchli emas.

Toolga user text to'g'ridan-to'g'ri buyruq sifatida yuborilmaydi.

Server:

-   schema validation
-   enum validation
-   range validation
-   ownership check
-   permission check
-   rate limit
-   confirmation

qiladi.

------------------------------------------------------------------------

# 26. RAG / KNOWLEDGE BASE

RAG hujjatlari:

-   FAQ
-   delivery policy
-   refund policy
-   seller guide
-   category info
-   platform rules

Hybrid retrieval:

-   BM25/keyword
-   embeddings

RAG response source-aware.

Noma'lum ma'lumot uydirilmaydi.

Muhim qoida:

**price, stock, order status, payment status RAGdan olinmaydi.**

Bular real-time DB/API orqali olinadi.

------------------------------------------------------------------------

# 27. AI CHAT MEMORY

Session:

-   session id
-   user id
-   locale
-   role
-   last intent
-   cart
-   selected shop
-   recent products
-   summary

Har 8--12 xabarda summary compression.

Modelga faqat kerakli context yuboriladi.

PII minimallashtiriladi.

------------------------------------------------------------------------

# 28. AI COST CONTROL

Har seller:

-   daily credits
-   monthly credits
-   token limits
-   feature limits

AI generation:

-   cache
-   content hash
-   max input/output
-   retry limit
-   exponential backoff

Admin:

-   provider
-   model
-   input tokens
-   output tokens
-   estimated UZS cost
-   feature
-   shop

bo'yicha monitoring ko'radi.

------------------------------------------------------------------------

# 29. AI SELLER COPILOT

Bu platformaning asosiy AI monetization featurelaridan biri.

Seller:

> "Bugun savdom qanday?"

AI:

-   order count
-   revenue
-   comparison
-   best sellers
-   low-stock products
-   cancellation
-   preparation performance
-   recommendations

beradi.

Action:

> "Sut mahsulotlariga 10% aksiya qil."

AI preview yaratadi.

Seller confirm qiladi.

Keyin campaign yaratiladi.

------------------------------------------------------------------------

# 30. AI PRODUCT COPY

Input:

-   product name
-   category
-   attributes
-   seller info

Output structured JSON:

-   title
-   description
-   SEO title
-   SEO description
-   tags

Max output limit.

AI uydirmasligi kerak:

-   certification
-   ingredient
-   medical claim
-   price
-   guarantee

------------------------------------------------------------------------

# 31. AI TRANSLATION

UZ/RU/EN.

Translation cache content hash bilan.

Seller text moderationdan o'tadi.

Legal/payment text faqat approved human translationdan chiqadi.

------------------------------------------------------------------------

# 32. AI POSTER GENERATOR

Flow:

``` text
Seller selects product
→ brief
→ brand info
→ structured prompt
→ image generation
→ moderation
→ text/price verification
→ seller edit
→ save
→ export/schedule
```

Poster:

-   1080x1350 mobile-first
-   real price
-   real discount
-   no fake claims
-   brand colors
-   product image
-   CTA

Generation async Celery.

Failed task retry.

------------------------------------------------------------------------

# 33. AI MODERATION

Moderate:

-   seller text
-   product images
-   reviews
-   AI posters
-   user content

Flag categories:

-   prohibited product
-   fake claim
-   offensive content
-   misleading price
-   illegal medical claim
-   copyright concern signal

High-risk content -\> human moderation.

------------------------------------------------------------------------

# 34. AR/3D

AR birinchi navbatda:

-   furniture
-   home goods
-   decor
-   premium products
-   selected fashion
-   electronics size preview

uchun.

Oddiy FMCG uchun AR majburiy emas.

## Pipeline

``` text
40–120 images / 360 video
→ validation
→ 3D provider
→ background job
→ GLB/USDZ
→ optimization
→ scale verification
→ CDN
→ QR
→ QA
```

Formats:

-   GLB
-   USDZ

Optimization:

-   Draco/Meshopt
-   KTX2/WebP
-   LOD
-   lazy loading

Model 10--20 MB atrofida yoki undan past bo'lishi maqsad.

------------------------------------------------------------------------

# 35. AR SAFETY / QUALITY

"1:1" deb yozishdan oldin real dimensions verify qilinadi.

Metadata:

-   width
-   height
-   depth
-   weight
-   volume

Device ARni qo'llamasa:

-   3D viewer fallback

bo'ladi.

Measure/scale QA:

-   Android Chrome
-   Scene Viewer
-   iOS Quick Look
-   desktop 3D

------------------------------------------------------------------------

# 36. MULTILINGUAL

UZ/RU/EN:

-   UI
-   API
-   product content
-   chatbot
-   seller tools
-   courier flow
-   customer flow

Locale:

-   `Accept-Language`
-   explicit lang
-   persisted user preference

SEO:

-   localized URLs yoki hreflang strategy.

Units:

-   dona
-   kg
-   litr
-   dimensions

locale bo'yicha to'g'ri ko'rsatiladi.

------------------------------------------------------------------------

# 37. TELEGRAM

Telegram faqat notification layer bo'ladi.

Events:

-   new order
-   confirmed
-   preparing
-   courier assigned
-   out for delivery
-   delivered
-   cancelled

Token faqat env/secret manager.

Webhook verification va rate limiting.

Telegram orqali destructive actionlar bo'lsa:

-   auth
-   role
-   confirmation
-   audit

majburiy.

------------------------------------------------------------------------

# 38. NOTIFICATION SYSTEM

Channels:

-   in-app
-   push
-   Telegram
-   SMS/email agar kerak bo'lsa

Notification preference:

-   order
-   marketing
-   security
-   delivery

Marketing faqat consent bilan.

------------------------------------------------------------------------

# 39. FLUTTER

Flutter API contract stable bo'lgandan keyin.

Stack:

-   Flutter
-   Dio
-   Riverpod yoki Bloc
-   flutter_secure_storage
-   Firebase Messaging
-   map SDK/flutter_map
-   WebView
-   Hive/Isar

MVP screens:

-   auth
-   home
-   catalog
-   search
-   product
-   cart
-   checkout
-   payment
-   orders
-   tracking
-   map
-   chatbot
-   profile

Deep links:

``` text
guliston://product/{slug}
guliston://order/{id}
guliston://ar/{id}
guliston://payment/result/{id}
```

------------------------------------------------------------------------

# 40. PWA/OFFLINE

Offline:

-   UI shell
-   catalog cache
-   recent products
-   recent orders

Offline bo'lmasligi kerak:

-   final payment
-   stock confirmation
-   refund
-   destructive action

Cache stale-while-revalidate.

Sensitive data cache qilinsa encrypted/controlled storage.

------------------------------------------------------------------------

# 41. SECURITY BASELINE

Production:

-   HTTPS only
-   HSTS
-   CSP
-   secure cookies
-   CSRF
-   CORS allowlist
-   XSS protection
-   SQL injection protection
-   file upload validation
-   MIME validation
-   image scan
-   size limits
-   rate limits
-   RBAC
-   object-level permissions
-   audit logs
-   secret rotation
-   backups
-   restore drills

------------------------------------------------------------------------

# 42. RATE LIMITS

Kamida:

-   OTP request
-   OTP verify
-   login
-   password reset
-   chat
-   checkout
-   payment callback
-   review
-   image upload
-   AI generation
-   courier location

bo'yicha.

Rate limit Redisda.

------------------------------------------------------------------------

# 43. FILE UPLOAD SECURITY

Upload:

-   MIME check
-   extension check
-   file size
-   image decode validation
-   malware scan imkon bo'lsa
-   EXIF stripping
-   filename sanitization
-   random storage key
-   no executable files
-   private/public storage policy

------------------------------------------------------------------------

# 44. RBAC VA OBJECT PERMISSIONS

Customer:

faqat o'z order/cart/profile.

Seller:

faqat o'z shop/product/order/staff.

Courier:

faqat assigned/current tasks.

Support:

PII access minimal.

Finance:

payment/refund.

Admin:

full access faqat zarur role uchun.

Har endpoint permission testga ega bo'ladi.

------------------------------------------------------------------------

# 45. AUDIT LOG

Audit qilinadiganlar:

-   login/security
-   role changes
-   seller approval
-   price change
-   stock change
-   order status
-   payment
-   refund
-   payout
-   AI action
-   campaign
-   moderation
-   account changes

Audit logni oddiy user o'chira olmaydi.

------------------------------------------------------------------------

# 46. FRAUD / RISK ENGINE

Risk signals:

-   many failed payments
-   COD abuse
-   repeated refunds
-   multiple accounts
-   same phone/device
-   coupon abuse
-   referral abuse
-   fake reviews
-   seller/customer collusion
-   unusual order velocity

Risk score:

``` text
0–30 LOW
31–70 MEDIUM
71–100 HIGH
```

High risk:

-   manual review
-   additional verification
-   temporary restriction

------------------------------------------------------------------------

# 47. BUSINESS MODEL

Revenue streams:

1.  marketplace commission
2.  delivery margin
3.  Seller Pro subscription
4.  AI credits
5.  sponsored advertising
6.  future premium analytics

Seller plans:

### Free

-   basic catalog
-   basic orders
-   limited AI

### Pro

-   analytics
-   AI credits
-   AI copy
-   poster
-   CRM
-   campaigns

### Business

-   higher AI
-   advanced analytics
-   team roles
-   advertising tools
-   priority support

------------------------------------------------------------------------

# 48. NORTH STAR KPI

Asosiy North Star:

**Weekly Successful Repeat Orders**

Secondary:

-   GMV
-   orders/day
-   repeat rate
-   conversion
-   AOV
-   contribution margin/order
-   CAC
-   LTV/CAC
-   active sellers
-   seller activation
-   stock accuracy
-   cancellation rate
-   delivery SLA
-   refund rate

AI:

-   AI cost/order
-   AI assisted conversion
-   poster conversion uplift

AR:

-   AR view → add-to-cart
-   AR add-to-cart → purchase

------------------------------------------------------------------------

# 49. ANALYTICS EVENT SYSTEM

Central event schema:

``` text
event_name
user_id
shop_id
product_id
order_id
session_id
timestamp
locale
device
metadata
```

Events:

-   product_view
-   search
-   add_to_cart
-   checkout_start
-   payment_start
-   payment_success
-   order_created
-   order_delivered
-   repeat_order
-   review_created
-   ai_query
-   ai_tool_call
-   ai_generation
-   ar_view
-   ar_add_to_cart
-   campaign_click
-   ad_impression
-   ad_click

------------------------------------------------------------------------

# 50. OBSERVABILITY

Monitoring:

-   uptime
-   error rate
-   5xx
-   latency
-   queue depth
-   failed jobs
-   DB slow query
-   payment callback failure
-   AI cost
-   storage/CDN
-   GPS update health

Sentry yoki equivalent.

Alerts:

-   payment callback failures
-   queue stuck
-   DB connection exhaustion
-   high 5xx
-   abnormal login
-   AI budget spike
-   delivery SLA degradation

------------------------------------------------------------------------

# 51. BACKUPS

PostgreSQL:

-   daily backup
-   retention policy
-   encrypted backup

Media:

-   weekly backup
-   versioning

Majburiy:

**restore drill**

Backup borligi yetarli emas; restore ishlashi isbotlanadi.

------------------------------------------------------------------------

# 52. PERFORMANCE

Mobile-first.

Target:

-   first content \< 2.5 sec
-   WebP/AVIF
-   responsive image sizes
-   lazy load
-   skeleton
-   CDN
-   database indexes
-   pagination
-   query optimization

No N+1 query.

Large catalogda full table scanlardan qochish.

------------------------------------------------------------------------

# 53. UI/UX

Brand:

-   cream #FAFAF7
-   ink #1A1A1A
-   green #16A34A
-   white cards
-   subtle borders

UX:

-   large touch targets
-   accessible contrast
-   clear validation
-   mobile-first
-   checkout max 3 steps
-   clear price
-   delivery fee
-   ETA
-   shop
-   payment status

AI-generated content "AI generated" sifatida kerak bo'lsa ko'rsatiladi
va seller edit qila oladi.

------------------------------------------------------------------------

# 54. ADMIN PANEL

Dashboard:

-   GMV
-   orders
-   active sellers
-   active couriers
-   delivery SLA
-   payment
-   refunds
-   AI cost
-   moderation
-   fraud risk

Management:

-   shops
-   products
-   categories
-   sellers
-   couriers
-   orders
-   payments
-   refunds
-   campaigns
-   ads
-   AI credits
-   moderation
-   reviews
-   delivery zones

------------------------------------------------------------------------

# 55. SELLER PANEL

Seller:

-   dashboard
-   products
-   inventory
-   orders
-   staff
-   analytics
-   customers/CRM
-   campaigns
-   AI copy
-   translation
-   poster
-   AR
-   subscription
-   billing/credits

Staff permissions:

-   owner
-   manager
-   operator
-   packer

------------------------------------------------------------------------

# 56. COURIER PANEL

Courier:

-   online/offline
-   task list
-   accept/reject
-   route
-   navigation
-   pickup
-   delivery
-   OTP
-   failed delivery
-   earnings
-   performance

Location only while operationally needed.

------------------------------------------------------------------------

# 57. API DESIGN

Base:

``` text
/api/v1/
```

Auth:

``` text
POST /auth/request-otp/
POST /auth/verify-otp/
POST /auth/refresh/
POST /auth/logout/
GET  /me/
PATCH /me/
```

Catalog:

``` text
GET /products/
GET /products/{slug}/
GET /categories/
GET /shops/
GET /search/
```

Cart/order:

``` text
GET /cart/
POST /cart/items/
PATCH /cart/items/{id}/
DELETE /cart/items/{id}/
POST /checkout/quote/
POST /orders/
GET /orders/
GET /orders/{id}/tracking/
POST /orders/{id}/repeat/
```

Payment:

``` text
POST /payments/create/
POST /payments/click/callback/
POST /payments/payme/callback/
GET /payments/{id}/status/
POST /payments/{id}/refund-request/
```

AI:

``` text
POST /ai/chat/messages/
POST /ai/design/generations/
GET /ai/design/generations/{id}/
POST /ai/products/{id}/copy/
POST /ai/products/{id}/translate/
```

AR:

``` text
POST /seller/products/{id}/ar/capture/
GET /seller/products/{id}/ar/jobs/{job_id}/
GET /ar/{product_id}/
GET /products/{id}/ar/qr/
```

Har endpoint:

-   serializer
-   permission
-   validation
-   pagination
-   rate limit
-   OpenAPI
-   tests

------------------------------------------------------------------------

# 58. IDEMPOTENCY

Idempotency talab qilinadigan operations:

-   order creation
-   payment creation
-   payment callback
-   refund
-   campaign creation
-   AI state-changing tool
-   courier assignment

Header:

``` text
Idempotency-Key
```

server uniqueness bilan saqlanadi.

------------------------------------------------------------------------

# 59. DATABASE INDEXLAR

Indexlar:

-   product shop/category
-   product slug
-   product SKU
-   order customer/status
-   order shop/status
-   payment transaction
-   delivery courier/status
-   review product
-   event timestamp
-   search fields

Unique constraints kerak joyda qo'yiladi.

------------------------------------------------------------------------

# 60. TEST STRATEGY

## Unit

-   pricing
-   stock
-   ranking
-   permissions
-   state transitions
-   AI parser
-   delivery quote

## Integration

-   checkout
-   payment
-   order
-   delivery
-   Telegram
-   AI tools
-   RAG

## Security

-   IDOR
-   RBAC bypass
-   CSRF
-   XSS
-   upload
-   rate limit
-   prompt injection
-   secret leakage

## Concurrency

-   same stock
-   duplicate payment callback
-   duplicate order request
-   courier race

------------------------------------------------------------------------

# 61. PAYMENT TEST MATRIX

Majburiy:

-   success callback
-   failed callback
-   duplicate callback
-   wrong amount
-   invalid signature
-   timeout
-   refund
-   partial refund
-   provider unavailable
-   reconciliation mismatch

------------------------------------------------------------------------

# 62. DELIVERY TEST MATRIX

-   inside zone
-   outside zone
-   peak fee
-   minimum order
-   courier accept
-   courier reject
-   timeout
-   no courier
-   GPS unavailable
-   cancellation before pickup
-   cancellation after pickup
-   OTP mismatch
-   failed delivery

------------------------------------------------------------------------

# 63. AI TEST MATRIX

-   UZ/RU/EN intent
-   natural language search
-   wrong price hallucination
-   wrong stock hallucination
-   prompt injection
-   tool permission boundary
-   confirmation bypass
-   duplicate action
-   token limit
-   credit limit
-   RAG source grounding
-   human handoff

------------------------------------------------------------------------

# 64. AR TEST MATRIX

-   GLB
-   USDZ
-   Android Chrome
-   Scene Viewer
-   iOS Quick Look
-   unsupported browser
-   slow network
-   large model
-   scale correctness
-   QR URL
-   fallback 3D viewer

------------------------------------------------------------------------

# 65. ACCEPTANCE CRITERIA

## Commerce

-   checkout successful flow \>= 99% in controlled test suite
-   no stock overselling
-   order history complete
-   order transitions valid
-   server-side delivery quote
-   multi-shop cart correctly separated

## Payment

-   callback idempotent
-   amount verified
-   signature verified
-   replay rejected
-   reconciliation working
-   refund audited

## Delivery

-   courier assignment target \<60 seconds
-   tracking works
-   OTP delivery works
-   SLA measurable

## AI

-   =70% FAQ answered without expensive LLM where expected

-   natural language search works

-   every tool has permission

-   every state-changing action audited

-   monthly AI budget enforced

-   no secret leakage

-   no price/stock hallucination

## AR

-   at least 10 SKU pilot
-   GLB preview
-   iOS/Android fallback
-   QR works
-   dimensions shown
-   scale verified

## Language

-   UZ/RU/EN main flow 100%
-   chatbot 3 languages
-   payment/legal texts use approved translations

------------------------------------------------------------------------

# 66. PRODUCTION DEPLOYMENT

Target:

``` text
Docker Compose initially
↓
Nginx
↓
Gunicorn/Uvicorn
↓
PostgreSQL
Redis
Celery Worker
Celery Beat
S3/R2
Sentry
```

CI/CD:

1.  lint
2.  tests
3.  security scan
4.  migration check
5.  build
6.  deploy
7.  health check
8.  rollback if failed

------------------------------------------------------------------------

# 67. ENVIRONMENT

Required keys:

``` text
DJANGO_SECRET_KEY=
DEBUG=
DATABASE_URL=
REDIS_URL=

TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

CLICK_MERCHANT_ID=
CLICK_SERVICE_ID=
CLICK_API_KEY=

PAYME_MERCHANT_ID=
PAYME_KEY=

AI_PROVIDER=
AI_API_KEY=
AI_TEXT_MODEL_FAST=
AI_TEXT_MODEL_QUALITY=
AI_IMAGE_MODEL=
AI_EMBEDDING_MODEL=

S3_ENDPOINT=
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_BUCKET=

SENTRY_DSN=
```

`.env` gitga kirmaydi.

------------------------------------------------------------------------

# 68. SECURITY SECRETS POLICY

-   secret rotation
-   least privilege
-   environment separation
-   no hardcoded secrets
-   no secrets in logs
-   no secrets in AI context
-   no secrets in error response
-   secret scanning in CI
-   compromised token immediate rotation

------------------------------------------------------------------------

# 69. LEGAL / COMPLIANCE

Productiondan oldin:

-   Privacy Policy
-   Terms of Service
-   Seller Agreement
-   Refund Policy
-   Delivery Policy
-   prohibited products
-   moderation policy
-   review policy
-   AI-generated content disclosure
-   sponsored content disclosure
-   consent management

tayyor bo'lishi kerak.

Payment/legal text professional approved translation bilan.

------------------------------------------------------------------------

# 70. ROADMAP

## Phase 0 --- Security/Foundation

-   token rotation
-   credentials cleanup
-   env
-   PostgreSQL
-   Redis
-   Celery
-   Docker
-   backup
-   monitoring
-   permissions

## Phase 1 --- Commerce Reliability

-   inventory reservation
-   order state machine
-   checkout
-   payment mock
-   delivery quote
-   zones
-   reconciliation

## Phase 2 --- Payment/Logistics

-   Click sandbox
-   Payme sandbox
-   webhook
-   2--3 courier pilot
-   dispatch
-   tracking
-   OTP

## Phase 3 --- AI Chatbot

-   FAQ
-   intent router
-   product search
-   tools
-   memory
-   human handoff
-   cost dashboard

## Phase 4 --- Seller AI

-   product copy
-   translation
-   seller copilot
-   poster
-   Pro credits
-   moderation

## Phase 5 --- AR/3D

-   manual GLB/USDZ
-   model viewer
-   QR
-   10 SKU
-   scale verification

## Phase 6 --- CRM/Growth

-   abandoned cart
-   reorder
-   referral
-   loyalty
-   campaigns
-   A/B testing
-   ads

## Phase 7 --- Flutter

Faqat API contract stable va real customer tractiondan keyin:

-   customer app
-   push
-   offline
-   payment WebView
-   deep links
-   tracking
-   chatbot

## Phase 8 --- Geographic scale

Guliston: → Sirdaryo → Jizzax → boshqa regional shaharlar → Toshkent

Faqat unit economics va SLA isbotlangandan keyin.

------------------------------------------------------------------------

# 71. 90 KUNLIK EXECUTION PLAN

## Kun 1--30

Security + foundation:

-   token rotation
-   secret cleanup
-   admin security
-   PostgreSQL
-   Redis
-   Celery
-   Docker
-   backup
-   Sentry
-   permission audit
-   object-level seller isolation
-   stock reservation
-   order state machine

## Kun 31--60

Commerce + delivery:

-   payment mock E2E
-   Click/Payme sandbox
-   reconciliation
-   delivery zones
-   pricing
-   courier dispatch
-   tracking
-   OTP
-   analytics events
-   performance

## Kun 61--90

AI + business pilot:

-   FAQ router
-   product search
-   chatbot
-   seller copilot
-   product copy
-   translation
-   poster beta
-   CRM
-   referral/loyalty
-   10--20 seller pilot
-   2--3 courier pilot
-   real order testing

AR va Flutter faqat core KPIlar yaxshi bo'lsa keyingi phasega o'tadi.

------------------------------------------------------------------------

# 72. BUSINESS PILOT

Dastlab:

-   10--20 seller
-   5--8 asosiy category
-   500--1000 SKU
-   2--3 courier
-   1--2 delivery zone

Maqsad:

-   real orders
-   real payment
-   real delivery
-   real repeat purchase

Avval GMV emas, **successful repeat orders** va contribution margin
isbotlanadi.

------------------------------------------------------------------------

# 73. SCALE QOIDASI

Yangi shahar ochishdan oldin:

-   seller supply
-   courier capacity
-   delivery SLA
-   customer repeat
-   payment reliability
-   unit economics
-   support capacity

thresholddan o'tishi kerak.

------------------------------------------------------------------------

# 74. BUDGET PRIORITY

Cheklangan budjetda:

1.  Core production
2.  Payment
3.  Delivery
4.  Security
5.  Monitoring
6.  Real marketing/pilot
7.  AI chatbot
8.  Seller AI
9.  AR
10. Flutter

AI/AR uchun unlimited spending mumkin emas.

Har seller va feature uchun budget/credit.

------------------------------------------------------------------------

# 75. AGENT IMPLEMENTATION PROTOCOL

AI coding agent quyidagi tartibda ishlasin:

### Step 1

Repository audit.

### Step 2

Tests baseline.

### Step 3

Security P0.

### Step 4

Infrastructure.

### Step 5

Commerce reliability.

### Step 6

Delivery.

### Step 7

Payments.

### Step 8

AI.

### Step 9

Seller AI.

### Step 10

AR.

### Step 11

CRM.

### Step 12

Flutter.

Har step tugagach:

-   tests
-   migrations
-   docs
-   changelog
-   health check

qilinadi.

------------------------------------------------------------------------

# 76. AGENT QILMASLIGI KERAK BO'LGAN ISHLAR

-   butun loyihani noldan rewrite qilish
-   mavjud working featurelarni sababsiz o'chirish
-   secretlarni kodga yozish
-   payment totalni frontendga ishonish
-   stockni locking/reservationsiz sotish
-   AIga direct DB access berish
-   AIga direct destructive access berish
-   seller object permissionni chetlab o'tish
-   sponsored rankingni organik rankingga aralashtirish
-   karta ma'lumotini saqlash
-   Flutterni API contractdan oldin boshlash
-   ARni core commerce'dan oldinga qo'yish
-   unlimited AI generation
-   test qilmasdan migration/deploy

------------------------------------------------------------------------

# 77. FINAL QUALITY GATE

Production release faqat quyidagilar PASS bo'lsa:

``` text
[ ] No exposed secrets
[ ] Old Telegram token revoked
[ ] No default admin password
[ ] DEBUG=False
[ ] PostgreSQL active
[ ] Redis active
[ ] Celery active
[ ] Backups tested
[ ] Restore tested
[ ] RBAC tested
[ ] IDOR tested
[ ] Rate limits active
[ ] Stock reservation tested
[ ] Order state machine tested
[ ] Payment callback idempotent
[ ] Payment signature verified
[ ] Reconciliation active
[ ] Delivery quote server-side
[ ] Courier dispatch tested
[ ] OTP delivery tested
[ ] AI tool permissions tested
[ ] Prompt injection tests pass
[ ] AI budget active
[ ] No AI secret leakage
[ ] UZ/RU/EN main flows pass
[ ] Performance target checked
[ ] Monitoring active
[ ] Legal pages ready
[ ] Production smoke test pass
```

------------------------------------------------------------------------

# 78. YAKUNIY MAQSAD

Online Store Guliston quyidagi holatga yetkazilishi kerak:

``` text
LOCAL SELLER
     ↓
SELLER OS
     ↓
PRODUCT / STOCK
     ↓
LOCAL MARKETPLACE
     ↓
AI SEARCH / AI ASSISTANT
     ↓
CHECKOUT
     ↓
PAYMENT
     ↓
DELIVERY OS
     ↓
TRACKING
     ↓
REVIEW / LOYALTY
     ↓
CRM / RETENTION
     ↓
ANALYTICS
     ↓
SELLER AI
     ↓
AR/3D PREMIUM EXPERIENCE
```

Bu loyiha funksiyalar to'plami emas.

Maqsad --- **Guliston uchun ishonchli Local Commerce Operating System**,
keyinchalik esa boshqa O'zbekiston shaharlariga ko'paytirish mumkin
bo'lgan platforma yaratish.

------------------------------------------------------------------------

# 79. FINAL INSTRUCTION TO AI CODING AGENT

Sen ushbu loyihaning senior:

-   Django/DRF engineer
-   PostgreSQL engineer
-   DevOps engineer
-   security engineer
-   payment integration engineer
-   logistics engineer
-   AI engineer
-   Flutter/API architect
-   QA engineer

sifatida ishlaysan.

Mavjud kodni tekshir.

Mavjud working funksiyalarni saqla.

Ushbu TZdagi architecture va priorityni asosiy manba sifatida qabul qil.

Savol berib ishni to'xtatma.

Noaniq joyda xavfsiz va production-ready default tanla.

Har o'zgarishdan oldin kodni o'qi.

Har feature uchun test yoz.

Har migrationdan keyin migration check qil.

Har API endpoint uchun permission + validation + documentation yoz.

Har state-changing AI tool uchun preview/confirmation/idempotency/audit
ishlat.

Har payment callback uchun signature/amount/order/replay/idempotency
tekshir.

Har stock operation uchun transaction/concurrency safety ishlat.

Har seller endpointida object-level ownership tekshir.

Har secretni environment/secret managerda saqla.

Har phase oxirida:

1.  test natijasi
2.  o'zgargan fayllar
3.  migrationlar
4.  security holati
5.  remaining issues
6.  next phase

ni `IMPLEMENTATION_REPORT.md`ga yoz.

**Hech qachon "tayyor" deb aytma, agar acceptance criteria test bilan
tasdiqlanmagan bo'lsa.**

**Maqsad --- ishlaydigan demo emas, xavfsiz, o'lchanadigan,
production-ready va keyinchalik scale qilinadigan Local Commerce OS.**
