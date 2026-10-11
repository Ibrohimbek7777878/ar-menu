import React, { createContext, useState, useEffect, useMemo, useCallback } from 'react';

export interface OrderItem {
  id: number | string;
  name: string;
  quantity: number;
  price: number;
  unit?: string;
  course?: '1-taom' | '2-taom' | 'salat' | 'ichimlik' | 'shirinlik';
  notes?: string;
  done?: boolean;
}

export interface LiveOrder {
  id: number | string;
  order_number: string;
  table_number: string | number;
  table_name: string;
  customer_name: string;
  customer_phone?: string;
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'paid';
  created_at: string;
  notes?: string;
  items: OrderItem[];
  total_amount: number;
}

export interface LiveTable {
  id: number | string;
  number: string | number;
  hall: string;
  status: 'free' | 'occupied' | 'bill_requested' | 'reserved';
  capacity: number;
  guests_count: number;
  total_bill: number;
  active_orders_count: number;
}

export interface LiveServiceCall {
  id: number;
  table_number: string | number;
  hall_name: string;
  type: 'waiter' | 'bill' | 'tea' | 'bread' | 'dish_ready';
  title: string;
  time: string;
  status: 'pending' | 'accepted' | 'done';
}

export interface NavigationContextType {
  // Navigation & Routing
  currentPath: string;
  navigate: (path: string) => void;

  // Table & Guest Session
  tableNumber: string | number;
  setTableNumber: (table: string | number) => void;

  // Cart
  cart: Record<number, number>;
  cartCount: number;
  addToCart: (productId: number, qty?: number) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, delta: number) => void;
  clearCart: () => void;

  // Real-time Orders (Shared between Guest, Waiter, KDS, Admin)
  orders: LiveOrder[];
  createOrder: (orderData: {
    tableNumber: string | number;
    customerName: string;
    phone?: string;
    notes?: string;
    items: OrderItem[];
    totalAmount: number;
  }) => LiveOrder;
  updateOrderStatus: (orderId: number | string, status: LiveOrder['status']) => void;
  toggleOrderItemDone: (orderId: number | string, itemId: number | string) => void;

  // Real-time Tables (Shared between Waiter, Admin, Hostess)
  tables: LiveTable[];
  addDishToTable: (tableNumber: string | number, dish: { name: string; price: number }) => void;
  settleTableBill: (tableNumber: string | number) => void;

  // Service Calls (Guest -> Waiter & KDS -> Waiter)
  serviceCalls: LiveServiceCall[];
  createServiceCall: (call: {
    table_number: string | number;
    hall_name?: string;
    type: LiveServiceCall['type'];
    title: string;
  }) => void;
  acceptServiceCall: (callId: number) => void;
  completeServiceCall: (callId: number) => void;

  // Financial & Inventory
  todayRevenue: number;
  stopList: number[];
  toggleStopList: (productId: number) => void;

  // Reusable Modals
  isCallWaiterOpen: boolean;
  setIsCallWaiterOpen: (open: boolean) => void;
  isNfcModalOpen: boolean;
  setIsNfcModalOpen: (open: boolean) => void;
}

export const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

// Web Audio API beeper
function playNotificationSound(type: 'order' | 'call' | 'ready' = 'order') {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === 'ready') {
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
    } else if (type === 'call') {
      osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12); // E5
    } else {
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.15); // G5
    }

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {}
}

