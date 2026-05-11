# 🚀 ONLINE STORE GULISTON — BACKEND DEVELOPMENT PROMPT
## SENIOR MICROSERVICES ARCHITECTURE — O'zbekistondagi Yagona Yangi Avlod E-commerce Platform

---

## 📋 UMUMIY TALAB

Siz senior backend developer sifatida **Online Store Guliston** platformasi uchun **production-ready, scalable, microservices-based backend tizimini** yaratishingiz kerak. Bu O'zbekistondagi mahalliy e-commerce ekosistemasi bo'lib, Yangi Yer va Guliston shaharlari uchun mo'ljallangan.

**ASOSIY PRINSIPLAR:**
- ✅ Microservices arxitekturasi — har bir servis alohida container (Docker)
- ✅ Scalable — 100K+ concurrent users uchun tayyor
- ✅ Real-time — WebSocket/SSE orqali live tracking
- ✅ Secure — JWT, rate limiting, encryption, OWASP Top 10 protection
- ✅ Observable — logging, monitoring, tracing
- ✅ Resilient — circuit breakers, retries, fallbacks
- ✅ Event-driven — message queue (RabbitMQ/Kafka)
- ✅ API Gateway pattern — centralized routing, auth, rate limiting

---

## 🏗️ ARXITEKTURA — MICROSERVICES DESIGN

```
┌─────────────────────────────────────────────────────────────────┐
│                        API GATEWAY (Kong/Nginx)                  │
│  - Routing │ Rate Limiting │ JWT Validation │ CORS │ SSL/TLS    │
└─────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
┌───────▼────────┐        ┌─────────▼────────┐      ┌──────────▼─────────┐
│  AUTH SERVICE  │        │  SHOP SERVICE    │      │  ORDER SERVICE     │
│  (Auth, Admin) │        │  (Shops, Prods)  │      │  (Orders, Cart)    │
│  Port: 3001    │        │  Port: 3002      │      │  Port: 3003        │
└────────┬───────┘        └──────────┬───────┘      └──────────┬─────────┘
         │                           │                         │
         │                           │                         │
┌────────▼────────────────────────────▼─────────────────────────▼─────────┐
│                      PostgreSQL (Primary DB)                             │
│  - users │ shops │ products │ orders │ order_items │ reviews             │
└──────────────────────────────────────────────────────────────────────────┘
         │                           │                         │
         │                           │                         │
┌────────▼────────┐        ┌─────────▼────────┐      ┌──────────▼─────────┐
│ NOTIFY SERVICE │        │  LOCATION SVC    │      │  ANALYTICS SVC     │
│ (Push, SMS)    │        │  (Maps, Geocode) │      │  (Stats, Reports)  │
│ Port: 3004     │        │  Port: 3005      │      │  Port: 3006        │
└────────┬───────┘        └──────────┬───────┘      └──────────┬─────────┘
         │                           │                         │
         │                           │                         │
┌────────▼────────────────────────────▼─────────────────────────▼─────────┐
│                    MESSAGE QUEUE (RabbitMQ / Kafka)                      │
│  - order.created │ order.updated │ notification.send │ analytics.track   │
└──────────────────────────────────────────────────────────────────────────┘
         │                           │                         │
         │                           │                         │
┌────────▼────────┐        ┌─────────▼────────┐      ┌──────────▼─────────┐
│  REDIS CACHE   │        │  FILE STORAGE    │      │  ELASTICSEARCH     │
│  (Sessions)    │        │  (Cloudinary)    │      │  (Product Search)  │
└────────────────┘        └──────────────────┘      └────────────────────┘
```

---

## 🔧 TECHNOLOGY STACK

### Backend Core
- **Runtime:** Node.js 20+ (LTS) yoki Bun (ultra-fast alternative)
- **Framework:** Express.js / Fastify / NestJS (choose one — I recommend **Fastify** for speed)
- **Language:** TypeScript (strict mode)
- **API Style:** RESTful + GraphQL (optional for complex queries)

### Databases
- **Primary DB:** PostgreSQL 16+ (ACID, complex queries, transactions)
- **Cache:** Redis 7+ (sessions, hot data, pub/sub)
- **Search Engine:** Elasticsearch 8+ (product search, fuzzy matching)
- **Time-series (optional):** InfluxDB (for analytics, metrics)

### Message Queue
- **Option 1:** RabbitMQ (traditional, reliable, AMQP)
- **Option 2:** Apache Kafka (high-throughput, event streaming) — recommended for scale
- **Option 3:** Redis Streams (lightweight, if already using Redis)

### Storage
- **File Storage:** Cloudinary (CDN, image optimization, transformations)
- **Alternative:** AWS S3 + CloudFront / MinIO (self-hosted)

