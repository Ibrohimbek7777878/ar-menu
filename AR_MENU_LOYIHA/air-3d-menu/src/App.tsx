import React, { useState, useEffect } from 'react';
import { Dish, Order, RestaurantTable, Language, UserRole, CartItem, Currency, DeviceMode } from './types';
import { INITIAL_DISHES, RESTAURANT_TABLES, INITIAL_ORDERS } from './data/mockData';
import { translations } from './data/translations';
import { CustomerMenu } from './components/CustomerMenu';
import { WaiterView } from './components/WaiterView';
import { KDSView } from './components/KDSView';
import { AdminView } from './components/AdminView';
import { ARViewerModal } from './components/ARViewerModal';
import { CartModal } from './components/CartModal';
import { AIChatModal } from './components/AIChatModal';
import { OrderStatusModal } from './components/OrderStatusModal';
import { TouristGuideModal } from './components/TouristGuideModal';
import { CheckCircle2, Bell, Monitor, Tablet, Smartphone } from 'lucide-react';
import { 
  getInitialContext, 
  fetchMenuFromAPI, 
  submitOrderAPI, 
  callWaiterAPI, 
  changeLanguageAPI, 
  DynamicCategory 
} from './services/api';

export default function App() {
  const [initContext] = useState(() => getInitialContext());
  const [restaurantName, setRestaurantName] = useState<string>(initContext.restaurantName);
  const [dynamicCategories, setDynamicCategories] = useState<DynamicCategory[]>([]);

  const [dishes, setDishes] = useState<Dish[]>(INITIAL_DISHES);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [tables, setTables] = useState<RestaurantTable[]>(RESTAURANT_TABLES);
  const [currentRole, setCurrentRole] = useState<UserRole>('customer');
  const [tableNumber, setTableNumber] = useState<number>(initContext.tableNumber);
  const [lang, setLang] = useState<Language>(initContext.lang);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('guliston-theme') || localStorage.getItem('theme');
      if (saved === 'dark' || saved === 'light') return saved;
      if (document.documentElement.classList.contains('dark')) return 'dark';
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    }
    return 'dark';
  });
  const [currency, setCurrency] = useState<Currency>('UZS');
  const [isAccessibleMode, setIsAccessibleMode] = useState<boolean>(false);
  const [isTouristGuideOpen, setIsTouristGuideOpen] = useState<boolean>(false);
  const [isPreviewMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('preview') === '1' || params.get('demo') === '1';
  });
  const [deviceMode, setDeviceMode] = useState<DeviceMode>(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      return 'desktop';
    }
    if (typeof window !== 'undefined' && window.innerWidth >= 640) {
      return 'tablet';
    }
    return 'mobile';
  });

  // Auto-adapt deviceMode on window resize unless manually set in preview
  useEffect(() => {
    const handleResize = () => {
      if (!isPreviewMode) {
        if (window.innerWidth >= 1024) setDeviceMode('desktop');
        else if (window.innerWidth >= 640) setDeviceMode('tablet');
        else setDeviceMode('mobile');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isPreviewMode]);

  // Customer state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderNote, setOrderNote] = useState<string>('');
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [activeArDish, setActiveArDish] = useState<Dish | null>(null);
  const [isAIChatOpen, setIsAIChatOpen] = useState<boolean>(false);
  const [activeCustomerOrder, setActiveCustomerOrder] = useState<Order | null>(null);
  const [isOrderStatusOpen, setIsOrderStatusOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);

  const t = translations[lang];

  // Fetch real menu data from Django backend
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const result = await fetchMenuFromAPI(initContext.slug, lang, initContext.tableId);
        if (isMounted) {
          if (result.dishes && result.dishes.length > 0) {
            setDishes(result.dishes);
          }
          if (result.categories && result.categories.length > 0) {
            setDynamicCategories(result.categories);
          }
          if (result.restaurant?.name) {
            setRestaurantName(result.restaurant.name);
          }
        }
      } catch (err) {
        console.warn('Backend API connection warning, using embedded menu:', err);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [initContext.slug, initContext.tableId, lang]);

  // Theme synchronization with HTML and localStorage
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      try { localStorage.setItem('guliston-theme', 'dark'); } catch (e) {}
    } else {
      root.classList.remove('dark');
      root.removeAttribute('data-theme');
      try { localStorage.setItem('guliston-theme', 'light'); } catch (e) {}
    }
  }, [theme]);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const handleToggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleSelectLanguage = (newLang: Language) => {
    setLang(newLang);
    changeLanguageAPI(newLang, initContext.sessionId);
  };

  // Cart operations
  const handleAddToCart = (dish: Dish) => {
    setCart(prev => {
      const existing = prev.find(it => it.dish.id === dish.id);
      if (existing) {
        return prev.map(it =>
          it.dish.id === dish.id ? { ...it, quantity: it.quantity + 1 } : it
        );
      }
      return [...prev, { id: 'cart-' + Date.now() + '-' + Math.random(), dish, quantity: 1 }];
    });
    showToast(`${dish.name[lang]} savatga qo'shildi`);
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    setCart(prev =>
      prev
        .map(it => {
          if (it.id === id) {
            const nextQty = it.quantity + delta;
            return nextQty > 0 ? { ...it, quantity: nextQty } : null;
          }
          return it;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveItem = (id: string) => {
    setCart(prev => prev.filter(it => it.id !== id));
  };

  const handleUpdateItemComment = (id: string, comment: string) => {
    setCart(prev =>
      prev.map(it => (it.id === id ? { ...it, comment } : it))
    );
  };

  const handleAddCrossSell = (dish: Dish) => {
    handleAddToCart(dish);
  };

  const handleUpdateCartQuantityByDishId = (dishId: string, delta: number) => {
    setCart(prev => {
      const existing = prev.find(it => it.dish.id === dishId);
      if (!existing) return prev;
      const nextQty = existing.quantity + delta;
      if (nextQty <= 0) {
        return prev.filter(it => it.dish.id !== dishId);
      }
      return prev.map(it => (it.dish.id === dishId ? { ...it, quantity: nextQty } : it));
    });
  };

  // Submit Order from Cart
  const handleSubmitOrder = async () => {
    if (cart.length === 0) return;

    const subtotal = cart.reduce((s, it) => s + it.dish.price * it.quantity, 0);
    const serviceFee = Math.round(subtotal * 0.1);
    const total = subtotal + serviceFee;

    const newOrder: Order = {
      id: `#0${orders.length + 48}`,
      tableNumber,
      items: [...cart],
      status: 'new',
      subtotal,
      serviceFee,
      total,
      createdAt: new Date(),
      estimatedMinutes: 15,
      customerNote: orderNote.trim() || undefined,
      paymentStatus: 'unpaid'
    };

    // Try submitting directly to Django backend
    try {
      const resp = await submitOrderAPI({
        sessionId: initContext.sessionId,
        tableId: initContext.tableId,
        note: orderNote.trim(),
        csrfToken: initContext.csrfToken,
        items: cart.map(it => ({
          dishId: it.dish.id,
          qty: it.quantity,
          note: it.comment
        }))
      });
      if (resp?.order_id) {
        newOrder.id = `#${resp.order_id}`;
      }
    } catch (e) {
      console.warn('Backend order submission fallback:', e);
    }

    setOrders(prev => [newOrder, ...prev]);
    setActiveCustomerOrder(newOrder);
    setCart([]);
    setOrderNote('');
    setIsCartOpen(false);
    setIsOrderStatusOpen(true);

    // Update table status
    setTables(prev =>
      prev.map(tbl =>
        tbl.number === tableNumber
          ? { ...tbl, status: 'waiting', currentOrderId: newOrder.id }
          : tbl
      )
    );

    showToast(`Buyurtma qabul qilindi! Stol №${tableNumber}`);
  };

  // Call Waiter
  const handleCallWaiter = (callType: 'waiter' | 'bill' | 'water' = 'waiter') => {
    callWaiterAPI(initContext.tableId, initContext.sessionId, callType).catch(err => {
      console.warn('Call waiter API warning:', err);
    });

    setTables(prev =>
      prev.map(tbl =>
        tbl.number === tableNumber ? { ...tbl, callAlert: true } : tbl
      )
    );
    showToast(
      callType === 'bill'
        ? "Hisob so'raldi, ofitsiant yaqinlashmoqda"
        : callType === 'water'
        ? "Suv so'raldi, ofitsiant olib kelmoqda"
        : "Ofitsiant chaqirildi, 1 daqiqada stolingizda bo'ladi"
    );
  };

  // Pay Order
  const handlePayOrder = (method: 'payme' | 'click' | 'uzum' | 'cash', tip: number) => {
    if (!activeCustomerOrder) return;
    const updatedOrder: Order = {
      ...activeCustomerOrder,
      paymentStatus: 'paid'
    };

    setActiveCustomerOrder(updatedOrder);
    setOrders(prev =>
      prev.map(o => (o.id === updatedOrder.id ? updatedOrder : o))
    );
    showToast(`${method.toUpperCase()} orqali to'lov qabul qilindi!`);
  };

  const handleSubmitReview = (rating: number, comment: string) => {
    showToast(`Fikringiz uchun rahmat! (${rating} yulduz)`);
  };

  // Waiter & KDS status updates
  const handleUpdateOrderStatus = (orderId: string, newStatus: any) => {
    setOrders(prev =>
      prev.map(o => (o.id === orderId ? { ...o, status: newStatus } : o))
    );

    // Keep activeCustomerOrder in sync if matches
    if (activeCustomerOrder && activeCustomerOrder.id === orderId) {
      setActiveCustomerOrder(prev => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  const handleUpdateTableStatus = (tblNum: number, status: any) => {
    setTables(prev =>
      prev.map(tbl => (tbl.number === tblNum ? { ...tbl, status, callAlert: false } : tbl))
    );
  };

  // Admin dish controls
  const handleToggleDish3D = (dishId: string) => {
    setDishes(prev =>
      prev.map(d => (d.id === dishId ? { ...d, has3d: !d.has3d } : d))
    );
  };

  const handleUpdateDishPrice = (dishId: string, newPrice: number) => {
    setDishes(prev =>
      prev.map(d => (d.id === dishId ? { ...d, price: newPrice } : d))
    );
  };

  return (
    <div className="relative min-h-screen bg-[var(--bg)] text-[var(--text)] selection:bg-[#C75B39]/20 selection:text-[#C75B39]">
      {/* 0. TOP VIEWPORT DEVICE SWITCHER TOOLBAR — Only visible in demo/preview mode on large screens */}
      {isPreviewMode && (
        <header className="bg-[#1C1815] text-[#F5F1EA] border-b border-[#332C26] px-4 py-2 sticky top-0 z-50 shadow-md">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#A89E92] hidden sm:inline">
                Ekran rejimi (Dasturchi / Preview):
              </span>
              <div className="flex bg-[#14110E] p-1 rounded-xl border border-[#332C26] gap-1 shadow-inner">
                <button
                  onClick={() => setDeviceMode('desktop')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    deviceMode === 'desktop'
                      ? 'bg-[#C75B39] text-white shadow-xs'
                      : 'text-[#A89E92] hover:text-white'
                  }`}
                  title="Desktop — Katta ekran"
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Desktop</span>
                </button>

                <button
                  onClick={() => setDeviceMode('tablet')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    deviceMode === 'tablet'
                      ? 'bg-[#1B4B73] text-white shadow-xs'
                      : 'text-[#A89E92] hover:text-white'
                  }`}
                  title="Planshet — iPad / Tablet (820px)"
                >
                  <Tablet className="w-3.5 h-3.5" />
                  <span>Planshet</span>
                </button>

                <button
                  onClick={() => setDeviceMode('mobile')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    deviceMode === 'mobile'
                      ? 'bg-[#16A34A] text-white shadow-xs'
                      : 'text-[#A89E92] hover:text-white'
                  }`}
                  title="Telefon — Smartfon (Mobil menyu)"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Telefon</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-[#A89E92]">
              <span className="hidden md:inline font-medium">Restoran:</span>
              <strong className="text-[#F5F1EA]">{restaurantName}</strong>
              <span className="px-2 py-0.5 rounded-full bg-[#16A34A]/20 text-[#16A34A] text-[11px] font-bold border border-[#16A34A]/30">
                Stol #{tableNumber}
              </span>
            </div>
          </div>
        </header>
      )}

      {/* Dynamic View based on Role */}
      {currentRole === 'customer' && (
        <CustomerMenu
          dishes={dishes}
          dynamicCategories={dynamicCategories}
          restaurantName={restaurantName}
          deviceMode={deviceMode}
          lang={lang}
          currency={currency}
          tableNumber={tableNumber}
          theme={theme}
          currentRole={currentRole}
          cartItems={cart}
          activeOrder={activeCustomerOrder}
          isAccessibleMode={isAccessibleMode}
          onSelectLanguage={handleSelectLanguage}
          onSelectCurrency={setCurrency}
          onToggleTheme={handleToggleTheme}
          onToggleAccessibleMode={() => setIsAccessibleMode(prev => !prev)}
          onSwitchRole={setCurrentRole}
          onOpenAR={setActiveArDish}
          onAddToCart={handleAddToCart}
          onUpdateCartQuantity={handleUpdateCartQuantityByDishId}
          onOpenCart={() => setIsCartOpen(true)}
          onOpenAIChat={() => setIsAIChatOpen(true)}
          onCallWaiter={handleCallWaiter}
          onOpenOrderStatus={() => setIsOrderStatusOpen(true)}
          onOpenTouristGuide={() => setIsTouristGuideOpen(true)}
        />
      )}

      {currentRole === 'waiter' && (
        <WaiterView
          orders={orders}
          tables={tables}
          lang={lang}
          onSwitchRole={setCurrentRole}
          onUpdateOrderStatus={handleUpdateOrderStatus}
          onUpdateTableStatus={handleUpdateTableStatus}
        />
      )}

      {currentRole === 'kds' && (
        <KDSView
          orders={orders}
          lang={lang}
          onSwitchRole={setCurrentRole}
          onUpdateOrderStatus={handleUpdateOrderStatus}
        />
      )}

      {currentRole === 'admin' && (
        <AdminView
          dishes={dishes}
          orders={orders}
          tables={tables}
          lang={lang}
          onSwitchRole={setCurrentRole}
          onToggleDish3D={handleToggleDish3D}
          onUpdateDishPrice={handleUpdateDishPrice}
        />
      )}

      {/* Global AR/3D Interactive Viewer Modal */}
      <ARViewerModal
        isOpen={!!activeArDish}
        dish={activeArDish}
        lang={lang}
        currency={currency}
        onClose={() => setActiveArDish(null)}
        onAddToCart={dish => {
          handleAddToCart(dish);
        }}
      />

      {/* Cart Bottom Sheet */}
      <CartModal
        isOpen={isCartOpen}
        items={cart}
        lang={lang}
        currency={currency}
        orderNote={orderNote}
        onClose={() => setIsCartOpen(false)}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onUpdateComment={handleUpdateItemComment}
        onSetOrderNote={setOrderNote}
        onAddCrossSell={handleAddCrossSell}
        onSubmitOrder={handleSubmitOrder}
      />

      {/* AI Sommelier / Waiter Dialog */}
      <AIChatModal
        isOpen={isAIChatOpen}
        lang={lang}
        dishes={dishes}
        onClose={() => setIsAIChatOpen(false)}
        onOpenAR={dish => setActiveArDish(dish)}
        onAddToCart={dish => handleAddToCart(dish)}
      />

      {/* Active Order Status Tracker & Payment Receipt */}
      {activeCustomerOrder && (
        <OrderStatusModal
          order={activeCustomerOrder}
          lang={lang}
          currency={currency}
          onClose={() => setIsOrderStatusOpen(false)}
          onOrderMore={() => {
            setIsOrderStatusOpen(false);
          }}
          onCallWaiter={handleCallWaiter}
          onPayOrder={handlePayOrder}
          onSubmitReview={handleSubmitReview}
        />
      )}

      {/* Silk Road Cultural & Tourist Guide Modal */}
      <TouristGuideModal
        isOpen={isTouristGuideOpen}
        lang={lang}
        currency={currency}
        onClose={() => setIsTouristGuideOpen(false)}
        onSelectCurrency={setCurrency}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-60 px-4 py-2.5 rounded-xl bg-[#1C1815] text-[#F5F1EA] text-xs font-semibold border border-[#C75B39]/50 shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
