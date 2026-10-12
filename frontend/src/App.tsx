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
import { AdminDashboardPage, getTabFromPath } from './pages/AdminDashboardPage/AdminDashboardPage';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { RouteGuard } from './core/guards/RouteGuard';
import { CallWaiterModal, NFCGatewayModal, QRGeneratorModal, PhotogrammetryStudioModal } from './components/ui';
import './App.css';

const AppContent: React.FC = () => {
  const { currentPath } = useNavigation();

  // ─── ROUTE GUARD MIDDLEWARE ENFORCEMENT (Zero Data Leakage) ───
  const guard = RouteGuard.canActivate(currentPath);
  if (!guard.allowed) {
    if (guard.redirectTo?.includes('/waiter')) return <WaiterPanelPage />;
    if (guard.redirectTo?.includes('/kitchen') || guard.redirectTo?.includes('/kds')) return <AdminDashboardPage initialTab="kds" />;
    if (guard.redirectTo?.includes('/hostess')) return <HostessDeskPage />;
    return <MenuPage />;
  }

  // Showcase laboratoriyasi
  if (currentPath.includes('/ui-components') || currentPath.includes('/design-system')) {
    return <ComponentShowcase />;
  }

  // ─── RESTORAN ADMIN PANELI & GULISTON UNIFIED MANAGEMENT SUITE ───
  // Clean paths: /menu/admin, /menu/kitchen, /menu/kds, /menu/waiter, /menu/table, /menu/hostess, /menu/finance, /menu/ar, /admin
  if (
    currentPath.startsWith('/menu/admin') ||
    currentPath.startsWith('/menu/kitchen') ||
    currentPath.startsWith('/menu/kds') ||
    currentPath.startsWith('/menu/waiter') ||
    currentPath.startsWith('/menu/table') ||
    currentPath.startsWith('/menu/hostess') ||
    currentPath.startsWith('/menu/finance') ||
    currentPath.startsWith('/menu/ar') ||
    currentPath.startsWith('/admin')
  ) {
    const tab = getTabFromPath(currentPath);
    return <AdminDashboardPage initialTab={tab} />;
  }

  // Oshxona Ekrani (KDS) (/kds/ yoki /kitchen/ yoki /seller/kds/)
  if (currentPath.includes('/kds') || currentPath.includes('/kitchen')) {
    return <AdminDashboardPage initialTab="kds" />;
  }

  // Moliya & Kassa Paneli (/finance)
  if (currentPath.includes('/finance')) {
    return <AdminDashboardPage initialTab="finance" />;
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

const GlobalModals: React.FC = () => {
  const { isQrModalOpen, setIsQrModalOpen, isStudioModalOpen, setIsStudioModalOpen } = useNavigation();
  return (
    <>
      <CallWaiterModal />
      <NFCGatewayModal />
      <QRGeneratorModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
      />
      <PhotogrammetryStudioModal
        isOpen={isStudioModalOpen}
        onClose={() => setIsStudioModalOpen(false)}
        onSaveProduct3D={(dish) => {
          console.log('New 3D/360 Dish generated:', dish);
        }}
      />
    </>
  );
};

export const App: React.FC = () => {
  return (
    <NavigationProvider>
      <AppContent />
      <GlobalModals />
    </NavigationProvider>
  );
};

export default App;
