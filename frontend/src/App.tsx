import React from 'react';
import { WelcomePage } from './pages/WelcomePage/WelcomePage';
import { MenuPage } from './pages/MenuPage/MenuPage';
import { CartPage } from './pages/CartPage/CartPage';
import { CheckoutPage } from './pages/CheckoutPage/CheckoutPage';
import { ComponentShowcase } from './showcase/ComponentShowcase';
import { ARMenuPage } from './pages/ARMenuPage/ARMenuPage';
import { OrdersPage } from './pages/OrdersPage/OrdersPage';
import { TableHubPage } from './pages/TableHubPage/TableHubPage';
import { ReservationPage } from './pages/ReservationPage/ReservationPage';
import { WaiterPanelPage } from './pages/WaiterPanelPage/WaiterPanelPage';
import { HostessDeskPage } from './pages/HostessDeskPage/HostessDeskPage';
import { KDSPage } from './pages/KDSPage/KDSPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage/AdminDashboardPage';
import './App.css';

export const App: React.FC = () => {
  const path = window.location.pathname;

  // Showcase laboratoriyasi
  if (path.includes('/ui-components') || path.includes('/design-system')) {
    return <ComponentShowcase />;
  }

  // Restoran Admin & Boshqaruv Markazi (/admin/dashboard/, /admin/)
  if (path.includes('/admin/dashboard') || path === '/admin' || path === '/admin/') {
    return <AdminDashboardPage />;
  }

  // Oshxona Ekrani (KDS) (/kds/ yoki /kitchen/ yoki /seller/kds/)
  if (path.includes('/kds') || path.includes('/kitchen')) {
    return <KDSPage />;
  }

  // 3D / AR Interaktiv Menyu (/ar/)
  if (path.includes('/ar')) {
    return <ARMenuPage />;
  }

  // Hostess / Kutib Olish Paneli (/arrival/desk, /arrival/timeline, /arrival/checklist, /hostess)
  if (path.includes('/arrival/') || path.includes('/hostess')) {
    return <HostessDeskPage />;
  }

  // Ofitsiant va Xizmat Paneli (/waiter yoki /ofitsiant)
  if (path.includes('/waiter') || path.includes('/ofitsiant')) {
    return <WaiterPanelPage />;
  }

  // Bron qidirish & Kelishni tasdiqlash (/reservation/arrival yoki /reservation/find)
  if (path.includes('/reservation/arrival') || path.includes('/reservation/find')) {
    return <ReservationPage />;
  }

  // Stol & Bron Hubi (/table/ yoki /reservation/)
  if (path.includes('/table') || path.includes('/reservation')) {
    return <TableHubPage />;
  }

  // Buyurtmalar & Hisob (/orders/ yoki /order/)
  if (path.includes('/orders') || path.includes('/order')) {
    return <OrdersPage />;
  }

  // Buyurtmani rasmiylashtirish (Checkout)
  if (path.includes('/checkout')) {
    return <CheckoutPage />;
  }

  // Savat sahifasi
  if (path.includes('/cart')) {
    return <CartPage />;
  }

  // Bosh sahifa (Welcome / Root)
  if (path === '/' || path.includes('/welcome')) {
    return <WelcomePage />;
  }

  // Standart: Asosiy Menyu sahifasi (/menu/)
  return <MenuPage />;
};

export default App;
