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
import { INITIAL_PRODUCTS, INITIAL_CATEGORIES } from '../../data/mockDishes';
import { matchUzbekQuery } from '../../utils/uzbekSearch';
import { useNavigation } from '../../context/NavigationContext';
import { RestaurantAPI } from '../../services/RestaurantAPI';
import { enrichDishWith3D } from '../../services/Smart3DMatcher';
import './MenuPage.css';

interface InitialData {
  shop?: { name: string };
  table?: { number: string | number; hall?: string };
  categories?: Category[];
  products?: Product[];
}

export const MenuPage: React.FC = () => {
  const { tableNumber, cart, addToCart, updateQuantity, cartCount, navigate } = useNavigation();

  // Read initial injected data or use fallback
  const initialData: InitialData = (window as any).__GULISTON_DATA__ || {};

  const shopName = initialData.shop?.name || 'Guliston';
  const table = initialData.table;
  const categoriesList =
    initialData.categories && initialData.categories.length > 0
      ? initialData.categories
      : INITIAL_CATEGORIES;
  const productsList =
    initialData.products && initialData.products.length > 0
      ? initialData.products
      : INITIAL_PRODUCTS;

  // Function to load and enrich all dishes (including custom dishes from Studio)
  const getMergedProducts = () => {
    try {
      const raw = localStorage.getItem('guliston_custom_products');
      const customList = raw ? JSON.parse(raw) : [];
      return [...customList, ...productsList].map(enrichDishWith3D);
    } catch {
      return productsList.map(enrichDishWith3D);
    }
  };

  // Local state
  const [categories, setCategories] = useState<Category[]>(categoriesList);
  const [products, setProducts] = useState<Product[]>(getMergedProducts);

  // Live menu sync & custom product update listener
  useEffect(() => {
    const handleUpdate = () => {
      setProducts(getMergedProducts());
    };
    window.addEventListener('guliston_menu_updated', handleUpdate);

    if (!initialData.products || initialData.products.length === 0) {
      RestaurantAPI.getMenu().then((res) => {
        if (res?.products && res.products.length > 0) {
          const enriched = res.products.map(enrichDishWith3D);
          try {
            const raw = localStorage.getItem('guliston_custom_products');
            const customList = raw ? JSON.parse(raw) : [];
            setProducts([...customList, ...enriched]);
          } catch {
            setProducts(enriched);
          }
          if (res.categories && res.categories.length > 0) {
            setCategories(res.categories);
          }
        }
      });
    }

    return () => window.removeEventListener('guliston_menu_updated', handleUpdate);
  }, []);

  const [activeCategory, setActiveCategory] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [only3D, setOnly3D] = useState(false);

  // Pagination state: start with 6 dishes
  const [visibleCount, setVisibleCount] = useState(6);
  
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

  const handleCategorySelect = (id: number | 'all') => {
    setActiveCategory(id);
    setVisibleCount(6);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setVisibleCount(6);
  };

  const handleToggle3D = () => {
    setOnly3D((prev) => !prev);
    setVisibleCount(6);
  };

  // If products were not preloaded, fetch them from backend API if available
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

  const handleAddToCart = (product: Product) => {
    addToCart(product.id, 1);
    showToast(`${product.name} savatga qo'shildi`);
  };

  const handleUpdateQuantity = (productId: number, delta: number) => {
    updateQuantity(productId, delta);
    if (delta < 0 && (cart[productId] || 0) <= 1) {
      showToast("Taom savatdan olib tashlandi");
    }
  };

  const handleOpen3D = (product: Product) => {
    setSelected3DProduct(product);
    setIs3DOpen(true);
  };

  // Smart Uzbek Semantic Filtered products list
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
      // Smart Uzbek Search query (handles o', g', sh, ch and all apostrophes)
      if (searchQuery.trim()) {
        const isMatch = matchUzbekQuery([p.name, p.description, p.category_name], searchQuery);
        if (!isMatch) return false;
      }
      return true;
    });
  }, [products, activeCategory, only3D, searchQuery]);

  // Paginated visible items
  const visibleProducts = useMemo(() => {
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, visibleCount]);

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + 6, filteredProducts.length));
  };

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
        tableNumber={tableNumber || table?.number}
        cartCount={cartCount}
        onCartClick={() => navigate('/cart')}
      />

      <main className="menu-main-content">
        {/* ─── Table & Status Bar ─── */}
        <div className="menu-top-bar">
          <TableBadge
            tableNumber={tableNumber || table?.number || 5}
            hallName={table?.hall || "Asosiy Zal"}
            status="available"
          />

          <button
            type="button"
            className={`btn-toggle-3d-filter ${only3D ? 'active' : ''}`}
            onClick={handleToggle3D}
            aria-pressed={only3D}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m21.12 6.4-6.05-4.06a2 2 0 0 0-2.17-.05L2.9 6.25a2 2 0 0 0-1 1.74v7.92a2 2 0 0 0 .98 1.72l6.08 4.07a2 2 0 0 0 2.17.05l9.95-3.96a2 2 0 0 0 1.02-1.74V8.14a2 2 0 0 0-.98-1.74Z" />
              <path d="m3.29 7 8.71 5.37L20.71 7" />
              <path d="M12 12.37V22" />
            </svg>
            <span>Faqat 360° taomlar</span>
          </button>
        </div>

        {/* ─── 2. Search Bar ─── */}
        <div className="menu-search-wrapper">
          <SearchBar
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Osh, kabob, sho'rva, salat qidirish..."
          />
        </div>

        {/* ─── 3. Category Chips ─── */}
        <div className="menu-categories-wrapper">
          <CategoryChips
            categories={categories}
            activeId={activeCategory}
            onSelect={handleCategorySelect}
          />
        </div>

        {/* ─── 4. Dishes Grid with Pagination ─── */}
        <div className="menu-dishes-grid">
          {visibleProducts.map((dish) => (
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

        {/* ─── 5. Pagination / Load More Bar ─── */}
        {filteredProducts.length > 0 && (
          <div className="menu-pagination-bar">
            <span className="pagination-count-label">
              {filteredProducts.length} tadan {visibleProducts.length} tasi ko'rsatilmoqda
            </span>
            {filteredProducts.length > visibleCount && (
              <button
                type="button"
                className="btn-load-more-dishes"
                onClick={handleLoadMore}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span>Yana taomlarni ko'rish</span>
              </button>
            )}
          </div>
        )}
      </main>

      {/* ─── 6. Mobile-Only Bottom Navigation ─── */}
      <BottomNav
        activeTab="menu"
        cartCount={cartCount}
      />
    </div>
  );
};