### Monitoring & Observability
- **Logging:** Winston / Pino (structured JSON logs)
- **Tracing:** OpenTelemetry + Jaeger (distributed tracing)
- **Metrics:** Prometheus + Grafana (system metrics, dashboards)
- **Errors:** Sentry (error tracking, alerts)
- **APM:** New Relic / Datadog (application performance monitoring)

### Infrastructure
- **Containerization:** Docker + Docker Compose (dev) → Kubernetes (prod)
- **API Gateway:** Kong / Nginx / Traefik
- **Reverse Proxy:** Nginx
- **Load Balancer:** Nginx / HAProxy / AWS ALB
- **CI/CD:** GitHub Actions / GitLab CI / Jenkins
- **Orchestration:** Kubernetes (K8s) + Helm charts

---

## 📦 MICROSERVICES TAFSILOTI

---

### 1️⃣ **AUTH SERVICE** (Port 3001)

**Mas'uliyati:** Foydalanuvchi autentifikatsiyasi va admin boshqaruvi

#### API Endpoints:

```typescript
POST   /api/auth/register-admin        // Faqat admin ro'yxatdan o'ta oladi
POST   /api/auth/login                 // Admin login (email + password)
POST   /api/auth/refresh               // JWT refresh token
POST   /api/auth/logout                // Logout (token blacklist)
POST   /api/auth/forgot-password       // Parolni tiklash
POST   /api/auth/reset-password        // Yangi parol o'rnatish
GET    /api/auth/me                    // Current user info
POST   /api/auth/verify-2fa            // 2FA verification
```

#### Database Schema:

```sql
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'admin', -- admin, super_admin
  is_active BOOLEAN DEFAULT true,
  two_fa_enabled BOOLEAN DEFAULT false,
  two_fa_secret VARCHAR(255),
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
  token VARCHAR(500) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_admins_email ON admins(email);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
```

#### Key Features:

- **JWT Authentication:** Access token (15 min expiry), Refresh token (7 days)
- **Password Security:** bcrypt (cost factor 12+)
- **2FA:** TOTP (Time-based One-Time Password) using `speakeasy` library
- **Rate Limiting:** 5 failed login attempts → 15 min account lock
- **Token Blacklist:** Redis set for revoked tokens

---

### 2️⃣ **SHOP SERVICE** (Port 3002)

**Mas'uliyati:** Do'konlar, mahsulotlar, kategoriyalar boshqaruvi

#### API Endpoints:

```typescript
// Shops
GET    /api/shops                      // Barcha do'konlar (pagination, filter)
GET    /api/shops/:id                  // Do'kon tafsiloti
POST   /api/shops                      // Do'kon qo'shish (admin only)
PUT    /api/shops/:id                  // Do'kon tahrirlash (admin only)
DELETE /api/shops/:id                  // Do'kon o'chirish (soft delete)
GET    /api/shops/nearby               // Yaqin atrofdagi do'konlar (lat, lng, radius)

// Products
GET    /api/products                   // Barcha mahsulotlar (pagination, filter)
GET    /api/products/:id               // Mahsulot tafsiloti
POST   /api/products                   // Mahsulot qo'shish (admin only)
PUT    /api/products/:id               // Mahsulot tahrirlash
DELETE /api/products/:id               // Mahsulot o'chirish
POST   /api/products/bulk-update       // Bulk narx o'zgartirish
GET    /api/products/search            // Elasticsearch orqali qidiruv

// Categories
GET    /api/categories                 // Barcha kategoriyalar
POST   /api/categories                 // Kategoriya qo'shish
PUT    /api/categories/:id             // Kategoriya tahrirlash
DELETE /api/categories/:id             // Kategoriya o'chirish
```

#### Database Schema:

```sql
CREATE TABLE shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL, -- yangi_yer | guliston
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  phone VARCHAR(20),
  opening_time TIME,
  closing_time TIME,
  is_open BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  rating DECIMAL(3, 2) DEFAULT 0.00,
  total_reviews INT DEFAULT 0,
  image_url TEXT,
  category_id UUID REFERENCES categories(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  icon_url TEXT,
  color VARCHAR(7), -- hex color
  parent_id UUID REFERENCES categories(id), -- for nested categories
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  unit VARCHAR(50), -- dona, kg, litr, paket
  images TEXT[], -- array of image URLs
  is_available BOOLEAN DEFAULT true,
  stock_quantity INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  order_id UUID,
  customer_phone VARCHAR(20) NOT NULL,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_shops_city ON shops(city);
CREATE INDEX idx_shops_location ON shops USING GIST (ll_to_earth(latitude, longitude));
CREATE INDEX idx_products_shop ON products(shop_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_availability ON products(is_available);
```

#### Key Features:

