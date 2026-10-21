import React, { createContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { RestaurantAPI } from '../services/RestaurantAPI';
import { CartSync } from '../services/CartSync';
import { RouteGuard } from '../core/guards/RouteGuard';
import { roleService } from '../core/auth/RoleService';
import { SubdomainService } from '../core/routing/SubdomainService';
import type { UserRole } from '../core/auth/types';

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

export interface FinanceTransaction {
  id: string | number;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  payment_method: 'cash' | 'card';
  source_type: 'receipt' | 'manual' | 'debt_payment';
  reference_id?: string;
  table_number?: string | number;
  order_number?: string;
  customer_name?: string;
  description: string;
  created_at: string;
  is_cancelled?: boolean;
  cancellation_reason?: string;
  cancelled_at?: string;
}

export interface FinanceDebt {
  id: string | number;
  type: 'receivable' | 'payable'; // receivable: bizga berishadi (mijozlar), payable: biz beramiz (ta'minotchilar)
  person_name: string;
  phone?: string;
  description?: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: 'pending' | 'partially_paid' | 'settled';
  created_at: string;
  due_date?: string;
}

export interface NavigationContextType {
  // Navigation & Routing with RBAC Middleware
  currentPath: string;
  navigate: (path: string) => void;
  userRole: UserRole;
  grantStaffRole: (role: UserRole, name?: string) => void;
  revokeStaffRole: () => void;
  loginStaff: (role: UserRole, name?: string) => void;
  logoutStaff: () => void;

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
  updateTableStatus: (tableNumber: string | number, status: LiveTable['status'], guestsCount?: number) => void;
  addDishToTable: (tableNumber: string | number, dish: { name: string; price: number; product_id?: number | null }) => Promise<boolean>;
  settleTableBill: (tableNumber: string | number, paymentMethod?: 'cash' | 'card') => Promise<boolean>;

  // Service Calls (Guest -> Waiter & KDS -> Waiter)
  serviceCalls: LiveServiceCall[];
  createServiceCall: (call: {
    table_number: string | number;
    hall_name?: string;
    type: LiveServiceCall['type'];
    title: string;
  }) => Promise<boolean>;
  acceptServiceCall: (callId: number) => void;
  completeServiceCall: (callId: number) => void;

  // Financial & Inventory
  todayRevenue: number;
  stopList: number[];
  toggleStopList: (productId: number) => void;

  // Sobir Tog'a Moliya Tizimi (Finance System)
  financeTransactions: FinanceTransaction[];
  financeDebts: FinanceDebt[];
  addFinanceTransaction: (tx: Omit<FinanceTransaction, 'id' | 'created_at'>) => void;
  cancelFinanceTransaction: (id: string | number, reason: string) => void;
  addFinanceDebt: (debt: Omit<FinanceDebt, 'id' | 'paid_amount' | 'remaining_amount' | 'status' | 'created_at'>) => void;
  payDebtPartial: (debtId: string | number, payAmount: number, paymentMethod: 'cash' | 'card', notes?: string) => void;

  // Reusable Modals
  isCallWaiterOpen: boolean;
  setIsCallWaiterOpen: (open: boolean) => void;
  isNfcModalOpen: boolean;
  setIsNfcModalOpen: (open: boolean) => void;
  isQrModalOpen: boolean;
  setIsQrModalOpen: (open: boolean) => void;
  isStudioModalOpen: boolean;
  setIsStudioModalOpen: (open: boolean) => void;
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

const DEFAULT_FINANCE_TRANSACTIONS: FinanceTransaction[] = [
  {
    id: 'tx-1',
    type: 'income',
    category: 'Restoran Tushumi (Chek)',
    amount: 1250000,
    payment_method: 'cash',
    source_type: 'receipt',
    table_number: 'VIP-2',
    order_number: '#098',
    customer_name: 'Bekzod aka',
    description: 'Stol VIP-2 yopildi (Chek #098)',
    created_at: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
  },
  {
    id: 'tx-2',
    type: 'income',
    category: 'Restoran Tushumi (Chek)',
    amount: 980000,
    payment_method: 'card',
    source_type: 'receipt',
    table_number: '03',
    order_number: '#099',
    customer_name: 'Shohruh',
    description: 'Stol 03 yopildi (Payme/Click)',
    created_at: new Date(Date.now() - 70 * 60 * 1000).toISOString(),
  },
  {
    id: 'tx-3',
    type: 'expense',
    category: 'Go\'sht & Masalliq',
    amount: 650000,
    payment_method: 'cash',
    source_type: 'manual',
    description: 'Qassob Ilhom akadan 15 kg lahm go\'sht olindi',
    created_at: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
  },
  {
    id: 'tx-4',
    type: 'income',
    category: 'Nasiya Qaytarildi',
    amount: 400000,
    payment_method: 'cash',
    source_type: 'debt_payment',
    customer_name: 'Alisher aka',
    description: 'Alisher aka qisman qarzini qaytardi',
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: 'tx-5',
    type: 'expense',
    category: 'Kommunal & Gaz',
    amount: 220000,
    payment_method: 'card',
    source_type: 'manual',
    description: 'Elektr energiyasi to\'lovi (Click)',
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
];

const DEFAULT_FINANCE_DEBTS: FinanceDebt[] = [
  {
    id: 'debt-1',
    type: 'receivable',
    person_name: 'Alisher aka',
    phone: '+998 90 333 44 55',
    description: 'Tug\'ilgan kun ziyofatidan qolgan qoldiq',
    total_amount: 1000000,
    paid_amount: 400000,
    remaining_amount: 600000,
    status: 'partially_paid',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    due_date: 'Dushanba kuni',
  },
  {
    id: 'debt-2',
    type: 'receivable',
    person_name: 'Bobur (Hokimiyat)',
    phone: '+998 97 111 22 33',
    description: 'Stol 01 tushlik buyurtmasi',
    total_amount: 350000,
    paid_amount: 0,
    remaining_amount: 350000,
    status: 'pending',
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    due_date: 'Ertaga',
  },
  {
    id: 'debt-3',
    type: 'payable',
    person_name: 'Ilhom Qassob (Go\'shtchi)',
    phone: '+998 93 777 88 99',
    description: 'Ertalabki mol go\'shti partiyasi',
    total_amount: 2400000,
    paid_amount: 1000000,
    remaining_amount: 1400000,
    status: 'partially_paid',
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    due_date: 'Hafta oxiri',
  },
];

const SERVER_RENDERED_GUEST_PATHS = ['/cart', '/checkout', '/orders'];

/** Xodim ekranlari serverni shuncha vaqtda bir so'raydi (KDS yangi buyurtmani ≤ 5 soniyada ko'rishi uchun). */
const STAFF_POLL_MS = 5000;

/* eslint-disable @typescript-eslint/no-explicit-any */
function normalizeServerOrder(o: any): LiveOrder {
  // Server 'confirmed' (qabul qilingan) KDS uchun hali "yangi"; to'langan yetkazilgan buyurtma — 'paid'
  let status: LiveOrder['status'] = o.status;
  if (o.status === 'confirmed') status = 'pending';
  else if (o.status === 'out_for_delivery') status = 'ready';
  else if (o.status === 'delivered' && o.payment_status === 'paid') status = 'paid';
  return {
    id: o.id,
    order_number: String(o.order_number ?? ''),
    table_number: o.table_number ?? '',
    table_name: o.table_name || (o.table_number ? `Stol ${o.table_number}` : 'Stol belgilanmagan'),
    customer_name: o.customer_name || 'Mehmon',
    customer_phone: o.customer_phone,
    status,
    created_at: o.created_at,
    notes: o.notes || '',
    total_amount: Number(o.final_amount ?? o.total_amount ?? 0),
    items: (o.items || []).map((it: any) => ({
      id: it.id,
      name: it.name,
      quantity: it.quantity,
      price: Number(it.price || 0),
      unit: it.unit,
      course: it.course,
      notes: it.notes,
      done: !!it.done,
    })),
  };
}

function normalizeServerTable(t: any): LiveTable {
  const status: LiveTable['status'] =
    t.status === 'bill' ? 'bill_requested' : t.status === 'free' ? 'free' : t.status === 'reserved' ? 'reserved' : 'occupied';
  return {
    id: t.id,
    number: t.number,
    hall: t.hall || 'Asosiy Zal',
    status,
    capacity: t.capacity ?? 4,
    guests_count: t.guests_count ?? 0,
    total_bill: Number(t.total_bill || 0),
    active_orders_count: t.active_orders_count ?? 0,
  };
}

function normalizeServerCall(c: any): LiveServiceCall {
  return {
    id: c.id,
    table_number: c.table_number,
    hall_name: c.hall_name || 'Asosiy Zal',
    type: c.type,
    title: c.title,
    time: c.time || 'Hozir',
    status: c.status === 'accepted' ? 'accepted' : 'pending',
  };
}

/** Django sahifasi bergan haqiqiy stol raqami (QR dan kirganda URL'da raqam emas, UUID token bo'ladi). */
function serverTableFromWindow(): string {
  if (typeof window === 'undefined') return '';
  const w = window as unknown as Record<string, any>;
  for (const key of ['__GULISTON_DATA__', '__GULISTON_CART_DATA__', '__GULISTON_ORDERS_DATA__', '__GULISTON_CHECKOUT_DATA__', '__GULISTON_TABLE_DATA__', '__GULISTON_AR_DATA__']) {
    const n = w[key]?.table?.number;
    if (n !== undefined && n !== null && String(n).trim() !== '') return String(n);
  }
  return '';
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Django sahifa bilan kelgan savat (sessiya) — mehmon savatining asosiy manbasi. null — sahifa savat yubormagan. */
function serverCartFromWindow(): Record<number, number> | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, any>;
  const flat = w.__GULISTON_DATA__?.cart ?? w.__GULISTON_AR_DATA__?.cart;
  if (flat && typeof flat === 'object' && !Array.isArray(flat)) return flat as Record<number, number>;
  const items = w.__GULISTON_CART_DATA__?.items;
  if (Array.isArray(items)) {
    const map: Record<number, number> = {};
    items.forEach((it: { product_id?: number; quantity?: number }) => {
      if (it.product_id) map[it.product_id] = Number(it.quantity) || 1;
    });
    return map;
  }
  return null;
}

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    const rawPath = window.location.pathname || '/';
    const subInfo = SubdomainService.getSubdomainInfo();

    // Agar subdomen aniqlangan bo'lsa (masalan admin.domain.uz)
    if (subInfo.isStaffDomain && subInfo.defaultPath) {
      if (rawPath === '/' || rawPath === '/welcome' || rawPath === '/welcome/' || rawPath === '/menu') {
        return subInfo.defaultPath;
      }
    }

    const urlParams = new URLSearchParams(window.location.search);
    const tableFromUrl = urlParams.get('table');

    // Agar mijoz QR kod yoki NFC orqali stol parametri bilan kirsa,
    // to'g'ridan-to'g'ri taomlar menyusiga (/menu/) yo'naltiriladi!
    if (tableFromUrl && (rawPath === '/' || rawPath === '/welcome' || rawPath === '/welcome/')) {
      return '/menu/';
    }
    return rawPath;
  });

  const [userRole, setUserRole] = useState<UserRole>(() => {
    const subInfo = SubdomainService.getSubdomainInfo();
    if (subInfo.detectedRole) {
      roleService.grantRole(subInfo.detectedRole, `${subInfo.detectedRole.toUpperCase()} Subdomeni`);
      return subInfo.detectedRole;
    }
    return roleService.getCurrentRole();
  });

  const loginStaff = useCallback((role: UserRole, name = 'Xodim') => {
    roleService.grantRole(role, name);
    setUserRole(role);
  }, []);

  const logoutStaff = useCallback(() => {
    roleService.revokeRole();
    setUserRole('guest');
    window.history.pushState({}, '', '/menu');
    setCurrentPath('/menu');
  }, []);

  const [tableNumber, setTableNumber] = useState<string | number>(() => {
    const fromServer = serverTableFromWindow();
    if (fromServer) return fromServer;
    const urlParams = new URLSearchParams(window.location.search);
    const tableFromUrl = urlParams.get('table');
    if (tableFromUrl && !UUID_RE.test(tableFromUrl)) return tableFromUrl;
    try {
      return localStorage.getItem('guliston_table_num') || '';
    } catch {
      return '';
    }
  });

  // Persistent cart in localStorage
  const [cart, setCart] = useState<Record<number, number>>(() => {
    // Server (sessiya) savati ustun: brauzerdagi eski savat serverdagidan farq qilmasin (TZ R-GST-04)
    const fromServer = serverCartFromWindow();
    if (fromServer) return fromServer;
    try {
      const saved = localStorage.getItem('guliston_cart_items');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};   // yangi mehmon savati bo'sh (avval "Plov×2, Somsa×4" bilan to'ldirilardi)
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

  // Sobir Tog'a Moliya Tizimi (Transactions & Debts)
  const [financeTransactions, setFinanceTransactions] = useState<FinanceTransaction[]>(() => {
    try {
      const saved = localStorage.getItem('guliston_finance_txs');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_FINANCE_TRANSACTIONS;
  });

  const [financeDebts, setFinanceDebts] = useState<FinanceDebt[]>(() => {
    try {
      const saved = localStorage.getItem('guliston_finance_debts');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_FINANCE_DEBTS;
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
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isStudioModalOpen, setIsStudioModalOpen] = useState(false);

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
      localStorage.setItem('guliston_finance_txs', JSON.stringify(financeTransactions));
    } catch {}
  }, [financeTransactions]);

  useEffect(() => {
    try {
      localStorage.setItem('guliston_finance_debts', JSON.stringify(financeDebts));
    } catch {}
  }, [financeDebts]);

  useEffect(() => {
    try {
      localStorage.setItem('guliston_stop_list', JSON.stringify(stopList));
    } catch {}
  }, [stopList]);

  // Handle browser Back / Forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
      setUserRole(roleService.getCurrentRole());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Xodim ekranlari (KDS, ofitsiant, hostess, admin) serverdan davriy yangilanadi: buyurtmalar, stollar, chaqiruvlar.
  // Avval faqat sahifa ochilganda bir marta so'ralar edi, KDS yangi buyurtmani qayta yuklamaguncha ko'rmasdi (R-KDS-01).
  // Yozuvlar (holat o'zgartirish) bajarilayotganda yangilanish o'tkazib yuboriladi — optimistik holat orqaga qaytmasin.
  const inflightWrites = useRef(0);
  const syncNowRef = useRef<() => void>(() => {});

  const financeNowRef = useRef<() => void>(() => {});
  const writeThrough = useCallback(<T,>(request: Promise<T>): Promise<T> => {
    inflightWrites.current += 1;
    return request.finally(() => {
      inflightWrites.current -= 1;
      syncNowRef.current();     // server holatini qayta o'qish: xato bo'lsa lokal taxmin to'g'rilanadi
      financeNowRef.current();  // kassa (stol yopilganda kirim) ham serverdan qayta o'qiladi
    });
  }, []);
  useEffect(() => {
    // Mehmon uchun so'ralmaydi (server ham 401/403 qaytaradi)
    if (roleService.getCurrentRole() === 'guest') return;

    let stopped = false;
    let baselineDone = false;
    const knownOrderIds = new Set<string>();
    const knownCallIds = new Set<string>();

    const run = async () => {
      if (stopped || document.hidden || inflightWrites.current > 0) return;
      try {
        const [serverOrders, serverTables, serverCalls] = await Promise.all([
          RestaurantAPI.getOrders(),
          RestaurantAPI.getTables(),
          RestaurantAPI.getServiceCalls(),
        ]);
        if (stopped || inflightWrites.current > 0) return;

        if (Array.isArray(serverOrders)) {
          const list = serverOrders.map(normalizeServerOrder);
          const fresh = list.filter((o) => o.status === 'pending' && !knownOrderIds.has(String(o.id)));
          list.forEach((o) => knownOrderIds.add(String(o.id)));
          if (baselineDone && fresh.length > 0) playNotificationSound('order');
          setOrders(list);
        }
        if (Array.isArray(serverTables)) {
          setTables(serverTables.map(normalizeServerTable));
        }
        if (Array.isArray(serverCalls)) {
          const list = serverCalls.map(normalizeServerCall);
          const fresh = list.filter((c) => c.status === 'pending' && !knownCallIds.has(String(c.id)));
          list.forEach((c) => knownCallIds.add(String(c.id)));
          if (baselineDone && fresh.length > 0) playNotificationSound('call');
          setServiceCalls(list);
        }
        baselineDone = true;
      } catch (e) {
        console.warn('[sync] server sync failed, keeping the last known data', e);
      }
    };

    syncNowRef.current = () => {
      void run();
    };
    void run();
    const timer = window.setInterval(run, STAFF_POLL_MS);
    const onVisible = () => {
      if (!document.hidden) void run();
    };
    document.addEventListener('visibilitychange', onVisible);

    // Moliya (faqat rahbariyat uchun; boshqa rolda server 403 beradi): ochilganda va har yozuvdan keyin
    const loadFinance = async () => {
      const fin = await RestaurantAPI.getFinanceData();
      if (stopped || !fin) return;
      if (Array.isArray(fin.transactions)) {
        setFinanceTransactions(fin.transactions);
        // Bugungi tushum — serverdagi haqiqiy kirimlardan, Toshkent kuni bo'yicha
        // (avval 3 480 000 so'm deb to'qib qo'yilgan hisoblagich edi)
        const dayKey = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
        const today = dayKey(new Date());
        setTodayRevenue(
          fin.transactions
            .filter((t: FinanceTransaction & { is_cancelled?: boolean }) =>
              t.type === 'income' && !t.is_cancelled && dayKey(new Date(t.created_at)) === today)
            .reduce((sum: number, t: FinanceTransaction) => sum + Number(t.amount || 0), 0)
        );
      }
      if (Array.isArray(fin.debts)) setFinanceDebts(fin.debts);
    };
    financeNowRef.current = () => {
      void loadFinance();
    };
    void loadFinance();

    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // ─── ROUTE GUARD MIDDLEWARE CHECK (INITIAL LOAD) ───
  useEffect(() => {
    const guard = RouteGuard.canActivate(currentPath);
    if (!guard.allowed) {
      const fallback = guard.redirectTo || '/menu';
      window.history.replaceState({}, '', fallback);
      setCurrentPath(fallback);
      setUserRole(roleService.getCurrentRole());
    }
  }, [currentPath]);

  // ─── ROUTE GUARD MIDDLEWARE CHECK (NAVIGATION) ───
  const navigate = useCallback((path: string) => {
    const guard = RouteGuard.canActivate(path);
    if (!guard.allowed) {
      console.warn(`[RouteGuard] Blocked navigation to ${path}. Redirecting to ${guard.redirectTo}`);
      const fallback = guard.redirectTo || '/menu';
      if (fallback !== currentPath) {
        window.history.pushState({}, '', fallback);
        setCurrentPath(fallback);
        setUserRole(roleService.getCurrentRole());
      }
      return;
    }

    if (path === currentPath) return;

    // Savat, checkout va buyurtmalar sahifalari ma'lumotni Django (sessiya) dan oladi: SPA ichida emas,
    // to'liq yuklanadi — aks holda serverdagi haqiqiy savat o'rniga demo ma'lumot ko'rinardi.
    const bare = path.split('?')[0].replace(/\/+$/, '');
    if (SERVER_RENDERED_GUEST_PATHS.includes(bare) && roleService.getCurrentRole() === 'guest') {
      window.location.assign(bare + '/');
      return;
    }

    window.history.pushState({}, '', path);
    setCurrentPath(path);
    setUserRole(roleService.getCurrentRole());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPath]);

  // Cart operations
  // Joriy savat (updater ichida side-effect qilmaslik uchun ref orqali o'qiladi)
  const cartRef = useRef(cart);
  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  const applyQuantity = useCallback((productId: number, qty: number) => {
    const next = { ...cartRef.current };
    if (qty <= 0) delete next[productId];
    else next[productId] = qty;
    cartRef.current = next;
    setCart(next);
    void CartSync.setQuantity(productId, qty);   // serverdagi sessiya savati bilan bir xil bo'lsin
  }, []);

  const addToCart = useCallback((productId: number, qty = 1) => {
    applyQuantity(productId, (cartRef.current[productId] || 0) + qty);
  }, [applyQuantity]);

  const removeFromCart = useCallback((productId: number) => {
    applyQuantity(productId, 0);
  }, [applyQuantity]);

  const updateQuantity = useCallback((productId: number, delta: number) => {
    applyQuantity(productId, (cartRef.current[productId] || 0) + delta);
  }, [applyQuantity]);

  const clearCart = useCallback(() => {
    cartRef.current = {};
    setCart({});
    void CartSync.clear();
  }, []);

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

      // Single-Request: Serverga bitta so'rov orqali yuborish
      RestaurantAPI.createOrder({
        table_number: orderData.tableNumber,
        customer_name: orderData.customerName || 'Mehmon',
        phone: orderData.phone,
        notes: orderData.notes,
        items: orderData.items.map((it) => ({
          name: it.name,
          price: it.price,
          quantity: it.quantity,
          unit: it.unit,
          course: it.course,
          notes: it.notes,
          product_id: typeof it.id === 'number' ? it.id : null,
        })),
      }).then((serverRes) => {
        if (serverRes?.id) {
          setOrders((prev) =>
            prev.map((o) => (o.id === newOrder.id ? { ...o, id: serverRes.id, order_number: serverRes.order_number } : o))
          );
        }
      }).catch((e) => console.warn('Order sync fallback', e));

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

      // Server haqiqat manbai: oshxona holati boshqa qurilmalarda (ofitsiant, admin) ham ko'rinadi
      if (status === 'preparing' || status === 'ready' || status === 'delivered') {
        void writeThrough(RestaurantAPI.updateOrderStatus(orderId, status));
      }
    },
    [writeThrough]
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

      // Single-Request: Oshpaz holatini serverga yuborish
      if (typeof itemId === 'number') {
        RestaurantAPI.toggleKitchenItem(itemId).catch((e) => console.warn('Kitchen toggle fallback', e));
      }
    },
    []
  );

  // Table Operations
  const addDishToTable = useCallback(
    async (
      tableNum: string | number,
      dish: { name: string; price: number; product_id?: number | null }
    ): Promise<boolean> => {
      // Faqat menyudagi taom (product_id) qo'shiladi; narxni server o'zi menyudan oladi (R-SEC-07)
      if (!dish.product_id) return false;
      const res = await writeThrough(
        RestaurantAPI.addDishToTable(tableNum, {
          name: dish.name, price: dish.price, quantity: 1, product_id: dish.product_id,
        })
      );
      return res?.status === 'success';
    },
    [writeThrough]
  );

  const updateTableStatus = useCallback((tableNum: string | number, status: LiveTable['status'], guestsCount?: number) => {
    setTables((prev) =>
      prev.map((t) =>
        String(t.number) === String(tableNum)
          ? {
              ...t,
              status,
              ...(guestsCount !== undefined ? { guests_count: guestsCount } : {}),
            }
          : t
      )
    );
  }, []);

  // Finance helpers
  const addFinanceTransaction = useCallback((tx: Omit<FinanceTransaction, 'id' | 'created_at'>) => {
    const newTx: FinanceTransaction = {
      ...tx,
      id: `tx-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    setFinanceTransactions((prev) => [newTx, ...prev]);

    // Agar kirim bo'lsa darhol todayRevenue ga ham ta'sir qiladi
    if (tx.type === 'income') {
      setTodayRevenue((prev) => prev + tx.amount);
    }
  }, []);

  const cancelFinanceTransaction = useCallback((id: string | number, reason: string) => {
    setFinanceTransactions((prev) =>
      prev.map((tx) => {
        if (String(tx.id) === String(id) && !tx.is_cancelled) {
          // Agar bekor qilinayotgan tranzaksiya kirim bo'lsa, tushumni kamaytirish
          if (tx.type === 'income') {
            setTodayRevenue((rev) => Math.max(0, rev - tx.amount));
          }
          return {
            ...tx,
            is_cancelled: true,
            cancellation_reason: reason,
            cancelled_at: new Date().toISOString(),
          };
        }
        return tx;
      })
    );
  }, []);

  const addFinanceDebt = useCallback(
    (debt: Omit<FinanceDebt, 'id' | 'paid_amount' | 'remaining_amount' | 'status' | 'created_at'>) => {
      const newDebt: FinanceDebt = {
        ...debt,
        id: `debt-${Date.now()}`,
        paid_amount: 0,
        remaining_amount: debt.total_amount,
        status: 'pending',
        created_at: new Date().toISOString(),
      };
      setFinanceDebts((prev) => [newDebt, ...prev]);
    },
    []
  );

  const payDebtPartial = useCallback(
    (debtId: string | number, payAmount: number, paymentMethod: 'cash' | 'card', notes?: string) => {
      setFinanceDebts((prev) =>
        prev.map((debt) => {
          if (String(debt.id) === String(debtId)) {
            const newPaid = Math.min(debt.total_amount, debt.paid_amount + payAmount);
            const remaining = Math.max(0, debt.total_amount - newPaid);
            const status: FinanceDebt['status'] = remaining === 0 ? 'settled' : 'partially_paid';

            // Agar mijoz bizga qarzini to'lagan bo'lsa (receivable) -> Kassaga KIRIM tushadi!
            // Agar biz ta'minotchiga qarzimizni to'lagan bo'lsak (payable) -> Kassadan CHIQIM bo'ladi!
            const txType = debt.type === 'receivable' ? ('income' as const) : ('expense' as const);
            const txCategory = debt.type === 'receivable' ? 'Nasiya Qaytarildi' : 'Qarz To\'lovi (Yetkazib beruvchi)';

            const autoTx: FinanceTransaction = {
              id: `tx-debt-${Date.now()}`,
              type: txType,
              category: txCategory,
              amount: payAmount,
              payment_method: paymentMethod,
              source_type: 'debt_payment',
              customer_name: debt.person_name,
              description: `${debt.person_name} (${debt.type === 'receivable' ? 'Nasiya qaytardi' : 'Qarz to\'landi'})${notes ? ': ' + notes : ''}`,
              created_at: new Date().toISOString(),
            };

            setFinanceTransactions((txs) => [autoTx, ...txs]);

            if (txType === 'income') {
              setTodayRevenue((rev) => rev + payAmount);
            }

            return {
              ...debt,
              paid_amount: newPaid,
              remaining_amount: remaining,
              status,
            };
          }
          return debt;
        })
      );
    },
    []
  );

  const settleTableBill = useCallback(
    async (tableNum: string | number, paymentMethod: 'cash' | 'card' = 'cash'): Promise<boolean> => {
      // Server haqiqat manbai: hisobni server yopadi, kassaga kirimni ham server yozadi (to'lov turi bilan).
      // Avval hisob lokal yopilib, kassa yozuvi brauzerda yaratilardi va server xatosi jim qolardi (R-FIN-04).
      const res = await writeThrough(RestaurantAPI.settleTableBill(tableNum, paymentMethod));
      return res?.status === 'success';
    },
    [writeThrough]
  );

  // Service Call Operations
  const createServiceCall = useCallback(
    async (call: {
      table_number: string | number;
      hall_name?: string;
      type: LiveServiceCall['type'];
      title: string;
    }): Promise<boolean> => {
      // Avval serverga: "yuborildi" faqat server qabul qilgandan keyin (avval lokal ro'yxatga qo'shib, xato bo'lsa jim qolardi)
      const res = await RestaurantAPI.createServiceCall(call.table_number, call.type, call.title);
      if (!res?.id) return false;

      const newCall: LiveServiceCall = {
        id: res.id,
        table_number: call.table_number,
        hall_name: call.hall_name || 'Asosiy Zal',
        type: call.type,
        title: call.title,
        time: 'Hozir',
        status: 'pending',
      };
      setServiceCalls((prev) => (prev.some((c) => c.id === newCall.id) ? prev : [newCall, ...prev]));

      if (call.type === 'bill') {
        setTables((prev) =>
          prev.map((t) =>
            String(t.number) === String(call.table_number) ? { ...t, status: 'bill_requested' } : t
          )
        );
      }
      return true;
    },
    []
  );

  const acceptServiceCall = useCallback((callId: number) => {
    setServiceCalls((prev) =>
      prev.map((c) => (c.id === callId ? { ...c, status: 'accepted' } : c))
    );
    void writeThrough(RestaurantAPI.updateServiceCallStatus(callId, 'accepted'));
  }, [writeThrough]);

  const completeServiceCall = useCallback((callId: number) => {
    setServiceCalls((prev) => prev.filter((c) => c.id !== callId));
    void writeThrough(RestaurantAPI.updateServiceCallStatus(callId, 'done'));
  }, [writeThrough]);

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
        userRole,
        grantStaffRole: loginStaff,
        revokeStaffRole: logoutStaff,
        loginStaff,
        logoutStaff,
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
        updateTableStatus,
        addDishToTable,
        settleTableBill,

        serviceCalls,
        createServiceCall,
        acceptServiceCall,
        completeServiceCall,

        todayRevenue,
        stopList,
        toggleStopList,

        // Sobir Tog'a Moliya Tizimi
        financeTransactions,
        financeDebts,
        addFinanceTransaction,
        cancelFinanceTransaction,
        addFinanceDebt,
        payDebtPartial,

        isCallWaiterOpen,
        setIsCallWaiterOpen,
        isNfcModalOpen,
        setIsNfcModalOpen,
        isQrModalOpen,
        setIsQrModalOpen,
        isStudioModalOpen,
        setIsStudioModalOpen,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export { useNavigation } from './useNavigation';
