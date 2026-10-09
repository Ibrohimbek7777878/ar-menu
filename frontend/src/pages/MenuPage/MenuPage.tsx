import React, { useState, useMemo, useEffect } from 'react';
import {
  HeaderNav,
  TableBadge,
  SearchBar,
  CategoryChips,
  DishCard,
  Modal3D,
  BottomNav,
  Toast,
} from '../../components/ui';
import type { Product, Category } from '../../types/dish';
import './MenuPage.css';

interface InitialData {
  shop?: { name: string };
  table?: { number: string | number; hall?: string };
  categories?: Category[];
  products?: Product[];
  cart?: Record<number, number>;
  cartCount?: number;
}

export const MenuPage: React.FC = () => {
  // Read initial injected data or use fallback
  const initialData: InitialData = (window as any).__GULISTON_DATA__ || {};

  const shopName = initialData.shop?.name || 'Guliston';
  const table = initialData.table;
  const categoriesList = initialData.categories || [];
  const productsList = initialData.products || [];

  // Local state
  const [categories, setCategories] = useState<Category[]>(categoriesList);
  const [products, setProducts] = useState<Product[]>(productsList);
  const [activeCategory, setActiveCategory] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [only3D, setOnly3D] = useState(false);
  const [cart, setCart] = useState<Record<number, number>>(initialData.cart || {});
  
  // 3D Modal state
  const [selected3DProduct, setSelected3DProduct] = useState<Product | null>(null);
  const [is3DOpen, setIs3DOpen] = useState(false);

  // Toast state
  const [toastMsg, setToastMsg] = useState('');
  const [toastIcon, setToastIcon] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = (msg: string, icon = '') => {
    setToastMsg(msg);
    setToastIcon(icon);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2400);
  };

  // If products were not preloaded, fetch them from backend API
  useEffect(() => {
    if (productsList.length === 0) {
      fetch('/api/v1/products/?is_available=true')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setProducts(data);
          } else if (data.results && Array.isArray(data.results)) {
            setProducts(data.results);
          }
        })
        .catch(() => {});
    }

    if (categoriesList.length === 0) {
      fetch('/api/v1/categories/')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setCategories(data);
          else if (data.results && Array.isArray(data.results)) setCategories(data.results);
        })
        .catch(() => {});
    }
  }, [productsList.length, categoriesList.length]);

  // Sync with Django /api/cart/ backend
  const syncCartWithBackend = async (productId: number, action: 'add' | 'remove' | 'delete', qty = 1) => {
    const csrfToken = document.cookie.match(/csrftoken=([^;]+)/)?.[1] || '';
    try {
      await fetch('/api/cart/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({
          action,
          product_id: productId,
          quantity: qty,
        }),
      });
    } catch (e) {
      console.warn("Cart backend sync failed:", e);
    }
  };

  const handleAddToCart = (product: Product) => {
    setCart((prev) => {
      const current = prev[product.id] || 0;
      const next = current + 1;
      return { ...prev, [product.id]: next };
    });
    syncCartWithBackend(product.id, 'add', 1);
    showToast(`${product.name} savatga qo'shildi`);
  };

  const handleUpdateQuantity = (productId: number, delta: number) => {
    setCart((prev) => {
      const current = prev[productId] || 0;
      const next = current + delta;
      const updated = { ...prev };
      if (next <= 0) {
        delete updated[productId];
        syncCartWithBackend(productId, 'delete');
        showToast("Taom savatdan olib tashlandi");
      } else {
        updated[productId] = next;
        if (delta > 0) syncCartWithBackend(productId, 'add', 1);
        else syncCartWithBackend(productId, 'remove', 1);
      }
      return updated;
    });
  };

  const handleOpen3D = (product: Product) => {
    setSelected3DProduct(product);
    setIs3DOpen(true);
  };

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category filter
      if (activeCategory !== 'all' && p.category_id !== activeCategory) {
        return false;
      }
      // 3D only toggle
      if (only3D && !p.has_3d) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchDesc = p.description ? p.description.toLowerCase().includes(q) : false;
        if (!matchName && !matchDesc) return false;
      }
      return true;
    });
  }, [products, activeCategory, only3D, searchQuery]);

  const totalCartCount = useMemo(() => {
    return Object.values(cart).reduce((a, b) => a + b, 0);
  }, [cart]);

  return (
    <div className="menu-app-container">
      {/* Toast Notification */}
      <Toast message={toastMsg} icon={toastIcon} visible={toastVisible} />

      {/* 3D / AR Interactive Modal */}
      <Modal3D
        product={selected3DProduct}
        isOpen={is3DOpen}
        onClose={() => setIs3DOpen(false)}
        onAddToCart={handleAddToCart}
      />

      {/* ─── 1. Header Nav ─── */}
      <HeaderNav
        brandName={shopName}
        tableNumber={table?.number}
        cartCount={totalCartCount}
        onCartClick={() => { window.location.href = '/cart/'; }}
      />

      <main className="menu-main-content">
        {/* ─── Table & Status Bar ─── */}
        <div className="menu-top-bar">
          <TableBadge
            tableNumber={table?.number || 1}
            hallName={table?.hall || "Asosiy Zal"}
            status="available"
          />

          <button
            type="button"
            className={`btn-toggle-3d-filter ${only3D ? 'active' : ''}`}
            onClick={() => setOnly3D(!only3D)}
            aria-pressed={only3D}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m21.12 6.4-6.05-4.06a2 2 0 0 0-2.17-.05L2.9 6.25a2 2 0 0 0-1 1.74v7.92a2 2 0 0 0 .98 1.72l6.08 4.07a2 2 0 0 0 2.17.05l9.95-3.96a2 2 0 0 0 1.02-1.74V8.14a2 2 0 0 0-.98-1.74Z" />
              <path d="m3.29 7 8.71 5.37L20.71 7" />
              <path d="M12 12.37V22" />
            </svg>
            <span>Faqat 3D modellar</span>
          </button>
        </div>

        {/* ─── 2. Search Bar ─── */}
        <div className="menu-search-wrapper">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Osh, kabob, sho'rva, salat qidirish..."
          />
        </div>

        {/* ─── 3. Category Chips ─── */}
        <div className="menu-categories-wrapper">
          <CategoryChips
            categories={categories}
            activeId={activeCategory}
            onSelect={setActiveCategory}
          />
        </div>

        {/* ─── 4. Dishes Grid ─── */}
        <div className="menu-dishes-grid">
          {filteredProducts.map((dish) => (
            <DishCard
              key={dish.id}
              product={dish}
              quantity={cart[dish.id] || 0}
              onAddToCart={handleAddToCart}
              onUpdateQuantity={handleUpdateQuantity}
              onOpen3D={handleOpen3D}
            />
          ))}

          {filteredProducts.length === 0 && (
            <div className="menu-empty-state">
              <div className="empty-icon-circle" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                  <path d="M8 11h6" />
                </svg>
              </div>
              <h3 className="empty-title">Mos taom topilmadi</h3>
              <p className="empty-text">Qidiruv so'zini tekshiring yoki barcha toifalarni ko'ring.</p>
              <button
                type="button"
                className="btn-clear-filters"
                onClick={() => { setActiveCategory('all'); setSearchQuery(''); setOnly3D(false); }}
              >
                Barcha taomlarni ko'rsatish
              </button>
            </div>
          )}
        </div>
      </main>

      {/* ─── 5. Bottom Navigation ─── */}
      <BottomNav
        activeTab="menu"
        cartCount={totalCartCount}
        onTabChange={(tab) => {
          if (tab === 'home') window.location.href = '/';
          else if (tab === 'menu') window.location.href = '/menu/';
          else if (tab === 'ar') window.location.href = '/ar/';
          else if (tab === 'cart') window.location.href = '/cart/';
          else if (tab === 'orders') window.location.href = '/orders/';
        }}
      />
    </div>
  );
};