- **Geospatial Queries:** PostGIS extension for "nearby shops" functionality
- **Full-text Search:** Elasticsearch integration for fast product search
- **Image Optimization:** Cloudinary automatic transformations
- **Caching:** Redis cache for popular products and shop listings (TTL: 5 min)
- **Soft Delete:** Do'konlar va mahsulotlar arxivga o'tadi, butunlay o'chirilmaydi

---

### 3️⃣ **ORDER SERVICE** (Port 3003)

**Mas'uliyati:** Buyurtmalar, savat, holat boshqaruvi

#### API Endpoints:

```typescript
// Cart (Temporary, Redis-based)
POST   /api/cart/add                   // Mahsulot savatga qo'shish
GET    /api/cart                       // Savat ko'rish (session-based)
PUT    /api/cart/update                // Soni o'zgartirish
DELETE /api/cart/remove                // Mahsulotni olib tashlash
DELETE /api/cart/clear                 // Savatni tozalash

// Orders
POST   /api/orders                     // Buyurtma berish
GET    /api/orders                     // Barcha buyurtmalar (admin)
GET    /api/orders/:id                 // Buyurtma tafsiloti
GET    /api/orders/track/:phone        // Telefon bo'yicha buyurtmalar tarihi
PUT    /api/orders/:id/status          // Holat o'zgartirish (admin)
DELETE /api/orders/:id                 // Buyurtma bekor qilish
GET    /api/orders/:id/realtime        // Real-time tracking (SSE/WebSocket)
```

#### Database Schema:

```sql
CREATE TYPE order_status AS ENUM (
  'pending',          -- Yangi
  'accepted',         -- Qabul qilindi
  'preparing',        -- Tayyorlanmoqda
  'out_for_delivery', -- Yo'lda
  'delivered',        -- Yetkazildi
  'cancelled'         -- Bekor qilindi
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) UNIQUE NOT NULL, -- OSG-20240510-0001
  shop_id UUID REFERENCES shops(id),
  
  -- Customer Info (NO REGISTRATION)
  customer_name VARCHAR(255) NOT NULL,
  customer_phone_1 VARCHAR(20) NOT NULL, -- Primary phone
  customer_phone_2 VARCHAR(20),          -- Secondary phone
  customer_phone_3 VARCHAR(20),          -- Optional third phone
  
  -- Delivery Info
  delivery_address TEXT,                 -- Full address or NULL if pickup
  delivery_lat DECIMAL(10, 8),           -- Yandex/Google Maps coordinates
  delivery_lng DECIMAL(11, 8),
  is_pickup BOOLEAN DEFAULT false,       -- True agar o'zi olib ketsa
  
  -- Order Details
  total_amount DECIMAL(10, 2) NOT NULL,
  delivery_fee DECIMAL(10, 2) DEFAULT 0,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  final_amount DECIMAL(10, 2) NOT NULL,
  
  -- Status Tracking
  status order_status DEFAULT 'pending',
  courier_name VARCHAR(255),
  courier_phone VARCHAR(20),
  estimated_delivery_time TIMESTAMP,     -- Taxminiy yetkazish vaqti
  actual_delivery_time TIMESTAMP,        -- Real yetkazilgan vaqt
  
  -- Payment
  payment_method VARCHAR(50) DEFAULT 'cash_on_delivery', -- naqd to'lov
  is_paid BOOLEAN DEFAULT false,
  
  -- Notes
  customer_notes TEXT,                   -- Mijoz izohi
  admin_notes TEXT,                      -- Admin ichki izohi
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(255) NOT NULL,    -- Snapshot (agar mahsulot o'chirilsa ham tarix saqlanadi)
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,   -- quantity * unit_price
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  old_status order_status,
  new_status order_status NOT NULL,
  changed_by UUID,                       -- Admin ID
  changed_at TIMESTAMP DEFAULT NOW(),
  notes TEXT
);

-- Indexes
CREATE INDEX idx_orders_phone ON orders(customer_phone_1);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_order_items_order ON order_items(order_id);
```

#### Key Features:

- **Telefon raqam orqali tarix:** Foydalanuvchi telefon kiritadi → oxirgi 10 ta buyurtmasi ko'rsatiladi
- **3 ta telefon raqam:** 2 ta majburiy, 1 ta ixtiyoriy — kuryer bilan bog'lanish oson
- **Real-time tracking:** Server-Sent Events (SSE) yoki WebSocket orqali kuryer pozitsiyasi
- **Order number format:** `OSG-YYYYMMDD-NNNN` (OSG = Online Store Guliston)
- **Status history:** Har bir holat o'zgarishi loglanadi — audit trail
- **Spam prevention:** 1 telefon raqamdan 5 daqiqada maksimum 3 ta buyurtma (Redis rate limit)

---