const DEFAULT_TABLES: LiveTable[] = [
  { id: 1, number: '01', hall: 'Asosiy Zal', status: 'occupied', capacity: 4, guests_count: 2, total_bill: 75000, active_orders_count: 1 },
  { id: 2, number: '02', hall: 'Asosiy Zal', status: 'free', capacity: 4, guests_count: 0, total_bill: 0, active_orders_count: 0 },
  { id: 3, number: '03', hall: 'Asosiy Zal', status: 'free', capacity: 6, guests_count: 0, total_bill: 0, active_orders_count: 0 },
  { id: 4, number: '04', hall: 'Asosiy Zal', status: 'occupied', capacity: 4, guests_count: 4, total_bill: 245000, active_orders_count: 1 },
  { id: 5, number: '05', hall: 'Asosiy Zal', status: 'occupied', capacity: 4, guests_count: 3, total_bill: 156000, active_orders_count: 1 },
  { id: 6, number: '06', hall: 'Asosiy Zal', status: 'free', capacity: 6, guests_count: 0, total_bill: 0, active_orders_count: 0 },
  { id: 7, number: '07', hall: 'Asosiy Zal', status: 'bill_requested', capacity: 4, guests_count: 2, total_bill: 110000, active_orders_count: 1 },
  { id: 8, number: '08', hall: 'Asosiy Zal', status: 'free', capacity: 4, guests_count: 0, total_bill: 0, active_orders_count: 0 },
  { id: 9, number: 'VIP-1', hall: 'VIP Xona', status: 'occupied', capacity: 8, guests_count: 6, total_bill: 420000, active_orders_count: 2 },
  { id: 10, number: 'VIP-2', hall: 'VIP Xona', status: 'reserved', capacity: 10, guests_count: 0, total_bill: 0, active_orders_count: 0 },
  { id: 11, number: 'VIP-3', hall: 'VIP Xona', status: 'free', capacity: 8, guests_count: 0, total_bill: 0, active_orders_count: 0 },
  { id: 12, number: 'VIP-4', hall: 'VIP Xona', status: 'free', capacity: 12, guests_count: 0, total_bill: 0, active_orders_count: 0 },
  { id: 13, number: 'Y-1', hall: 'Terassa', status: 'free', capacity: 4, guests_count: 0, total_bill: 0, active_orders_count: 0 },
  { id: 14, number: 'Y-2', hall: 'Terassa', status: 'occupied', capacity: 4, guests_count: 2, total_bill: 88000, active_orders_count: 1 },
  { id: 15, number: 'Y-3', hall: 'Terassa', status: 'free', capacity: 6, guests_count: 0, total_bill: 0, active_orders_count: 0 },
  { id: 16, number: 'Y-4', hall: 'Terassa', status: 'free', capacity: 6, guests_count: 0, total_bill: 0, active_orders_count: 0 },
];

const DEFAULT_ORDERS: LiveOrder[] = [
  {
    id: 101,
    order_number: '#101',
    table_number: '05',
    table_name: 'Stol 05 (Asosiy Zal)',
    customer_name: 'Rustam aka',
    customer_phone: '+998 90 123 45 67',
    status: 'preparing',
    created_at: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
    notes: 'Oshga achchiq murch solinmasin, piyoz alohida.',
    total_amount: 156000,
    items: [
      { id: 1, name: 'To\'y Oshi (Maxsus devzira)', quantity: 2, price: 48000, unit: 'porsiya', course: '2-taom' },
      { id: 2, name: 'Qo\'y Go\'shti Shashlik', quantity: 4, price: 28000, unit: 'six', course: '2-taom' },
      { id: 3, name: 'Tandir Non (Issiq)', quantity: 2, price: 5000, unit: 'dona', course: '2-taom' },
      { id: 4, name: 'Achchiq-chuchuk Salati', quantity: 1, price: 15000, unit: 'porsiya', course: 'salat' },
      { id: 5, name: 'Ko\'k Choy (Limon bilan)', quantity: 1, price: 10000, unit: 'choynak', course: 'ichimlik' },
    ],
  },
  {
    id: 102,
    order_number: '#102',
    table_number: 'VIP-1',
    table_name: 'VIP Xona 1',
    customer_name: 'Dilshod aka',
    customer_phone: '+998 93 456 78 90',
    status: 'pending',
    created_at: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    notes: 'Mehmonlar kutmoqda, choy va somsa darhol berilsin.',
    total_amount: 420000,
    items: [
      { id: 6, name: 'Qozon Kabob (Qovurilgan go\'sht)', quantity: 3, price: 65000, unit: 'porsiya', course: '2-taom' },
      { id: 7, name: 'Mastava Sho\'rva', quantity: 2, price: 35000, unit: 'kosa', course: '1-taom' },
      { id: 8, name: 'Tandir Somsa Go\'shtli', quantity: 6, price: 15000, unit: 'dona', course: '2-taom' },
      { id: 9, name: 'Suzma ko\'katlar bilan', quantity: 1, price: 15000, unit: 'likop', course: 'salat' },
      { id: 10, name: 'Ko\'k Choy Zafaronli', quantity: 2, price: 25000, unit: 'choynak', course: 'ichimlik' },
    ],
  },
  {
    id: 103,
    order_number: '#103',
    table_number: 'Y-2',
    table_name: 'Terassa Y-2',
    customer_name: 'Aziza opa',
    customer_phone: '+998 97 789 01 23',
    status: 'ready',
    created_at: new Date(Date.now() - 21 * 60 * 1000).toISOString(),
    notes: 'Olib borishga tayyor.',
    total_amount: 88000,
    items: [
      { id: 11, name: 'Qo\'y Go\'shti Shashlik', quantity: 2, price: 28000, unit: 'six', course: '2-taom' },
      { id: 12, name: 'Tandir Somsa Go\'shtli', quantity: 2, price: 15000, unit: 'dona', course: '2-taom' },
      { id: 13, name: 'Qora Choy (Qand bilan)', quantity: 1, price: 8000, unit: 'choynak', course: 'ichimlik' },
    ],
  },
];

