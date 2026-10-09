import React, { useState, useMemo, useEffect } from 'react';
import {
  HeaderNav,
  SearchBar,
  CategoryChips,
  DishCard,
  Modal3D,
  BottomNav,
  Toast,
} from '../../components/ui';
import type { Product, Category } from '../../types/dish';
import './ARMenuPage.css';

interface InitialARData {
  shop?: { name: string };
  table?: { number: string | number; hall?: string };
  categories?: Category[];
  products?: Product[];
  cart?: Record<number, number>;
  cartCount?: number;
}

const DEFAULT_AR_PRODUCTS: Product[] = [
  {
    id: 1,
    name: "To'y Oshi (Maxsus Devzira)",
    description: "Lazer va devzira guruchi, sara qo'y go'shti, sarg'ish sabzi va mayiz bilan dimlangan milliy shohona taom.",
    price: 45000,
    image: "/media/dish/plov_devzira.jpg",
    has_3d: true,
    ar_model: "/media/ar/glb/plov.glb",
    weight: "400 gr",
    prep_time: "15 daq",
    is_halal: true,
    is_popular: true,
  },
  {
    id: 2,
    name: "Mastava (Sho'rva)",
    description: "Barra mol go'shti, guruch, pomidor va yangi ko'katlar bilan pishirilgan to'yimli issiq sho'rva.",
    price: 36000,
    image: "/media/dish/mastava.jpg",
    has_3d: true,
    ar_model: "/media/ar/glb/mastava.glb",
    weight: "350 ml",
    prep_time: "10 daq",
    is_halal: true,
  },
  {
    id: 3,
    name: "Sezar Salati",
    description: "Tovuq filesi, aysberg barglari, parmezan pishlog'i, sarimsoqli suxariklar va klassik sezar sousi.",
    price: 38000,
    image: "/media/dish/salad.jpg",
    has_3d: true,
    ar_model: "/media/ar/glb/salad_bahor.glb",
    weight: "250 gr",
    prep_time: "8 daq",
    is_halal: true,
  },
  {
    id: 4,
    name: "Dimlama Go'sht va Sabzavotlar",
    description: "O'z sharbatida past olovda 2 soat dimlangan mol go'shti, kartoshka va yangi sabzavotlar.",
    price: 58000,
    image: "/media/dish/qozon_kabob.jpg",
    has_3d: true,
    ar_model: "/media/ar/glb/steak_meat.glb",
    weight: "450 gr",
    prep_time: "20 daq",
    is_halal: true,
  },
];