### 4️⃣ **NOTIFICATION SERVICE** (Port 3004)

**Mas'uliyati:** Push bildirishnomalar, SMS (optional), Telegram bot

#### API Endpoints:

```typescript
POST   /api/notifications/send-push    // Push yuborish
POST   /api/notifications/send-sms     // SMS yuborish (Telegram orqali ham mumkin)
POST   /api/notifications/send-batch   // Batch notifications (segment targeting)
GET    /api/notifications/history      // Yuborilgan bildirishnomalar tarihi
```

#### Technology:

- **Push Notifications:** Firebase Cloud Messaging (FCM) — free, reliable
- **SMS (Optional):** Playmobile / Eskiz.uz API (O'zbekiston SMS gateway)
- **Telegram Bot:** BotFather orqali bot yaratish, webhook orqali bog'lanish

#### Event-driven flow (RabbitMQ/Kafka):

```javascript
// Order Service publishes event:
rabbitmq.publish('order.status.changed', {
  orderId: 'uuid',
  customerId: 'phone',
  oldStatus: 'preparing',
  newStatus: 'out_for_delivery',
  courierPhone: '+998901234567'
});

// Notification Service consumes event:
rabbitmq.consume('order.status.changed', async (event) => {
  // Send push notification
  await fcm.send({
    to: event.customerId,
    title: 'Buyurtmangiz yo\'lda!',
    body: `Kuryer: ${event.courierPhone}`,
    data: { orderId: event.orderId }
  });
  
  // Send Telegram message (if user enabled)
  await telegram.sendMessage(event.customerId, '🚚 Buyurtmangiz yo\'lda!');
});
```

---

### 5️⃣ **LOCATION SERVICE** (Port 3005)

**Mas'uliyati:** Xarita, geocoding, masofa hisoblash

#### API Endpoints:

```typescript
GET    /api/location/geocode           // Manzilni koordinatalarga aylantirish
GET    /api/location/reverse-geocode   // Koordinatalarni manzilga aylantirish
GET    /api/location/distance          // 2 nuqta orasidagi masofa
GET    /api/location/route             // Marshrutni hisoblash (A dan B gacha)
GET    /api/location/nearby-shops      // Yaqin do'konlar (geospatial query)
```

#### Integration:

- **Yandex Maps API:** Geocoding, routing, distance matrix
- **Google Maps API:** Alternative/fallback
- **PostGIS:** Database-level geospatial queries

#### Example Query (Yaqin do'konlar):

```sql
-- 5 km radiusda do'konlar
SELECT id, name, address, 
       earth_distance(
         ll_to_earth(latitude, longitude),
         ll_to_earth(40.5966, 68.7786)  -- User location
       ) AS distance
FROM shops
WHERE earth_box(ll_to_earth(40.5966, 68.7786), 5000) @> ll_to_earth(latitude, longitude)
  AND is_active = true
  AND is_open = true
ORDER BY distance
LIMIT 10;
```

---

### 6️⃣ **ANALYTICS SERVICE** (Port 3006)

**Mas'uliyati:** Statistika, hisobotlar, heatmap

#### API Endpoints:

```typescript
GET    /api/analytics/dashboard        // Admin dashboard stats
GET    /api/analytics/sales            // Kunlik/haftalik/oylik sotuv
GET    /api/analytics/top-products     // Eng ko'p sotilgan mahsulotlar
GET    /api/analytics/top-shops        // Eng ko'p buyurtma olgan do'konlar
GET    /api/analytics/heatmap          // Buyurtma lokatsiyalari (heatmap data)
GET    /api/analytics/revenue          // Daromad tahlili
GET    /api/analytics/user-segments    // Foydalanuvchi segmentlari
```

#### Data Aggregation:

```javascript
// Daily aggregation (CRON job — har kecha 00:00)
const dailyStats = await db.query(`
  SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_orders,
    SUM(final_amount) as total_revenue,
    AVG(final_amount) as avg_order_value,
    COUNT(DISTINCT customer_phone_1) as unique_customers
  FROM orders
  WHERE created_at >= NOW() - INTERVAL '30 days'
  GROUP BY DATE(created_at)
  ORDER BY date DESC
`);

// Store in InfluxDB or Redis for fast retrieval
```

---

## 🔒 SECURITY — CRITICAL REQUIREMENTS

### 1. Authentication & Authorization

```typescript
// JWT middleware
const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Check token blacklist (Redis)
  const isBlacklisted = await redis.get(`blacklist:${token}`);
  if (isBlacklisted) {
    return res.status(401).json({ error: 'Token revoked' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Role-based access control
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};
```

### 2. Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

// Global rate limit
const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many requests' });
  }
});

