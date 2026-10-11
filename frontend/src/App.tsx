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
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { CallWaiterModal, NFCGatewayModal } from './components/ui';
import './App.css';

const AppContent: React.FC = () => {
  const { currentPath } = useNavigation();

  // Showcase laboratoriyasi
  if (currentPath.includes('/ui-components') || currentPath.includes('/design-system')) {
    return <ComponentShowcase />;
  }

  // Restoran Admin & Boshqaruv Markazi (/admin/dashboard/, /admin/)
  if (currentPath.includes('/admin/dashboard') || currentPath === '/admin' || currentPath === '/admin/') {
    return <AdminDashboardPage />;
  }

  // Oshxona Ekrani (KDS) (/kds/ yoki /kitchen/ yoki /seller/kds/)
  if (currentPath.includes('/kds') || currentPath.includes('/kitchen')) {
    return <KDSPage />;
  }

  // 3D / AR Interaktiv Menyu (/ar/)
  if (currentPath.includes('/ar')) {
    return <ARMenuPage />;
  }

  // Hostess / Kutib Olish Paneli (/arrival/desk, /arrival/timeline, /arrival/checklist, /hostess)
  if (currentPath.includes('/arrival/') || currentPath.includes('/hostess')) {
    return <HostessDeskPage />;
  }

  // Ofitsiant va Xizmat Paneli (/waiter yoki /ofitsiant)
  if (currentPath.includes('/waiter') || currentPath.includes('/ofitsiant')) {
    return <WaiterPanelPage />;
  }

  // Bron qidirish & Kelishni tasdiqlash (/reservation/arrival yoki /reservation/find)
  if (currentPath.includes('/reservation/arrival') || currentPath.includes('/reservation/find')) {
    return <ReservationPage />;
  }

  // Stol & Bron Hubi (/table/ yoki /reservation/)
  if (currentPath.includes('/table') || currentPath.includes('/reservation')) {
    return <TableHubPage />;
  }

  // Buyurtmalar & Hisob (/orders/ yoki /order/)
  if (currentPath.includes('/orders') || currentPath.includes('/order')) {
    return <OrdersPage />;
  }

  // Buyurtmani rasmiylashtirish (Checkout)
  if (currentPath.includes('/checkout')) {
    return <CheckoutPage />;
  }

  // Savat sahifasi
  if (currentPath.includes('/cart')) {
    return <CartPage />;
  }

  // Bosh sahifa (Welcome / Root)
  if (currentPath === '/' || currentPath.includes('/welcome')) {
    return <WelcomePage />;
  }

  // Standart: Asosiy Menyu sahifasi (/menu/)
  return <MenuPage />;
};

export const App: React.FC = () => {
  return (
    <NavigationProvider>
      <AppContent />
      <CallWaiterModal />
      <NFCGatewayModal />
    </NavigationProvider>
  );
};

export default App;
