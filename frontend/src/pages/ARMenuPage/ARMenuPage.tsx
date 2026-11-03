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
import { INITIAL_PRODUCTS } from '../../data/mockDishes';
import { matchUzbekQuery } from '../../utils/uzbekSearch';
import { useNavigation } from '../../context/NavigationContext';
import { enrichDishWith3D } from '../../services/Smart3DMatcher';
import { getLang, t } from '../../i18n';
import { categoryName, dishName } from '../../utils/dishText';
import './ARMenuPage.css';

interface InitialARData {
  shop?: { name: string };
  table?: { number: string | number; hall?: string };
  categories?: Category[];
  products?: Product[];
}

const DEFAULT_AR_PRODUCTS: Product[] = INITIAL_PRODUCTS.filter((p) => p.has_3d);

export const ARMenuPage: React.FC = () => {
  const { tableNumber, cart, addToCart, updateQuantity, cartCount, navigate, setIsStudioModalOpen, userRole } = useNavigation();
  // Taom yaratish — faqat xodim uchun (server ham faqat rahbariyatga ruxsat beradi, TZ: R-SEC-08)
  const isStaff = userRole !== 'guest';

  // Read initial injected data or use fallback
  const initialData: InitialARData =
    typeof window !== 'undefined'
      ? (window as any).__GULISTON_AR_DATA__ || (window as any).__GULISTON_DATA__ || {}
      : {};

  const shopName = initialData.shop?.name || 'Guliston';
  const table = initialData.table;
  const categoriesList = initialData.categories || [];
  // Django ma'lumot yuborgan bo'lsa (initialData.shop) — faqat shu restoran taomlari, bo'sh bo'lsa ham. Demo taomlar,
  // brauzerdagi lokal taomlar va boshqa do'konlar kategoriyalari mehmon menyusiga aralashmaydi (TZ: R5-4, R-GST-08).
  const isServerData = Boolean(initialData.shop);
  const productsList = isServerData
    ? initialData.products || []
    : initialData.products && initialData.products.length > 0
      ? initialData.products
      : DEFAULT_AR_PRODUCTS;

  const getMergedARProducts = () => {
    if (isServerData) return productsList.filter((p) => p.has_3d);
    try {
      const raw = localStorage.getItem('guliston_custom_products');
      const customList = raw ? JSON.parse(raw) : [];
      const custom3D = customList.map(enrichDishWith3D).filter((p: Product) => p.has_3d);
      return [...custom3D, ...productsList.map(enrichDishWith3D).filter((p) => p.has_3d)];
    } catch {
      return productsList.map(enrichDishWith3D).filter((p) => p.has_3d);
    }
  };

  // Local state
  const [categories, setCategories] = useState<Category[]>(categoriesList);
  const [products, setProducts] = useState<Product[]>(getMergedARProducts);
  const [activeCategory, setActiveCategory] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Live menu sync & custom product update listener
  useEffect(() => {
    const handleUpdate = () => {
      setProducts(getMergedARProducts());
    };
    window.addEventListener('guliston_menu_updated', handleUpdate);
    return () => window.removeEventListener('guliston_menu_updated', handleUpdate);
  }, []);

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

  // Preload categories from API if missing
  useEffect(() => {
    if (!isServerData && categoriesList.length === 0) {
      fetch('/api/v1/categories/')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setCategories(data);
          else if (data.results && Array.isArray(data.results)) setCategories(data.results);
        })
        .catch(() => {});
    }
  }, [categoriesList.length, isServerData]);

  const handleAddToCart = (product: Product) => {
    addToCart(product.id, 1);
    showToast(t("{name} savatga qo'shildi", { name: `"${dishName(product, getLang())}"` }));
  };

  const handleUpdateQuantity = (productId: number, delta: number) => {
    updateQuantity(productId, delta);
    if (delta < 0 && (cart[productId] || 0) <= 1) {
      showToast(t("Taom savatdan olib tashlandi"));
    }
  };

  const handleOpen3D = (product: Product) => {
    setSelected3DProduct(product);
    setIs3DOpen(true);
  };

  const activeCategoryItem = categories.find((c) => c.id === activeCategory);

  // Filter products by category and smart Uzbek search
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory =
        activeCategory === 'all' || p.category_id === activeCategory;
      const matchesSearch = searchQuery.trim()
        ? matchUzbekQuery([p.name, p.name_ru, p.name_en, p.description, p.category_name], searchQuery)
        : true;
      return matchesCategory && matchesSearch;
    });
  }, [products, activeCategory, searchQuery]);

  return (
    <div className="react-ar-menu-page">
      {/* ─── Header Navigation ─── */}
      <HeaderNav
        brandName={shopName}
        tableNumber={tableNumber || table?.number}
        cartCount={cartCount}
        onCartClick={() => navigate('/cart')}
      />

      <main className="ar-page-main">
        {/* ─── 360 Interactive Hero Section ─── */}
        <section className="ar-hero-card">
          <div className="ar-hero-content">
            <span className="ar-hero-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m21.12 6.4-6.05-4.06a2 2 0 0 0-2.17-.05L2.9 6.25a2 2 0 0 0-1 1.74v7.92a2 2 0 0 0 .98 1.72l6.08 4.07a2 2 0 0 0 2.17.05l9.95-3.96a2 2 0 0 0 1.02-1.74V8.14a2 2 0 0 0-.98-1.74Z" />
                <path d="m3.29 7 8.71 5.37L20.71 7" />
                <path d="M12 12.37V22" />
              </svg>
              <span>{t("360° Jonli Ko'rinish")}</span>
            </span>
            <h1 className="ar-hero-title">
              {t('Taomlarni 360° Har Taraflama')}<br />{t('Tanlang')}
            </h1>
            <p className="ar-hero-desc">
              {t("Har bir taomning porsiyasi va ko'rinishini aylantirib, stol ustida ko'rib buyurtma bering.")}
            </p>
            <div className="ar-hero-actions">
              <button 
                type="button" 
                onClick={() => navigate('/menu')} 
                className="btn-ar-action btn-ar-action-primary"
              >
                {t('Klassik menyu')}
              </button>
              {isStaff && (
                <button
                  type="button"
                  onClick={() => setIsStudioModalOpen(true)}
                  className="btn-ar-action btn-ar-action-secondary"
                  style={{ background: 'var(--brand-primary)', color: '#FFFFFF', borderColor: 'var(--brand-primary)' }}
                >
                  📸 {t('Yangi 3D/360 Taom Yaratish')}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ─── Controls: Search & Category Chips ─── */}
        <div className="ar-controls-section">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t('Taomlarni qidirish...')}
          />

          <CategoryChips
            categories={categories}
            activeId={activeCategory}
            onSelect={setActiveCategory}
          />
        </div>

        {/* ─── 360 Dish Grid ─── */}
        <section className="ar-grid-section">
          <div className="ar-section-header">
            <div>
              <h2 className="ar-section-title">
                {activeCategory === 'all'
                  ? t("360° Aylantirib Ko'rish Mumkin Bo'lgan Taomlar")
                  : (activeCategoryItem && categoryName(activeCategoryItem, getLang())) || t('Taomlar')}
              </h2>
              <span className="ar-section-count tabular-nums">
                {t('{n} ta taom', { n: filteredProducts.length })}
              </span>
            </div>
          </div>

          {filteredProducts.length === 0 && products.length === 0 ? (
            // Restoranda hali birorta taomga 3D model biriktirilmagan: "qidiruv topilmadi" emas, haqiqiy sabab aytiladi
            <div className="ar-empty-state">
              <h3 className="ar-empty-title">{t("Hozircha 360° taomlar yo'q")}</h3>
              <p className="ar-empty-desc">{t("Taomlarning 360° ko'rinishi tayyorlanmoqda. Hozircha butun menyuni ko'rishingiz mumkin.")}</p>
              <button type="button" className="btn-ar-reset" onClick={() => navigate('/menu')}>
                {t("Menyuni ko'rish")}
              </button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="ar-empty-state">
              <p>{t("Qidiruv bo'yicha mos taom topilmadi.")}</p>
              <button
                type="button"
                className="btn-ar-reset"
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('all');
                }}
              >
                {t('Filtrni tozalash')}
              </button>
            </div>
          ) : (
            <div className="ar-dishes-grid">
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
            </div>
          )}
        </section>
      </main>

      {/* ─── 3D / AR Interactive Modal ─── */}
      <Modal3D
        product={selected3DProduct}
        isOpen={is3DOpen}
        onClose={() => setIs3DOpen(false)}
        onAddToCart={handleAddToCart}
      />

      {/* ─── Mobile-Only Bottom Navigation ─── */}
      <BottomNav
        activeTab="ar"
        cartCount={cartCount}
      />

      {/* ─── Toast Feedback ─── */}
      <Toast message={toastMsg} icon={toastIcon} visible={toastVisible} />
    </div>
  );
};