// Order creation rate limit (spam prevention)
const orderLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // 3 orders per 5 minutes per IP/phone
  keyGenerator: (req) => req.body.customer_phone_1, // Rate limit by phone
  handler: (req, res) => {
    res.status(429).json({ error: 'Juda ko\'p buyurtma. 5 daqiqadan keyin qayta urinib ko\'ring.' });
  }
});

app.use(globalLimiter);
app.post('/api/orders', orderLimiter, createOrder);
```

### 3. Input Validation & Sanitization

```typescript
import { body, validationResult } from 'express-validator';
import validator from 'validator';

const validateOrder = [
  body('customer_name')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Ism 2-255 belgi orasida bo\'lishi kerak'),
  
  body('customer_phone_1')
    .trim()
    .matches(/^\+998[0-9]{9}$/)
    .withMessage('Telefon raqam +998XXXXXXXXX formatida bo\'lishi kerak'),
  
  body('delivery_address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .customSanitizer(value => validator.escape(value)), // XSS prevention
  
  body('customer_notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .customSanitizer(value => validator.escape(value)),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

app.post('/api/orders', validateOrder, createOrder);
```

### 4. SQL Injection Prevention

```typescript
// ALWAYS use parameterized queries (PostgreSQL)
// ❌ WRONG (vulnerable)
const result = await db.query(`SELECT * FROM users WHERE email = '${email}'`);

// ✅ CORRECT (safe)
const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);

// Or use ORM (Prisma / TypeORM)
const user = await prisma.user.findUnique({ where: { email } });
```

### 5. CORS Configuration

```typescript
import cors from 'cors';

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000',          // Frontend dev
      'https://onlinestore-guliston.uz', // Production
      'capacitor://localhost',          // Mobile app
      'ionic://localhost'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
```

### 6. Helmet.js (Security Headers)

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

---

## 📊 DATA RETENTION — MA'LUMOTLAR SAQLASH MUDDATI

```typescript
// CRON job — har kuni kechqurun 02:00 da ishga tushadi
import cron from 'node-cron';

cron.schedule('0 2 * * *', async () => {
  const retentionDays = 10; // 10 kun
  
  // 1. Delete old cart data (Redis) — 3 kun
  await redis.keys('cart:*').then(async (keys) => {
    for (const key of keys) {
      const ttl = await redis.ttl(key);
      if (ttl < 0) {
        await redis.del(key); // Expired sessions
      }
    }
  });
  
  // 2. Archive old orders (10+ kun) — PostgreSQL
  await db.query(`
    UPDATE orders
    SET is_archived = true
    WHERE created_at < NOW() - INTERVAL '${retentionDays} days'
      AND status IN ('delivered', 'cancelled')
  `);
  
  // 3. Delete temporary files (uploads folder) — 3 kun
  const fs = require('fs/promises');
  const files = await fs.readdir('/tmp/uploads');
  const now = Date.now();
  
  for (const file of files) {
    const stats = await fs.stat(`/tmp/uploads/${file}`);
    const ageInDays = (now - stats.mtimeMs) / (1000 * 60 * 60 * 24);
    
    if (ageInDays > 3) {
      await fs.unlink(`/tmp/uploads/${file}`);
    }
  }
  
  console.log(`✅ Data retention cleanup completed at ${new Date()}`);
});
```

**MUHIM:** Foydalanuvchi ma'lumotlari (telefon, ism, buyurtma tarixi) **10 kungacha saqlanadi**, keyin arxivlanadi yoki anonim qilinadi (GDPR-style privacy).

---

## 🌐 REAL-TIME DELIVERY TRACKING

### Server-Sent Events (SSE) — Simple & Efficient

```typescript
// Order Service — Real-time tracking endpoint
app.get('/api/orders/:id/track', async (req, res) => {
  const { id } = req.params;
  
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  
  // Send initial order status
  const order = await db.query('SELECT * FROM orders WHERE id = $1', [id]);
  res.write(`data: ${JSON.stringify(order.rows[0])}\n\n`);
  
  // Listen to Redis pub/sub for order updates
  const subscriber = redis.duplicate();
  await subscriber.subscribe(`order:${id}:status`);
  
  subscriber.on('message', (channel, message) => {
    const update = JSON.parse(message);
    res.write(`data: ${JSON.stringify(update)}\n\n`);
  });
  
  // Cleanup on client disconnect
  req.on('close', () => {
    subscriber.unsubscribe();
    subscriber.quit();
    res.end();
  });
});

// When order status changes, publish to Redis
const updateOrderStatus = async (orderId, newStatus) => {
  await db.query('UPDATE orders SET status = $1 WHERE id = $2', [newStatus, orderId]);
  
  // Publish real-time update
  await redis.publish(`order:${orderId}:status`, JSON.stringify({
    orderId,
    status: newStatus,
    timestamp: new Date()
  }));
};
```

### Kuryer pozitsiyasini tracking qilish

```typescript
// Courier Service — GPS tracking
app.post('/api/courier/location', authMiddleware, async (req, res) => {
  const { orderId, latitude, longitude } = req.body;
  
  // Save to Redis (expires after 1 hour)
  await redis.setex(
    `courier:${orderId}:location`,
    3600,
    JSON.stringify({ lat: latitude, lng: longitude, timestamp: Date.now() })
  );
  
  // Broadcast to SSE clients
  await redis.publish(`order:${orderId}:courier`, JSON.stringify({
    lat: latitude,
    lng: longitude,
    timestamp: Date.now()
  }));
  
  res.json({ success: true });
});
```

---

## 🎉 AKSIYA VA CHEGIRMALAR TIZIMI

```sql
CREATE TABLE promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL, -- percentage | fixed_amount | free_delivery
  value DECIMAL(10, 2) NOT NULL, -- 10 (10% yoki 10000 so'm)
  min_order_amount DECIMAL(10, 2), -- Minimal buyurtma summasi
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT true,
  usage_limit INT, -- Maksimum foydalanish soni
  used_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  promotion_id UUID REFERENCES promotions(id),
  max_uses INT DEFAULT 1,
  used_count INT DEFAULT 0,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_promo_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID REFERENCES promo_codes(id),
  customer_phone VARCHAR(20) NOT NULL,
  order_id UUID REFERENCES orders(id),
  used_at TIMESTAMP DEFAULT NOW()
);
```

### Aksiya logikasi

```typescript
const applyPromotion = async (orderId, promoCode) => {
  // 1. Validate promo code
  const promo = await db.query(`
    SELECT pc.*, p.*
    FROM promo_codes pc
    JOIN promotions p ON p.id = pc.promotion_id
    WHERE pc.code = $1
      AND pc.is_active = true
      AND p.is_active = true
      AND p.start_date <= NOW()
      AND p.end_date >= NOW()
      AND pc.used_count < pc.max_uses
  `, [promoCode]);
  
  if (promo.rows.length === 0) {
    throw new Error('Promo kod yaroqsiz yoki muddati tugagan');
  }
  
  const promotion = promo.rows[0];
  
  // 2. Check if user already used this promo
  const userUsage = await db.query(`
    SELECT * FROM user_promo_usage
    WHERE promo_code_id = $1 AND customer_phone = $2
  `, [promotion.id, customerPhone]);
  
  if (userUsage.rows.length > 0) {
    throw new Error('Siz bu promo kodni allaqachon ishlatgansiz');
  }
  
  // 3. Calculate discount
  const order = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
  const orderAmount = order.rows[0].total_amount;
  
  let discountAmount = 0;
  
  if (promotion.type === 'percentage') {
    discountAmount = (orderAmount * promotion.value) / 100;
  } else if (promotion.type === 'fixed_amount') {
    discountAmount = promotion.value;
  } else if (promotion.type === 'free_delivery') {
    discountAmount = order.rows[0].delivery_fee;
  }
  
  // 4. Apply discount
  await db.query(`
    UPDATE orders
    SET discount_amount = $1,
        final_amount = total_amount - $1
    WHERE id = $2
  `, [discountAmount, orderId]);
  
  // 5. Mark promo as used
  await db.query('UPDATE promo_codes SET used_count = used_count + 1 WHERE id = $1', [promotion.id]);
  await db.query(`
    INSERT INTO user_promo_usage (promo_code_id, customer_phone, order_id)
    VALUES ($1, $2, $3)
  `, [promotion.id, customerPhone, orderId]);
  
  return { discountAmount, finalAmount: orderAmount - discountAmount };
};
```

---

## ☁️ OB-HAVO INTEGRATSIYASI

```typescript
import axios from 'axios';

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const YANGI_YER_LAT = 40.5966;
const YANGI_YER_LON = 68.7786;

// Weather Service endpoint
app.get('/api/weather/current', async (req, res) => {
  try {
    const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
      params: {
        lat: YANGI_YER_LAT,
        lon: YANGI_YER_LON,
        appid: OPENWEATHER_API_KEY,
        units: 'metric',
        lang: 'uz'
      }
    });
    
    const weather = {
      temp: response.data.main.temp,
      feels_like: response.data.main.feels_like,
      humidity: response.data.main.humidity,
      description: response.data.weather[0].description,
      icon: `https://openweathermap.org/img/wn/${response.data.weather[0].icon}@2x.png`,
      wind_speed: response.data.wind.speed
    };
    
    // Cache for 30 minutes
    await redis.setex('weather:yangi_yer', 1800, JSON.stringify(weather));
    
    res.json(weather);
  } catch (error) {
    res.status(500).json({ error: 'Ob-havo ma\'lumotlarini olishda xato' });
  }
});

