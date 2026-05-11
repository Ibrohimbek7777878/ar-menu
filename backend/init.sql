-- Online Store Guliston Database Schema
-- PostgreSQL 16+ with PostGIS for geospatial queries

-- Enable PostGIS extension for location-based queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================
-- USERS & ADMINS TABLES
-- ============================================================

-- Admin users table (only admins can access admin panel)
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
    is_active BOOLEAN DEFAULT true,
    two_fa_enabled BOOLEAN DEFAULT false,
    two_fa_secret VARCHAR(255),
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Refresh tokens for JWT
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- SHOPS & PRODUCTS TABLES
-- ============================================================

-- Categories table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    icon_url TEXT,
    color VARCHAR(7) DEFAULT '#1B5E20', -- hex color
    parent_id UUID REFERENCES categories(id),
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Shops table (do'konlar)
CREATE TABLE shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL DEFAULT 'yangi_yer', -- yangi_yer | guliston
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    phone VARCHAR(20),
    opening_time TIME,
    closing_time TIME,
    is_open BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    rating DECIMAL(3, 2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
    total_reviews INT DEFAULT 0,
    image_url TEXT,
    category_id UUID REFERENCES categories(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Products table (mahsulotlar)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    unit VARCHAR(50) DEFAULT 'dona', -- dona, kg, litr, paket
    images TEXT[], -- array of image URLs
    is_available BOOLEAN DEFAULT true,
    stock_quantity INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- ORDERS TABLES
-- ============================================================

-- Order status enum
CREATE TYPE order_status AS ENUM (
    'pending',          -- Yangi
    'accepted',         -- Qabul qilindi
    'preparing',        -- Tayyorlanmoqda
    'out_for_delivery', -- Yo'lda
    'delivered',        -- Yetkazildi
    'cancelled'         -- Bekor qilindi
);

-- Orders table (buyurtmalar)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL, -- OSG-YYYYMMDD-NNNN
    
    -- Customer Info (NO REGISTRATION REQUIRED)
    customer_name VARCHAR(255) NOT NULL,
    customer_phone_1 VARCHAR(20) NOT NULL, -- Primary phone (format: +998XXXXXXXXX)
    customer_phone_2 VARCHAR(20),          -- Secondary phone
    customer_phone_3 VARCHAR(20),          -- Optional third phone
    
    -- Delivery Info
    delivery_address TEXT,
    delivery_lat DECIMAL(10, 8),
    delivery_lng DECIMAL(11, 8),
    is_pickup BOOLEAN DEFAULT false,
    
    -- Order Details
    total_amount DECIMAL(10, 2) NOT NULL,
    delivery_fee DECIMAL(10, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    final_amount DECIMAL(10, 2) NOT NULL,
    
    -- Status Tracking
    status order_status DEFAULT 'pending',
    courier_name VARCHAR(255),
    courier_phone VARCHAR(20),
    estimated_delivery_time TIMESTAMP,
    actual_delivery_time TIMESTAMP,
    
    -- Payment
    payment_method VARCHAR(50) DEFAULT 'cash_on_delivery',
    is_paid BOOLEAN DEFAULT false,
    
    -- Notes
    customer_notes TEXT,
    admin_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Order items table (buyurtma tarkibi)
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL, -- Snapshot (agar mahsulot o'chirilsa ham tarix saqlanadi)
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Order status history (audit trail)
CREATE TABLE order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    old_status order_status,
    new_status order_status NOT NULL,
    changed_by UUID REFERENCES admins(id),
    changed_at TIMESTAMP DEFAULT NOW(),
    notes TEXT
);

-- ============================================================
-- REVIEWS & RATINGS
-- ============================================================

CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id),
    customer_phone VARCHAR(20) NOT NULL,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- PROMOTIONS & DISCOUNTS
-- ============================================================

CREATE TABLE promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('percentage', 'fixed_amount', 'free_delivery')),
    value DECIMAL(10, 2) NOT NULL,
    min_order_amount DECIMAL(10, 2),
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true,
    usage_limit INT,
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

-- ============================================================
-- BANNERS & MARKETING
-- ============================================================

CREATE TABLE banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    image_url TEXT NOT NULL,
    link_url TEXT,
    position VARCHAR(50) DEFAULT 'home', -- home, shop, category
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0,
    start_date TIMESTAMP DEFAULT NOW(),
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

-- Admin indexes
CREATE INDEX idx_admins_email ON admins(email);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_admin ON refresh_tokens(admin_id);

-- Shop & Product indexes
CREATE INDEX idx_shops_city ON shops(city);
CREATE INDEX idx_shops_location ON shops USING GIST (ll_to_earth(latitude, longitude));
CREATE INDEX idx_shops_category ON shops(category_id);
CREATE INDEX idx_shops_active ON shops(is_active);
CREATE INDEX idx_shops_open ON shops(is_open);

CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);

CREATE INDEX idx_products_shop ON products(shop_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_available ON products(is_available);
CREATE INDEX idx_products_slug ON products(slug);

-- Order indexes
CREATE INDEX idx_orders_phone ON orders(customer_phone_1);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
CREATE INDEX idx_order_history_order ON order_status_history(order_id);

-- Review indexes
CREATE INDEX idx_reviews_shop ON reviews(shop_id);
CREATE INDEX idx_reviews_order ON reviews(order_id);

-- Promotion indexes
CREATE INDEX idx_promotions_active ON promotions(is_active);
CREATE INDEX idx_promo_codes_code ON promo_codes(code);
CREATE INDEX idx_user_promo_phone ON user_promo_usage(customer_phone);

-- Banner indexes
CREATE INDEX idx_banners_active ON banners(is_active);
CREATE INDEX idx_banners_position ON banners(position);

-- ============================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to tables with updated_at
CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shops_updated_at BEFORE UPDATE ON shops FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- INITIAL DATA SEEDING
-- ============================================================

-- Insert default admin (password: admin123 - hashed with bcrypt cost 12)
-- In production, change this password immediately!
INSERT INTO admins (email, password_hash, full_name, role) 
VALUES ('admin@guliston.uz', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj8YKFqU0uKy', 'Super Admin', 'super_admin')
ON CONFLICT (email) DO NOTHING;

-- Insert default categories
INSERT INTO categories (name, slug, color, sort_order) VALUES
('Oziq-ovqat', 'oziq-ovqat', '#4CAF50', 1),
('Ichimliklar', 'ichimliklar', '#2196F3', 2),
('Sut mahsulotlari', 'sut-mahsulotlari', '#FFC107', 3),
('Non mahsulotlari', 'non-mahsulotlari', '#FF9800', 4),
('Mevalar', 'mevalar', '#E91E63', 5),
('Sabzavotlar', 'sabzavotlar', '#8BC34A', 6),
('Go''sht mahsulotlari', 'gosht-mahsulotlari', '#F44336', 7),
('Uy-ro''zg''or', 'uy-rozigor', '#9C27B0', 8),
('Gigiyena', 'gigiyena', '#00BCD4', 9),
('Boshqa', 'boshqa', '#607D8B', 10)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- USEFUL VIEWS
-- ============================================================

-- View for order statistics
CREATE VIEW order_stats AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_orders,
    SUM(final_amount) as total_revenue,
    AVG(final_amount) as avg_order_value,
    COUNT(DISTINCT customer_phone_1) as unique_customers,
    COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders
FROM orders
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- View for shop performance
CREATE VIEW shop_performance AS
SELECT 
    s.id,
    s.name,
    s.city,
    COUNT(o.id) as total_orders,
    SUM(o.final_amount) as total_revenue,
    AVG(o.final_amount) as avg_order_value,
    s.rating,
    s.total_reviews
FROM shops s
LEFT JOIN orders o ON s.id = o.shop_id AND o.status != 'cancelled'
WHERE s.is_active = true
GROUP BY s.id, s.name, s.city, s.rating, s.total_reviews
ORDER BY total_revenue DESC;

COMMENT ON TABLE admins IS 'Admin foydalanuvchilar - faqat admin panelga kirish huquqiga ega';
COMMENT ON TABLE shops IS 'Do''konlar ma''lumotlari';
COMMENT ON TABLE products IS 'Mahsulotlar - har bir do''konga tegishli';
COMMENT ON TABLE orders IS 'Buyurtmalar - mijozlar ro''yxatdan o''tmasdan buyurtma beradi';
COMMENT ON TABLE order_items IS 'Buyurtma tarkibi - qaysi mahsulotlar va qancha';
COMMENT ON TABLE categories IS 'Mahsulot kategoriyalari';