export const ARMenuPage: React.FC = () => {
  // Read initial injected data or use fallback
  const initialData: InitialARData =
    typeof window !== 'undefined'
      ? (window as any).__GULISTON_AR_DATA__ || (window as any).__GULISTON_DATA__ || {}
      : {};

  const shopName = initialData.shop?.name || 'Guliston';
  const table = initialData.table;
  const categoriesList = initialData.categories || [];
  const productsList = initialData.products && initialData.products.length > 0
    ? initialData.products
    : DEFAULT_AR_PRODUCTS;

  // Local state
  const [categories, setCategories] = useState<Category[]>(categoriesList);
  const [products, setProducts] = useState<Product[]>(productsList);
  const [activeCategory, setActiveCategory] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
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

  // Pre-load if not available
  useEffect(() => {
    if (productsList.length === 0) {
      fetch('/api/v1/products/?is_available=true')
        .then((res) => res.json())
        .then((data) => {
          const list = Array.isArray(data) ? data : (data.results || []);
          const with3d = list.filter((p: Product) => p.has_3d);
          setProducts(with3d.length > 0 ? with3d : list);
        })
        .catch(() => {});
    }

    if (categoriesList.length === 0) {
      fetch('/api/v1/categories/')
        .then((res) => res.json())
        .then((data) => {
          const list = Array.isArray(data) ? data : (data.results || []);
          setCategories(list);
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
    showToast(`"${product.name}" savatga qo'shildi`);
  };

  const handleUpdateQuantity = (productId: number, delta: number) => {
    setCart((prev) => {
      const current = prev[productId] || 0;
      const next = Math.max(0, current + delta);
      const updated = { ...prev };
      if (next === 0) {
        delete updated[productId];
      } else {
        updated[productId] = next;
      }
      return updated;
    });

    if (delta > 0) {
      syncCartWithBackend(productId, 'add', 1);
    } else {
      syncCartWithBackend(productId, 'remove', 1);
    }
  };

  const handleOpen3D = (product: Product) => {
    setSelected3DProduct(product);
    setIs3DOpen(true);
  };

  // Calculate total cart items
  const totalCartCount = useMemo(() => {
    return Object.values(cart).reduce((sum, count) => sum + count, 0);
  }, [cart]);

  // Filter products by category and search
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory =
        activeCategory === 'all' || p.category_id === activeCategory;
      const matchesSearch =
        searchQuery.trim() === '' ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [products, activeCategory, searchQuery]);

  return (
    <div className="react-ar-menu-page">
      {/* ─── Header Navigation ─── */}
      <HeaderNav
        brandName={shopName}
        tableNumber={table?.number}
        cartCount={totalCartCount}
        onCartClick={() => (window.location.href = '/cart/')}
      />

      <main className="ar-page-main">
        {/* ─── 3D / AR Hero Section ─── */}
        <section className="ar-hero-card">
          <div className="ar-hero-content">
            <span className="ar-hero-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m21.12 6.4-6.05-4.06a2 2 0 0 0-2.17-.05L2.9 6.25a2 2 0 0 0-1 1.74v7.92a2 2 0 0 0 .98 1.72l6.08 4.07a2 2 0 0 0 2.17.05l9.95-3.96a2 2 0 0 0 1.02-1.74V8.14a2 2 0 0 0-.98-1.74Z" />
                <path d="m3.29 7 8.71 5.37L20.71 7" />
                <path d="M12 12.37V22" />
              </svg>
              <span>3D Taomlar Ko'rgazmasi</span>
            </span>
            <h1 className="ar-hero-title serif">
              Taomlarni 3D Ko'rinishda<br />Tanlang
            </h1>
            <p className="ar-hero-desc">
              Har bir taomning porsiyasi va ko'rinishini 360° burchak ostida ko'rib, buyurtma bering.
            </p>
            <div className="ar-hero-actions">
              <a href="/menu/" className="btn-ar-action btn-ar-action-primary">
                Klassik menyu
              </a>
              <a href="/" className="btn-ar-action btn-ar-action-secondary">
                Bosh sahifa
              </a>
            </div>
          </div>
        </section>

        {/* ─── Controls: Search & Category Chips ─── */}
        <div className="ar-controls-section">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="3D taomlarni qidirish..."
          />

          <CategoryChips
            categories={categories}
            activeId={activeCategory}
            onSelect={setActiveCategory}
          />
        </div>

        {/* ─── 3D Dish Grid ─── */}
        <section className="ar-grid-section">
          <div className="ar-section-header">
            <div>
              <h2 className="ar-section-title serif">
                {activeCategory === 'all'
                  ? 'Barcha 3D Taomlar'
                  : categories.find((c) => c.id === activeCategory)?.name || '3D Taomlar'}
              </h2>
              <span className="ar-section-count tabular-nums">
                {filteredProducts.length} ta model
              </span>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="ar-empty-state">
              <div className="ar-empty-icon-circle" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                  <path d="M8 11h6" />
                </svg>
              </div>
              <h3 className="ar-empty-title">Mos taom topilmadi</h3>
              <p className="ar-empty-desc">
                Qidiruv so'zini o'zgartiring yoki klassik menyuga o'tib barcha taomlarni ko'ring.
              </p>
              <a href="/menu/" className="btn-ar-action btn-ar-action-primary" style={{ marginTop: '16px' }}>
                Klassik menyuga o'tish
              </a>
            </div>
          ) : (
            <div className="ar-dishes-grid">
              {filteredProducts.map((dish) => (
                <DishCard
                  key={dish.id}
                  product={{ ...dish, has_3d: true }}
                  quantity={cart[dish.id] || 0}
                  onAddToCart={handleAddToCart}
                  onUpdateQuantity={handleUpdateQuantity}
                  onOpen3D={handleOpen3D}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* ─── 3D / AR Modal Viewer ─── */}
      <Modal3D
        product={selected3DProduct}
        isOpen={is3DOpen}
        onClose={() => setIs3DOpen(false)}
        onAddToCart={handleAddToCart}
      />

      {/* ─── Bottom Navigation ─── */}
      <BottomNav
        activeTab="ar"
        cartCount={totalCartCount}
        onTabChange={(tab) => {
          if (tab === 'home') window.location.href = '/';
          else if (tab === 'menu') window.location.href = '/menu/';
          else if (tab === 'ar') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else if (tab === 'cart') window.location.href = '/cart/';
          else if (tab === 'orders') window.location.href = '/orders/';
        }}
      />

      {/* ─── Toast Feedback ─── */}
      <Toast message={toastMsg} icon={toastIcon} visible={toastVisible} />
    </div>
  );
};