const DEFAULT_SERVICE_CALLS: LiveServiceCall[] = [
  {
    id: 1,
    table_number: '05',
    hall_name: 'Asosiy Zal',
    type: 'tea',
    title: 'Ko\'k choyni yangilash so\'raldi',
    time: '2 daqiqa oldin',
    status: 'pending',
  },
  {
    id: 2,
    table_number: '07',
    hall_name: 'Asosiy Zal',
    type: 'bill',
    title: 'Hisob-kitob (chek) olib kelinsin',
    time: '4 daqiqa oldin',
    status: 'pending',
  },
  {
    id: 3,
    table_number: 'Y-2',
    hall_name: 'Terassa',
    type: 'dish_ready',
    title: 'Oshxonadan taom tayyor: 2x Shashlik, Somsa',
    time: 'Hozir',
    status: 'pending',
  },
];

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
    return { 101: 2, 104: 4 };
  });

  // Real-time Orders
  const [orders, setOrders] = useState<LiveOrder[]>(() => {
    try {
      const saved = localStorage.getItem('guliston_orders');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_ORDERS;
  });

  // Real-time Tables
  const [tables, setTables] = useState<LiveTable[]>(() => {
    try {
      const saved = localStorage.getItem('guliston_tables');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_TABLES;
  });

  // Real-time Service Calls
  const [serviceCalls, setServiceCalls] = useState<LiveServiceCall[]>(() => {
    try {
      const saved = localStorage.getItem('guliston_service_calls');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_SERVICE_CALLS;
  });

  // Today Revenue
  const [todayRevenue, setTodayRevenue] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('guliston_today_revenue');
      if (saved) return Number(saved);
    } catch {}
    return 3480000;
  });

  // Stop List (Unavailable products)
  const [stopList, setStopList] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('guliston_stop_list');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Modals
  const [isCallWaiterOpen, setIsCallWaiterOpen] = useState(false);
  const [isNfcModalOpen, setIsNfcModalOpen] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('guliston_cart_items', JSON.stringify(cart));
    } catch {}
  }, [cart]);

  useEffect(() => {
    try {
      if (tableNumber) localStorage.setItem('guliston_table_num', String(tableNumber));
    } catch {}
  }, [tableNumber]);

  useEffect(() => {
    try {
      localStorage.setItem('guliston_orders', JSON.stringify(orders));
    } catch {}
  }, [orders]);

  useEffect(() => {
    try {
      localStorage.setItem('guliston_tables', JSON.stringify(tables));
    } catch {}
  }, [tables]);

  useEffect(() => {
    try {
      localStorage.setItem('guliston_service_calls', JSON.stringify(serviceCalls));
    } catch {}
  }, [serviceCalls]);

  useEffect(() => {
    try {
      localStorage.setItem('guliston_today_revenue', String(todayRevenue));
    } catch {}
  }, [todayRevenue]);

  useEffect(() => {
    try {
      localStorage.setItem('guliston_stop_list', JSON.stringify(stopList));
    } catch {}
  }, [stopList]);

  // Handle browser Back / Forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((path: string) => {
    if (path === currentPath) return;
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPath]);

  // Cart operations
  const addToCart = useCallback((productId: number, qty = 1) => {
    setCart((prev) => {
      const current = prev[productId] || 0;
      return { ...prev, [productId]: current + qty };
    });
  }, []);

  const removeFromCart = useCallback((productId: number) => {
    setCart((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  }, []);

  const updateQuantity = useCallback((productId: number, delta: number) => {
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
  }, []);

  const clearCart = useCallback(() => setCart({}), []);

  const cartCount = useMemo(() => {
    return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  }, [cart]);

  // Order Operations
  const createOrder = useCallback(
    (orderData: {
      tableNumber: string | number;
      customerName: string;
      phone?: string;
      notes?: string;
      items: OrderItem[];
      totalAmount: number;
    }): LiveOrder => {
      const newOrderNum = `#${Math.floor(100 + Math.random() * 900)}`;
      const newOrder: LiveOrder = {
        id: Date.now(),
        order_number: newOrderNum,
        table_number: orderData.tableNumber,
        table_name: `Stol ${orderData.tableNumber}`,
        customer_name: orderData.customerName || 'Hurmatli Mehmon',
        customer_phone: orderData.phone || '+998 90 000 00 00',
        status: 'pending',
        created_at: new Date().toISOString(),
        notes: orderData.notes,
        items: orderData.items,
        total_amount: orderData.totalAmount,
      };

      // Add to orders
      setOrders((prev) => [newOrder, ...prev]);

      // Update table status to occupied
      setTables((prev) =>
        prev.map((t) =>
          String(t.number) === String(orderData.tableNumber)
            ? {
                ...t,
                status: 'occupied',
                total_bill: t.total_bill + orderData.totalAmount,
                active_orders_count: t.active_orders_count + 1,
              }
            : t
        )
      );

      // Play chime
      playNotificationSound('order');

      // Clear current user cart
      setCart({});

      return newOrder;
    },
    []
  );

  const updateOrderStatus = useCallback(
    (orderId: number | string, status: LiveOrder['status']) => {
      let changedOrder: LiveOrder | undefined;

      setOrders((prev) =>
        prev.map((o) => {
          if (o.id === orderId) {
            changedOrder = { ...o, status };
            return changedOrder;
          }
          return o;
        })
      );

      // If status changed to ready, alert waiter automatically
      if (status === 'ready' && changedOrder) {
        playNotificationSound('ready');
        const dishSummary = changedOrder.items.map((it) => `${it.quantity}x ${it.name}`).slice(0, 2).join(', ');
        const newCall: LiveServiceCall = {
          id: Date.now(),
          table_number: changedOrder.table_number,
          hall_name: 'Zal',
          type: 'dish_ready',
          title: `Oshxonadan taom tayyor: ${dishSummary}`,
          time: 'Hozir',
          status: 'pending',
        };
        setServiceCalls((prev) => [newCall, ...prev]);
      }
    },
    []
  );

  const toggleOrderItemDone = useCallback(
    (orderId: number | string, itemId: number | string) => {
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id === orderId) {
            const updatedItems = o.items.map((it) =>
              it.id === itemId ? { ...it, done: !it.done } : it
            );
            return { ...o, items: updatedItems };
          }
          return o;
        })
      );
    },
    []
  );

  // Table Operations
  const addDishToTable = useCallback(
    (tableNum: string | number, dish: { name: string; price: number }) => {
      setTables((prev) =>
        prev.map((t) =>
          String(t.number) === String(tableNum)
            ? {
                ...t,
                status: 'occupied',
                total_bill: t.total_bill + dish.price,
                active_orders_count: Math.max(1, t.active_orders_count),
              }
            : t
        )
      );

      // Also create/append into live orders for KDS
      setOrders((prev) => {
        const existing = prev.find((o) => String(o.table_number) === String(tableNum) && o.status !== 'paid');
        if (existing) {
          const updatedItems = [
            ...existing.items,
            {
              id: Date.now(),
              name: dish.name,
              quantity: 1,
              price: dish.price,
              unit: 'porsiya',
              course: '2-taom' as const,
            },
          ];
          return prev.map((o) =>
            o.id === existing.id
              ? { ...o, items: updatedItems, total_amount: o.total_amount + dish.price }
              : o
          );
        } else {
          const newOrder: LiveOrder = {
            id: Date.now(),
            order_number: `#${Math.floor(100 + Math.random() * 900)}`,
            table_number: tableNum,
            table_name: `Stol ${tableNum}`,
            customer_name: 'Ofitsiant buyurtmasi',
            status: 'preparing',
            created_at: new Date().toISOString(),
            total_amount: dish.price,
            items: [
              {
                id: Date.now(),
                name: dish.name,
                quantity: 1,
                price: dish.price,
                unit: 'porsiya',
                course: '2-taom' as const,
              },
            ],
          };
          return [newOrder, ...prev];
        }
      });
    },
    []
  );

  const settleTableBill = useCallback((tableNum: string | number) => {
    let billSum = 0;
    setTables((prev) =>
      prev.map((t) => {
        if (String(t.number) === String(tableNum)) {
          billSum = t.total_bill;
          return {
            ...t,
            status: 'free',
            total_bill: 0,
            guests_count: 0,
            active_orders_count: 0,
          };
        }
        return t;
      })
    );

    // Mark orders as paid
    setOrders((prev) =>
      prev.map((o) =>
        String(o.table_number) === String(tableNum) && o.status !== 'paid'
          ? { ...o, status: 'paid' }
          : o
      )
    );

    // Remove pending service calls for this table
    setServiceCalls((prev) => prev.filter((c) => String(c.table_number) !== String(tableNum)));

    // Increase today's revenue
    if (billSum > 0) {
      setTodayRevenue((prev) => prev + billSum);
    }
  }, []);

  // Service Call Operations
  const createServiceCall = useCallback(
    (call: {
      table_number: string | number;
      hall_name?: string;
      type: LiveServiceCall['type'];
      title: string;
    }) => {
      const newCall: LiveServiceCall = {
        id: Date.now(),
        table_number: call.table_number,
        hall_name: call.hall_name || 'Asosiy Zal',
        type: call.type,
        title: call.title,
        time: 'Hozir',
        status: 'pending',
      };

      setServiceCalls((prev) => [newCall, ...prev]);

      // If bill requested, mark table status
      if (call.type === 'bill') {
        setTables((prev) =>
          prev.map((t) =>
            String(t.number) === String(call.table_number) ? { ...t, status: 'bill_requested' } : t
          )
        );
      }

      playNotificationSound('call');
    },
    []
  );

  const acceptServiceCall = useCallback((callId: number) => {
    setServiceCalls((prev) =>
      prev.map((c) => (c.id === callId ? { ...c, status: 'accepted' } : c))
    );
  }, []);

  const completeServiceCall = useCallback((callId: number) => {
    setServiceCalls((prev) => prev.filter((c) => c.id !== callId));
  }, []);

  const toggleStopList = useCallback((productId: number) => {
    setStopList((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  }, []);

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

        orders,
        createOrder,
        updateOrderStatus,
        toggleOrderItemDone,

        tables,
        addDishToTable,
        settleTableBill,

        serviceCalls,
        createServiceCall,
        acceptServiceCall,
        completeServiceCall,

        todayRevenue,
        stopList,
        toggleStopList,

        isCallWaiterOpen,
        setIsCallWaiterOpen,
        isNfcModalOpen,
        setIsNfcModalOpen,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export { useNavigation } from './useNavigation';