// 3-day forecast
app.get('/api/weather/forecast', async (req, res) => {
  try {
    const response = await axios.get('https://api.openweathermap.org/data/2.5/forecast', {
      params: {
        lat: YANGI_YER_LAT,
        lon: YANGI_YER_LON,
        appid: OPENWEATHER_API_KEY,
        units: 'metric',
        lang: 'uz',
        cnt: 24 // 3 days * 8 (3-hour intervals)
      }
    });
    
    const forecast = response.data.list.map(item => ({
      date: item.dt_txt,
      temp: item.main.temp,
      description: item.weather[0].description,
      icon: `https://openweathermap.org/img/wn/${item.weather[0].icon}@2x.png`
    }));
    
    await redis.setex('weather:yangi_yer:forecast', 1800, JSON.stringify(forecast));
    
    res.json(forecast);
  } catch (error) {
    res.status(500).json({ error: 'Ob-havo prognozini olishda xato' });
  }
});
```

---

## 🐳 DOCKER SETUP

### docker-compose.yml

```yaml
version: '3.8'

services:
  # API Gateway
  kong:
    image: kong:3.4
    environment:
      KONG_DATABASE: postgres
      KONG_PG_HOST: postgres
      KONG_PG_USER: kong
      KONG_PG_PASSWORD: kong123
      KONG_PROXY_ACCESS_LOG: /dev/stdout
      KONG_ADMIN_ACCESS_LOG: /dev/stdout
      KONG_PROXY_ERROR_LOG: /dev/stderr
      KONG_ADMIN_ERROR_LOG: /dev/stderr
      KONG_ADMIN_LISTEN: 0.0.0.0:8001
    ports:
      - "8000:8000"  # Proxy
      - "8443:8443"  # Proxy SSL
      - "8001:8001"  # Admin API
    depends_on:
      - postgres
    networks:
      - backend

  # PostgreSQL
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres123
      POSTGRES_DB: online_store_guliston
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    networks:
      - backend

  # Redis
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    networks:
      - backend

  # RabbitMQ
  rabbitmq:
    image: rabbitmq:3-management-alpine
    environment:
      RABBITMQ_DEFAULT_USER: rabbitmq
      RABBITMQ_DEFAULT_PASS: rabbitmq123
    ports:
      - "5672:5672"   # AMQP
      - "15672:15672" # Management UI
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    networks:
      - backend

  # Elasticsearch
  elasticsearch:
    image: elasticsearch:8.10.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
      - xpack.security.enabled=false
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    ports:
      - "9200:9200"
    networks:
      - backend

  # Auth Service
  auth-service:
    build:
      context: ./services/auth
      dockerfile: Dockerfile
    environment:
      NODE_ENV: production
      PORT: 3001
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: online_store_guliston
      DB_USER: postgres
      DB_PASSWORD: postgres123
      REDIS_HOST: redis
      REDIS_PORT: 6379
      JWT_SECRET: your-super-secret-jwt-key-change-this
      JWT_EXPIRY: 15m
      REFRESH_TOKEN_EXPIRY: 7d
    ports:
      - "3001:3001"
    depends_on:
      - postgres
      - redis
    networks:
      - backend

  # Shop Service
  shop-service:
    build:
      context: ./services/shop
      dockerfile: Dockerfile
    environment:
      NODE_ENV: production
      PORT: 3002
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: online_store_guliston
      REDIS_HOST: redis
      ELASTICSEARCH_HOST: elasticsearch
      CLOUDINARY_CLOUD_NAME: your_cloud_name
      CLOUDINARY_API_KEY: your_api_key
      CLOUDINARY_API_SECRET: your_api_secret
    ports:
      - "3002:3002"
    depends_on:
      - postgres
      - redis
      - elasticsearch
    networks:
      - backend

  # Order Service
  order-service:
    build:
      context: ./services/order
      dockerfile: Dockerfile
    environment:
      NODE_ENV: production
      PORT: 3003
      DB_HOST: postgres
      REDIS_HOST: redis
      RABBITMQ_HOST: rabbitmq
      RABBITMQ_USER: rabbitmq
      RABBITMQ_PASS: rabbitmq123
    ports:
      - "3003:3003"
    depends_on:
      - postgres
      - redis
      - rabbitmq
    networks:
      - backend

  # Notification Service
  notification-service:
    build:
      context: ./services/notification
      dockerfile: Dockerfile
    environment:
      NODE_ENV: production
      PORT: 3004
      RABBITMQ_HOST: rabbitmq
      FCM_SERVER_KEY: your_fcm_server_key
      TELEGRAM_BOT_TOKEN: your_telegram_bot_token
    ports:
      - "3004:3004"
    depends_on:
      - rabbitmq
    networks:
      - backend

  # Monitoring — Prometheus
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    networks:
      - backend

  # Monitoring — Grafana
  grafana:
    image: grafana/grafana:latest
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin123
    volumes:
      - grafana_data:/var/lib/grafana
    ports:
      - "3000:3000"
    depends_on:
      - prometheus
    networks:
      - backend

