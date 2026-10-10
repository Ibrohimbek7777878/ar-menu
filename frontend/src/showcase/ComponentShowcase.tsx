import React, { useState } from 'react';
import {
  DishCard,
  Button,
  Badge,
  CategoryChips,
  QuantityStepper,
  Modal3D,
  SearchBar,
  TableBadge,
  HeaderNav,
  OrderSummary,
  Toast,
} from '../components/ui';
import type { Product, Category } from '../types/dish';
import { INITIAL_PRODUCTS, INITIAL_CATEGORIES } from '../data/mockDishes';
import './ComponentShowcase.css';

const DEMO_CATEGORIES: Category[] = INITIAL_CATEGORIES;
const DEMO_PRODUCTS: Product[] = INITIAL_PRODUCTS.slice(0, 4);

export const ComponentShowcase: React.FC = () => {
  // State management
  const [activeCategory, setActiveCategory] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<Record<number, number>>({ 1: 1 });
  const [selectedProduct3D, setSelectedProduct3D] = useState<Product | null>(null);
  const [is3DModalOpen, setIs3DModalOpen] = useState(false);
  const [stepperValue, setStepperValue] = useState(2);
  
  // Toast state
  const [toastMessage, setToastMessage] = useState('');
  const [toastIcon, setToastIcon] = useState('✨');
  const [toastVisible, setToastVisible] = useState(false);

  const triggerToast = (msg: string, icon = '✨') => {
    setToastMessage(msg);
    setToastIcon(icon);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2400);
  };

  const handleAddToCart = (product: Product) => {
    setCart((prev) => ({
      ...prev,
      [product.id]: (prev[product.id] || 0) + 1,
    }));
    triggerToast(`${product.name} savatga qo'shildi!`, '🍲');
  };

  const handleUpdateQuantity = (productId: number, delta: number) => {
    setCart((prev) => {
      const current = prev[productId] || 0;
      const next = current + delta;
      const updated = { ...prev };
      if (next <= 0) {
        delete updated[productId];
        triggerToast("Taom savatdan olib tashlandi", "🗑️");
      } else {
        updated[productId] = next;
      }
      return updated;
    });
  };

  const handleOpen3D = (product: Product) => {
    setSelectedProduct3D(product);
    setIs3DModalOpen(true);
  };

  const totalCartCount = Object.values(cart).reduce((a, b) => a + b, 0);

  return (
    <div className="showcase-root">
      {/* Toast Notification */}
      <Toast message={toastMessage} icon={toastIcon} visible={toastVisible} />

      {/* 3D Interactive Modal */}
      <Modal3D
        product={selectedProduct3D}
        isOpen={is3DModalOpen}
        onClose={() => setIs3DModalOpen(false)}
        onAddToCart={handleAddToCart}
      />

      {/* Header Nav Component */}
      <HeaderNav
        brandName="Guliston"
        tableNumber={7}
        cartCount={totalCartCount}
        onCartClick={() => triggerToast(`Savatda ${totalCartCount} ta taom bor`, '🛒')}
      />

      <main className="showcase-content">
        {/* Banner */}
        <section className="showcase-hero">
          <span className="hero-tag">⚡ REACT 18 + TYPESCRIPT DESIGN SYSTEM</span>
          <h1 className="hero-title">UI Komponentlar Laboratoriyasi (React)</h1>
          <p className="hero-desc">
            Barcha komponentlar 0 dan toza React TypeScript arxitekturasida qayta yozildi.
            Ayniqsa <strong>DishCard (Taom Kartochkasi)</strong> to'liq interaktiv, 3D/AR modal va reaktiv savat bilan jihozlandi.
          </p>
        </section>

        {/* 0. JONLI SAHIFALAR NAVIGATORI */}
        <section className="showcase-card" style={{ background: '#FAF7F0', border: '1.5px solid #2F4836' }}>
          <div className="section-head">
            <h2 className="section-title">
              <span>🚀</span> Loyihadagi Barcha Jonli React Sahifalar (10 ta Sahifa)
            </h2>
            <p className="section-subtitle">
              Har bir sahifa 100% toza React TypeScript komponentlariga o'tkazildi va Django backend bilan bog'landi:
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
            {[
              { title: 'Bosh Sahifa (Kirish)', url: '/', icon: '🏛️' },
              { title: 'Dasturxon Menyusi', url: '/menu/', icon: '🍽️' },
              { title: '3D / AR Menyu', url: '/ar/', icon: '✨' },
              { title: 'Savat', url: '/cart/', icon: '🛒' },
              { title: 'Buyurtmalar & Hisob', url: '/orders/', icon: '🧾' },
              { title: 'Stol & Bron Hubi', url: '/table/', icon: '🪑' },
              { title: 'Kelishni Tasdiqlash', url: '/reservation/arrival/', icon: '👋' },
              { title: 'Ofitsiant Paneli', url: '/ofitsiant/', icon: '📋' },
              { title: 'Oshxona Ekrani (KDS)', url: '/kds/', icon: '👨‍🍳' },
              { title: 'Hostess / Kutib Olish', url: '/arrival/desk/', icon: '🌸' },
              { title: 'Boshqaruv Markazi (Admin)', url: '/admin/dashboard/', icon: '📊' },
              { title: 'UI Laboratoriyasi', url: '/ui-components/', icon: '🔬' },
            ].map((p, idx) => (
              <a
                key={idx}
                href={p.url}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#FFFFFF',
                  border: '1px solid #E8E0CF',
                  borderRadius: '12px',
                  padding: '10px 12px',
                  color: '#2F4836',
                  fontWeight: 700,
                  fontSize: '13px',
                  textDecoration: 'none',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                }}
              >
                <span>{p.icon}</span>
                <span>{p.title}</span>
              </a>
            ))}
          </div>
        </section>

        {/* 1. DISH CARD (0 DAN QAYTA YARATILGAN) */}
        <section className="showcase-card">
          <div className="section-head">
            <h2 className="section-title">
              <span>🌟</span> 4. DishCard — 0 dan Qayta Yaratilgan Asosiy Modul
            </h2>
            <p className="section-subtitle">
              Sifatli rasm, 3D/AR glassmorphism nishoni, silliq hover animatsiyasi, porsiya/tayyorlanish vaqti va bir zumda stepperga aylanuvchi aqlli savat tugmasi.
            </p>
          </div>

          <div className="dish-grid-demo">
            {DEMO_PRODUCTS.map((product) => (
              <DishCard
                key={product.id}
                product={product}
                quantity={cart[product.id] || 0}
                onAddToCart={handleAddToCart}
                onUpdateQuantity={handleUpdateQuantity}
                onOpen3D={handleOpen3D}
              />
            ))}
          </div>

          {/* Horizontal Layout Demo */}
          <div style={{ marginTop: '28px' }}>
            <h3 style={{ fontSize: '15px', color: '#2F4836', marginBottom: '12px' }}>
              📱 Horizontal Layout (Mobil ro'yxat ko'rinishi):
            </h3>
            <div style={{ maxWidth: '540px' }}>
              <DishCard
                product={DEMO_PRODUCTS[0]}
                layout="horizontal"
                quantity={cart[DEMO_PRODUCTS[0].id] || 0}
                onAddToCart={handleAddToCart}
                onUpdateQuantity={handleUpdateQuantity}
                onOpen3D={handleOpen3D}
              />
            </div>
          </div>
        </section>

        {/* 2. BUTTONS */}
        <section className="showcase-card">
          <div className="section-head">
            <h2 className="section-title"><span>🔘</span> 1. Button (Tugmalar)</h2>
            <p className="section-subtitle">Primary, Secondary, Warm 3D, Outline, Ghost va Danger holatlari.</p>
          </div>
          <div className="flex-wrap-row">
            <Button variant="primary" icon="✨" onClick={() => triggerToast("Primary bosildi!")}>
              Primary Button
            </Button>
            <Button variant="secondary" onClick={() => triggerToast("Secondary bosildi!")}>
              Secondary
            </Button>
            <Button variant="warm" icon="📱" onClick={() => triggerToast("3D/AR Rejim tanlandi!", "✨")}>
              3D / AR Rejim
            </Button>
            <Button variant="outline" onClick={() => triggerToast("Outline bosildi!")}>
              Outline
            </Button>
            <Button variant="ghost" onClick={() => triggerToast("Ghost bosildi!")}>
              Ghost
            </Button>
            <Button variant="danger" onClick={() => triggerToast("Bekor qilindi!", "⚠️")}>
              Danger
            </Button>
            <Button variant="primary" size="sm">
              Kichik (sm)
            </Button>
            <Button variant="primary" size="lg" icon="🚀">
              Katta (lg)
            </Button>
          </div>
        </section>

        {/* 3. BADGES */}
        <section className="showcase-card">
          <div className="section-head">
            <h2 className="section-title"><span>🏷️</span> 2. Badge & Tags (Nishonlar)</h2>
            <p className="section-subtitle">Stol holati, 3D nishon va restoran belgilari.</p>
          </div>
          <div className="flex-wrap-row">
            <Badge variant="success" icon="●">Bo'sh (Erkin)</Badge>
            <Badge variant="danger" icon="●">Band (Mehmon bor)</Badge>
            <Badge variant="warning" icon="⏳">Kutilmoqda</Badge>
            <Badge variant="ar" icon="✨">3D / AR Voqelik</Badge>
            <Badge variant="success" icon="✓">Halol</Badge>
            <Badge variant="neutral">Neytral</Badge>
            <Badge variant="dark">Dark Badge</Badge>
          </div>
        </section>

        {/* 4. CATEGORY CHIPS */}
        <section className="showcase-card">
          <div className="section-head">
            <h2 className="section-title"><span>📑</span> 3. CategoryChips (Toifalar Filtri)</h2>
            <p className="section-subtitle">Gorizontal siljiydigan toifalar teglari.</p>
          </div>
          <CategoryChips
            categories={DEMO_CATEGORIES}
            activeId={activeCategory}
            onSelect={(id) => {
              setActiveCategory(id);
              triggerToast(`Toifa tanlandi: ${id === 'all' ? 'Barchasi' : DEMO_CATEGORIES.find(c => c.id === id)?.name}`, '📑');
            }}
          />
        </section>

        {/* 5. SEARCH & TABLE */}
        <section className="showcase-card">
          <div className="section-head">
            <h2 className="section-title"><span>🔍</span> 5. SearchBar & TableBadge</h2>
          </div>
          <div className="grid-two-cols">
            <div>
              <h3 style={{ fontSize: '14px', marginBottom: '8px', color: '#2F4836' }}>Qidiruv inputi:</h3>
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Taom yoki kabob qidirish..."
              />
            </div>
            <div>
              <h3 style={{ fontSize: '14px', marginBottom: '8px', color: '#2F4836' }}>Stol nishoni:</h3>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <TableBadge tableNumber={7} hallName="Asosiy Zal" status="available" />
                <TableBadge tableNumber={12} hallName="VIP Terrace" status="occupied" />
              </div>
            </div>
          </div>
        </section>

        {/* 6. QUANTITY STEPPER & ORDER SUMMARY */}
        <section className="showcase-card">
          <div className="section-head">
            <h2 className="section-title"><span>📊</span> 6. QuantityStepper & OrderSummary</h2>
          </div>
          <div className="grid-two-cols">
            <div>
              <h3 style={{ fontSize: '14px', marginBottom: '8px', color: '#2F4836' }}>Miqdor hisoblagich (- / +):</h3>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <QuantityStepper value={stepperValue} onChange={setStepperValue} size="sm" />
                <QuantityStepper value={stepperValue} onChange={setStepperValue} size="md" />
                <QuantityStepper value={stepperValue} onChange={setStepperValue} size="lg" />
              </div>
            </div>
            <div>
              <h3 style={{ fontSize: '14px', marginBottom: '8px', color: '#2F4836' }}>Hisob-kitob kartasi:</h3>
              <OrderSummary
                subtotal={165000}
                servicePercent={10}
                onCheckout={() => triggerToast("To'lov sahifasiga o'tilmoqda...", "💳")}
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
