import React, { useState, useMemo } from 'react';
import {
  HeaderNav,
  TableBadge,
  QuantityStepper,
  OrderSummary,
  BottomNav,
  Toast,
} from '../../components/ui';
import { useNavigation } from '../../context/NavigationContext';
import './CartPage.css';

interface CartItem {
  product_id: number;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  image?: string;
  unit?: string;
}

interface InitialCartData {
  shop?: { name: string };
  table?: { number: string | number; hall?: string };
  items?: CartItem[];
  cartCount?: number;
  totalAmount?: number;
}

const DEFAULT_CART_ITEMS: CartItem[] = [
  {
    product_id: 101,
    name: "To'y Oshi (Devzira Palov)",
    price: 48000,
    quantity: 2,
    subtotal: 96000,
    image: "/media/dish/plov.jpg",
    unit: "porsiya",
  },
  {
    product_id: 104,
    name: "Tandir Somsa (Go'shtli)",
    price: 15000,
    quantity: 4,
    subtotal: 60000,
    image: "/media/dish/somsa.jpg",
    unit: "dona",
  },
];

export const CartPage: React.FC = () => {
  const { navigate } = useNavigation();
  const initialData: InitialCartData = (window as any).__GULISTON_CART_DATA__ || {};

  const shopName = initialData.shop?.name || 'Guliston';
  const table = initialData.table;
  const initialItems =
    initialData.items && initialData.items.length > 0
      ? initialData.items
      : DEFAULT_CART_ITEMS;

  const [items, setItems] = useState<CartItem[]>(initialItems);
  const [customerNote, setCustomerNote] = useState('');

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

  const handleUpdateQuantity = (productId: number, newQty: number) => {
    setItems((prev) => {
      if (newQty <= 0) {
        syncCartWithBackend(productId, 'delete');
        showToast("Taom savatdan olib tashlandi");
        return prev.filter((item) => item.product_id !== productId);
      }

      const existing = prev.find((item) => item.product_id === productId);
      const delta = existing ? newQty - existing.quantity : 1;

      if (delta > 0) syncCartWithBackend(productId, 'add', delta);
      else if (delta < 0) syncCartWithBackend(productId, 'remove', Math.abs(delta));

      return prev.map((item) => {
        if (item.product_id === productId) {
          return {
            ...item,
            quantity: newQty,
            subtotal: item.price * newQty,
          };
        }
        return item;
      });
    });
  };

  const handleRemoveItem = (productId: number, name: string) => {
    setItems((prev) => prev.filter((item) => item.product_id !== productId));
    syncCartWithBackend(productId, 'delete');
    showToast(`${name} savatdan olib tashlandi`);
  };

  const totalCartCount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [items]);

  const fmt = (num: number) => new Intl.NumberFormat('uz-UZ').format(num);

  return (
    <div className="cart-app-container">
      {/* Toast Notification */}
      <Toast message={toastMsg} icon={toastIcon} visible={toastVisible} />

      {/* Header Nav */}
      <HeaderNav
        brandName={shopName}
        tableNumber={table?.number}
        cartCount={totalCartCount}
        onCartClick={() => {}}
      />

      <main className="cart-main-content">
        {/* Top bar with Back button and Table Badge */}
        <div className="cart-top-bar">
          <a href="/menu/" className="btn-back-to-menu">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>Menyuga qaytish</span>
          </a>

          {table?.number && (
            <TableBadge
              tableNumber={table.number}
              hallName={table.hall || "Asosiy Zal"}
              status="available"
            />
          )}
        </div>

        {items.length > 0 ? (
          <>
            {/* Title & Counter */}
            <div className="cart-title-section">
              <h1 className="cart-title-main">Savatchangiz</h1>
              <span className="cart-items-count-badge tabular-nums">{totalCartCount} ta taom</span>
            </div>

            {/* List of Cart Items */}
            <div className="cart-items-list">
              {items.map((item) => (
                <div key={item.product_id} className="cart-item-card">
                  <div className="cart-item-media">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="cart-item-img"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="cart-item-placeholder" aria-hidden="true">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                          <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                          <line x1="6" y1="1" x2="6" y2="4" />
                          <line x1="10" y1="1" x2="10" y2="4" />
                          <line x1="14" y1="1" x2="14" y2="4" />
                        </svg>
                      </div>
                    )}
                  </div>

                  <div className="cart-item-details">
                    <h3 className="cart-item-name">{item.name}</h3>
                    <p className="cart-item-unit-price tabular-nums">
                      {fmt(item.price)} so'm {item.unit ? `/ ${item.unit}` : ''}
                    </p>
                    <span className="cart-item-total-price tabular-nums">
                      {fmt(item.price * item.quantity)} so'm
                    </span>
                  </div>

                  <div className="cart-item-actions">
                    <QuantityStepper
                      value={item.quantity}
                      min={1}
                      onChange={(newVal) => handleUpdateQuantity(item.product_id, newVal)}
                      size="sm"
                    />

                    <button
                      type="button"
                      className="btn-remove-item"
                      onClick={() => handleRemoveItem(item.product_id, item.name)}
                      title="O'chirish"
                      aria-label={`${item.name}ni o'chirish`}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Special Instructions */}
            <div className="cart-note-box">
              <h4 className="cart-note-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
                <span>Oshxona uchun maxsus istak yoki eslatma:</span>
              </h4>
              <textarea
                className="cart-note-input"
                placeholder="Masalan: Sho'rvasini kamroq yog'li qiling, ko'katlarsiz, issiqroq keltiring..."
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
              />
            </div>

            {/* Order Summary & Checkout Button */}
            <OrderSummary
              subtotal={subtotal}
              servicePercent={10}
              onCheckout={() => {
                if (customerNote) {
                  sessionStorage.setItem('order_note', customerNote);
                }
                navigate('/checkout');
              }}
              checkoutButtonText="Buyurtmani rasmiylashtirish"
            />
          </>
        ) : (
          /* Empty Cart State */
          <div className="empty-cart-card">
            <div className="empty-cart-icon-circle" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8" cy="21" r="1" />
                <circle cx="19" cy="21" r="1" />
                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
              </svg>
            </div>
            <h2 className="empty-cart-heading">Savatingiz hozircha bo'sh</h2>
            <p className="empty-cart-desc">
              Dasturxonimizdagi sara va milliy taomlarni tanlab, buyurtma berishingiz mumkin.
            </p>
            <button type="button" onClick={() => navigate('/menu')} className="btn-go-menu-primary">
              <span>Menyudan taom tanlash</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav
        activeTab="cart"
        cartCount={totalCartCount}
        onTabChange={(tab) => {
          if (tab === 'home') navigate('/');
          else if (tab === 'menu') navigate('/menu/');
          else if (tab === 'ar') navigate('/ar/');
          else if (tab === 'cart') navigate('/cart/');
          else if (tab === 'orders') navigate('/orders/');
        }}
      />
    </div>
  );
};