volumes:
  postgres_data:
  redis_data:
  rabbitmq_data:
  elasticsearch_data:
  prometheus_data:
  grafana_data:

networks:
  backend:
    driver: bridge
```

---

## 📱 APK UCHUN BACKEND OPTIMIZATSIYA

**Muhim:** Ilova Play Market orqali emas, to'g'ridan-to'g'ri APK fayl orqali tarqatiladi. Bu quyidagilarni talab qiladi:

### 1. Auto-update mexanizmi

```typescript
// Version Service endpoint
app.get('/api/app/version', async (req, res) => {
  res.json({
    current_version: '1.0.5',
    min_supported_version: '1.0.0',
    download_url: 'https://cdn.onlinestore-guliston.uz/app/latest.apk',
    release_notes: 'Bug fixes va performance yaxshilandi',
    is_force_update: false // true bo'lsa — majburiy yangilash
  });
});

// Frontend check on app launch
const checkUpdate = async () => {
  const response = await fetch('https://api.onlinestore-guliston.uz/app/version');
  const data = await response.json();
  
  const currentVersion = '1.0.3'; // App ichidan
  
  if (currentVersion < data.min_supported_version) {
    // Force update dialog
    showUpdateDialog({ isForced: true, url: data.download_url });
  } else if (currentVersion < data.current_version) {
    // Optional update dialog
    showUpdateDialog({ isForced: false, url: data.download_url });
  }
};
```

### 2. CDN orqali APK hosting

- **Cloudflare R2** yoki **AWS S3 + CloudFront**
- SSL sertifikat majburiy (HTTPS)
- Versioning: `latest.apk` va `v1.0.5.apk`

### 3. Offline-first arxitektura

```typescript
// Service Worker (PWA style)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache hit — return cached version
      if (response) {
        return response;
      }
      
      // Fetch from network
      return fetch(event.request).then((response) => {
        // Cache valid responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open('v1').then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      });
    })
  );
});
```

---

## 🚀 DEPLOYMENT CHECKLIST

### Pre-launch

- [ ] Database migrations tested
- [ ] All environment variables configured
- [ ] SSL certificates installed (Let's Encrypt)
- [ ] Rate limiting configured
- [ ] CORS whitelist updated
- [ ] Error tracking (Sentry) enabled
- [ ] Monitoring (Prometheus + Grafana) setup
- [ ] Load testing completed (min 1000 concurrent users)
- [ ] Security audit passed (OWASP Top 10)
- [ ] Backup strategy implemented (daily DB backups)

### Launch

- [ ] Docker containers running
- [ ] Health check endpoints responding
- [ ] API Gateway routing configured
- [ ] CDN configured (Cloudflare/AWS CloudFront)
- [ ] DNS records updated
- [ ] Firewall rules configured
- [ ] Logs aggregation working (ELK stack optional)

### Post-launch

- [ ] Monitor error rates (< 1%)
- [ ] Monitor response times (p95 < 500ms)
- [ ] Check database query performance
- [ ] Verify push notifications delivery
- [ ] Test real-time tracking
- [ ] Hotfix deployment pipeline tested

---

## 📞 SUPPORT & CONTACT

**Backend Documentation:** Auto-generated Swagger docs → `https://api.onlinestore-guliston.uz/docs`

**Healthcheck Endpoint:** `GET /health`
```json
{
  "status": "healthy",
  "uptime": 345678,
  "services": {
    "postgres": "connected",
    "redis": "connected",
    "rabbitmq": "connected",
    "elasticsearch": "connected"
  },
  "version": "1.0.0"
}
```

---

## 🎯 FINAL WORDS

Bu prompt **production-ready, scalable, secure backend tizimi** yaratish uchun zarur bo'lgan **barcha tafsilotlarni** o'z ichiga oladi:

✅ Microservices arxitekturasi  
✅ Event-driven kommunikatsiya  
✅ Real-time tracking (SSE)  
✅ Security best practices  
✅ Docker containerization  
✅ Monitoring & observability  
✅ Data retention policy  
✅ Promocode system  
✅ Weather integration  
✅ APK deployment strategy  

**KEYINGI QADAM:** Har bir servic uchun alohida `services/auth`, `services/shop`, `services/order` papkalarida kod yozish va Docker orqali deploy qilish.

**OMAD!** 🚀
