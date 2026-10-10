import React, { createContext, useState, useEffect, useMemo } from 'react';

export interface NavigationContextType {
  currentPath: string;
  navigate: (path: string) => void;
  tableNumber: string | number;
  setTableNumber: (table: string | number) => void;
  cart: Record<number, number>;
  cartCount: number;
  addToCart: (productId: number, qty?: number) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, delta: number) => void;
  clearCart: () => void;
}

export const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  const [tableNumber, setTableNumber] = useState<string | number>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tableFromUrl = urlParams.get('table');
    if (tableFromUrl) return tableFromUrl;
    try {
      return localStorage.getItem('guliston_table_num') || '05';
    } catch {
      return '05';
    }
  });

  // Persistent cart in localStorage
  const [cart, setCart] = useState<Record<number, number>>(() => {
    try {
      const saved = localStorage.getItem('guliston_cart_items');
      if (saved) return JSON.parse(saved);
    } catch {}
    // Initial demo items
    return { 101: 2, 104: 4 };
  });

  // Save cart changes
  useEffect(() => {
    try {
      localStorage.setItem('guliston_cart_items', JSON.stringify(cart));
    } catch {}
  }, [cart]);

  // Save table changes
  useEffect(() => {
    try {
      if (tableNumber) localStorage.setItem('guliston_table_num', String(tableNumber));
    } catch {}
  }, [tableNumber]);

  // Handle browser Back / Forward buttons seamlessly
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    if (path === currentPath) return;
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addToCart = (productId: number, qty = 1) => {
    setCart((prev) => {
      const current = prev[productId] || 0;
      return { ...prev, [productId]: current + qty };
    });
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart((prev) => {
      const current = prev[productId] || 0;
      const nextQty = current + delta;
      if (nextQty <= 0) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return { ...prev, [productId]: nextQty };
    });
  };

  const clearCart = () => setCart({});

  const cartCount = useMemo(() => {
    return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  }, [cart]);

  return (
    <NavigationContext.Provider
      value={{
        currentPath,
        navigate,
        tableNumber,
        setTableNumber,
        cart,
        cartCount,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export { useNavigation } from './useNavigation';
